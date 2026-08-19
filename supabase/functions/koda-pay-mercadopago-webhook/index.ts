import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function parseSignature(value: string) {
  const result: Record<string, string> = {};
  for (const part of value.split(",")) {
    const [key, rawValue] = part.split("=", 2);
    if (key && rawValue) result[key.trim()] = rawValue.trim();
  }
  return result;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function validateSignature(xSignature: string, xRequestId: string, dataId: string, secret: string) {
  const parts = parseSignature(xSignature);
  const timestamp = parts.ts;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  // Mercado Pago signs the exact data.id value from the query string.
  // Do not lowercase or otherwise normalize it before building the HMAC manifest.
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  return safeEqual(bytesToHex(signature), expected);
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !webhookSecret) {
    return json({ error: "connector_not_configured" }, 503);
  }

  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";
  const topic = url.searchParams.get("type") ?? "";
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!dataId || !xSignature || !xRequestId) return json({ error: "invalid_webhook" }, 400);
  if (topic && topic !== "order") return json({ ok: true, ignored: "unsupported_topic" });

  const signatureValid = await validateSignature(xSignature, xRequestId, dataId, webhookSecret);
  if (!signatureValid) return json({ error: "invalid_signature" }, 401);

  let notification: any = {};
  try {
    notification = await req.json();
  } catch {
    notification = {};
  }

  if (notification?.type && notification.type !== "order") {
    return json({ ok: true, ignored: "unsupported_topic" });
  }
  const bodyDataId = notification?.data?.id != null ? String(notification.data.id) : "";
  if (bodyDataId && bodyDataId !== dataId) {
    return json({ error: "webhook_data_mismatch" }, 400);
  }

  const providerResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!providerResponse.ok) return json({ error: "provider_lookup_failed" }, 502);

  const providerOrder = await providerResponse.json();
  const localOrderId = typeof providerOrder?.external_reference === "string" ? providerOrder.external_reference : "";
  if (!localOrderId) return json({ ok: true, ignored: "missing_external_reference" });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: localOrder } = await admin
    .from("orders")
    .select("id,user_id,total_cents,paid_at")
    .eq("id", localOrderId)
    .maybeSingle();
  if (!localOrder) return json({ ok: true, ignored: "unknown_order" });

  const providerStatus = typeof providerOrder?.status === "string" ? providerOrder.status : "created";
  const providerStatusDetail = typeof providerOrder?.status_detail === "string" ? providerOrder.status_detail : null;
  const providerPayment = providerOrder?.transactions?.payments?.[0] ?? null;
  const paymentMethod = providerPayment?.payment_method ?? {};
  const localPaymentStatus = mapPaymentStatus(providerStatus);
  const localOrderStatus = mapOrderStatus(providerStatus);
  const now = new Date().toISOString();

  let { data: payment } = await admin
    .from("payments")
    .select("id,paid_at")
    .eq("order_id", localOrder.id)
    .eq("provider_key", "mercado_pago")
    .eq("provider_payment_id", dataId)
    .maybeSingle();

  if (!payment) {
    const created = await admin
      .from("payments")
      .insert({
        order_id: localOrder.id,
        user_id: localOrder.user_id,
        provider_key: "mercado_pago",
        provider_payment_id: dataId,
        method: paymentMethod?.id === "pix" ? "pix" : "card",
        status: localPaymentStatus,
        amount_cents: localOrder.total_cents,
        pix_copy_paste: paymentMethod?.qr_code ?? null,
        paid_at: localPaymentStatus === "paid" ? now : null,
        failure_code: localPaymentStatus === "failed" ? providerStatusDetail : null,
        failure_message: localPaymentStatus === "failed" ? "Pagamento não concluído pelo processador." : null,
      })
      .select("id,paid_at")
      .single();
    payment = created.data ?? null;
  } else {
    await admin.from("payments").update({
      status: localPaymentStatus,
      pix_copy_paste: paymentMethod?.qr_code ?? undefined,
      paid_at: localPaymentStatus === "paid" ? (payment.paid_at ?? now) : payment.paid_at,
      failure_code: localPaymentStatus === "failed" ? providerStatusDetail : null,
      failure_message: localPaymentStatus === "failed" ? "Pagamento não concluído pelo processador." : null,
    }).eq("id", payment.id);
  }

  const orderUpdate: Record<string, unknown> = { status: localOrderStatus };
  if (localPaymentStatus === "paid") orderUpdate.paid_at = localOrder.paid_at ?? now;
  await admin.from("orders").update(orderUpdate).eq("id", localOrder.id);

  const rawProviderEventId = notification?.id != null
    ? String(notification.id)
    : `${dataId}:${providerStatus}:${providerStatusDetail ?? ""}`;
  const providerEventId = `mercadopago:webhook:${rawProviderEventId}`;

  if (payment?.id) {
    const { data: existingEvent } = await admin
      .from("payment_events")
      .select("id")
      .eq("source", "provider")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();

    if (!existingEvent) {
      await admin.from("payment_events").insert({
        payment_id: payment.id,
        source: "provider",
        event_type: notification?.action ?? `order.${providerStatus}`,
        provider_event_id: providerEventId,
        payload: {
          provider: "mercado_pago",
          provider_order_id: dataId,
          provider_payment_id: providerPayment?.id ?? null,
          status: providerStatus,
          status_detail: providerStatusDetail,
          live_mode: Boolean(notification?.live_mode),
        },
      });
    }
  }

  return json({ ok: true });
});
