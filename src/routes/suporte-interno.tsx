import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/suporte-interno")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/suporte" });
  },
});
