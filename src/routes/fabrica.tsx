import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fabrica")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/fabrica" });
  },
});
