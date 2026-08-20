import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/kodabot-i/comprar")({
  beforeLoad: () => {
    throw redirect({ to: "/checkout/$productSlug", params: { productSlug: "kodabot-i" } });
  },
});
