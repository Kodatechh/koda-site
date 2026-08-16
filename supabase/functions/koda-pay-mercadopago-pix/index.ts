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
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function centsToAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

function extractPix(order: any) {
  const payment = order?.transactions?.payments?.[0] ?? null;
  const method = payment?.payment_method ?? {};
  return {
    provider_order_id: order?.id ?? null,
    provider_payment_id: payment?.id ?? null,
    status: order?.status ?? payment?.status ?? "created",
    status_detail: order?.status_detail ?? payment?.status_detail ?? null,
    qr_code: method?.qr_code ?? null,
    qr_code_base64: method?.qr_code_base64 ?? null,
    ticket_url: method?.ticket_url ?? null,
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { orderId?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!orderId) return json({ error: "invalid_order" }, 400);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,status,currency,total_cents,customer_email,order_number")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) return json({ error: "order_lookup_failed" }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);
  if (order.currency !== "BRL" || !Number.isInteger(order.total_cents) || order.total_cents <= 0) {
    return json({ error: "order_not_payable" }, 409);
  }
  if (["paid", "processing", "shipped", "delivered", "refunded", "cancelled"].includes(order.status)) {
    return json({ error: "order_not_payable" }, 409);
  }
  if (!order.customer_email) return json({ error: "payer_email_required" }, 409);

  const { data: existingPayment } = await admin
    .from("payments")
    .select("id,provider_payment_id,status,pix_copy_paste,pix_expires_at")
    .eq("order_id", order.id)
    .eq("provider_key", "mercado_pago")
    .eq("method", "pix")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPayment?.provider_payment_id && ["pending", "paid"].includes(existingPayment.status)) {
    const providerResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(existingPayment.provider_payment_id)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (providerResponse.ok) {
      const providerOrder = await providerResponse.json();
      return json({
        payment: {
          id: existingPayment.id,
          ...extractPix(providerOrder),
          local_status: existingPayment.status,
        },
      });
    }
  }

  const amount = centsToAmount(order.total_cents);
  const providerResponse = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Idempotency-Key": `koda-pay-pix-${order.id}`,
    },
    body: JSON.stringify({
      type: "online",
      total_amount: amount,
      external_reference: order.id,
      processing_mode: "automatic",
      transactions: {
        payments: [
          {
            amount,
            payment_method: { id: "pix", type: "bank_transfer" },
            expiration_time: "PT1H",
          },
        ],
      },
      payer: { email: order.customer_email },
    }),
  });

  const providerBody = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) return json({ error: "provider_error", provider_status: providerResponse.status }, 502);

  const pix = extractPix(providerBody);
  if (!pix.provider_order_id || !pix.qr_code) return json({ error: "provider_invalid_response" }, 502);

  const now = new Date().toISOString();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      user_id: user.id,
      provider_key: "mercado_pago",
      provider_payment_id: pix.provider_order_id,
      method: "pix",
      status: pix.status === "processed" ? "paid" : "pending",
      amount_cents: order.total_cents,
      pix_copy_paste: pix.qr_code,
      pix_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      paid_at: pix.status === "processed" ? now : null,
    })
    .select("id,status")
    .single();

  if (paymentError || !payment) return json({ error: "payment_record_failed" }, 500);

  const { error: orderUpdateError } = await admin.from("orders").update({
    status: pix.status === "processed" ? "paid" : "pending_payment",
    paid_at: pix.status === "processed" ? now : null,
  }).eq("id", order.id);
  if (orderUpdateError) return json({ error: "order_status_update_failed" }, 500);

  await admin.from("payment_events").insert({
    payment_id: payment.id,
    source: "provider",
    event_type: "provider_order_created",
    provider_event_id: `mercadopago:create:${pix.provider_order_id}`,
    payload: {
      provider: "mercado_pago",
      provider_order_id: pix.provider_order_id,
      provider_payment_id: pix.provider_payment_id,
      status: pix.status,
      status_detail: pix.status_detail,
    },
  });

  return json({
    payment: {
      id: payment.id,
      ...pix,
      local_status: payment.status,
    },
  }, 201);
});
