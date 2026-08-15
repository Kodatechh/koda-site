import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/kodabot")({
  component: KodaBotLayout,
});

function KodaBotLayout() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
