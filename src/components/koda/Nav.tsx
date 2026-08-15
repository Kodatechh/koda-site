import { useState } from "react";
import { ChevronDown, Menu, Search, UserRound, X } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { SearchOverlay } from "@/components/koda/SearchOverlay";

type MenuGroup = { title: string; items: { label: string; note?: string; href: string }[] };
type NavItem = { label: string; href: string; menu?: MenuGroup[] };

const navItems: NavItem[] = [
  {
    label: "Produtos",
    href: "/kodabot",
    menu: [
      {
        title: "KodaBot",
        items: [
          { label: "KodaBot I", note: "Em desenvolvimento", href: "/kodabot" },
          { label: "KodaBot I Pro", note: "Em desenvolvimento", href: "/kodabot-pro" },
          { label: "Comparar modelos", href: "/comparar" },
        ],
      },
      {
        title: "Conheça mais",
        items: [
          { label: "Por dentro do KodaBot", href: "/kodabot/por-dentro" },
          { label: "Especificações do KodaBot I", href: "/kodabot/tech-specs" },
          { label: "Especificações do Pro", href: "/kodabot-pro/tech-specs" },
        ],
      },
    ],
  },
  {
    label: "KODA OS",
    href: "/kodaos",
    menu: [
      {
        title: "Software",
        items: [
          { label: "KODA OS", note: "Visão geral", href: "/kodaos" },
          { label: "Atualizações", href: "/kodaos/updates" },
          { label: "Changelog", href: "/kodaos/changelog" },
        ],
      },
    ],
  },
  {
    label: "Suporte",
    href: "/suporte",
    menu: [
      {
        title: "Ajuda",
        items: [
          { label: "Central de suporte", href: "/suporte" },
          { label: "Configurar um KodaBot", href: "/suporte/configurar" },
          { label: "Reparo e assistência", href: "/suporte/reparo" },
          { label: "Garantia e cobertura", href: "/suporte/garantia" },
        ],
      },
      {
        title: "Recursos",
        items: [
          { label: "Manuais e downloads", href: "/suporte/manuais" },
          { label: "Perguntas frequentes", href: "/suporte/faq" },
          { label: "Fale com a Koda", href: "/suporte/contato" },
        ],
      },
    ],
  },
  { label: "Sobre", href: "/sobre" },
];

export function Nav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isFactoryAdmin, loading } = useAuth();

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-black/5 bg-background/85 text-foreground backdrop-blur-xl"
        onMouseLeave={() => setOpenMenu(null)}
      >
        <nav className="mx-auto flex h-11 max-w-5xl items-center justify-between px-5">
          <a href="/" className="text-sm font-semibold tracking-tight" aria-label="Koda — início">
            Koda
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onMouseEnter={() => setOpenMenu(item.menu ? item.label : null)}
                  onFocus={() => setOpenMenu(item.menu ? item.label : null)}
                  className="flex items-center gap-1 text-xs text-foreground/72 transition-colors hover:text-foreground"
                >
                  {item.label}
                  {item.menu && <ChevronDown className="h-3 w-3 opacity-45" />}
                </a>
              </li>
            ))}
            {isFactoryAdmin && (
              <li>
                <a href="/fabrica" className="text-xs font-medium text-[#0071e3] hover:underline">Fábrica</a>
              </li>
            )}
          </ul>

          <div className="flex items-center gap-4">
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" className="rounded-full p-1 transition-opacity hover:opacity-60">
              <Search className="h-3.5 w-3.5 text-foreground/72" />
            </button>
            <a
              href={user ? "/conta" : "/conta/entrar"}
              aria-label={user ? "Minha Conta KodaCloud" : "Entrar na KodaCloud"}
              className="relative rounded-full p-1 transition-opacity hover:opacity-60"
            >
              <UserRound className="h-3.5 w-3.5 text-foreground/72" />
              {!loading && user && <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#34c759] ring-2 ring-background" />}
            </a>
            <button className="md:hidden" onClick={() => setMobile((v) => !v)} aria-label="Abrir menu">
              {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {navItems.map(
          (item) =>
            item.menu &&
            openMenu === item.label && (
              <div key={item.label} className="hidden border-t border-black/5 bg-background/95 backdrop-blur-xl md:block">
                <div className="mx-auto grid max-w-5xl gap-12 px-5 pb-12 pt-8 sm:grid-cols-3">
                  {item.menu.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] text-foreground/40">{group.title}</p>
                      <ul className="mt-3 space-y-2">
                        {group.items.map((sub) => (
                          <li key={sub.label}>
                            <a
                              href={sub.href}
                              onClick={() => setOpenMenu(null)}
                              className="text-xl font-semibold tracking-tight text-foreground/90 transition-colors hover:text-foreground"
                            >
                              {sub.label}
                              {sub.note && <span className="ml-2 align-middle text-[11px] font-normal text-foreground/40">{sub.note}</span>}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}

        {mobile && (
          <div className="max-h-[82vh] overflow-y-auto border-t border-black/5 bg-background px-5 py-6 md:hidden">
            {navItems.map((item) => (
              <div key={item.label} className="border-b border-black/5 py-4 last:border-0">
                <a href={item.href} onClick={() => setMobile(false)} className="block text-2xl font-semibold tracking-tight">
                  {item.label}
                </a>
                {item.menu && (
                  <ul className="mt-2 space-y-1 pl-1">
                    {item.menu.flatMap((g) => g.items).map((sub) => (
                      <li key={sub.label + sub.href}>
                        <a href={sub.href} onClick={() => setMobile(false)} className="block py-1 text-sm text-foreground/60">
                          {sub.label}
                          {sub.note && <span className="ml-2 text-[11px]">{sub.note}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="pt-4">
              {isFactoryAdmin && <a href="/fabrica" className="block py-2 text-sm font-semibold text-[#0071e3]">Menu de Fábrica</a>}
              <a href={user ? "/conta" : "/conta/entrar"} className="block py-2 text-sm font-semibold">
                {user ? "Minha Conta KodaCloud" : "Entrar na KodaCloud"}
              </a>
            </div>
          </div>
        )}
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
