import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/conta")({ component: AccountLayout });

function AccountLayout() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
