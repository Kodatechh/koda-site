import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const RETRY_DELAY_MS = 12_000;
const MAX_ATTEMPTS = 12;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

function cents(value: unknown) {
  return Number(value ?? 0) / 100;
}

function digits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function firstText(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function providerState(payload: Record<string, any>) {
  const raw = String(payload.status ?? payload.status_sefaz ?? payload.status_prefeitura ?? "").toLowerCase();
  if (raw.includes("autoriz")) return "authorized" as const;
  if (raw.includes("cancel")) return "cancelled" as const;
  if (raw.includes("erro") || raw.includes("rejeit") || raw.includes("falh")) return "failed" as const;
  if (raw.includes("process") || raw.includes("pend") || raw.includes("fila")) return "processing" as const;
  return "unknown" as const;
}

function basicAuth(token: string) {
  return `Basic ${btoa(`${token}:`)}`;
}

async function responseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 4000) }; }
}

async function addOrderEvent(admin: any, orderId: string, eventType: string, title: string, body: string, metadata: Record<string, unknown> = {}) {
  const { data: existing } = await admin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", eventType)
    .maybeSingle();
  if (existing) return;
  await admin.from("order_events").insert({ order_id: orderId, event_type: eventType, status: "paid", title, body, metadata });
}

function scheduleRetry(supabaseUrl: string, serviceRoleKey: string, orderId: string) {
  EdgeRuntime.waitUntil((async () => {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    await fetch(`${supabaseUrl}/functions/v1/koda-fiscal-process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    }).catch(() => null);
  })());
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const focusToken = Deno.env.get("FOCUS_NFE_TOKEN")?.trim() ?? "";
  const focusEnv = Deno.env.get("FOCUS_NFE_ENV")?.trim().toLowerCase() === "production" ? "production" : "homologacao";
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  if (authorization !== `Bearer ${serviceRoleKey}`) return json({ error: "unauthorized" }, 401);

  let input: { orderId?: string } = {};
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "invalid_order_id" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: fiscal } = await admin.from("fiscal_documents").select("*").eq("order_id", orderId).maybeSingle();
  if (!fiscal) return json({ ok: true, skipped: "fiscal_document_not_required" });
  if (["email_scheduled", "cancelled"].includes(fiscal.status)) return json({ ok: true, status: fiscal.status, idempotent: true });

  if (!focusToken) {
    await admin.from("fiscal_documents").update({
      status: "waiting_configuration",
      last_error: "focus_token_missing",
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    return json({ ok: false, error: "fiscal_provider_not_configured", environment: focusEnv }, 503);
  }

  if (!["nfe", "nfce"].includes(fiscal.document_type)) {
    await admin.from("fiscal_documents").update({
      status: "waiting_configuration",
      last_error: "nfse_requires_accountant_approved_mapping",
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    return json({ ok: false, error: "fiscal_document_mapping_required" }, 409);
  }

  const { data: order } = await admin
    .from("orders")
    .select("id,order_number,user_id,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,customer_name,customer_email,customer_tax_id,shipping_address,paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.paid_at || !["paid", "processing", "shipped", "delivered"].includes(order.status)) {
    return json({ ok: true, skipped: "order_not_paid" });
  }

  const { data: items } = await admin
    .from("order_items")
    .select("id,product_id,product_slug,product_name,unit_amount_cents,quantity,total_amount_cents")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (!items?.length) return json({ error: "order_items_missing" }, 409);

  const productIds = [...new Set(items.map((item: any) => item.product_id).filter(Boolean))];
  const { data: products } = await admin
    .from("commerce_products")
    .select("id,sku,fiscal_document_type,fiscal_config")
    .in("id", productIds);
  const productsById = new Map((products ?? []).map((product: any) => [product.id, product]));
  const firstProduct = productsById.get(items[0].product_id);
  const firstConfig = asObject(firstProduct?.fiscal_config);
  const documentTemplate = asObject(firstConfig?.focus_document);

  if (!firstConfig || !documentTemplate) {
    await admin.from("fiscal_documents").update({
      status: "waiting_configuration",
      last_error: "accountant_approved_focus_document_missing",
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    return json({ ok: false, error: "fiscal_product_configuration_required" }, 409);
  }

  const taxId = digits(order.customer_tax_id);
  const taxIdRequired = firstConfig.require_customer_tax_id !== false;
  if (taxIdRequired && taxId.length !== 11 && taxId.length !== 14) {
    await admin.from("fiscal_documents").update({
      status: "waiting_configuration",
      last_error: "customer_tax_id_required",
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    return json({ ok: false, error: "customer_tax_id_required" }, 409);
  }

  const providerItems: Record<string, any>[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const product = productsById.get(item.product_id);
    const config = asObject(product?.fiscal_config);
    const itemTemplate = asObject(config?.focus_item);
    if (!product || product.fiscal_document_type !== fiscal.document_type || !itemTemplate) {
      await admin.from("fiscal_documents").update({
        status: "waiting_configuration",
        last_error: `accountant_approved_focus_item_missing:${item.product_slug}`,
        updated_at: new Date().toISOString(),
      }).eq("id", fiscal.id);
      return json({ ok: false, error: "fiscal_product_configuration_required", product: item.product_slug }, 409);
    }

    const quantity = Number(item.quantity);
    const unit = cents(item.unit_amount_cents);
    const total = cents(item.total_amount_cents);
    const providerItem: Record<string, any> = {
      ...itemTemplate,
      numero_item: index + 1,
      codigo_produto: String(product.sku || item.product_slug).slice(0, 60),
      descricao: String(item.product_name).slice(0, 120),
      quantidade_comercial: quantity,
      valor_unitario_comercial: unit,
      valor_bruto: total,
    };
    if (Object.hasOwn(providerItem, "quantidade_tributavel")) providerItem.quantidade_tributavel = quantity;
    if (Object.hasOwn(providerItem, "valor_unitario_tributavel")) providerItem.valor_unitario_tributavel = unit;
    providerItems.push(providerItem);
  }

  const address = asObject(order.shipping_address) ?? {};
  const providerPayload: Record<string, any> = {
    ...documentTemplate,
    data_emissao: order.paid_at,
    tipo_documento: 1,
    consumidor_final: 1,
    presenca_comprador: 2,
    nome_destinatario: order.customer_name,
    email_destinatario: order.customer_email,
    valor_produtos: cents(order.subtotal_cents),
    valor_frete: cents(order.shipping_cents),
    valor_desconto: cents(order.discount_cents),
    valor_total: cents(order.total_cents),
    items: providerItems,
  };

  if (taxId.length === 11) providerPayload.cpf_destinatario = taxId;
  if (taxId.length === 14) providerPayload.cnpj_destinatario = taxId;
  if (address.street) providerPayload.logradouro_destinatario = address.street;
  if (address.number) providerPayload.numero_destinatario = address.number;
  if (address.complement) providerPayload.complemento_destinatario = address.complement;
  if (address.neighborhood) providerPayload.bairro_destinatario = address.neighborhood;
  if (address.city) providerPayload.municipio_destinatario = address.city;
  if (address.state) providerPayload.uf_destinatario = address.state;
  if (address.postal_code) providerPayload.cep_destinatario = digits(address.postal_code);
  if (address.phone) providerPayload.telefone_destinatario = digits(address.phone);

  const baseUrl = focusEnv === "production" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
  const endpoint = fiscal.document_type;
  const auth = basicAuth(focusToken);
  const attempts = Number(fiscal.attempts ?? 0) + 1;
  const now = new Date().toISOString();

  await admin.from("fiscal_documents").update({ attempts, status: "processing", last_error: null, updated_at: now }).eq("id", fiscal.id);

  let providerPayloadResult: Record<string, any> = {};
  if (fiscal.status === "queued" || fiscal.status === "waiting_configuration" || !fiscal.provider_status) {
    const issueResponse = await fetch(`${baseUrl}/v2/${endpoint}?ref=${encodeURIComponent(fiscal.reference)}`, {
      method: "POST",
      headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(providerPayload),
    });
    providerPayloadResult = asObject(await responseJson(issueResponse)) ?? {};
    if (![200, 201, 202, 422].includes(issueResponse.status)) {
      await admin.from("fiscal_documents").update({
        status: "failed",
        provider_status: String(providerPayloadResult.status ?? `http_${issueResponse.status}`),
        last_error: "focus_issue_request_failed",
        provider_response: providerPayloadResult,
        updated_at: new Date().toISOString(),
      }).eq("id", fiscal.id);
      await addOrderEvent(admin, orderId, "fiscal_attention", "Nota fiscal em revisão", "O pedido está confirmado, mas a emissão fiscal precisa de uma verificação interna.");
      return json({ ok: false, error: "fiscal_issue_failed" }, 502);
    }
  }

  const consultResponse = await fetch(`${baseUrl}/v2/${endpoint}/${encodeURIComponent(fiscal.reference)}`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const consultPayload = asObject(await responseJson(consultResponse)) ?? providerPayloadResult;
  const state = providerState(consultPayload);
  const providerStatus = String(consultPayload.status ?? consultPayload.status_sefaz ?? "");

  if (state === "authorized") {
    const pdfUrl = firstText(consultPayload, ["caminho_danfe", "url_danfe", "caminho_pdf", "url_pdf"]);
    const xmlUrl = firstText(consultPayload, ["caminho_xml_nota_fiscal", "caminho_xml", "url_xml"]);
    const accessKey = firstText(consultPayload, ["chave_nfe", "chave_nfce", "chave"]);
    const documentNumber = firstText(consultPayload, ["numero", "numero_nfe", "numero_nfce"]);
    const series = firstText(consultPayload, ["serie"]);
    const authorizedAt = firstText(consultPayload, ["data_autorizacao", "data_emissao"]);

    await admin.from("fiscal_documents").update({
      status: "authorized",
      provider_status: providerStatus || "autorizado",
      document_number: documentNumber,
      series,
      access_key: accessKey,
      pdf_url: pdfUrl,
      xml_url: xmlUrl,
      authorized_at: authorizedAt ?? new Date().toISOString(),
      provider_response: consultPayload,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    await addOrderEvent(admin, orderId, "fiscal_authorized", "Nota fiscal emitida", "A nota fiscal do seu pedido foi autorizada e está sendo enviada por e-mail.");

    if (order.customer_email) {
      const emailResponse = await fetch(`${baseUrl}/v2/${endpoint}/${encodeURIComponent(fiscal.reference)}/email`, {
        method: "POST",
        headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [order.customer_email] }),
      });
      const emailPayload = asObject(await responseJson(emailResponse)) ?? {};
      if (emailResponse.ok) {
        await admin.from("fiscal_documents").update({
          status: "email_scheduled",
          recipient_email: order.customer_email,
          email_sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", fiscal.id);
        await addOrderEvent(admin, orderId, "invoice_email_scheduled", "Nota fiscal enviada", `A nota fiscal foi enviada para ${order.customer_email}.`);
        if (order.user_id) {
          await admin.from("user_notifications").insert({
            user_id: order.user_id,
            type: "fiscal_document",
            title: "Nota fiscal enviada",
            body: "A nota fiscal da sua compra foi autorizada e enviada para o seu e-mail.",
            href: `/conta/pedidos/${order.id}`,
            metadata: { order_id: order.id, fiscal_document_id: fiscal.id },
          });
        }
        return json({ ok: true, status: "email_scheduled", environment: focusEnv });
      }

      await admin.from("fiscal_documents").update({
        status: "authorized",
        last_error: `focus_email_failed:${emailResponse.status}`,
        updated_at: new Date().toISOString(),
      }).eq("id", fiscal.id);
      return json({ ok: true, status: "authorized", email_scheduled: false, provider_email: emailPayload }, 207);
    }

    return json({ ok: true, status: "authorized", email_scheduled: false });
  }

  if (state === "cancelled") {
    await admin.from("fiscal_documents").update({ status: "cancelled", provider_status: providerStatus, provider_response: consultPayload, updated_at: new Date().toISOString() }).eq("id", fiscal.id);
    return json({ ok: true, status: "cancelled" });
  }

  if (state === "failed") {
    await admin.from("fiscal_documents").update({
      status: "failed",
      provider_status: providerStatus,
      provider_response: consultPayload,
      last_error: "fiscal_authorization_rejected",
      updated_at: new Date().toISOString(),
    }).eq("id", fiscal.id);
    await addOrderEvent(admin, orderId, "fiscal_attention", "Nota fiscal em revisão", "O pedido está confirmado, mas a emissão fiscal precisa de uma verificação interna.");
    return json({ ok: false, status: "failed" }, 422);
  }

  await admin.from("fiscal_documents").update({
    status: "processing",
    provider_status: providerStatus || "processing",
    provider_response: consultPayload,
    last_error: attempts >= MAX_ATTEMPTS ? "provider_authorization_timeout" : null,
    updated_at: new Date().toISOString(),
  }).eq("id", fiscal.id);

  if (attempts < MAX_ATTEMPTS) scheduleRetry(supabaseUrl, serviceRoleKey, orderId);
  else await addOrderEvent(admin, orderId, "fiscal_attention", "Nota fiscal em processamento", "A compra está confirmada. A emissão fiscal está demorando mais que o normal e será acompanhada pela Koda.");

  return json({ ok: true, status: "processing", retry_scheduled: attempts < MAX_ATTEMPTS, environment: focusEnv }, 202);
});
