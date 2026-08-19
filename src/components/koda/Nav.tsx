/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, Search, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
          { label: "KodaBot", note: "Com tela touch", href: "/kodabot" },
          { label: "KodaBot Pro", note: "Feito para voz", href: "/kodabot-pro" },
          { label: "Comparar modelos", href: "/comparar" },
          { label: "Comprar KodaBot", href: "/kodabot-i/comprar" },
        ],
      },
      {
        title: "Conheça mais",
        items: [
          { label: "Por dentro do KodaBot", href: "/kodabot/por-dentro" },
          { label: "Especificações do KodaBot", href: "/kodabot/tech-specs" },
          { label: "Especificações do Pro", href: "/kodabot-pro/tech-specs" },
        ],
      },
    ],
  },
  { label: "KodaCare", href: "/kodacare" },
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
          { label: "Orçamentos", href: "/suporte/orcamentos" },
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
  const [renderedMenu, setRenderedMenu] = useState<string | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileMenu, setMobileMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading } = useAuth();

  const clearMenuTimers = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    closeTimerRef.current = null;
    unmountTimerRef.current = null;
  };

  const showMenu = (menu: string) => {
    clearMenuTimers();
    setRenderedMenu(menu);
    setOpenMenu(menu);
    setMenuClosing(false);
  };

  const hideMenu = (withGrace = false) => {
    clearMenuTimers();
    const close = () => {
      setOpenMenu(null);
      setMenuClosing(true);
      unmountTimerRef.current = setTimeout(() => {
        setRenderedMenu(null);
        setMenuClosing(false);
      }, 260);
    };
    if (withGrace) closeTimerRef.current = setTimeout(close, 140);
    else close();
  };

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    (supabase as any)
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }: { count: number | null }) => setUnread(count ?? 0));
  }, [user]);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) hideMenu();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideMenu();
        setMobileMenu(null);
        setMobile(false);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      clearMenuTimers();
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const closeNavigation = () => {
    hideMenu();
    setMobileMenu(null);
    setMobile(false);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-black/[.055] bg-white/90 text-[#1d1d1f] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/80"
      >
        <nav className="mx-auto flex h-12 max-w-[1040px] items-center justify-between px-5">
          <a href="/" className="rounded-md text-[15px] font-semibold tracking-[-.03em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40" aria-label="Koda — início">
            Koda
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <li key={item.label} onMouseEnter={() => item.menu && showMenu(item.label)}>
                {item.menu ? (
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-controls={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    onClick={() => (openMenu === item.label ? hideMenu() : showMenu(item.label))}
                    onMouseEnter={() => showMenu(item.label)}
                    className="flex items-center gap-1 rounded-md py-2 text-[12px] font-medium text-[#1d1d1f]/70 transition-colors duration-200 hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40"
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-3 w-3 opacity-40 transition-transform duration-[240ms] motion-reduce:transition-none ${openMenu === item.label ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    onClick={closeNavigation}
                    className="rounded-md py-2 text-[12px] font-medium text-[#1d1d1f]/70 transition-colors duration-200 hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            {user && (
              <a href="/conta/notificacoes" aria-label={`${unread} notificações não lidas`} className="relative rounded-full p-1 transition-opacity duration-200 hover:opacity-55">
                <Bell className="h-3.5 w-3.5 text-[#1d1d1f]/70" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--kodacare-red)] px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </a>
            )}
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" className="rounded-full p-1 transition-opacity duration-200 hover:opacity-55">
              <Search className="h-3.5 w-3.5 text-[#1d1d1f]/70" />
            </button>
            <a href={user ? "/conta" : "/conta/entrar"} aria-label={user ? "Minha Conta Koda" : "Entrar na Conta Koda"} className="relative rounded-full p-1 transition-opacity duration-200 hover:opacity-55">
              <UserRound className="h-3.5 w-3.5 text-[#1d1d1f]/70" />
              {!loading && user && <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#34c759] ring-2 ring-white" />}
            </a>
            <button className="md:hidden" onClick={() => setMobile((v) => !v)} aria-label="Abrir menu">
              {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {navItems.map(
          (item) =>
            item.menu &&
            renderedMenu === item.label && (
              <div
                id={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                key={item.label}
                onMouseEnter={() => showMenu(item.label)}
                onMouseLeave={() => hideMenu(true)}
                className={`absolute inset-x-0 top-full hidden origin-top border-t border-black/[.045] bg-white/96 shadow-[0_24px_70px_rgba(0,0,0,.09)] backdrop-blur-2xl transition-[opacity,transform] duration-[240ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none md:block ${
                  menuClosing
                    ? "pointer-events-none -translate-y-1.5 scale-[.99] opacity-0"
                    : "translate-y-0 scale-100 opacity-100"
                }`}
              >
                <div className="mx-auto grid max-w-[1040px] gap-14 px-5 pb-12 pt-9 sm:grid-cols-3">
                  {item.menu.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] font-medium text-[#86868b]">{group.title}</p>
                      <ul className="mt-4 space-y-1">
                        {group.items.map((sub) => (
                          <li key={sub.label}>
                            <a
                              href={sub.href}
                              onClick={closeNavigation}
                              className="block rounded-xl px-2 py-1.5 text-[20px] font-semibold tracking-[-.035em] text-[#1d1d1f] transition-[color,background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-black/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40 motion-reduce:transform-none motion-reduce:transition-none"
                            >
                              {sub.label}
                              {sub.note && <span className="ml-2 align-middle text-[11px] font-normal tracking-normal text-[#86868b]">{sub.note}</span>}
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
          <div className="max-h-[82vh] overflow-y-auto border-t border-black/5 bg-white px-5 py-6 md:hidden">
            {navItems.map((item) => (
              <div key={item.label} className="border-b border-black/5 py-4 last:border-0">
                {item.menu ? (
                  <button
                    type="button"
                    aria-expanded={mobileMenu === item.label}
                    aria-controls={`mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    onClick={() => setMobileMenu((open) => (open === item.label ? null : item.label))}
                    className="flex w-full items-center justify-between text-left text-2xl font-semibold tracking-[-.04em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40"
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 opacity-40 transition-transform duration-[240ms] motion-reduce:transition-none ${mobileMenu === item.label ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <a href={item.href} onClick={closeNavigation} className="block text-2xl font-semibold tracking-[-.04em]">{item.label}</a>
                )}
                {item.menu && (
                  <div id={`mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`} className={`grid transition-[grid-template-rows,opacity] duration-[240ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${mobileMenu === item.label ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <ul className="mt-2 space-y-1 overflow-hidden pl-1">
                      {item.menu.flatMap((g) => g.items).map((sub) => (
                        <li key={sub.label + sub.href}>
                          <a href={sub.href} onClick={closeNavigation} className="block rounded-lg px-2 py-1.5 text-sm text-[#6e6e73] transition-colors hover:bg-black/[.035] hover:text-[#1d1d1f] motion-reduce:transition-none">
                            {sub.label}
                            {sub.note && <span className="ml-2 text-[11px] text-[#86868b]">{sub.note}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4">
              <a href={user ? "/conta" : "/conta/entrar"} className="block py-2 text-sm font-semibold">
                {user ? "Minha Conta Koda" : "Entrar na Conta Koda"}
              </a>
            </div>
          </div>
        )}
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
