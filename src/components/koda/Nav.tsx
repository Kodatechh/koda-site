/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { SearchOverlay } from "@/components/koda/SearchOverlay";

type MenuLink = { label: string; href: string; note?: string };
type MenuGroup = { title: string; emphasis?: boolean; items: MenuLink[] };
type NavItem = { label: string; href: string; menu?: MenuGroup[] };

const navItems: NavItem[] = [
  {
    label: "Loja",
    href: "/loja",
    menu: [
      {
        title: "Comprar",
        emphasis: true,
        items: [
          { label: "Acessórios", href: "/loja" },
          { label: "KodaBot", href: "/kodabot" },
          { label: "KodaBot Pro", href: "/kodabot-pro" },
          { label: "Comparar modelos", href: "/comparar" },
        ],
      },
      {
        title: "Links rápidos",
        items: [
          { label: "Seus pedidos", href: "/conta/pedidos" },
          { label: "Meus KodaBots", href: "/conta" },
          { label: "Suporte", href: "/suporte" },
          { label: "Reparos", href: "/suporte/reparo" },
        ],
      },
      {
        title: "Serviços Koda",
        items: [
          { label: "KodaCare", href: "/kodacare" },
          { label: "Garantia", href: "/suporte/garantia" },
          { label: "Conta Koda", href: "/conta" },
        ],
      },
    ],
  },
  {
    label: "KodaBot",
    href: "/kodabot",
    menu: [
      {
        title: "Conheça o KodaBot",
        emphasis: true,
        items: [
          { label: "KodaBot", href: "/kodabot" },
          { label: "KodaBot Pro", href: "/kodabot-pro" },
          { label: "Comparar", href: "/comparar" },
        ],
      },
      {
        title: "Explorar",
        items: [
          { label: "Por dentro do KodaBot", href: "/kodabot/por-dentro" },
          { label: "Especificações", href: "/kodabot/tech-specs" },
          { label: "Especificações do Pro", href: "/kodabot-pro/tech-specs" },
        ],
      },
      {
        title: "Comprar",
        items: [
          { label: "Comprar KodaBot", href: "/checkout/kodabot-i" },
          { label: "Ver acessórios", href: "/loja" },
        ],
      },
    ],
  },
  {
    label: "Suporte",
    href: "/suporte",
    menu: [
      {
        title: "Suporte",
        emphasis: true,
        items: [
          { label: "Central de suporte", href: "/suporte" },
          { label: "Reparo e assistência", href: "/suporte/reparo" },
          { label: "Garantia", href: "/suporte/garantia" },
        ],
      },
      {
        title: "Recursos",
        items: [
          { label: "Configurar um KodaBot", href: "/suporte/configurar" },
          { label: "Manuais e downloads", href: "/suporte/manuais" },
          { label: "Perguntas frequentes", href: "/suporte/faq" },
          { label: "Fale com a Koda", href: "/suporte/contato" },
        ],
      },
    ],
  },
  {
    label: "Sobre",
    href: "/sobre",
    menu: [
      {
        title: "Conheça a Koda",
        emphasis: true,
        items: [
          { label: "Sobre nós", href: "/sobre" },
          { label: "Sobre os KodaBots", href: "/kodabot" },
          { label: "KODA OS", href: "/kodaos" },
        ],
      },
      {
        title: "Documentos",
        items: [
          { label: "Contratos", href: "/contratos" },
          { label: "Privacidade", href: "/privacidade" },
          { label: "Garantia", href: "/suporte/garantia" },
        ],
      },
      {
        title: "KODA OS",
        items: [
          { label: "Visão geral", href: "/kodaos" },
          { label: "Atualizações", href: "/kodaos/updates" },
          { label: "Changelog", href: "/kodaos/changelog" },
        ],
      },
    ],
  },
];

export function Nav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renderedMenu, setRenderedMenu] = useState<string | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileMenu, setMobileMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();

  const clearTimers = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    closeTimerRef.current = null;
    unmountTimerRef.current = null;
  };

  const showMenu = (label: string) => {
    clearTimers();
    setRenderedMenu(label);
    setOpenMenu(label);
    setMenuClosing(false);
  };

  const hideMenu = (withGrace = false) => {
    clearTimers();
    const close = () => {
      setOpenMenu(null);
      setMenuClosing(true);
      unmountTimerRef.current = setTimeout(() => {
        setRenderedMenu(null);
        setMenuClosing(false);
      }, 220);
    };
    if (withGrace) closeTimerRef.current = setTimeout(close, 90);
    else close();
  };

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) hideMenu();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideMenu();
        setMobile(false);
        setMobileMenu(null);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimers();
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
    setMobile(false);
    setMobileMenu(null);
  };

  const activeItem = navItems.find((item) => item.label === renderedMenu);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-[60] h-11 border-b border-black/[.035] bg-white/90 text-[#1d1d1f] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/82"
      >
        <nav className="mx-auto grid h-11 max-w-[1024px] grid-cols-[44px_1fr_auto] items-center px-3 sm:px-5">
          <a
            href="/"
            onClick={closeNavigation}
            aria-label="Koda — início"
            className="flex h-11 w-11 items-center justify-start text-[15px] font-semibold tracking-[-.035em] outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
          >
            Koda
          </a>

          <ul className="hidden h-11 items-center justify-center gap-[30px] lg:flex">
            {navItems.map((item) => (
              <li
                key={item.label}
                className="flex h-11 items-center"
                onMouseEnter={() => {
                  if (!item.menu) hideMenu(true);
                }}
              >
                {item.menu ? (
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-controls={`globalnav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    onMouseEnter={() => showMenu(item.label)}
                    onFocus={() => showMenu(item.label)}
                    onClick={() => (openMenu === item.label ? hideMenu() : showMenu(item.label))}
                    className="flex h-11 items-center whitespace-nowrap px-0 text-[12px] font-normal leading-none text-[#1d1d1f]/80 outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
                  >
                    {item.label}
                  </button>
                ) : (
                  <a
                    href={item.href}
                    onClick={closeNavigation}
                    className="flex h-11 items-center whitespace-nowrap text-[12px] font-normal leading-none text-[#1d1d1f]/80 outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="flex h-11 items-center justify-end gap-0">
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className="grid h-11 w-10 place-items-center outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
            >
              <Search className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <a
              href="/loja"
              aria-label="Loja Koda"
              onClick={closeNavigation}
              className="grid h-11 w-10 place-items-center outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
            >
              <ShoppingBag className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </a>
            <a
              href={user ? "/conta" : "/conta/entrar"}
              aria-label={user ? "Minha Conta" : "Entrar na Conta Koda"}
              onClick={closeNavigation}
              className="grid h-11 w-10 place-items-center outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35"
            >
              <UserRound className="h-[16px] w-[16px]" strokeWidth={1.8} />
            </a>
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobile((value) => !value)}
              className="grid h-11 w-10 place-items-center outline-none lg:hidden"
            >
              {mobile ? (
                <X className="h-[17px] w-[17px]" />
              ) : (
                <Menu className="h-[17px] w-[17px]" />
              )}
            </button>
          </div>
        </nav>

        {activeItem?.menu && (
          <div
            id={`globalnav-${activeItem.label.toLowerCase().replaceAll(" ", "-")}`}
            onMouseEnter={() => showMenu(activeItem.label)}
            onMouseLeave={() => hideMenu(true)}
            className={`absolute left-0 right-0 top-11 hidden border-t border-black/[.035] bg-white transition-[opacity,transform] duration-[220ms] ease-out lg:block ${
              menuClosing
                ? "pointer-events-none -translate-y-2 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div className="mx-auto grid min-h-[330px] max-w-[1024px] grid-cols-[1.35fr_.8fr_.8fr] gap-16 px-5 pb-14 pt-10">
              {activeItem.menu.map((group) => (
                <div key={group.title}>
                  <p className="mb-4 text-[11px] font-normal text-[#86868b]">{group.title}</p>
                  <ul className={group.emphasis ? "space-y-1" : "space-y-2.5"}>
                    {group.items.map((item) => (
                      <li key={`${item.label}-${item.href}`}>
                        <a
                          href={item.href}
                          onClick={closeNavigation}
                          className={`block w-fit text-[#1d1d1f] outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-[#0071e3]/35 ${
                            group.emphasis
                              ? "py-0.5 text-[24px] font-semibold leading-[1.18] tracking-[-.035em]"
                              : "text-[12px] font-semibold leading-[1.35]"
                          }`}
                        >
                          {item.label}
                          {item.note && (
                            <span className="ml-2 text-[10px] font-normal text-[#86868b]">
                              {item.note}
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
        )}

        {mobile && (
          <div className="fixed inset-x-0 top-11 z-[70] max-h-[calc(100vh-44px)] overflow-y-auto bg-white px-6 pb-12 pt-4 lg:hidden">
            {navItems.map((item) => (
              <div key={item.label} className="border-b border-black/[.06] last:border-0">
                {item.menu ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={mobileMenu === item.label}
                      onClick={() =>
                        setMobileMenu((open) => (open === item.label ? null : item.label))
                      }
                      className="flex w-full items-center justify-between py-4 text-left text-[28px] font-semibold tracking-[-.045em]"
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${mobileMenu === item.label ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ${mobileMenu === item.label ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <div className="overflow-hidden">
                        {item.menu.map((group) => (
                          <div key={group.title} className="mb-5 last:mb-0">
                            <p className="mb-2 text-[11px] text-[#86868b]">{group.title}</p>
                            <div className="space-y-2">
                              {group.items.map((sub) => (
                                <a
                                  key={`${sub.label}-${sub.href}`}
                                  href={sub.href}
                                  onClick={closeNavigation}
                                  className="block text-[15px] font-semibold text-[#1d1d1f]"
                                >
                                  {sub.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <a
                    href={item.href}
                    onClick={closeNavigation}
                    className="block py-4 text-[28px] font-semibold tracking-[-.045em]"
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {renderedMenu && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => hideMenu()}
          className={`fixed inset-x-0 bottom-0 top-11 z-50 hidden bg-black/20 backdrop-blur-[1px] transition-opacity duration-[220ms] lg:block ${menuClosing ? "opacity-0" : "opacity-100"}`}
        />
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
