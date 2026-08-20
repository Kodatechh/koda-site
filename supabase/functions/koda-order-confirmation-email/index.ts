import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
  const emailFrom = Deno.env.get("KODA_EMAIL_FROM")?.trim() ?? "";
  const siteUrl = (Deno.env.get("KODA_SITE_URL")?.trim() || "https://koda-site-six.vercel.app").replace(/\/$/, "");
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  if (authorization !== `Bearer ${serviceRoleKey}`) return json({ error: "unauthorized" }, 401);

  let input: { orderId?: string } = {};
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "invalid_order_id" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: alreadySent } = await admin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", "confirmation_email_sent")
    .maybeSingle();
  if (alreadySent) return json({ ok: true, idempotent: true });

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,customer_name,customer_email,shipping_service,shipping_deadline_days,shipping_address,paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) return json({ error: "order_not_found" }, 404);
  if (!order.paid_at || !["paid", "processing", "shipped", "delivered"].includes(order.status)) return json({ ok: true, skipped: "order_not_paid" });
  if (!order.customer_email) return json({ ok: true, skipped: "customer_email_missing" });

  if (!resendApiKey || !emailFrom) {
    return json({ ok: true, skipped: "email_provider_not_configured" });
  }

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("product_name,quantity,total_amount_cents")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (itemsError || !items?.length) return json({ error: "order_items_missing" }, 409);

  const displayNumber = `KD-${String(order.order_number).padStart(6, "0")}`;
  const address = order.shipping_address && typeof order.shipping_address === "object" ? order.shipping_address as Record<string, unknown> : {};
  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #ececec;color:#1d1d1f;font-size:14px">${esc(item.quantity)}× ${esc(item.product_name)}</td>
      <td style="padding:14px 0;border-bottom:1px solid #ececec;color:#1d1d1f;font-size:14px;text-align:right;font-weight:600">${esc(money(Number(item.total_amount_cents), order.currency))}</td>
    </tr>`).join("");

  const shippingBlock = Number(order.shipping_cents) > 0 || order.shipping_service ? `
    <div style="margin-top:24px;padding:20px;border-radius:18px;background:#f5f5f7">
      <div style="font-size:12px;color:#86868b;margin-bottom:7px">Entrega</div>
      <div style="font-size:14px;font-weight:600;color:#1d1d1f">${esc(order.shipping_service || "Entrega Koda")}</div>
      ${order.shipping_deadline_days != null ? `<div style="margin-top:5px;font-size:12px;color:#6e6e73">Prazo estimado: até ${esc(order.shipping_deadline_days)} dias úteis após a postagem.</div>` : ""}
      ${address.street ? `<div style="margin-top:10px;font-size:12px;line-height:1.55;color:#6e6e73">${esc(address.street)}, ${esc(address.number)}${address.complement ? ` · ${esc(address.complement)}` : ""}<br>${esc(address.neighborhood)} · ${esc(address.city)} - ${esc(address.state)} · CEP ${esc(address.postal_code)}</div>` : ""}
    </div>` : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f">
  <div style="max-width:640px;margin:0 auto;padding:42px 18px">
    <div style="padding:0 6px 24px;font-size:25px;font-weight:750;letter-spacing:-1px">Koda</div>
    <div style="background:#fff;border-radius:28px;padding:34px 30px">
      <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#eaf8ee;color:#248a3d;font-size:12px;font-weight:700">Pagamento confirmado</div>
      <h1 style="margin:20px 0 8px;font-size:34px;line-height:1.08;letter-spacing:-1.4px">Seu pedido está confirmado.</h1>
      <p style="margin:0;color:#6e6e73;font-size:15px;line-height:1.6">${order.customer_name ? `${esc(order.customer_name)}, recebemos seu pagamento.` : "Recebemos seu pagamento."} A partir de agora você pode acompanhar cada etapa pela Conta Koda.</p>
      <div style="margin-top:26px;padding:18px 20px;border-radius:18px;background:#f5f5f7">
        <div style="font-size:12px;color:#86868b">Pedido</div>
        <div style="margin-top:3px;font-size:20px;font-weight:700">${displayNumber}</div>
      </div>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:22px">${itemRows}
        <tr><td style="padding-top:14px;color:#6e6e73;font-size:13px">Subtotal</td><td style="padding-top:14px;text-align:right;font-size:13px">${esc(money(Number(order.subtotal_cents), order.currency))}</td></tr>
        <tr><td style="padding-top:8px;color:#6e6e73;font-size:13px">Entrega</td><td style="padding-top:8px;text-align:right;font-size:13px">${Number(order.shipping_cents) === 0 ? "Grátis" : esc(money(Number(order.shipping_cents), order.currency))}</td></tr>
        ${Number(order.discount_cents) > 0 ? `<tr><td style="padding-top:8px;color:#6e6e73;font-size:13px">Desconto</td><td style="padding-top:8px;text-align:right;font-size:13px">− ${esc(money(Number(order.discount_cents), order.currency))}</td></tr>` : ""}
        <tr><td style="padding-top:15px;font-size:16px;font-weight:700">Total</td><td style="padding-top:15px;text-align:right;font-size:19px;font-weight:750">${esc(money(Number(order.total_cents), order.currency))}</td></tr>
      </table>
      ${shippingBlock}
      <div style="margin-top:28px"><a href="${siteUrl}/conta/pedidos/${order.id}" style="display:inline-block;background:#0071e3;color:white;text-decoration:none;padding:13px 20px;border-radius:999px;font-size:14px;font-weight:700">Acompanhar pedido</a></div>
      <p style="margin:28px 0 0;color:#86868b;font-size:11px;line-height:1.6">Este e-mail confirma o pedido e o pagamento. A documentação fiscal, quando aplicável e autorizada, é enviada separadamente.</p>
    </div>
    <div style="padding:20px 6px;color:#86868b;font-size:11px;line-height:1.5">Koda · tecnologia feita para simplificar.</div>
  </div>
</body></html>`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Koda/1.0",
      "Idempotency-Key": `koda-order-confirmed-${order.id}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [order.customer_email],
      subject: `${displayNumber} confirmado — Koda`,
      html,
    }),
  });
  const emailBody = await emailResponse.json().catch(() => ({}));
  if (!emailResponse.ok) {
    await admin.from("order_events").insert({
      order_id: order.id,
      event_type: "confirmation_email_attention",
      status: "paid",
      title: "Confirmação por e-mail pendente",
      body: "O pedido está confirmado, mas o envio do e-mail de confirmação precisa ser repetido.",
      metadata: { provider: "resend", status: emailResponse.status },
    });
    return json({ error: "email_send_failed", provider_status: emailResponse.status }, 502);
  }

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "confirmation_email_sent",
    status: "paid",
    title: "Confirmação enviada por e-mail",
    body: `Enviamos a confirmação do pedido para ${order.customer_email}.`,
    metadata: { provider: "resend", provider_email_id: typeof emailBody?.id === "string" ? emailBody.id : null },
  });

  return json({ ok: true });
});
