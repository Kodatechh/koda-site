import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const service = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SITE_URL = (
  Deno.env.get("KODA_SITE_PUBLIC_URL") || "https://koda-site-six.vercel.app"
).replace(/\/$/, "");
const HEARTBEAT_INTERVAL_SECONDS = 30;
const ONLINE_WINDOW_SECONDS = 120;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const bytesHex = (value: Uint8Array) =>
  Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
function randomHex(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesHex(value);
}
async function sha256Hex(value: string) {
  return bytesHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  );
}
function modelSlug(value: string) {
  const model = value.trim().toLowerCase().replaceAll("_", "-");
  if (model === "kodabot-i" || model === "kodabot i") return "kodabot-i";
  if (model === "kodabot-i-pro" || model === "kodabot i pro") return "kodabot-i-pro";
  return model;
}
function hexBytes(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("invalid credential encoding");
  return new Uint8Array(value.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
}
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    hexBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesHex(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))),
  );
}
function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
async function body(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
function versionParts(value: string | null) {
  return value && /^\d+(\.\d+){1,2}$/.test(value) ? value.split(".").map(Number) : null;
}
function maxVersion(current: string | null, incoming: string | null) {
  if (!incoming) return current;
  const oldV = versionParts(current);
  const newV = versionParts(incoming);
  if (!oldV || !newV) return current || incoming;
  for (let i = 0; i < 3; i++) {
    if ((newV[i] || 0) > (oldV[i] || 0)) return incoming;
    if ((newV[i] || 0) < (oldV[i] || 0)) return current;
  }
  return incoming;
}
async function authenticated(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const plain = auth.slice(7).trim();
  if (!plain) return null;
  const { data: token } = await service
    .from("koda_device_tokens")
    .select("device_id,expires_at,revoked_at")
    .eq("token_hash", await sha256Hex(plain))
    .maybeSingle();
  if (!token || token.revoked_at || new Date(token.expires_at) <= new Date()) return null;
  const { data: device } = await service
    .from("devices")
    .select(
      "id,serial_number,model,board_uid,status,provisioning_status,activated_at,kodaos_version",
    )
    .eq("id", token.device_id)
    .maybeSingle();
  return device || null;
}
async function nextCommand(deviceId: string) {
  const retryBefore = new Date(Date.now() - 120_000).toISOString();
  const { data: retry, error: retryError } = await service
    .from("device_commands")
    .select("id,command,payload,created_at,status")
    .eq("device_id", deviceId)
    .eq("command", "run_diagnostics")
    .eq("status", "delivered")
    .lt("delivered_at", retryBefore)
    .order("delivered_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (retryError) throw retryError;
  const { data: pending, error } = await service
    .from("device_commands")
    .select("id,command,payload,created_at,status")
    .eq("device_id", deviceId)
    .eq("status", "pending")
    .in("command", [
      "restart",
      "run_diagnostics",
      "check_update",
      "install_update",
      "sync_preferences",
      "factory_reset_request",
    ])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const command = retry || pending;
  if (!command) return null;
  const now = new Date().toISOString();
  const { data: delivered, error: deliveryError } = await service
    .from("device_commands")
    .update({ status: "delivered", delivered_at: now })
    .eq("id", command.id)
    .eq("device_id", deviceId)
    .eq("status", command.status)
    .select("id,command,payload,created_at,delivered_at")
    .maybeSingle();
  if (deliveryError) throw deliveryError;
  return delivered;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/^.*\/kodacloud-device/, "");
    if (!path.startsWith("/")) path = "/" + path;
    if (req.method === "POST" && path === "/v1/device/challenge") {
      const input = await body(req);
      const serial = String(input.serial || "")
        .trim()
        .toUpperCase();
      const suppliedModel = String(input.model || "").trim();
      const model = modelSlug(suppliedModel);
      const boardUid = String(input.board_uid || "")
        .trim()
        .toLowerCase();
      if (!serial || !suppliedModel || !boardUid)
        return json({ error: "missing_device_identity" }, 400);
      const { data: device } = await service
        .from("devices")
        .select("id,status")
        .eq("serial_number", serial)
        .eq("model", model)
        .eq("board_uid", boardUid)
        .maybeSingle();
      if (!device || device.status === "retired") return json({ error: "unknown_device" }, 404);
      const nonce = randomHex();
      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      const { data: challenge, error } = await service
        .from("koda_device_challenges")
        .insert({ device_id: device.id, nonce, expires_at: expiresAt })
        .select("id")
        .single();
      if (error) throw error;
      return json({ challenge_id: challenge.id, nonce, expires_in: 60 });
    }
    if (req.method === "POST" && path === "/v1/device/auth") {
      const input = await body(req);
      const serial = String(input.serial || "")
        .trim()
        .toUpperCase();
      const suppliedModel = String(input.model || "").trim();
      const boardUid = String(input.board_uid || "")
        .trim()
        .toLowerCase();
      const challengeId = String(input.challenge_id || "").trim();
      const proof = String(input.proof || "")
        .trim()
        .toLowerCase();
      const { data: device } = await service
        .from("devices")
        .select("id,status")
        .eq("serial_number", serial)
        .eq("model", modelSlug(suppliedModel))
        .eq("board_uid", boardUid)
        .maybeSingle();
      if (!device || device.status === "retired") return json({ error: "unknown_device" }, 404);
      const { data: challenge } = await service
        .from("koda_device_challenges")
        .select("id,nonce,expires_at,used_at")
        .eq("id", challengeId)
        .eq("device_id", device.id)
        .maybeSingle();
      if (!challenge || challenge.used_at || new Date(challenge.expires_at) <= new Date())
        return json({ error: "invalid_or_expired_challenge" }, 401);
      const { data: credential } = await service
        .from("koda_device_credentials")
        .select("device_secret_hex")
        .eq("device_id", device.id)
        .maybeSingle();
      if (!credential) return json({ error: "device_not_provisioned" }, 403);
      const expected = await hmacHex(
        credential.device_secret_hex,
        `${serial}|${suppliedModel}|${boardUid}|${challengeId}|${challenge.nonce}`,
      );
      if (!safeEqual(expected, proof)) return json({ error: "invalid_device_proof" }, 401);
      const now = new Date().toISOString();
      const { data: consumed } = await service
        .from("koda_device_challenges")
        .update({ used_at: now })
        .eq("id", challengeId)
        .is("used_at", null)
        .gt("expires_at", now)
        .select("id")
        .maybeSingle();
      if (!consumed) return json({ error: "invalid_or_expired_challenge" }, 401);
      const plainToken = randomHex();
      const { error } = await service.from("koda_device_tokens").insert({
        device_id: device.id,
        token_hash: await sha256Hex(plainToken),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      if (error) throw error;
      return json({
        device_token: plainToken,
        expires_in: 86400,
        device_id: device.id,
        activation_status: device.status,
      });
    }
    const device = await authenticated(req);
    if (!device) return json({ error: "invalid_device_token" }, 401);
    if (req.method === "GET" && path === "/v1/device/status")
      return json({
        device_id: device.id,
        serial: device.serial_number,
        model: device.model,
        activation_status: device.status,
        activated_at: device.activated_at,
        koda_os_version: device.kodaos_version,
      });
    if (req.method === "POST" && path === "/v1/device/activation/session") {
      if (device.provisioning_status !== "ready" || device.status !== "not_activated")
        return json(
          {
            error: device.status === "activated" ? "device_already_activated" : "device_not_ready",
          },
          409,
        );
      const claimToken = randomHex();
      const { data: session, error } = await service
        .from("koda_activation_sessions")
        .insert({
          device_id: device.id,
          claim_token_hash: await sha256Hex(claimToken),
          expires_at: new Date(Date.now() + 600_000).toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      await service.from("device_events").insert({
        device_id: device.id,
        event_type: "activation_started",
        details: { session_id: session.id },
      });
      return json({
        session_id: session.id,
        activation_url: `${SITE_URL}/ativar?token=${claimToken}`,
        expires_in: 600,
      });
    }
    if (req.method === "GET" && path === "/v1/device/commands/next") {
      return json({ command: await nextCommand(device.id) });
    }
    const commandResult = path.match(/^\/v1\/device\/commands\/([0-9a-f-]+)\/result$/i);
    if (req.method === "POST" && commandResult) {
      const input = await body(req);
      const status = input.ok === false ? "failed" : "completed";
      const result = input.result && typeof input.result === "object" ? input.result : {};
      const now = new Date().toISOString();
      const { data: completed, error } = await service
        .from("device_commands")
        .update({ status, result, completed_at: now })
        .eq("id", commandResult[1])
        .eq("device_id", device.id)
        .in("status", ["delivered", "pending"])
        .select("id,command")
        .maybeSingle();
      if (error) throw error;
      if (!completed) return json({ error: "command_not_found_or_already_finished" }, 409);
      if (completed.command === "run_diagnostics") {
        const { error: healthError } = await service.from("device_health").upsert(
          {
            device_id: device.id,
            online: true,
            last_seen_at: now,
            diagnostics: result,
            updated_at: now,
          },
          { onConflict: "device_id" },
        );
        if (healthError) throw healthError;
      }
      await service.from("device_events").insert({
        device_id: device.id,
        event_type: "command_completed",
        details: { command_id: completed.id, command: completed.command, status },
      });
      return json({ ok: true, status });
    }
    const match = path.match(/^\/v1\/device\/activation\/session\/([0-9a-f-]+)$/i);
    if (req.method === "GET" && match) {
      const { data: session } = await service
        .from("koda_activation_sessions")
        .select("id,status,expires_at,claimed_at")
        .eq("id", match[1])
        .eq("device_id", device.id)
        .maybeSingle();
      if (!session) return json({ error: "activation_session_not_found" }, 404);
      let status = session.status;
      if (status === "pending" && new Date(session.expires_at) <= new Date()) {
        status = "expired";
        await service.from("koda_activation_sessions").update({ status }).eq("id", session.id);
      }
      return json({
        status,
        device_id: device.id,
        activated_at: status === "activated" ? session.claimed_at : null,
      });
    }
    if (req.method === "POST" && path === "/v1/device/heartbeat") {
      const input = await body(req);
      const now = new Date().toISOString();
      const incoming = String(input.koda_os_version || "").slice(0, 64) || null;
      const { error: deviceError } = await service
        .from("devices")
        .update({
          last_seen_at: now,
          kodaos_version: maxVersion(device.kodaos_version, incoming),
        })
        .eq("id", device.id);
      if (deviceError) throw deviceError;

      // Compatibility record for older clients. Presence is derived from the
      // server timestamp; a stored boolean cannot expire after power loss.
      const health = {
        device_id: device.id,
        online: true,
        last_seen_at: now,
        system_status:
          typeof input.system_status === "string" ? input.system_status.slice(0, 64) : "ok",
        updated_at: now,
      } as Record<string, unknown>;
      if (typeof input.wifi_status === "string")
        health.wifi_status = input.wifi_status.slice(0, 64);
      if (Number.isFinite(input.wifi_signal)) health.wifi_signal = input.wifi_signal;
      const { error: healthError } = await service
        .from("device_health")
        .upsert(health, { onConflict: "device_id" });
      if (healthError) throw healthError;

      return json({
        ok: true,
        server_time: now,
        heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
        online_window_seconds: ONLINE_WINDOW_SECONDS,
        command: await nextCommand(device.id),
      });
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    console.error(error instanceof Error ? error.name : "internal_error");
    return json({ error: "internal_error" }, 500);
  }
});
