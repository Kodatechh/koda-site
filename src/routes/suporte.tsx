import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";

export const Route = createFileRoute("/suporte")({
  component: SuporteLayout,
});

function SuporteLayout() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Outlet />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Koda Eletrônicos.</p>
          <p>Suporte técnico e orçamentos sob demanda.</p>
        </div>
      </footer>
    </div>
  );
}
