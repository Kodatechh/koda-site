import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function cleanText(value: unknown, max = 120) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function normalizeAddress(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const address = {
    recipient: cleanText(input.recipient, 120),
    postal_code: cleanText(input.postalCode, 16).replace(/\D/g, ""),
    street: cleanText(input.street, 160),
    number: cleanText(input.number, 30),
    complement: cleanText(input.complement, 100) || null,
    neighborhood: cleanText(input.neighborhood, 100),
    city: cleanText(input.city, 100),
    state: cleanText(input.state, 2).toUpperCase(),
    phone: cleanText(input.phone, 24).replace(/\D/g, "") || null,
    country: "BR",
  };
  if (!address.recipient || address.postal_code.length !== 8 || !address.street || !address.number || !address.neighborhood || !address.city || !/^[A-Z]{2}$/.test(address.state)) return null;
  if (address.phone && (address.phone.length < 10 || address.phone.length > 11)) return null;
  return address;
}
function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function verifyQuote(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}
function displayOrder(order: any) { return { ...order, display_number: `KD-${String(order.order_number).padStart(6, "0")}` }; }
const orderSelect = "id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,shipping_provider,shipping_service,shipping_deadline_days,created_at";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { productSlug?: string; quantity?: number; shippingAddress?: unknown; shippingQuoteToken?: string; checkoutReference?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const productSlug = cleanText(input.productSlug, 120);
  const quantity = Number.isInteger(input.quantity) ? Number(input.quantity) : 1;
  const checkoutReference = cleanText(input.checkoutReference, 100);
  const shippingQuoteToken = cleanText(input.shippingQuoteToken, 6000);
  if (!productSlug || quantity < 1 || quantity > 20) return json({ error: "invalid_order" }, 400);
  if (checkoutReference && !/^[A-Za-z0-9_-]{16,100}$/.test(checkoutReference)) return json({ error: "invalid_checkout_reference" }, 400);

  if (checkoutReference) {
    const { data: existing, error } = await admin.from("orders").select(orderSelect).eq("user_id", user.id).eq("checkout_reference", checkoutReference).maybeSingle();
    if (error) return json({ error: "order_lookup_failed" }, 500);
    if (existing) return json({ order: displayOrder(existing), idempotent_replay: true });
  }

  const { data: product, error: productError } = await admin.from("commerce_products")
    .select("id,slug,name,active,currency,unit_amount_cents,track_stock,stock_quantity,requires_shipping")
    .eq("slug", productSlug).maybeSingle();
  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) return json({ error: "product_unavailable" }, 409);
  if (product.track_stock && (product.stock_quantity ?? 0) < quantity) return json({ error: "insufficient_stock" }, 409);

  let shippingAddress: ReturnType<typeof normalizeAddress> = null;
  let shippingCents = 0;
  let shippingProvider: string | null = null;
  let shippingService: string | null = null;
  let shippingDeadlineDays: number | null = null;
  let shippingQuoteId: string | null = null;
  let shippingQuotedAt: string | null = null;

  if (product.requires_shipping) {
    shippingAddress = normalizeAddress(input.shippingAddress);
    if (!shippingAddress) return json({ error: "invalid_shipping_address" }, 400);
    if (!shippingQuoteToken) return json({ error: "shipping_quote_required" }, 400);
    const quote = await verifyQuote(shippingQuoteToken, Deno.env.get("KODA_SHIPPING_SIGNING_SECRET")?.trim() || serviceRoleKey);
    if (!quote) return json({ error: "invalid_shipping_quote" }, 400);

    const now = Date.now();
    const price = Number(quote.price_cents);
    const deadline = Number(quote.deadline_days);
    const issuedAt = Number(quote.issued_at);
    const expiresAt = Number(quote.expires_at);
    const provider = cleanText(quote.provider, 60);
    const serviceId = cleanText(quote.service_id, 80);
    const serviceName = cleanText(quote.service_name, 120);
    const carrier = cleanText(quote.carrier, 120);
    const quoteId = cleanText(quote.quote_id, 100);
    if (
      Number(quote.v) !== 1 || cleanText(quote.product_slug, 120) !== product.slug || Number(quote.quantity) !== quantity ||
      cleanText(quote.postal_code, 16).replace(/\D/g, "") !== shippingAddress.postal_code || provider !== "melhor_envio" ||
      !serviceId || !serviceName || !carrier || !quoteId || !Number.isInteger(price) || price < 0 || price > 1_000_000 ||
      !Number.isInteger(deadline) || deadline < 0 || deadline > 120 || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      issuedAt > now + 60_000 || expiresAt <= now || expiresAt - issuedAt > 30 * 60 * 1000
    ) return json({ error: "invalid_shipping_quote" }, 400);

    shippingCents = price;
    shippingProvider = provider;
    shippingService = `${carrier} · ${serviceName}`.slice(0, 240);
    shippingDeadlineDays = deadline;
    shippingQuoteId = quoteId;
    shippingQuotedAt = new Date(issuedAt).toISOString();
  }

  const subtotalCents = product.unit_amount_cents * quantity;
  const totalCents = subtotalCents + shippingCents;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();

  const { data: order, error: orderError } = await admin.from("orders").insert({
    user_id: user.id, status: "draft", currency: product.currency, subtotal_cents: subtotalCents, shipping_cents: shippingCents,
    discount_cents: 0, total_cents: totalCents, customer_name: profile?.full_name ?? shippingAddress?.recipient ?? null,
    customer_email: user.email ?? null, shipping_address: shippingAddress, checkout_reference: checkoutReference || null,
    shipping_provider: shippingProvider, shipping_service: shippingService, shipping_deadline_days: shippingDeadlineDays,
    shipping_quote_id: shippingQuoteId, shipping_quoted_at: shippingQuotedAt,
  }).select(orderSelect).single();

  if (orderError || !order) {
    if (checkoutReference && orderError?.code === "23505") {
      const { data: raced } = await admin.from("orders").select(orderSelect).eq("user_id", user.id).eq("checkout_reference", checkoutReference).maybeSingle();
      if (raced) return json({ order: displayOrder(raced), idempotent_replay: true });
    }
    return json({ error: "order_create_failed" }, 500);
  }

  const { error: itemError } = await admin.from("order_items").insert({
    order_id: order.id, product_id: product.id, product_slug: product.slug, product_name: product.name,
    unit_amount_cents: product.unit_amount_cents, quantity, total_amount_cents: subtotalCents,
  });
  if (itemError) { await admin.from("orders").delete().eq("id", order.id); return json({ error: "order_item_create_failed" }, 500); }

  await admin.from("order_events").insert({
    order_id: order.id, event_type: "order_created", status: "draft", title: "Pedido recebido",
    body: product.requires_shipping ? `Pedido criado com ${shippingService ?? "frete selecionado"}; pronto para pagamento.` : "Seu pedido foi criado e está pronto para a etapa de pagamento.",
    actor_user_id: user.id,
    metadata: product.requires_shipping ? { shipping_provider: shippingProvider, shipping_service: shippingService, shipping_cents: shippingCents, shipping_deadline_days: shippingDeadlineDays, shipping_quote_id: shippingQuoteId } : {},
  });

  return json({ order: displayOrder(order) }, 201);
});
