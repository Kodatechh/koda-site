import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

  let input: { postalCode?: string; products?: unknown[] };
  try {
    input = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const postalCode = String(input.postalCode ?? "").replace(/\D/g, "");
  if (postalCode.length !== 8) return json({ error: "invalid_postal_code" }, 400);

  const token = Deno.env.get("MELHOR_ENVIO_TOKEN");

  if (!token) {
    return json({
      provider: "manual",
      options: [
        {
          id: "standard",
          name: "Entrega padrão",
          price_cents: 0,
          deadline_days: 7,
        },
      ],
      warning: "shipping_provider_not_configured",
    });
  }

  const response = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { postal_code: Deno.env.get("KODA_ORIGIN_POSTAL_CODE") ?? "00000000" },
      to: { postal_code: postalCode },
      products: input.products ?? [],
    }),
  });

  if (!response.ok) return json({ error: "shipping_provider_error" }, 502);

  const data = await response.json();
  return json({ provider: "melhor_envio", options: data });
});
