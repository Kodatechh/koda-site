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
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)),
  );
  return `${encodedPayload}.${base64Url(signature)}`;
}

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toCentimeters(mm: number) {
  return Math.max(1, Math.ceil(mm / 10));
}

function normalizeProviderError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const message = typeof item.error === "string"
    ? item.error
    : typeof item.message === "string"
      ? item.message
      : null;
  return message?.slice(0, 240) ?? null;
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
    .select("slug,name,active,currency,unit_amount_cents,requires_shipping,weight_grams,length_mm,width_mm,height_mm")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) {
    return json({ error: "product_unavailable" }, 409);
  }

  if (!product.requires_shipping) {
    return json({ provider: "none", options: [], requires_shipping: false });
  }

  const weightGrams = positiveInteger(product.weight_grams);
  const lengthMm = positiveInteger(product.length_mm);
  const widthMm = positiveInteger(product.width_mm);
  const heightMm = positiveInteger(product.height_mm);
  if (!weightGrams || !lengthMm || !widthMm || !heightMm) {
    return json({ error: "shipping_dimensions_not_configured" }, 503);
  }

  const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_TOKEN")?.trim();
  const originPostalCode = Deno.env.get("KODA_ORIGIN_POSTAL_CODE")?.replace(/\D/g, "") ?? "";
  const userAgent = Deno.env.get("MELHOR_ENVIO_USER_AGENT")?.trim();
  const environment = Deno.env.get("MELHOR_ENVIO_ENV")?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";

  if (!melhorEnvioToken || originPostalCode.length !== 8 || !userAgent) {
    return json({
      error: "shipping_provider_not_configured",
      missing: {
        token: !melhorEnvioToken,
        origin_postal_code: originPostalCode.length !== 8,
        user_agent: !userAgent,
      },
    }, 503);
  }

  const baseUrl = environment === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";

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
      products: [
        {
          id: product.slug,
          width: toCentimeters(widthMm),
          height: toCentimeters(heightMm),
          length: toCentimeters(lengthMm),
          weight: Number((weightGrams / 1000).toFixed(3)),
          insurance_value: Number((product.unit_amount_cents / 100).toFixed(2)),
          quantity,
        },
      ],
      options: { receipt: false, own_hand: false, collect: false },
    }),
  });

  const providerBody = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    return json({
      error: "shipping_provider_error",
      provider_status: providerResponse.status,
      provider_message: normalizeProviderError(providerBody),
    }, 502);
  }

  const rows = Array.isArray(providerBody) ? providerBody : [];
  const signingSecret = Deno.env.get("KODA_SHIPPING_SIGNING_SECRET")?.trim() || serviceRoleKey;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 15 * 60 * 1000;

  const normalized = await Promise.all(rows.map(async (raw: any) => {
    if (!raw || raw.error) return null;

    const serviceId = String(raw.id ?? "").trim();
    const serviceName = String(raw.name ?? "").trim();
    const carrier = String(raw.company?.name ?? "").trim() || "Transportadora";
    const price = Number(raw.custom_price ?? raw.price);
    const deadline = Number(raw.custom_delivery_time ?? raw.delivery_time);

    if (!serviceId || !serviceName || !Number.isFinite(price) || price < 0 || !Number.isFinite(deadline) || deadline < 0) {
      return null;
    }

    const priceCents = Math.round(price * 100);
    const deadlineDays = Math.max(0, Math.ceil(deadline));
    const quoteId = crypto.randomUUID();
    const quotePayload = {
      v: 1,
      quote_id: quoteId,
      provider: "melhor_envio",
      product_slug: product.slug,
      quantity,
      postal_code: postalCode,
      service_id: serviceId,
      service_name: serviceName.slice(0, 120),
      carrier: carrier.slice(0, 120),
      price_cents: priceCents,
      deadline_days: deadlineDays,
      issued_at: issuedAt,
      expires_at: expiresAt,
    };

    return {
      id: quoteId,
      provider: "melhor_envio",
      service_id: serviceId,
      service_name: serviceName,
      carrier,
      price_cents: priceCents,
      deadline_days: deadlineDays,
      quote_token: await signQuote(quotePayload, signingSecret),
      expires_at: new Date(expiresAt).toISOString(),
    };
  }));

  const options = normalized
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .sort((a, b) => a.price_cents - b.price_cents || a.deadline_days - b.deadline_days);

  if (!options.length) return json({ error: "shipping_no_options" }, 502);

  return json({
    provider: "melhor_envio",
    environment,
    requires_shipping: true,
    postal_code: postalCode,
    options,
  });
});
