import { Banknote, Factory, Headphones, LayoutDashboard } from "lucide-react";

const adminLinks = [
  { id: "home", label: "Visão geral", href: "/admin", icon: LayoutDashboard },
  { id: "factory", label: "Fábrica", href: "/admin/fabrica", icon: Factory },
  { id: "finance", label: "Comercial", href: "/admin/financeiro", icon: Banknote },
  { id: "support", label: "Suporte", href: "/admin/suporte", icon: Headphones },
] as const;

type AdminSection = (typeof adminLinks)[number]["id"];

export function AdminSectionNav({ active }: { active: AdminSection }) {
  return (
    <div className="sticky top-11 z-50 border-b border-black/10 bg-white/90 backdrop-blur-xl">
      <nav
        aria-label="Áreas do Admin Koda"
        className="mx-auto flex h-[52px] max-w-7xl items-center gap-1 overflow-x-auto px-5"
      >
        <a
          href="/admin"
          className="mr-4 shrink-0 text-sm font-semibold tracking-[-.02em] text-[#1d1d1f]"
        >
          Koda Admin
        </a>
        {adminLinks.map((item) => {
          const Icon = item.icon;
          const selected = item.id === active;
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                selected
                  ? "bg-[#1d1d1f] text-white"
                  : "text-[#424245] hover:bg-black/[.055] hover:text-black"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
