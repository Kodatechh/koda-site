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
    .select("slug,name,description,active,currency,unit_amount_cents,track_stock,stock_quantity")
    .eq("slug", productSlug)
    .maybeSingle();

  if (error) return json({ error: "catalog_error" }, 500);
  if (!product) return json({ error: "product_not_found" }, 404);

  const inStock = !product.track_stock || (product.stock_quantity ?? 0) > 0;
  return json({
    product: {
      slug: product.slug,
      name: product.name,
      description: product.description,
      available: product.active && product.unit_amount_cents != null && inStock,
      currency: product.currency,
      unit_amount_cents: product.unit_amount_cents,
      in_stock: inStock,
    },
    koda_pay: {
      payment_ready: false,
      methods: ["pix", "card"],
      message: "O núcleo do Koda Pay está ativo; o conector financeiro real ainda não foi configurado.",
    },
  });
});
