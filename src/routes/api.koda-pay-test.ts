import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/koda-pay-test")({
  server: {
    handlers: {
      GET: async () => {
        const response = await fetch(
          "https://qqvwnsemihkknzodkxob.supabase.co/functions/v1/koda-pay-test-pix-once",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "x-koda-test-guard": "koda-pay-test-2026-08-19-1902-v2",
            },
            cache: "no-store",
          },
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
