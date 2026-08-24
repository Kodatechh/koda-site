import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  Headphones,
  LoaderCircle,
  Package,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type StoreProduct = {
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string | null;
  product_type: "physical" | "digital" | "service" | "coverage" | "subscription";
  image_url: string | null;
  available: boolean;
  currency: string;
  unit_amount_cents: number | null;
  in_stock: boolean;
  sales_mode?: "preorder" | "standard" | "waitlist";
  waitlist_enabled?: boolean;
  preorder_price_cents?: number | null;
  regular_price_cents?: number | null;
};

type CatalogListResponse = { products: StoreProduct[] };

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja Koda — KodaBot e acessórios" },
      {
        name: "description",
        content: "Compre o KodaBot, acessórios e encontre ajuda para escolher.",
      },
    ],
  }),
  component: StorePage,
});

function money(cents: number | null, currency = "BRL") {
  if (cents == null) return "Preço em breve";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.functions
      .invoke<CatalogListResponse>("koda-pay-catalog", { body: { list: true } })
      .then(({ data, error: invokeError }) => {
        if (!alive) return;
        setError(Boolean(invokeError || !data));
        setProducts(
          (data?.products ?? []).filter((product) => !product.slug.startsWith("kodacare")),
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const kodaBot = useMemo(
    () => products.find((product) => product.slug === "kodabot-i") ?? null,
    [products],
  );
  const pro = useMemo(
    () => products.find((product) => product.slug === "kodabot-i-pro") ?? null,
    [products],
  );
  const accessories = useMemo(
    () => products.filter((product) => !product.slug.startsWith("kodabot-i")),
    [products],
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 py-3 text-center text-xs sm:text-sm">
          Pré-venda do KodaBot por R$ 99,90 até 16/10. Envios a partir de 17/10.{" "}
          <a href="/comprar" className="font-semibold text-[#0066cc]">
            Comprar ›
          </a>
        </section>

        <section className="px-5 pb-12 pt-16 sm:pb-16 sm:pt-24">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <p className="text-sm font-semibold text-[#0071e3]">Loja Koda</p>
                <h1 className="mt-3 max-w-[850px] text-6xl font-semibold leading-[.94] tracking-[-.075em] sm:text-8xl">
                  Tudo para começar bem com seu Koda.
                </h1>
              </div>
              <div className="space-y-3">
                <a
                  href="/comprar"
                  className="group flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-sm"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eef6ff] text-[#0071e3]">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">Não sabe por onde começar?</strong>
                    <span className="mt-1 block text-xs text-[#0066cc]">Use a compra guiada</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#86868b]" />
                </a>
                <a
                  href="/conta/pedidos"
                  className="group flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-sm"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f5f5f7]">
                    <Package className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">Já comprou?</strong>
                    <span className="mt-1 block text-xs text-[#0066cc]">
                      Acompanhe sua pré-venda
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#86868b]" />
                </a>
              </div>
            </div>

            <div className="mt-12 flex gap-3 overflow-x-auto pb-2">
              <QuickLink href="#kodabot" label="KodaBot" />
              <QuickLink href="#acessorios" label="Acessórios" />
              <QuickLink href="/comparar" label="Comparar" />
              <QuickLink href="/comprar" label="Compra guiada" />
              <QuickLink href="/trade-in" label="Trade In" />
              <QuickLink href="/suporte" label="Suporte" />
            </div>
          </div>
        </section>

        {loading ? (
          <section className="grid min-h-[540px] place-items-center bg-white">
            <div className="text-center text-sm text-[#6e6e73]">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
              <p className="mt-3">Preparando a loja…</p>
            </div>
          </section>
        ) : error ? (
          <section className="mx-auto max-w-[1180px] px-5 pb-24">
            <div className="rounded-[36px] bg-white p-12 text-center">
              <h2 className="text-3xl font-semibold">A loja está temporariamente indisponível.</h2>
              <p className="mt-3 text-sm text-[#6e6e73]">Tente novamente em alguns instantes.</p>
            </div>
          </section>
        ) : (
          <>
            {kodaBot && (
              <section id="kodabot" className="px-3 pb-3">
                <article className="mx-auto grid min-h-[720px] max-w-[1400px] overflow-hidden rounded-[44px] bg-white lg:grid-cols-[.92fr_1.08fr]">
                  <div className="flex flex-col justify-center p-8 sm:p-14 lg:p-20">
                    <p className="text-sm font-semibold text-[#0071e3]">Pré-venda</p>
                    <h2 className="mt-3 text-6xl font-semibold tracking-[-.07em] sm:text-7xl">
                      KodaBot
                    </h2>
                    <p className="mt-4 max-w-lg text-2xl font-semibold tracking-[-.035em] text-[#6e6e73]">
                      Simples, útil e bonito para o seu dia.
                    </p>
                    <p className="mt-7 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
                      Tela touch, KODA OS e informações rápidas. Cabo Micro USB incluído; adaptador
                      de tomada disponível como acessório.
                    </p>
                    <p className="mt-8 text-3xl font-semibold tracking-[-.04em]">
                      {money(kodaBot.unit_amount_cents, kodaBot.currency)}
                    </p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      Envios a partir de 17 de outubro de 2026.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <a
                        href="/comprar"
                        className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
                      >
                        Comprar com ajuda
                      </a>
                      <a
                        href="/checkout/kodabot-i"
                        className="rounded-full border border-[#0071e3] px-6 py-3 text-sm font-semibold text-[#0066cc]"
                      >
                        Comprar direto
                      </a>
                    </div>
                    <a
                      href="/kodabot"
                      className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]"
                    >
                      Conhecer todos os detalhes <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="relative grid min-h-[460px] place-items-center bg-[radial-gradient(circle_at_center,#e9f2ff_0%,#f8faff_48%,#fff_75%)] p-8">
                    <img
                      src="/kodabot-checkout-transparent-v1.png"
                      alt="KodaBot"
                      className="h-full max-h-[690px] w-full object-contain drop-shadow-[0_35px_35px_rgba(24,43,74,.15)]"
                    />
                  </div>
                </article>
              </section>
            )}

            <section className="px-3 pb-3">
              <div className="mx-auto grid max-w-[1400px] gap-3 lg:grid-cols-2">
                {pro && (
                  <article className="relative min-h-[570px] overflow-hidden rounded-[44px] bg-[#0b0c0e] p-8 text-white sm:p-12">
                    <p className="text-sm font-semibold text-[#2997ff]">Em desenvolvimento</p>
                    <h2 className="mt-3 text-5xl font-semibold tracking-[-.06em] sm:text-6xl">
                      KodaBot Pro
                    </h2>
                    <p className="mt-4 max-w-md text-lg text-white/55">
                      Voz, áudio e inteligência Koda.
                    </p>
                    <p className="mt-7 text-sm font-semibold">
                      Pré-venda futura: {money(pro.preorder_price_cents ?? 12990, pro.currency)}
                    </p>
                    <p className="mt-2 text-xs text-white/45">
                      Após o lançamento: {money(pro.regular_price_cents ?? 19990, pro.currency)}
                    </p>
                    <a
                      href="/kodabot-pro#lista-de-espera"
                      className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold"
                    >
                      Entrar na lista
                    </a>
                    <div className="absolute inset-x-10 bottom-10 flex h-40 items-center justify-center gap-2 rounded-[36px] border border-white/10 bg-white/[.035]">
                      {[40, 84, 122, 74, 142, 92, 52].map((height, index) => (
                        <span
                          key={index}
                          className="w-3 rounded-full bg-[#4d86ff]"
                          style={{ height }}
                        />
                      ))}
                    </div>
                  </article>
                )}

                <article className="relative min-h-[570px] overflow-hidden rounded-[44px] bg-[#edf8f0] p-8 sm:p-12">
                  <Recycle className="h-8 w-8 text-[#248a3d]" />
                  <p className="mt-8 text-sm font-semibold text-[#248a3d]">Koda Trade In</p>
                  <h2 className="mt-3 text-5xl font-semibold tracking-[-.06em]">
                    Troque. Economize. Recicle.
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-[#58715f]">
                    Integre seu aparelho antigo à compra. O envio para análise é gratuito e você só
                    usa o crédito depois de aceitar a oferta.
                  </p>
                  <a
                    href="/comprar"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#176b37]"
                  >
                    Começar na compra guiada <ArrowRight className="h-4 w-4" />
                  </a>
                  <div className="absolute bottom-10 left-8 right-8 rounded-[28px] bg-white/80 p-6 backdrop-blur sm:left-12 sm:right-12">
                    <p className="text-xs text-[#6e6e73]">Crédito estimado</p>
                    <p className="mt-2 text-2xl font-semibold">Até R$ 79,90</p>
                    <p className="mt-2 text-xs text-[#6e6e73]">
                      Também aceitamos aparelhos com danos.
                    </p>
                  </div>
                </article>
              </div>
            </section>

            <section id="acessorios" className="px-5 py-24 sm:py-32">
              <div className="mx-auto max-w-[1180px]">
                <p className="text-sm font-semibold text-[#0071e3]">Acessórios</p>
                <h2 className="mt-2 text-5xl font-semibold tracking-[-.06em] sm:text-6xl">
                  Complete seu KodaBot.
                </h2>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {accessories.map((product) => (
                    <article key={product.slug} className="overflow-hidden rounded-[34px] bg-white">
                      <div className="grid h-72 place-items-center bg-[#fafafa] p-8">
                        <img
                          src={product.image_url ?? "/koda-adaptador-usb-2a.webp"}
                          alt={product.name}
                          className="h-full w-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="p-7">
                        <p className="text-xs font-semibold text-[#0071e3]">Acessório Koda</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
                          {product.name}
                        </h3>
                        <p className="mt-3 min-h-10 text-xs leading-relaxed text-[#6e6e73]">
                          {product.short_description ?? product.description}
                        </p>
                        <div className="mt-7 flex items-center justify-between gap-4">
                          <strong>{money(product.unit_amount_cents, product.currency)}</strong>
                          <a
                            href={`/checkout/${product.slug}`}
                            className="rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white"
                          >
                            Comprar
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white px-5 py-20">
              <div className="mx-auto grid max-w-[1180px] gap-4 sm:grid-cols-3">
                <Service
                  icon={Truck}
                  title="Entrega calculada"
                  text="Compare o frete para seu CEP antes de pagar."
                  href="/comprar"
                />
                <Service
                  icon={ShieldCheck}
                  title="KodaCare+"
                  text="Cobertura vinculada à conta depois da ativação."
                  href="/kodacare"
                />
                <Service
                  icon={Headphones}
                  title="Ajuda de verdade"
                  text="Suporte, pedidos e reparos em um só lugar."
                  href="/suporte"
                />
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="shrink-0 rounded-full bg-white px-5 py-2.5 text-xs font-semibold shadow-sm"
    >
      {label}
    </a>
  );
}

function Service({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof Truck;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <a href={href} className="group rounded-[30px] bg-[#f5f5f7] p-7">
      <Icon className="h-7 w-7 text-[#0071e3]" />
      <h3 className="mt-10 text-xl font-semibold tracking-[-.035em]">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">{text}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]">
        Saiba mais <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
      </span>
    </a>
  );
}
