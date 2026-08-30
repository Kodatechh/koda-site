import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "server_configuration_error" }, 500);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Honeypot: this field is hidden from real visitors.
  if (text(input.website, 160)) return json({ ok: true });

  const program = text(input.program, 32);
  const email = text(input.email, 254).toLowerCase();
  const fullName = text(input.fullName, 120) || null;
  const organization = text(input.organization, 160) || null;
  const contactRole = text(input.contactRole, 120) || null;
  const message = text(input.message, 1200) || null;
  const quantity = Number(input.estimatedQuantity);
  const estimatedQuantity =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 10000 ? quantity : null;

  if (!["refurbished", "education", "business"].includes(program))
    return json({ error: "program_not_available" }, 409);
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
  if (input.consent !== true) return json({ error: "consent_required" }, 400);
  if ((program === "education" || program === "business") && !organization)
    return json({ error: "organization_required" }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userId: string | null = null;
  const authorization = request.headers.get("Authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(authorization.slice(7));
    userId = data.user?.id ?? null;
  }

  const { error } = await admin.from("growth_interest_entries").upsert(
    {
      program,
      email,
      full_name: fullName,
      organization,
      contact_role: contactRole,
      estimated_quantity: estimatedQuantity,
      message,
      user_id: userId,
      source: `stage_4_${program}`,
      consented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "program,email" },
  );

  if (error) return json({ error: "interest_save_failed" }, 500);
  return json({ ok: true, program });
});
