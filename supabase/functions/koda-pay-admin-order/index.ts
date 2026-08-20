import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function displayNumber(value: number) {
  return `KD-${String(value).padStart(6, "0")}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const actor = userData.user;
  if (userError || !actor) return json({ error: "unauthorized" }, 401);

  const { data: role } = await admin.from("user_roles").select("id").eq("user_id", actor.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "forbidden" }, 403);

  let input: { orderId?: string; action?: string; trackingCode?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  const action = typeof input.action === "string" ? input.action.trim() : "";
  const trackingCode = typeof input.trackingCode === "string" ? input.trackingCode.trim().slice(0, 120) : "";
  if (!orderId || !["start_processing", "mark_shipped", "mark_delivered"].includes(action)) return json({ error: "invalid_action" }, 400);

  const { data: order, error: lookupError } = await admin
    .from("orders")
    .select("id,order_number,user_id,status,tracking_code,shipped_at,delivered_at")
    .eq("id", orderId)
    .maybeSingle();
  if (lookupError) return json({ error: "order_lookup_failed" }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);

  const now = new Date().toISOString();
  let nextStatus = "";
  let title = "";
  let body = "";
  const update: Record<string, unknown> = {};

  if (action === "start_processing") {
    if (order.status !== "paid") return json({ error: "invalid_order_transition", current_status: order.status }, 409);
    nextStatus = "processing";
    title = "Preparando seu pedido";
    body = "O pagamento foi confirmado e seu pedido entrou em preparação.";
    update.status = nextStatus;
  }

  if (action === "mark_shipped") {
    if (order.status !== "processing") return json({ error: "invalid_order_transition", current_status: order.status }, 409);
    if (trackingCode.length < 4) return json({ error: "tracking_code_required" }, 400);
    nextStatus = "shipped";
    title = "Seu pedido foi enviado";
    body = "Seu pedido saiu da Koda e já está a caminho.";
    update.status = nextStatus;
    update.tracking_code = trackingCode;
    update.shipped_at = order.shipped_at ?? now;
  }

  if (action === "mark_delivered") {
    if (order.status !== "shipped") return json({ error: "invalid_order_transition", current_status: order.status }, 409);
    nextStatus = "delivered";
    title = "Pedido entregue";
    body = "Seu pedido foi marcado como entregue. Esperamos que você aproveite seu produto Koda.";
    update.status = nextStatus;
    update.delivered_at = order.delivered_at ?? now;
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id,order_number,status,tracking_code,shipped_at,delivered_at,updated_at")
    .maybeSingle();
  if (updateError) return json({ error: "order_update_failed" }, 500);
  if (!updated) return json({ error: "order_changed_concurrently" }, 409);

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: action,
    status: nextStatus,
    title,
    body,
    actor_user_id: actor.id,
    metadata: trackingCode ? { tracking_code: trackingCode } : {},
  });

  if (order.user_id) {
    await admin.from("user_notifications").insert({
      user_id: order.user_id,
      type: "order_update",
      title,
      body: `Pedido ${displayNumber(order.order_number)}. ${body}`,
      href: `/conta/pedidos/${order.id}`,
      metadata: { order_id: order.id, order_status: nextStatus },
    });
  }

  await admin.from("admin_audit_log").insert({
    actor_user_id: actor.id,
    action: `order_${action}`,
    entity_type: "order",
    entity_id: order.id,
    details: { from_status: order.status, to_status: nextStatus, tracking_code_set: Boolean(trackingCode) },
  });

  return json({ order: updated });
});
