import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

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

function centsToAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

function mapPaymentStatus(status: string) {
  if (status === "processed") return "paid";
  if (status === "failed") return "failed";
  if (status === "canceled") return "cancelled";
  if (status === "expired") return "expired";
  if (status === "refunded") return "refunded";
  return "pending";
}

function mapOrderStatus(status: string) {
  if (status === "processed") return "paid";
  if (status === "canceled" || status === "expired") return "cancelled";
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

async function sha256Short(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function runCustomerPostPaymentJobs(supabaseUrl: string, serviceRoleKey: string, orderId: string) {
  for (const functionName of ["koda-fiscal-process", "koda-order-confirmation-email"]) {
    EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => null));
  }
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
  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: {
    orderId?: string;
    cardToken?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    installments?: number;
    payerEmail?: string;
    identification?: { type?: string; number?: string };
    cardLast4?: string;
  };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  const cardToken = typeof input.cardToken === "string" ? input.cardToken.trim() : "";
  const paymentMethodId = typeof input.paymentMethodId === "string" ? input.paymentMethodId.trim().toLowerCase() : "";
  const paymentTypeId = input.paymentTypeId === "debit_card" ? "debit_card" : "credit_card";
  const installments = Number.isInteger(input.installments) ? Number(input.installments) : 1;
  const cardLast4 = typeof input.cardLast4 === "string" && /^\d{4}$/.test(input.cardLast4.trim()) ? input.cardLast4.trim() : null;
  if (!orderId || !cardToken || cardToken.length < 12 || !/^[a-z0-9_-]+$/i.test(paymentMethodId) || installments < 1 || installments > 24) {
    return json({ error: "invalid_payment_data" }, 400);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,status,order_type,currency,total_cents,customer_email,paid_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (orderError) return json({ error: "order_lookup_failed" }, 500);
  if (!order) return json({ error: "order_not_found" }, 404);
  if (order.currency !== "BRL" || !Number.isInteger(order.total_cents) || order.total_cents <= 0) return json({ error: "order_not_payable" }, 409);
  if (["paid", "processing", "shipped", "delivered", "refunded", "cancelled"].includes(order.status)) return json({ error: "order_not_payable" }, 409);

  const payerEmail = typeof input.payerEmail === "string" && input.payerEmail.includes("@") ? input.payerEmail.trim() : order.customer_email;
  if (!payerEmail) return json({ error: "payer_email_required" }, 409);

  const amount = centsToAmount(order.total_cents);
  const payer: Record<string, unknown> = { email: payerEmail };
  if (input.identification?.type && input.identification?.number) {
    payer.identification = {
      type: String(input.identification.type).trim().slice(0, 16),
      number: String(input.identification.number).replace(/\D/g, "").slice(0, 32),
    };
  }

  const tokenHash = await sha256Short(cardToken);
  const providerResponse = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Idempotency-Key": `koda-pay-card-${order.id}-${tokenHash}`,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      total_amount: amount,
      external_reference: order.id,
      config: {
        online: {
          transaction_security: {
            validation: "on_fraud_risk",
            liability_shift: "required",
          },
        },
      },
      payer,
      transactions: {
        payments: [{
          amount,
          payment_method: {
            id: paymentMethodId,
            type: paymentTypeId,
            token: cardToken,
            installments,
          },
        }],
      },
    }),
  });

  const providerBody = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    return json({
      error: "provider_error",
      provider_status: providerResponse.status,
      provider_message: typeof providerBody?.message === "string" ? providerBody.message : null,
      provider_error: typeof providerBody?.error === "string" ? providerBody.error : null,
    }, 502);
  }

  const card = extractCard(providerBody);
  if (!card.provider_order_id) return json({ error: "provider_invalid_response" }, 502);

  const localPaymentStatus = mapPaymentStatus(card.status);
  const localOrderStatus = mapOrderStatus(card.status);
  const now = new Date().toISOString();
  const firstPaidConfirmation = localPaymentStatus === "paid" && !order.paid_at;

  const { data: payment, error: paymentError } = await admin.from("payments").insert({
    order_id: order.id,
    user_id: user.id,
    provider_key: "mercado_pago",
    provider_payment_id: card.provider_order_id,
    method: "card",
    status: localPaymentStatus,
    amount_cents: order.total_cents,
    installments,
    card_brand: paymentMethodId,
    card_last4: cardLast4,
    paid_at: localPaymentStatus === "paid" ? now : null,
    failure_code: localPaymentStatus === "failed" ? card.status_detail : null,
    failure_message: localPaymentStatus === "failed" ? "Pagamento não concluído pelo processador." : null,
  }).select("id,status").single();
  if (paymentError || !payment) return json({ error: "payment_record_failed" }, 500);

  await admin.from("orders").update({
    status: localOrderStatus,
    paid_at: localPaymentStatus === "paid" ? (order.paid_at ?? now) : order.paid_at,
  }).eq("id", order.id);

  await admin.from("payment_events").insert({
    payment_id: payment.id,
    source: "provider",
    event_type: "provider_order_created",
    provider_event_id: `mercadopago:create:${card.provider_order_id}`,
    payload: {
      provider: "mercado_pago",
      provider_order_id: card.provider_order_id,
      provider_payment_id: card.provider_payment_id,
      status: card.status,
      status_detail: card.status_detail,
      payment_method_id: paymentMethodId,
      payment_type: paymentTypeId,
      installments,
      card_last4: cardLast4,
      three_ds_required: Boolean(card.challenge_url),
    },
  });

  let fulfillmentResult: any = null;
  if (localPaymentStatus === "paid") {
    const { data: existingEvent } = await admin.from("order_events").select("id").eq("order_id", order.id).eq("event_type", "payment_confirmed").maybeSingle();
    if (!existingEvent) {
      await admin.from("order_events").insert({
        order_id: order.id,
        event_type: "payment_confirmed",
        status: "paid",
        title: "Pagamento confirmado",
        body: order.order_type === "coverage"
          ? "Pagamento confirmado. Estamos ativando a cobertura no KodaBot escolhido."
          : "Pagamento confirmado. Seu pedido seguirá para preparação.",
      });
    }

    const { data: fulfillment, error: fulfillmentError } = await admin.rpc("fulfill_paid_order", { _order_id: order.id });
    fulfillmentResult = fulfillmentError ? { ok: false, error: "fulfillment_rpc_failed" } : fulfillment;

    if (firstPaidConfirmation) runCustomerPostPaymentJobs(supabaseUrl, serviceRoleKey, order.id);
  }

  return json({
    payment: { id: payment.id, ...card, local_status: payment.status },
    fulfillment: fulfillmentResult ? { ok: Boolean(fulfillmentResult.ok), error: fulfillmentResult.error ?? null } : null,
  }, 201);
});