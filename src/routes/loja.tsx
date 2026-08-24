import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Cable,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Headphones,
  HeartHandshake,
  LoaderCircle,
  Package,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type StoreMedia = {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
};

type StoreProduct = {
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string | null;
  category_id: string | null;
  product_type: "physical" | "digital" | "service" | "coverage" | "subscription";
  image_url: string | null;
  media: StoreMedia[];
  featured: boolean;
  available: boolean;
  currency: string;
  unit_amount_cents: number | null;
  compare_at_cents: number | null;
  in_stock: boolean;
  requires_shipping: boolean;
  requires_device: boolean;
  sales_mode?: "preorder" | "standard" | "waitlist";
  waitlist_enabled?: boolean;
  launch_at?: string | null;
};

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type CatalogListResponse = { products: StoreProduct[]; categories: StoreCategory[] };

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja Koda — Produtos e acessórios" },
      {
        name: "description",
        content: "Compre produtos e acessórios diretamente da Koda.",
      },
    ],
  }),
  component: StorePage,
});

function money(cents: number | null, currency = "BRL") {
  if (cents == null) return "Preço em breve";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function visualTone(product: StoreProduct) {
  if (product.slug.includes("pro")) return "bg-[#0b0b0d] text-white";
  if (product.slug.startsWith("kodabot"))
    return "bg-[linear-gradient(145deg,#f9fbff,#e8eef8)] text-[#111216]";
  return "bg-[linear-gradient(145deg,#fafafa,#e9e9ed)] text-[#1d1d1f]";
}

function ProductVisual({ product, compact = false }: { product: StoreProduct; compact?: boolean }) {
  const isKodaBot = product.slug === "kodabot-i";

  return (
    <div
      className={`relative grid overflow-hidden ${compact ? "h-48" : "h-[310px] sm:h-[360px]"} ${visualTone(product)}`}
    >
      {isKodaBot ? (
        <img
          src="/kodabot-checkout-transparent-v1.png"
          alt="KodaBot"
          className="h-full w-full object-contain p-5"
          loading="lazy"
        />
      ) : product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-contain p-5"
          loading="lazy"
        />
      ) : (
        <div className="grid place-items-center p-8 text-center">
          <div>
            <div
              className={`mx-auto grid ${compact ? "h-14 w-14 text-2xl" : "h-20 w-20 text-4xl"} place-items-center rounded-[28%] bg-current/10 font-semibold tracking-[-.08em]`}
            >
              K
            </div>
            <p
              className={`${compact ? "mt-5 text-xl" : "mt-7 text-3xl"} font-semibold tracking-[-.05em]`}
            >
              {product.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BuyLink({ product, small = false }: { product: StoreProduct; small?: boolean }) {
  const waitlist = product.waitlist_enabled || product.sales_mode === "waitlist";
  return (
    <a
      href={waitlist ? "/kodabot-pro#lista-de-espera" : `/checkout/${product.slug}`}
      className={`inline-flex items-center justify-center rounded-full bg-[#0071e3] font-semibold text-white transition-colors hover:bg-[#0077ed] ${small ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"} ${product.available || waitlist ? "" : "pointer-events-none opacity-40"}`}
    >
      {waitlist ? "Avise-me" : product.available ? "Comprar" : "Indisponível"}
    </a>
  );
}

type Department = {
  label: string;
  href: string;
  image?: string;
  icon?: LucideIcon;
  accent?: string;
};

function KodaBotSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25 12h22c7.2 0 13 5.8 13 13v27c0 7.2-5.8 13-13 13H25c-7.2 0-13-5.8-13-13V25c0-7.2 5.8-13 13-13Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M21 12V7m30 5V7M12 31H7m5 17H7m53-17h5m-5 17h5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="22" y="23" width="28" height="30" rx="4" stroke="currentColor" strokeWidth="2.6" />
      <path d="M28 31h16M28 37h11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="29" cy="45" r="2" fill="currentColor" />
      <circle cx="36" cy="45" r="2" fill="currentColor" />
      <circle cx="43" cy="45" r="2" fill="currentColor" />
    </svg>
  );
}

const departments: Department[] = [
  { label: "KodaBot", href: "/kodabot" },
  { label: "KodaBot Pro", href: "/kodabot-pro", icon: Bot },
  { label: "Acessórios", href: "#catalogo", icon: Cable },
  { label: "Pedidos", href: "/conta/pedidos", icon: Package },
  { label: "Conta Koda", href: "/conta", icon: UserRound },
  { label: "Reparos", href: "/reparos/solicitar", icon: Wrench },
  { label: "Suporte", href: "/suporte", icon: Headphones },
];

function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogListResponse>(
        "koda-pay-catalog",
        {
          body: { list: true },
        },
      );
      if (!alive) return;
      if (invokeError || !data) {
        setError("Não foi possível carregar a loja agora.");
        setProducts([]);
      } else {
        setProducts(
          (data.products ?? []).filter((product) => !product.slug.startsWith("kodacare")),
        );
      }
      setLoading(false);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const featured = useMemo(() => {
    const explicit = products.filter((product) => product.featured);
    return explicit.length ? explicit : products.slice(0, 6);
  }, [products]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="overflow-hidden">
        <section className="border-b border-black/[.04] bg-white">
          <div className="mx-auto flex min-h-[58px] max-w-[1200px] items-center justify-between gap-4 px-5 py-3 text-center text-xs sm:text-sm">
            <button
              type="button"
              aria-label="Oferta anterior"
              className="hidden text-[#6e6e73] sm:block"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="mx-auto">
              KodaBot em pré-venda por R$ 99,90 até 16/10. Envios a partir de 17/10.{" "}
              <a href="/checkout/kodabot-i" className="text-[#0066cc] hover:underline">
                Comprar <CircleHelp className="inline h-4 w-4" />
              </a>
            </p>
            <button
              type="button"
              aria-label="Próxima oferta"
              className="hidden text-[#6e6e73] sm:block"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 pb-6 pt-14 sm:pb-8 sm:pt-20">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <h1 className="max-w-[880px] text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-7xl lg:text-[76px]">
                Loja.{" "}
                <span className="text-[#6e6e73]">O melhor jeito de comprar tudo da Koda.</span>
              </h1>
            </div>
            <div className="space-y-5 text-sm lg:justify-self-end">
              <a href="/suporte" className="group flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <span>
                  <strong className="block text-xs">Precisa de ajuda para comprar?</strong>
                  <span className="text-xs text-[#0066cc]">
                    Fale com a Koda <ChevronRight className="inline h-3 w-3" />
                  </span>
                </span>
              </a>
              <a href="/conta" className="group flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                  <UserRound className="h-4 w-4" />
                </span>
                <span>
                  <strong className="block text-xs">Continue de onde parou.</strong>
                  <span className="text-xs text-[#0066cc]">
                    Acesse sua Conta Koda <ChevronRight className="inline h-3 w-3" />
                  </span>
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] pb-16 pt-8 sm:pb-20">
          <div className="no-scrollbar mx-auto flex max-w-[1320px] gap-7 overflow-x-auto px-5 pb-3 sm:gap-10">
            {departments.map((department) => {
              const Icon = department.icon;
              return (
                <a
                  key={department.label}
                  href={department.href}
                  className="group w-[116px] shrink-0 text-center"
                >
                  <span className="grid h-[112px] place-items-center transition-transform duration-300 group-hover:-translate-y-1.5">
                    {department.label === "KodaBot" ? (
                      <KodaBotSymbol className="h-[72px] w-[72px] text-[#1d1d1f]" />
                    ) : department.image ? (
                      <img
                        src={department.image}
                        alt=""
                        className="h-[108px] w-[118px] max-w-none object-contain mix-blend-multiply"
                      />
                    ) : Icon ? (
                      <Icon
                        className={`h-16 w-16 ${department.accent || "text-[#1d1d1f]"}`}
                        strokeWidth={1.05}
                      />
                    ) : null}
                  </span>
                  <span className="mt-2 block text-sm font-semibold">{department.label}</span>
                </a>
              );
            })}
          </div>
        </section>

        {loading ? (
          <section className="grid min-h-[500px] place-items-center bg-white">
            <div className="text-center text-sm text-[#6e6e73]">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
              <p className="mt-3">Preparando a Loja Koda…</p>
            </div>
          </section>
        ) : error ? (
          <section className="mx-auto max-w-[1200px] px-5 py-20">
            <div className="rounded-[32px] bg-white p-12 text-center">
              <Package className="mx-auto h-9 w-9 text-[#86868b]" />
              <h2 className="mt-5 text-3xl font-semibold tracking-[-.04em]">
                A loja está temporariamente indisponível.
              </h2>
              <p className="mt-3 text-sm text-[#6e6e73]">{error}</p>
            </div>
          </section>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="bg-[#f5f5f7] pb-20">
                <div className="mx-auto max-w-[1200px] px-5">
                  <h2 className="text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
                    Novidades. <span className="text-[#6e6e73]">Veja o que está em destaque.</span>
                  </h2>
                </div>
                <div className="no-scrollbar mx-auto mt-7 flex max-w-[1280px] gap-5 overflow-x-auto px-5 pb-6">
                  {featured.map((product) => (
                    <article
                      key={product.slug}
                      className="w-[330px] shrink-0 overflow-hidden rounded-[32px] bg-white shadow-[0_12px_35px_rgba(0,0,0,.07)] transition-transform duration-300 hover:-translate-y-1 sm:w-[390px]"
                    >
                      <ProductVisual product={product} />
                      <div className="p-7 sm:p-8">
                        <p className="text-[11px] font-semibold uppercase tracking-[.09em] text-[#0071e3]">
                          {product.category || "Koda"}
                        </p>
                        <h3 className="mt-2 text-3xl font-semibold tracking-[-.05em]">
                          {product.name}
                        </h3>
                        <p className="mt-3 min-h-10 text-sm leading-relaxed text-[#6e6e73]">
                          {product.short_description ||
                            product.description ||
                            "Feito para funcionar de forma simples no ecossistema Koda."}
                        </p>
                        <div className="mt-7 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] text-[#86868b]">A partir de</p>
                            <p className="mt-1 text-lg font-semibold">
                              {money(product.unit_amount_cents, product.currency)}
                            </p>
                          </div>
                          <BuyLink product={product} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white py-20">
              <div className="mx-auto max-w-[1200px] px-5">
                <h2 className="text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
                  Mais da Koda.{" "}
                  <span className="text-[#6e6e73]">
                    Tudo conectado ao que vem depois da compra.
                  </span>
                </h2>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <a
                    href="/conta/pedidos"
                    className="group min-h-[270px] rounded-[30px] bg-[#f5f5f7] p-7 transition-transform duration-300 hover:-translate-y-1 sm:p-8"
                  >
                    <Package className="h-8 w-8 text-[#0071e3]" />
                    <h3 className="mt-14 text-3xl font-semibold tracking-[-.05em]">
                      Do pedido à sua mesa.
                    </h3>
                    <p className="mt-3 max-w-xs text-sm text-[#6e6e73]">
                      Acompanhe pagamento, preparação, envio, entrega e o histórico completo pela
                      Conta Koda.
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]">
                      Meus pedidos{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </a>
                  <a
                    href="/suporte/reparo"
                    className="group min-h-[270px] rounded-[30px] bg-[#111113] p-7 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-8"
                  >
                    <HeartHandshake className="h-8 w-8 text-white" />
                    <h3 className="mt-14 text-3xl font-semibold tracking-[-.05em]">
                      Suporte que conhece seu produto.
                    </h3>
                    <p className="mt-3 max-w-xs text-sm text-white/60">
                      Diagnóstico, reparo e histórico vinculados ao seu dispositivo, sem começar do
                      zero.
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
                      Obter suporte{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </a>
                </div>
              </div>
            </section>

            <section id="catalogo" className="bg-[#f5f5f7] py-20">
              <div className="mx-auto max-w-[1200px] px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0071e3]">Catálogo Koda</p>
                    <h2 className="mt-2 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
                      Todos os produtos.
                    </h2>
                  </div>
                </div>
                {products.length ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                      <article
                        key={product.slug}
                        className="overflow-hidden rounded-[28px] bg-white"
                      >
                        <ProductVisual product={product} compact />
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-semibold text-[#0071e3]">
                                {product.category || "Koda"}
                              </p>
                              <h3 className="mt-1 text-xl font-semibold tracking-[-.04em]">
                                {product.name}
                              </h3>
                            </div>
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${product.in_stock ? "bg-[#34c759]" : "bg-[#ff9f0a]"}`}
                              aria-label={product.in_stock ? "Disponível" : "Indisponível"}
                            />
                          </div>
                          <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-[#6e6e73]">
                            {product.short_description || product.description || "Produto Koda."}
                          </p>
                          <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="font-semibold">
                              {money(product.unit_amount_cents, product.currency)}
                            </p>
                            <BuyLink product={product} small />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-[28px] bg-white p-12 text-center">
                    <Package className="mx-auto h-8 w-8 text-[#86868b]" />
                    <p className="mt-4 text-sm text-[#6e6e73]">
                      Ainda não há produtos publicados nesta categoria.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
