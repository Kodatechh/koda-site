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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  let input: { productSlug?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const productSlug = typeof input.productSlug === "string" ? input.productSlug.trim() : "";
  if (!productSlug) return json({ error: "invalid_product" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: product, error } = await admin
    .from("commerce_products")
    .select("slug,name,short_description,description,product_type,image_url,active,currency,unit_amount_cents,compare_at_cents,track_stock,stock_quantity,requires_shipping,requires_device,shipping_mode,flat_shipping_cents,weight_grams,length_mm,width_mm,height_mm,published_at")
    .eq("slug", productSlug)
    .maybeSingle();

  if (error) return json({ error: "catalog_error" }, 500);
  if (!product) return json({ error: "product_not_found" }, 404);

  const inStock = !product.track_stock || (product.stock_quantity ?? 0) > 0;
  const mercadoPagoConfigured = Boolean(Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")?.trim());
  const cardConfigured = mercadoPagoConfigured && Boolean(Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")?.trim());
  const readyMethods: Array<"pix" | "card"> = [];
  if (mercadoPagoConfigured) readyMethods.push("pix");
  if (cardConfigured) readyMethods.push("card");

  const originPostalCode = Deno.env.get("KODA_ORIGIN_POSTAL_CODE")?.replace(/\D/g, "") ?? "";
  const carrierConfigured = Boolean(
    Deno.env.get("MELHOR_ENVIO_TOKEN")?.trim() &&
    originPostalCode.length === 8 &&
    Deno.env.get("MELHOR_ENVIO_USER_AGENT")?.trim() &&
    product.weight_grams && product.length_mm && product.width_mm && product.height_mm
  );
  const shippingConfigured = !product.requires_shipping ||
    product.shipping_mode === "free" ||
    (product.shipping_mode === "flat" && Number.isInteger(product.flat_shipping_cents) && product.flat_shipping_cents >= 0) ||
    (product.shipping_mode === "carrier" && carrierConfigured);

  return json({
    product: {
      slug: product.slug,
      name: product.name,
      short_description: product.short_description,
      description: product.description,
      product_type: product.product_type,
      image_url: product.image_url,
      available: Boolean(product.active && product.unit_amount_cents != null && inStock),
      currency: product.currency,
      unit_amount_cents: product.unit_amount_cents,
      compare_at_cents: product.compare_at_cents,
      in_stock: inStock,
      requires_shipping: product.requires_shipping,
      requires_device: product.requires_device,
      shipping_mode: product.shipping_mode,
    },
    koda_pay: {
      provider: "mercado_pago",
      payment_ready: mercadoPagoConfigured,
      methods: ["pix", "card"],
      ready_methods: readyMethods,
      message: !mercadoPagoConfigured
        ? "A integração Mercado Pago está preparada; falta adicionar a credencial no servidor."
        : cardConfigured
          ? "Pix e cartão conectados ao Koda Pay."
          : "Pix conectado ao Koda Pay. Falta a Public Key para habilitar cartão.",
    },
    koda_shipping: {
      provider: product.requires_shipping && product.shipping_mode === "carrier" ? "melhor_envio" : "koda",
      required: product.requires_shipping,
      ready: shippingConfigured,
      mode: product.shipping_mode,
      message: !product.requires_shipping
        ? "Este produto não exige entrega física."
        : shippingConfigured
          ? "Cálculo de entrega disponível."
          : "A configuração de entrega deste produto ainda está incompleta.",
    },
  });
});
