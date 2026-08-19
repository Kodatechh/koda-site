import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/koda-pay-card-ready-check")({
  server: {
    handlers: {
      GET: async () => {
        const response = await fetch(
          "https://qqvwnsemihkknzodkxob.supabase.co/functions/v1/koda-pay-public-config",
          { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
        );
        const body = await response.json().catch(() => ({}));
        return Response.json(
          { ok: response.ok, card_ready: Boolean(body?.card_ready), public_key_present: Boolean(body?.public_key) },
          { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
        );
      },
    },
  },
});
