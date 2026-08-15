import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/kodabot-pro")({
  component: KodaBotProLayout,
});

function KodaBotProLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <Outlet />
      <SiteFooter dark />
    </div>
  );
}
