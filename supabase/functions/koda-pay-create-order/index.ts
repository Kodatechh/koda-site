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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { productSlug?: string; quantity?: number };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const productSlug = typeof input.productSlug === "string" ? input.productSlug.trim() : "";
  const quantity = Number.isInteger(input.quantity) ? Number(input.quantity) : 1;
  if (!productSlug || quantity < 1 || quantity > 20) return json({ error: "invalid_order" }, 400);

  const { data: product, error: productError } = await admin
    .from("commerce_products")
    .select("id,slug,name,active,currency,unit_amount_cents,track_stock,stock_quantity")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) {
    return json({ error: "product_unavailable" }, 409);
  }
  if (product.track_stock && (product.stock_quantity ?? 0) < quantity) {
    return json({ error: "insufficient_stock" }, 409);
  }

  const subtotalCents = product.unit_amount_cents * quantity;
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      status: "draft",
      currency: product.currency,
      subtotal_cents: subtotalCents,
      shipping_cents: 0,
      discount_cents: 0,
      total_cents: subtotalCents,
      customer_name: profile?.full_name ?? null,
      customer_email: user.email ?? null,
    })
    .select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at")
    .single();

  if (orderError || !order) return json({ error: "order_create_failed" }, 500);

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

  return json({
    order: {
      ...order,
      display_number: `KD-${String(order.order_number).padStart(6, "0")}`,
    },
  }, 201);
});
