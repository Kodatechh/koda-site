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
          { label: "KodaBot I", note: "Em desenvolvimento", href: "/kodabot" },
          { label: "KodaBot I Pro", note: "Em desenvolvimento", href: "/kodabot-pro" },
          { label: "Comparar modelos", href: "/comparar" },
          { label: "Comprar KodaBot I", href: "/kodabot-i/comprar" },
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
      }, 240);
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

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  const closeNavigation = () => {
    hideMenu();
    setMobileMenu(null);
    setMobile(false);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 h-12 border-b border-black/[.06] bg-white/90 text-[#1d1d1f] backdrop-blur-2xl"
      >
        <nav className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-5 lg:px-3">
          <a
            href="/"
            className="flex h-12 items-center text-[14px] font-semibold tracking-[-.03em]"
            aria-label="Koda — início"
          >
            Koda
          </a>

          <ul className="hidden h-full items-center gap-0 md:flex">
            {navItems.map((item) => (
              <li
                key={item.label}
                onMouseEnter={() => (item.menu ? showMenu(item.label) : hideMenu(true))}
              >
                {item.menu ? (
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-controls={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    onClick={() => (openMenu === item.label ? hideMenu() : showMenu(item.label))}
                    onMouseEnter={() => showMenu(item.label)}
                    className="flex h-12 items-center gap-1 px-[18px] text-[11px] font-medium leading-none text-[#1d1d1f]/75 transition-colors hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3]/50"
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-3 w-3 opacity-45 transition-transform duration-200 motion-reduce:transition-none ${openMenu === item.label ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    onClick={closeNavigation}
                    className="flex h-12 items-center px-[18px] text-[11px] font-medium leading-none text-[#1d1d1f]/75 transition-colors hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071e3]/50"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="flex h-12 items-center gap-1 sm:gap-2">
            {user && (
              <a
                href="/conta/notificacoes"
                aria-label={`${unread} notificações não lidas`}
                className="relative grid h-9 w-9 place-items-center rounded-full transition-opacity hover:opacity-60"
              >
                <Bell className="h-3.5 w-3.5 text-foreground/72" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--kodacare-red)] px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </a>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
              className="grid h-9 w-9 place-items-center rounded-full transition-opacity hover:opacity-60"
            >
              <Search className="h-3.5 w-3.5 text-foreground/72" />
            </button>
            <a
              href={user ? "/conta" : "/conta/entrar"}
              aria-label={user ? "Minha Conta KodaCloud" : "Entrar na KodaCloud"}
              className="relative grid h-9 w-9 place-items-center rounded-full transition-opacity hover:opacity-60"
            >
              <UserRound className="h-3.5 w-3.5 text-foreground/72" />
              {!loading && user && (
                <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#34c759] ring-2 ring-background" />
              )}
            </a>
            <button
              className="grid h-9 w-9 place-items-center rounded-full md:hidden"
              onClick={() => setMobile((v) => !v)}
              aria-label={mobile ? "Fechar menu" : "Abrir menu"}
            >
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
                className={`fixed inset-x-0 top-12 hidden origin-top border-t border-black/[.04] bg-white/95 shadow-[0_28px_55px_rgba(0,0,0,.10)] backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none md:block ${
                  menuClosing
                    ? "pointer-events-none -translate-y-3 opacity-0"
                    : "translate-y-0 scale-100 opacity-100"
                }`}
              >
                <div className="mx-auto grid min-h-[260px] max-w-[1024px] grid-cols-3 gap-16 px-5 pb-14 pt-10 lg:px-3">
                  {item.menu.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] font-medium text-[#6e6e73]">{group.title}</p>
                      <ul className="mt-4 space-y-1">
                        {group.items.map((sub) => (
                          <li key={sub.label}>
                            <a
                              href={sub.href}
                              onClick={closeNavigation}
                              className="block py-1 text-[22px] font-semibold leading-[1.15] tracking-[-.04em] text-[#1d1d1f] transition-[color,transform] duration-200 hover:translate-x-1 hover:text-[#0066cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/50 motion-reduce:transform-none motion-reduce:transition-none"
                            >
                              {sub.label}
                              {sub.note && (
                                <span className="ml-2 align-middle text-[11px] font-normal text-foreground/40">
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
          <div className="fixed inset-x-0 top-12 h-[calc(100dvh-3rem)] overflow-y-auto bg-white px-7 pb-12 pt-7 md:hidden">
            {navItems.map((item) => (
              <div key={item.label} className="py-2.5">
                {item.menu ? (
                  <button
                    type="button"
                    aria-expanded={mobileMenu === item.label}
                    aria-controls={`mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    onClick={() =>
                      setMobileMenu((open) => (open === item.label ? null : item.label))
                    }
                    className="flex w-full items-center justify-between text-left text-[28px] font-semibold leading-tight tracking-[-.045em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/50"
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 opacity-45 transition-transform duration-200 motion-reduce:transition-none ${mobileMenu === item.label ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    onClick={closeNavigation}
                    className="block text-[28px] font-semibold leading-tight tracking-[-.045em]"
                  >
                    {item.label}
                  </a>
                )}
                {item.menu && (
                  <div
                    id={`mobile-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${mobileMenu === item.label ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <ul className="mt-2 space-y-1 overflow-hidden border-l border-black/10 pl-4">
                      {item.menu
                        .flatMap((g) => g.items)
                        .map((sub) => (
                          <li key={sub.label + sub.href}>
                            <a
                              href={sub.href}
                              onClick={closeNavigation}
                              className="block rounded-lg px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/[.035] hover:text-foreground motion-reduce:transition-none"
                            >
                              {sub.label}
                              {sub.note && <span className="ml-2 text-[11px]">{sub.note}</span>}
                            </a>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4">
              <a
                href={user ? "/conta" : "/conta/entrar"}
                className="block py-2 text-sm font-semibold"
              >
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
