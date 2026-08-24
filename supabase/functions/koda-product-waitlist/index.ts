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

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value) && value.length <= 254;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  let input: {
    productSlug?: string;
    email?: string;
    fullName?: string;
    consent?: boolean;
    company?: string;
  };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Honeypot: real visitors never see or fill this field.
  if (cleanText(input.company, 120)) return json({ ok: true });

  const productSlug = cleanText(input.productSlug, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const fullName = cleanText(input.fullName, 120) || null;
  if (productSlug !== "kodabot-i-pro") return json({ error: "waitlist_not_available" }, 409);
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
  if (input.consent !== true) return json({ error: "consent_required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  const authorization = req.headers.get("Authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(authorization.slice(7));
    userId = data.user?.id ?? null;
  }

  const { error } = await admin.from("product_waitlist_entries").upsert(
    {
      product_slug: productSlug,
      email,
      full_name: fullName,
      user_id: userId,
      consented_at: new Date().toISOString(),
      source: "kodabot_pro_page",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_slug,email" },
  );

  if (error) return json({ error: "waitlist_save_failed" }, 500);
  return json({ ok: true, product_slug: productSlug });
});
