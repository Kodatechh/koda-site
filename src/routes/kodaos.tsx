import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/kodaos")({ component: KodaosLayout });

function KodaosLayout() {
  return <div className="min-h-screen"><Nav/><Outlet/><SiteFooter/></div>;
}
