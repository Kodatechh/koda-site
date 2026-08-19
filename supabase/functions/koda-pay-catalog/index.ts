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
    .select("slug,name,description,active,currency,unit_amount_cents,track_stock,stock_quantity,requires_shipping,weight_grams,length_mm,width_mm,height_mm")
    .eq("slug", productSlug)
    .maybeSingle();

  if (error) return json({ error: "catalog_error" }, 500);
  if (!product) return json({ error: "product_not_found" }, 404);

  const inStock = !product.track_stock || (product.stock_quantity ?? 0) > 0;
  const mercadoPagoConfigured = Boolean(Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN"));
  const cardConfigured = mercadoPagoConfigured && Boolean(Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")?.trim());
  const readyMethods: Array<"pix" | "card"> = [];
  if (mercadoPagoConfigured) readyMethods.push("pix");
  if (cardConfigured) readyMethods.push("card");

  const originPostalCode = Deno.env.get("KODA_ORIGIN_POSTAL_CODE")?.replace(/\D/g, "") ?? "";
  const dimensionsReady = Boolean(product.weight_grams && product.length_mm && product.width_mm && product.height_mm);
  const shippingConfigured = !product.requires_shipping || Boolean(
    Deno.env.get("MELHOR_ENVIO_TOKEN")?.trim() &&
    originPostalCode.length === 8 &&
    Deno.env.get("MELHOR_ENVIO_USER_AGENT")?.trim() &&
    dimensionsReady
  );

  return json({
    product: {
      slug: product.slug,
      name: product.name,
      description: product.description,
      available: product.active && product.unit_amount_cents != null && inStock,
      currency: product.currency,
      unit_amount_cents: product.unit_amount_cents,
      in_stock: inStock,
      requires_shipping: product.requires_shipping,
    },
    koda_pay: {
      provider: "mercado_pago",
      payment_ready: mercadoPagoConfigured,
      methods: ["pix", "card"],
      ready_methods: readyMethods,
      message: !mercadoPagoConfigured
        ? "A integração Mercado Pago está preparada; falta adicionar a credencial de teste no servidor."
        : cardConfigured
          ? "Pix e cartão conectados ao Koda Pay."
          : "Pix conectado ao Koda Pay. Falta a Public Key para habilitar cartão.",
    },
    koda_shipping: {
      provider: product.requires_shipping ? "melhor_envio" : "none",
      required: product.requires_shipping,
      ready: shippingConfigured,
      message: !product.requires_shipping
        ? "Este produto não exige entrega física."
        : shippingConfigured
          ? "Cálculo de frete disponível."
          : "O provedor de frete ainda precisa das credenciais e dados de origem no servidor.",
    },
  });
});
