import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/financeiro-interno")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
