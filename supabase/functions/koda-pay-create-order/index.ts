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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

type AddressInput = {
  recipient?: unknown;
  postalCode?: unknown;
  street?: unknown;
  number?: unknown;
  complement?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
  phone?: unknown;
};

function cleanText(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeAddress(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as AddressInput;
  const recipient = cleanText(input.recipient, 120);
  const postalCode = cleanText(input.postalCode, 16).replace(/\D/g, "");
  const street = cleanText(input.street, 160);
  const number = cleanText(input.number, 30);
  const complement = cleanText(input.complement, 100);
  const neighborhood = cleanText(input.neighborhood, 100);
  const city = cleanText(input.city, 100);
  const state = cleanText(input.state, 2).toUpperCase();
  const phone = cleanText(input.phone, 24).replace(/\D/g, "");

  if (!recipient || postalCode.length !== 8 || !street || !number || !neighborhood || !city || !/^[A-Z]{2}$/.test(state)) {
    return { error: "invalid_shipping_address" } as const;
  }
  if (phone && (phone.length < 10 || phone.length > 11)) return { error: "invalid_shipping_address" } as const;

  return {
    recipient,
    postal_code: postalCode,
    street,
    number,
    complement: complement || null,
    neighborhood,
    city,
    state,
    phone: phone || null,
    country: "BR",
  };
}

function displayOrder(order: Record<string, unknown> & { order_number: number }) {
  return { ...order, display_number: `KD-${String(order.order_number).padStart(6, "0")}` };
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
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { productSlug?: string; quantity?: number; shippingAddress?: unknown; checkoutReference?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const productSlug = typeof input.productSlug === "string" ? input.productSlug.trim() : "";
  const quantity = Number.isInteger(input.quantity) ? Number(input.quantity) : 1;
  const checkoutReference = typeof input.checkoutReference === "string" ? input.checkoutReference.trim() : "";
  if (!productSlug || quantity < 1 || quantity > 20) return json({ error: "invalid_order" }, 400);
  if (checkoutReference && !/^[A-Za-z0-9_-]{16,100}$/.test(checkoutReference)) return json({ error: "invalid_checkout_reference" }, 400);

  if (checkoutReference) {
    const { data: existing, error: existingError } = await admin.from("orders")
      .select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at")
      .eq("user_id", user.id).eq("checkout_reference", checkoutReference).maybeSingle();
    if (existingError) return json({ error: "order_lookup_failed" }, 500);
    if (existing) return json({ order: displayOrder(existing), idempotent_replay: true });
  }

  const { data: product, error: productError } = await admin.from("commerce_products")
    .select("id,slug,name,active,currency,unit_amount_cents,track_stock,stock_quantity")
    .eq("slug", productSlug).maybeSingle();
  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) return json({ error: "product_unavailable" }, 409);
  if (product.track_stock && (product.stock_quantity ?? 0) < quantity) return json({ error: "insufficient_stock" }, 409);

  let shippingAddress: Record<string, unknown> | null = null;
  if (input.shippingAddress != null) {
    const normalized = normalizeAddress(input.shippingAddress);
    if (!normalized || "error" in normalized) return json({ error: "invalid_shipping_address" }, 400);
    shippingAddress = normalized;
  }

  const subtotalCents = product.unit_amount_cents * quantity;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
  const { data: order, error: orderError } = await admin.from("orders").insert({
    user_id: user.id,
    status: "draft",
    currency: product.currency,
    subtotal_cents: subtotalCents,
    shipping_cents: 0,
    discount_cents: 0,
    total_cents: subtotalCents,
    customer_name: profile?.full_name ?? shippingAddress?.recipient ?? null,
    customer_email: user.email ?? null,
    shipping_address: shippingAddress,
    checkout_reference: checkoutReference || null,
  }).select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at").single();

  if (orderError || !order) {
    if (checkoutReference && orderError?.code === "23505") {
      const { data: raced } = await admin.from("orders")
        .select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at")
        .eq("user_id", user.id).eq("checkout_reference", checkoutReference).maybeSingle();
      if (raced) return json({ order: displayOrder(raced), idempotent_replay: true });
    }
    return json({ error: "order_create_failed" }, 500);
  }

  const { error: itemError } = await admin.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    unit_amount_cents: product.unit_amount_cents,
    quantity,
    total_amount_cents: subtotalCents,
  });
  if (itemError) {
    await admin.from("orders").delete().eq("id", order.id);
    return json({ error: "order_item_create_failed" }, 500);
  }

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "order_created",
    status: "draft",
    title: "Pedido recebido",
    body: "Seu pedido foi criado e está pronto para a etapa de pagamento.",
    actor_user_id: user.id,
  });

  return json({ order: displayOrder(order) }, 201);
});
