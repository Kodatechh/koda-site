import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BatteryCharging,
  ChevronRight,
  Headphones,
  HeartHandshake,
  LoaderCircle,
  Package,
  ShieldCheck,
  Sparkles,
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
      { title: "Loja Koda — Produtos, KodaCare e acessórios" },
      {
        name: "description",
        content: "Compre produtos Koda, KodaCare, acessórios e serviços diretamente da Koda.",
      },
    ],
  }),
  component: StorePage,
});

function money(cents: number | null, currency = "BRL") {
  if (cents == null) return "Preço em breve";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function categoryIcon(name: string) {
  const key = name.toLowerCase();
  if (key.includes("care")) return ShieldCheck;
  if (key.includes("energia")) return BatteryCharging;
  if (key.includes("acess")) return Headphones;
  if (key.includes("serv")) return HeartHandshake;
  return Package;
}

function visualTone(product: StoreProduct) {
  if (product.slug.startsWith("kodacare")) return "bg-[#e11900] text-white";
  if (product.slug.includes("pro")) return "bg-[#0b0b0d] text-white";
  if (product.slug.startsWith("kodabot")) return "bg-[linear-gradient(145deg,#f9fbff,#e8eef8)] text-[#111216]";
  return "bg-[linear-gradient(145deg,#fafafa,#e9e9ed)] text-[#1d1d1f]";
}

function ProductVisual({ product, compact = false }: { product: StoreProduct; compact?: boolean }) {
  return (
    <div className={`relative grid overflow-hidden ${compact ? "h-48" : "h-[290px] sm:h-[330px]"} ${visualTone(product)}`}>
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-5" loading="lazy" />
      ) : (
        <div className="grid place-items-center p-8 text-center">
          <div>
            <div className={`mx-auto grid ${compact ? "h-14 w-14 text-2xl" : "h-20 w-20 text-4xl"} place-items-center rounded-[28%] bg-current/10 font-semibold tracking-[-.08em]`}>
              K
            </div>
            <p className={`${compact ? "mt-5 text-xl" : "mt-7 text-3xl"} font-semibold tracking-[-.05em]`}>{product.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BuyLink({ product, small = false }: { product: StoreProduct; small?: boolean }) {
  return (
    <a
      href={`/checkout/${product.slug}`}
      className={`inline-flex items-center justify-center rounded-full bg-[#0071e3] font-semibold text-white transition-colors hover:bg-[#0077ed] ${small ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"} ${product.available ? "" : "pointer-events-none opacity-40"}`}
    >
      {product.available ? "Comprar" : "Indisponível"}
    </a>
  );
}

function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogListResponse>("koda-pay-catalog", {
        body: { list: true },
      });
      if (!alive) return;
      if (invokeError || !data) {
        setError("Não foi possível carregar a loja agora.");
        setProducts([]);
        setCategories([]);
      } else {
        setProducts(data.products ?? []);
        setCategories(data.categories ?? []);
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

  const visibleProducts = useMemo(
    () => (selectedCategory ? products.filter((product) => product.category_id === selectedCategory) : products),
    [products, selectedCategory],
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="overflow-hidden">
        <section className="bg-[#f5f5f7] px-5 pb-10 pt-14 sm:pb-14 sm:pt-20">
          <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold text-[#0071e3]">Loja Koda</p>
              <h1 className="max-w-[850px] text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-7xl lg:text-[78px]">
                Loja. <span className="text-[#6e6e73]">Tecnologia que fica perto de você.</span>
              </h1>
            </div>
            <div className="space-y-4 pb-1 text-sm">
              <a href="/suporte" className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition-transform hover:-translate-y-0.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7]"><HeartHandshake className="h-4 w-4" /></span>
                <span><strong className="block text-xs">Precisa de ajuda?</strong><span className="text-xs text-[#0066cc]">Fale com a Koda <ChevronRight className="inline h-3 w-3" /></span></span>
              </a>
              <a href="/conta" className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition-transform hover:-translate-y-0.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7]"><Sparkles className="h-4 w-4" /></span>
                <span><strong className="block text-xs">Já tem um produto Koda?</strong><span className="text-xs text-[#0066cc]">Acesse sua Conta Koda <ChevronRight className="inline h-3 w-3" /></span></span>
              </a>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="grid min-h-[500px] place-items-center bg-white">
            <div className="text-center text-sm text-[#6e6e73]"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" /><p className="mt-3">Preparando a Loja Koda…</p></div>
          </section>
        ) : error ? (
          <section className="mx-auto max-w-[1200px] px-5 py-20"><div className="rounded-[32px] bg-white p-12 text-center"><Package className="mx-auto h-9 w-9 text-[#86868b]" /><h2 className="mt-5 text-3xl font-semibold tracking-[-.04em]">A loja está temporariamente indisponível.</h2><p className="mt-3 text-sm text-[#6e6e73]">{error}</p></div></section>
        ) : (
          <>
            <section className="bg-[#f5f5f7] pb-14">
              <div className="mx-auto max-w-[1200px] px-5">
                <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 sm:gap-5">
                  <button type="button" onClick={() => setSelectedCategory(null)} className="group min-w-[118px] text-center">
                    <span className={`mx-auto grid h-[98px] w-[98px] place-items-center rounded-[32px] transition-transform duration-300 group-hover:-translate-y-1 ${selectedCategory === null ? "bg-[#1d1d1f] text-white" : "bg-white text-[#1d1d1f]"}`}><Sparkles className="h-8 w-8" strokeWidth={1.4} /></span>
                    <span className="mt-3 block text-xs font-semibold">Todos</span>
                  </button>
                  {categories.map((category) => {
                    const Icon = categoryIcon(category.name);
                    const active = selectedCategory === category.id;
                    return (
                      <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className="group min-w-[118px] text-center">
                        <span className={`mx-auto grid h-[98px] w-[98px] place-items-center rounded-[32px] transition-transform duration-300 group-hover:-translate-y-1 ${category.slug === "kodacare" ? "bg-[#e11900] text-white" : active ? "bg-[#1d1d1f] text-white" : "bg-white text-[#1d1d1f]"}`}><Icon className="h-8 w-8" strokeWidth={1.35} /></span>
                        <span className="mt-3 block text-xs font-semibold">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {!selectedCategory && featured.length > 0 && (
              <section className="bg-[#f5f5f7] pb-20">
                <div className="mx-auto max-w-[1200px] px-5">
                  <h2 className="text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Novidades. <span className="text-[#6e6e73]">Veja o que está em destaque.</span></h2>
                </div>
                <div className="no-scrollbar mx-auto mt-7 flex max-w-[1280px] gap-5 overflow-x-auto px-5 pb-6">
                  {featured.map((product) => (
                    <article key={product.slug} className="w-[330px] shrink-0 overflow-hidden rounded-[32px] bg-white shadow-[0_12px_35px_rgba(0,0,0,.07)] transition-transform duration-300 hover:-translate-y-1 sm:w-[390px]">
                      <ProductVisual product={product} />
                      <div className="p-7 sm:p-8">
                        <p className={`text-[11px] font-semibold uppercase tracking-[.09em] ${product.slug.startsWith("kodacare") ? "text-[#e11900]" : "text-[#0071e3]"}`}>{product.category || "Koda"}</p>
                        <h3 className="mt-2 text-3xl font-semibold tracking-[-.05em]">{product.name}</h3>
                        <p className="mt-3 min-h-10 text-sm leading-relaxed text-[#6e6e73]">{product.short_description || product.description || "Feito para funcionar de forma simples no ecossistema Koda."}</p>
                        <div className="mt-7 flex items-end justify-between gap-4">
                          <div><p className="text-[11px] text-[#86868b]">A partir de</p><p className="mt-1 text-lg font-semibold">{money(product.unit_amount_cents, product.currency)}</p></div>
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
                <h2 className="text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Mais da Koda. <span className="text-[#6e6e73]">Tudo conectado ao que vem depois da compra.</span></h2>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <a href="/kodacare" className="group min-h-[270px] overflow-hidden rounded-[30px] bg-[#e11900] p-7 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                    <ShieldCheck className="h-8 w-8" /><h3 className="mt-14 text-3xl font-semibold tracking-[-.05em]">KodaCare.</h3><p className="mt-3 max-w-xs text-sm text-white/78">Cobertura vinculada ao seu KodaBot, acompanhamento e assistência em um só lugar.</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">Conhecer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </a>
                  <a href="/conta/pedidos" className="group min-h-[270px] rounded-[30px] bg-[#f5f5f7] p-7 transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                    <Package className="h-8 w-8 text-[#0071e3]" /><h3 className="mt-14 text-3xl font-semibold tracking-[-.05em]">Do pedido à sua mesa.</h3><p className="mt-3 max-w-xs text-sm text-[#6e6e73]">Acompanhe pagamento, preparação, envio, entrega e o histórico completo pela Conta Koda.</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]">Meus pedidos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </a>
                  <a href="/suporte/reparo" className="group min-h-[270px] rounded-[30px] bg-[#111113] p-7 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-8">
                    <HeartHandshake className="h-8 w-8 text-white" /><h3 className="mt-14 text-3xl font-semibold tracking-[-.05em]">Suporte que conhece seu produto.</h3><p className="mt-3 max-w-xs text-sm text-white/60">Diagnóstico, reparo e histórico vinculados ao seu dispositivo, sem começar do zero.</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">Obter suporte <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </a>
                </div>
              </div>
            </section>

            <section className="bg-[#f5f5f7] py-20">
              <div className="mx-auto max-w-[1200px] px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-sm font-semibold text-[#0071e3]">Catálogo Koda</p><h2 className="mt-2 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : "Todos os produtos"}.</h2></div>
                  {selectedCategory && <button type="button" onClick={() => setSelectedCategory(null)} className="text-sm font-semibold text-[#0066cc]">Ver todos ›</button>}
                </div>
                {visibleProducts.length ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleProducts.map((product) => (
                      <article key={product.slug} className="overflow-hidden rounded-[28px] bg-white">
                        <ProductVisual product={product} compact />
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold text-[#0071e3]">{product.category || "Koda"}</p><h3 className="mt-1 text-xl font-semibold tracking-[-.04em]">{product.name}</h3></div><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${product.in_stock ? "bg-[#34c759]" : "bg-[#ff9f0a]"}`} aria-label={product.in_stock ? "Disponível" : "Indisponível"} /></div>
                          <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-[#6e6e73]">{product.short_description || product.description || "Produto Koda."}</p>
                          <div className="mt-6 flex items-center justify-between gap-4"><p className="font-semibold">{money(product.unit_amount_cents, product.currency)}</p><BuyLink product={product} small /></div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-[28px] bg-white p-12 text-center"><Package className="mx-auto h-8 w-8 text-[#86868b]" /><p className="mt-4 text-sm text-[#6e6e73]">Ainda não há produtos publicados nesta categoria.</p></div>
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
