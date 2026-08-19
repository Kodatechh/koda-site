import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/koda-pay-provider-order-check")({
  server: {
    handlers: {
      GET: async () => {
        const response = await fetch(
          "https://qqvwnsemihkknzodkxob.supabase.co/functions/v1/koda-pay-webhook-replay-test?key=koda-pay-webhook-replay-20260819-2004",
          { headers: { Accept: "application/json" }, cache: "no-store" },
        );
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
