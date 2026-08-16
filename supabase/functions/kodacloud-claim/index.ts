import { createClient } from "@supabase/supabase-js";
const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type,apikey,x-client-info", "access-control-allow-methods": "POST,OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
async function hash(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers }); if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const auth = req.headers.get("authorization") || ""; if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "missing_user_token" }, 401);
    const { data: userData, error: userError } = await service.auth.getUser(auth.slice(7).trim()); if (userError || !userData.user) return json({ error: "invalid_user_token" }, 401);
    let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const token = String(body.claim_token || "").trim(); if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: "missing_claim_token" }, 400);
    const { data, error } = await service.rpc("koda_claim_device", { p_claim_token_hash: await hash(token), p_user_id: userData.user.id });
    if (error) { const message = String(error.message || "").toLowerCase(); if (message.includes("expired")) return json({ error: "activation_expired" }, 410); if (message.includes("already")) return json({ error: "device_already_activated" }, 409); if (message.includes("invalid activation token")) return json({ error: "invalid_activation_token" }, 404); if (message.includes("not ready")) return json({ error: "device_not_ready" }, 409); console.error("claim_failed"); return json({ error: "claim_failed" }, 400); }
    return json({ ok: true, device: Array.isArray(data) ? data[0] : data });
  } catch (error) { console.error(error instanceof Error ? error.name : "internal_error"); return json({ error: "internal_error" }, 500); }
});
