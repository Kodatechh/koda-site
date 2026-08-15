import { useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";

type MenuGroup = { title: string; items: { label: string; note?: string; href: string }[] };

type NavItem = { label: string; href: string; menu?: MenuGroup[] };

const navItems: NavItem[] = [
  {
    label: "Produtos",
    href: "/#kodabot",
    menu: [
      {
        title: "Conheça o KodaBot",
        items: [
          { label: "KodaBot I", note: "Em desenvolvimento", href: "/#kodabot" },
          { label: "KodaBot I Pro", note: "Em desenvolvimento", href: "/#roadmap" },
          { label: "Comparar modelos", href: "/comparar" },
        ],
      },
      {
        title: "Software",
        items: [
          { label: "KODA OS", note: "Sistema", href: "/kodaos" },
          { label: "Changelog", note: "Atualizações", href: "/kodaos/changelog" },
        ],
      },

    ],
  },
  {
    label: "KODA OS",
    href: "/kodaos",
  },
  {
    label: "Acessórios",
    href: "/#roadmap",
    menu: [
      {
        title: "Em desenvolvimento",
        items: [
          { label: "Base Koda", note: "Em breve", href: "/#roadmap" },
          { label: "Cabos e módulos", note: "Em breve", href: "/#roadmap" },
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
          { label: "Orçamentos", note: "Reparos", href: "/suporte/orcamentos" },
        ],
      },
    ],
  },
];

export function Nav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-ink-foreground/10 bg-ink/85 text-ink-foreground backdrop-blur-xl"
      onMouseLeave={() => setOpenMenu(null)}
    >
      <nav className="mx-auto flex h-11 max-w-5xl items-center justify-between px-5">
        <a href="/#top" className="text-sm font-semibold tracking-tight">
          Koda
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onMouseEnter={() => setOpenMenu(item.menu ? item.label : null)}
                onFocus={() => setOpenMenu(item.menu ? item.label : null)}
                className="flex items-center gap-1 text-xs text-ink-foreground/80 transition-colors hover:text-ink-foreground"
              >
                {item.label}
                {item.menu && <ChevronDown className="h-3 w-3 opacity-50" />}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <Search className="hidden h-3.5 w-3.5 text-ink-foreground/80 md:block" aria-label="Buscar" />
          <ShoppingBag className="h-3.5 w-3.5 text-ink-foreground/80" aria-label="Sacola" />
          <button className="md:hidden" onClick={() => setMobile((v) => !v)} aria-label="Abrir menu">
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {navItems.map(
        (item) =>
          item.menu &&
          openMenu === item.label && (
            <div
              key={item.label}
              className="hidden border-t border-ink-foreground/10 bg-ink/95 backdrop-blur-xl md:block"
            >
              <div className="mx-auto grid max-w-5xl gap-12 px-5 pb-12 pt-8 sm:grid-cols-3">
                {item.menu.map((group) => (
                  <div key={group.title}>
                    <p className="text-[11px] text-ink-foreground/40">{group.title}</p>
                    <ul className="mt-3 space-y-2">
                      {group.items.map((sub) => (
                        <li key={sub.label}>
                          <a
                            href={sub.href}
                            onClick={() => setOpenMenu(null)}
                            className="text-xl font-semibold tracking-tight text-ink-foreground/90 transition-colors hover:text-ink-foreground"
                          >
                            {sub.label}
                            {sub.note && (
                              <span className="ml-2 align-middle text-[11px] font-normal text-ink-foreground/40">
                                {sub.note}
                              </span>
                            )}
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
        <div className="max-h-[80vh] overflow-y-auto border-t border-ink-foreground/10 px-5 py-6 md:hidden">
          {navItems.map((item) => (
            <div key={item.label} className="py-2">
              <a
                href={item.href}
                onClick={() => setMobile(false)}
                className="block text-2xl font-semibold tracking-tight"
              >
                {item.label}
              </a>
              {item.menu && (
                <ul className="mt-2 space-y-1 pl-1">
                  {item.menu.flatMap((g) => g.items).map((sub) => (
                    <li key={sub.label + sub.href}>
                      <a
                        href={sub.href}
                        onClick={() => setMobile(false)}
                        className="block py-1 text-sm text-ink-foreground/60"
                      >
                        {sub.label}
                        {sub.note && <span className="ml-2 text-[11px]">{sub.note}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
