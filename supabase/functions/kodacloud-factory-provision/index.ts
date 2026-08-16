import { createClient } from "@supabase/supabase-js";
const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,x-client-info,content-type,apikey", "access-control-allow-methods": "POST,OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers }); if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const auth = req.headers.get("authorization") || ""; if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "missing_user_token" }, 401);
    const { data: userData, error: userError } = await service.auth.getUser(auth.slice(7).trim()); if (userError || !userData.user) return json({ error: "invalid_user_token" }, 401);
    const { data: role, error: roleError } = await service.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle(); if (roleError) return json({ error: "authorization_check_failed" }, 500); if (!role) return json({ error: "forbidden" }, 403);
    let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const serial = String(body.serial || "").trim().toUpperCase(); const model = String(body.model || "").trim().toLowerCase(); const boardUid = String(body.board_uid || "").trim().toLowerCase(); if (!serial || !model || !boardUid) return json({ error: "missing_fields" }, 400);
    const { data, error } = await service.rpc("koda_factory_provision_device", { p_serial: serial, p_model: model, p_board_uid: boardUid });
    if (error) { const message = String(error.message || "").toLowerCase(); const known = ["serial already provisioned","board uid already provisioned","invalid serial","invalid model","invalid board uid","device must be registered first","device model mismatch","device board uid mismatch"]; const match = known.find((item) => message.includes(item)); return json({ error: match ? match.replaceAll(" ", "_") : "provision_failed" }, match?.includes("already") ? 409 : 400); }
    const record = data as Record<string, unknown>; return json({ ok: true, device: { device_id: record.device_id, serial: record.serial, model: record.model, board_uid: record.board_uid, activation_status: record.activation_status }, factory_identity: { serial: record.serial, model: record.model, board_uid: record.board_uid, device_secret_hex: record.device_secret_hex } });
  } catch (error) { console.error(error instanceof Error ? error.name : "internal_error"); return json({ error: "internal_error" }, 500); }
});
