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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const calc = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(value[i]) * (length + 1 - i);
    const digit = 11 - (sum % 11);
    return digit >= 10 ? 0 : digit;
  };
  return calc(9) === Number(value[9]) && calc(10) === Number(value[10]);
}

function validCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((total, current, index) => total + Number(current) * weights[index], 0);
    const result = 11 - (sum % 11);
    return result >= 10 ? 0 : result;
  };
  const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(value[12]) && second === Number(value[13]);
}

function validTaxId(value: string) {
  return value.length === 11 ? validCpf(value) : value.length === 14 ? validCnpj(value) : false;
}

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
  if (
    !address.recipient ||
    address.postal_code.length !== 8 ||
    !address.street ||
    !address.number ||
    !address.neighborhood ||
    !address.city ||
    !/^[A-Z]{2}$/.test(address.state)
  ) return null;
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
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(parts[1]),
      encoder.encode(parts[0]),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function displayOrder(order: any) {
  return { ...order, display_number: `KD-${String(order.order_number).padStart(6, "0")}` };
}

const orderSelect = "id,order_number,status,order_type,context_type,context_id,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,shipping_provider,shipping_service,shipping_deadline_days,fulfillment_status,created_at";

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

  const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: {
    productSlug?: string;
    quantity?: number;
    checkoutReference?: string;
    deviceId?: string;
    customerTaxId?: string;
    shippingAddress?: unknown;
    shippingQuoteToken?: string;
    shippingServiceId?: string;
  };

  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const productSlug = cleanText(input.productSlug, 120);
  const quantity = Number.isInteger(input.quantity) ? Number(input.quantity) : 1;
  const checkoutReference = cleanText(input.checkoutReference, 100);
  const deviceId = cleanText(input.deviceId, 80);
  const customerTaxId = digits(input.customerTaxId);
  const shippingQuoteToken = cleanText(input.shippingQuoteToken, 6000);

  if (!productSlug || quantity < 1 || quantity > 20) return json({ error: "invalid_order" }, 400);
  if (checkoutReference && !/^[A-Za-z0-9_-]{16,100}$/.test(checkoutReference)) {
    return json({ error: "invalid_checkout_reference" }, 400);
  }
  if (!customerTaxId || !validTaxId(customerTaxId)) return json({ error: "invalid_customer_tax_id" }, 400);

  if (checkoutReference) {
    const { data: existing, error: existingError } = await admin
      .from("orders")
      .select(orderSelect)
      .eq("user_id", user.id)
      .eq("checkout_reference", checkoutReference)
      .maybeSingle();
    if (existingError) return json({ error: "order_lookup_failed" }, 500);
    if (existing) return json({ order: displayOrder(existing), idempotent_replay: true });
  }

  const { data: product, error: productError } = await admin
    .from("commerce_products")
    .select("id,slug,name,active,currency,unit_amount_cents,track_stock,stock_quantity,product_type,requires_shipping,requires_device,shipping_mode,flat_shipping_cents")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) return json({ error: "catalog_error" }, 500);
  if (!product || !product.active || product.unit_amount_cents == null) return json({ error: "product_unavailable" }, 409);
  if (product.track_stock && (product.stock_quantity ?? 0) < quantity) return json({ error: "insufficient_stock" }, 409);
  if (product.requires_device && quantity !== 1) return json({ error: "invalid_order" }, 400);

  let validatedDeviceId: string | null = null;
  if (product.requires_device) {
    if (!deviceId) return json({ error: "device_required" }, 400);
    const { data: device, error: deviceError } = await admin
      .from("devices")
      .select("id,owner_user_id")
      .eq("id", deviceId)
      .maybeSingle();
    if (deviceError) return json({ error: "device_lookup_failed" }, 500);
    if (!device || device.owner_user_id !== user.id) return json({ error: "device_not_owned" }, 403);
    validatedDeviceId = device.id;

    if (product.product_type === "coverage") {
      const { data: rawStatus, error: statusError } = await admin.rpc("get_device_kodacare_status", { _device_id: device.id });
      if (statusError) return json({ error: "device_eligibility_failed" }, 500);
      const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
      if (!status?.eligible) return json({ error: "device_not_eligible_for_kodacare" }, 409);
    }
  }

  let shippingAddress: ReturnType<typeof normalizeAddress> = null;
  let shippingCents = 0;
  let shippingProvider: string | null = null;
  let shippingService: string | null = null;
  let shippingDeadlineDays: number | null = null;
  let shippingQuoteId: string | null = null;
  let shippingQuotedAt: string | null = null;

  if (product.requires_shipping) {
    shippingAddress = normalizeAddress(input.shippingAddress);
    if (!shippingAddress) return json({ error: "shipping_address_required" }, 400);
    if (!shippingQuoteToken) return json({ error: "shipping_service_invalid" }, 400);

    const quote = await verifyQuote(
      shippingQuoteToken,
      Deno.env.get("KODA_SHIPPING_SIGNING_SECRET")?.trim() || serviceRoleKey,
    );
    if (!quote) return json({ error: "shipping_service_invalid" }, 400);

    const quoteVersion = Number(quote.v);
    const now = Date.now();
    const price = Number(quote.price_cents);
    const issuedAt = Number(quote.issued_at);
    const expiresAt = Number(quote.expires_at);
    const quoteId = cleanText(quote.quote_id, 100);
    const provider = cleanText(quote.provider, 60);
    const serviceId = cleanText(quote.service_id, 80);
    const serviceName = cleanText(quote.service_name, 120);
    const carrier = cleanText(quote.carrier, 120);
    const quotedMode = quoteVersion === 1 ? "carrier" : cleanText(quote.shipping_mode, 20);
    const deadlineRaw = quote.deadline_days;
    const deadline = deadlineRaw == null ? null : Number(deadlineRaw);
    const expectedMode = product.shipping_mode === "free" || product.shipping_mode === "flat"
      ? product.shipping_mode
      : "carrier";

    const baseValid =
      (quoteVersion === 1 || quoteVersion === 2) &&
      cleanText(quote.product_slug, 120) === product.slug &&
      Number(quote.quantity) === quantity &&
      cleanText(quote.postal_code, 16).replace(/\D/g, "") === shippingAddress.postal_code &&
      quotedMode === expectedMode &&
      Boolean(quoteId && provider && serviceId && serviceName && carrier) &&
      Number.isInteger(price) &&
      price >= 0 &&
      price <= 1_000_000 &&
      Number.isFinite(issuedAt) &&
      Number.isFinite(expiresAt) &&
      issuedAt <= now + 60_000 &&
      expiresAt > now &&
      expiresAt - issuedAt <= 30 * 60 * 1000 &&
      (deadline == null || (Number.isInteger(deadline) && deadline >= 0 && deadline <= 120));

    if (!baseValid) return json({ error: "shipping_service_invalid" }, 400);
    if (expectedMode === "carrier" && provider !== "superfrete") return json({ error: "shipping_service_invalid" }, 400);
    if (expectedMode === "free" && price !== 0) return json({ error: "shipping_service_invalid" }, 400);
    if (expectedMode === "flat" && (!Number.isInteger(product.flat_shipping_cents) || price !== Number(product.flat_shipping_cents))) {
      return json({ error: "shipping_service_invalid" }, 400);
    }

    shippingCents = price;
    shippingProvider = provider;
    shippingService = `${carrier} · ${serviceName}`.slice(0, 240);
    shippingDeadlineDays = deadline;
    shippingQuoteId = quoteId;
    shippingQuotedAt = new Date(issuedAt).toISOString();
  }

  const subtotalCents = Number(product.unit_amount_cents) * quantity;
  const totalCents = subtotalCents + shippingCents;
  const orderType = product.product_type === "coverage" ? "coverage" : "commerce";

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
      order_type: orderType,
      context_type: validatedDeviceId ? "device" : null,
      context_id: validatedDeviceId,
      currency: product.currency,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: 0,
      total_cents: totalCents,
      customer_name: shippingAddress?.recipient ?? profile?.full_name ?? null,
      customer_email: user.email ?? null,
      customer_tax_id: customerTaxId,
      shipping_address: shippingAddress,
      checkout_reference: checkoutReference || null,
      shipping_provider: shippingProvider,
      shipping_service: shippingService,
      shipping_deadline_days: shippingDeadlineDays,
      shipping_quote_id: shippingQuoteId,
      shipping_quoted_at: shippingQuotedAt,
      fulfillment_status: "pending",
    })
    .select(orderSelect)
    .single();

  if (orderError || !order) {
    if (checkoutReference && orderError?.code === "23505") {
      const { data: raced } = await admin
        .from("orders")
        .select(orderSelect)
        .eq("user_id", user.id)
        .eq("checkout_reference", checkoutReference)
        .maybeSingle();
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
    device_id: validatedDeviceId,
    metadata: {
      product_type: product.product_type,
      shipping_quote_id: shippingQuoteId,
      shipping_provider: shippingProvider,
      shipping_service: shippingService,
    },
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
    body: product.requires_shipping
      ? `Pedido criado com ${shippingService ?? "entrega selecionada"}; pronto para pagamento.`
      : product.product_type === "coverage"
        ? "Pedido de cobertura criado e vinculado ao KodaBot selecionado."
        : "Seu pedido foi criado e está pronto para a etapa de pagamento.",
    actor_user_id: user.id,
    metadata: {
      product_type: product.product_type,
      device_id: validatedDeviceId,
      shipping_provider: shippingProvider,
      shipping_service: shippingService,
      shipping_cents: shippingCents,
      shipping_deadline_days: shippingDeadlineDays,
      shipping_quote_id: shippingQuoteId,
    },
  });

  return json({ order: displayOrder(order) }, 201);
});
