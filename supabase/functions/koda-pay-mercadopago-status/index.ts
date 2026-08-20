import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function mapPaymentStatus(status: string) {
  if (status === "processed") return "paid";
  if (status === "failed") return "failed";
  if (status === "canceled") return "cancelled";
  if (status === "expired") return "expired";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "failed";
  return "pending";
}

function mapOrderStatus(status: string) {
  if (status === "processed") return "paid";
  if (status === "canceled" || status === "expired" || status === "charged_back") return "cancelled";
  if (status === "refunded") return "refunded";
  return "pending_payment";
}

function extractCard(order: any) {
  const payment = order?.transactions?.payments?.[0] ?? null;
  const method = payment?.payment_method ?? {};
  return {
    provider_order_id: order?.id ?? null,
    provider_payment_id: payment?.id ?? null,
    status: order?.status ?? payment?.status ?? "created",
    status_detail: order?.status_detail ?? payment?.status_detail ?? null,
    payment_method_id: method?.id ?? null,
    payment_type: method?.type ?? null,
    installments: Number(method?.installments ?? 1),
    challenge_url: method?.transaction_security?.url ?? null,
    transaction_security_status: method?.transaction_security?.status ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  if (!accessToken) return json({ error: "connector_not_configured" }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { orderId?: string; providerOrderId?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  const providerOrderId = typeof input.providerOrderId === "string" ? input.providerOrderId.trim() : "";
  if (!orderId || !providerOrderId || !/^ORD[A-Z0-9_-]+$/i.test(providerOrderId)) return json({ error: "invalid_request" }, 400);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,status,total_cents,paid_at,order_type")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (orderError) return json({ error: "order_lookup_failed" }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);

  const providerResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerOrderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!providerResponse.ok) return json({ error: "provider_lookup_failed", provider_status: providerResponse.status }, 502);

  const providerOrder = await providerResponse.json();
  if (providerOrder?.external_reference !== order.id) return json({ error: "provider_order_mismatch" }, 403);

  const card = extractCard(providerOrder);
  const localPaymentStatus = mapPaymentStatus(card.status);
  const localOrderStatus = mapOrderStatus(card.status);
  const now = new Date().toISOString();
  const firstPaidConfirmation = localPaymentStatus === "paid" && !order.paid_at;

  const { data: payment } = await admin
    .from("payments")
    .select("id,paid_at")
    .eq("order_id", order.id)
    .eq("provider_key", "mercado_pago")
    .eq("provider_payment_id", providerOrderId)
    .maybeSingle();

  if (payment?.id) {
    await admin.from("payments").update({
      status: localPaymentStatus,
      paid_at: localPaymentStatus === "paid" ? (payment.paid_at ?? now) : payment.paid_at,
      failure_code: localPaymentStatus === "failed" ? card.status_detail : null,
      failure_message: localPaymentStatus === "failed" ? "Pagamento não concluído pelo processador." : null,
    }).eq("id", payment.id);
  }

  const orderUpdate: Record<string, unknown> = { status: localOrderStatus };
  if (localPaymentStatus === "paid") orderUpdate.paid_at = order.paid_at ?? now;
  await admin.from("orders").update(orderUpdate).eq("id", order.id);

  if (firstPaidConfirmation) {
    await admin.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_confirmed",
      status: "paid",
      title: "Pagamento confirmado",
      body: order.order_type === "coverage"
        ? "Pagamento confirmado. Estamos ativando a cobertura no KodaBot escolhido."
        : "Pagamento confirmado. Seu pedido seguirá para preparação.",
    });
    await admin.rpc("fulfill_paid_order", { _order_id: order.id });
  }

  return json({
    payment: {
      ...card,
      local_status: localPaymentStatus,
      order_status: localOrderStatus,
    },
  });
});
