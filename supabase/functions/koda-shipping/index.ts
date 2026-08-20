import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signQuote(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = base64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)));
  return `${encodedPayload}.${base64Url(signature)}`;
}

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toCentimeters(mm: number) {
  return Math.max(1, Math.ceil(mm / 10));
}

function providerMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const message = typeof row.error === "string" ? row.error : typeof row.message === "string" ? row.message : null;
  return message?.slice(0, 240) ?? null;
}

async function makeOption(input: {
  secret: string;
  productSlug: string;
  quantity: number;
  postalCode: string;
  shippingMode: "carrier" | "free" | "flat";
  provider: string;
  serviceId: string;
  name: string;
  company: string;
  priceCents: number;
  deadlineDays: number | null;
}) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 15 * 60 * 1000;
  const quoteId = crypto.randomUUID();
  const payload = {
    v: 2,
    quote_id: quoteId,
    product_slug: input.productSlug,
    quantity: input.quantity,
    postal_code: input.postalCode,
    shipping_mode: input.shippingMode,
    provider: input.provider,
    service_id: input.serviceId,
    service_name: input.name.slice(0, 120),
    carrier: input.company.slice(0, 120),
    price_cents: input.priceCents,
    deadline_days: input.deadlineDays,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  return {
    id: quoteId,
    service_id: input.serviceId,
    name: input.name,
    service_name: input.name,
    company: input.company,
    carrier: input.company,
    price_cents: input.priceCents,
    deadline_days: input.deadlineDays,
    quote_token: await signQuote(payload, input.secret),
    expires_at: new Date(expiresAt).toISOString(),
  };
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
  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);

  let input: { postalCode?: string; productSlug?: string; quantity?: number };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const postalCode = String(input.postalCode ?? "").replace(/\D/g, "");
  const productSlug = typeof input.productSlug === "string" ? input.productSlug.trim() : "";
  const quantity = Number.isInteger(input.quantity) ? Number(input.quantity) : 1;
  if (postalCode.length !== 8) return json({ error: "invalid_postal_code" }, 400);
  if (!productSlug || quantity < 1 || quantity > 20) return json({ error: "invalid_product" }, 400);

  const { data: product, error: productError } = await admin
    .from("commerce_products")
    .select("slug,active,unit_amount_cents,requires_shipping,shipping_mode,flat_shipping_cents,weight_grams,length_mm,width_mm,height_mm")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) return json({ error: "product_unavailable" }, 409);
  if (!product.requires_shipping) return json({ provider: "none", configured: true, requires_shipping: false, options: [] });

  const shippingMode = product.shipping_mode === "free" || product.shipping_mode === "flat" ? product.shipping_mode : "carrier";
  const signingSecret = Deno.env.get("KODA_SHIPPING_SIGNING_SECRET")?.trim() || serviceRoleKey;

  if (shippingMode === "free") {
    const option = await makeOption({
      secret: signingSecret,
      productSlug: product.slug,
      quantity,
      postalCode,
      shippingMode,
      provider: "koda",
      serviceId: "free",
      name: "Entrega grátis",
      company: "Koda",
      priceCents: 0,
      deadlineDays: null,
    });
    return json({ provider: "koda", configured: true, requires_shipping: true, postal_code: postalCode, options: [option] });
  }

  if (shippingMode === "flat") {
    if (!Number.isInteger(product.flat_shipping_cents) || Number(product.flat_shipping_cents) < 0) {
      return json({ error: "flat_shipping_not_configured", configured: false, options: [] }, 503);
    }
    const option = await makeOption({
      secret: signingSecret,
      productSlug: product.slug,
      quantity,
      postalCode,
      shippingMode,
      provider: "koda",
      serviceId: "flat",
      name: "Entrega Koda",
      company: "Koda",
      priceCents: Number(product.flat_shipping_cents),
      deadlineDays: null,
    });
    return json({ provider: "koda", configured: true, requires_shipping: true, postal_code: postalCode, options: [option] });
  }

  const weightGrams = positiveInteger(product.weight_grams);
  const lengthMm = positiveInteger(product.length_mm);
  const widthMm = positiveInteger(product.width_mm);
  const heightMm = positiveInteger(product.height_mm);
  if (!weightGrams || !lengthMm || !widthMm || !heightMm) {
    return json({ error: "shipping_dimensions_missing", configured: false, options: [] }, 503);
  }

  const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_TOKEN")?.trim();
  const originPostalCode = Deno.env.get("KODA_ORIGIN_POSTAL_CODE")?.replace(/\D/g, "") ?? "";
  const userAgent = Deno.env.get("MELHOR_ENVIO_USER_AGENT")?.trim();
  if (originPostalCode.length !== 8) return json({ error: "shipping_origin_not_configured", configured: false, options: [] }, 503);
  if (!melhorEnvioToken || !userAgent) return json({ error: "shipping_provider_not_configured", configured: false, options: [] }, 503);

  const environment = Deno.env.get("MELHOR_ENVIO_ENV")?.trim().toLowerCase() === "production" ? "production" : "sandbox";
  const baseUrl = environment === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";

  const providerResponse = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${melhorEnvioToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: originPostalCode },
      to: { postal_code: postalCode },
      products: [{
        id: product.slug,
        width: toCentimeters(widthMm),
        height: toCentimeters(heightMm),
        length: toCentimeters(lengthMm),
        weight: Number((weightGrams / 1000).toFixed(3)),
        insurance_value: Number((Number(product.unit_amount_cents) / 100).toFixed(2)),
        quantity,
      }],
      options: { receipt: false, own_hand: false, collect: false },
    }),
  });

  const providerBody = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    return json({
      error: "shipping_provider_error",
      configured: true,
      options: [],
      provider_status: providerResponse.status,
      provider_message: providerMessage(providerBody),
    }, 502);
  }

  const rows = Array.isArray(providerBody) ? providerBody : [];
  const options = (await Promise.all(rows.map(async (raw: any) => {
    if (!raw || raw.error) return null;
    const serviceId = String(raw.id ?? "").trim();
    const name = String(raw.name ?? "").trim();
    const company = String(raw.company?.name ?? "").trim() || "Transportadora";
    const price = Number(raw.custom_price ?? raw.price);
    const deadlineValue = Number(raw.custom_delivery_time ?? raw.delivery_time);
    if (!serviceId || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(deadlineValue) || deadlineValue < 0) return null;
    return await makeOption({
      secret: signingSecret,
      productSlug: product.slug,
      quantity,
      postalCode,
      shippingMode: "carrier",
      provider: "melhor_envio",
      serviceId,
      name,
      company,
      priceCents: Math.round(price * 100),
      deadlineDays: Math.ceil(deadlineValue),
    });
  })))
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .sort((a, b) => a.price_cents - b.price_cents || (a.deadline_days ?? 999) - (b.deadline_days ?? 999));

  if (!options.length) return json({ error: "shipping_no_options", configured: true, options: [] }, 502);

  return json({
    provider: "melhor_envio",
    environment,
    configured: true,
    requires_shipping: true,
    postal_code: postalCode,
    options,
  });
});
