import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, Package, Search, ShoppingBag } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type StoreProduct = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  product_type: "physical" | "digital" | "service" | "coverage";
  image_url: string | null;
  available: boolean;
  currency: string;
  unit_amount_cents: number;
  in_stock: boolean;
};

type CatalogListResponse = { products: StoreProduct[] };

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja Koda — Produtos e serviços" },
      {
        name: "description",
        content: "Conheça os produtos, acessórios, serviços e coberturas disponíveis na Koda.",
      },
    ],
  }),
  component: StorePage,
});

function money(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function typeLabel(type: StoreProduct["product_type"]) {
  return {
    physical: "Produto",
    digital: "Digital",
    service: "Serviço",
    coverage: "Cobertura",
  }[type];
}

function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogListResponse>(
        "koda-pay-catalog",
        { body: { list: true } },
      );
      if (!alive) return;
      if (invokeError || !data) {
        setError("Não foi possível carregar a Loja Koda agora.");
        setProducts([]);
      } else {
        setProducts(data.products ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[]))],
    [products],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
      const matchesSearch =
        !term ||
        `${product.name} ${product.description ?? ""} ${product.category ?? ""}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
          <p className="text-sm font-semibold text-[#0071e3]">Loja Koda</p>
          <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Tudo da Koda, em um só lugar.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73] sm:text-xl">
            Produtos, acessórios, serviços e coberturas publicados diretamente pelo catálogo oficial da Koda.
          </p>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 py-12 sm:py-16">
          <div className="flex flex-col gap-4 rounded-[28px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <label className="flex h-11 flex-1 items-center gap-3 rounded-full bg-[#f5f5f7] px-4 sm:max-w-md">
              <Search className="h-4 w-4 text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar na Loja Koda"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    category === item ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-[420px] place-items-center">
              <div className="text-center text-sm text-[#6e6e73]">
                <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
                <p className="mt-3">Carregando produtos…</p>
              </div>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-[32px] bg-white p-12 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-[#86868b]" />
              <h2 className="mt-5 text-2xl font-semibold">Loja indisponível.</h2>
              <p className="mt-2 text-sm text-[#6e6e73]">{error}</p>
            </div>
          ) : visible.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product) => {
                const genericPhysical = product.product_type === "physical" && !product.slug.startsWith("kodabot");
                return (
                  <article key={product.slug} className="flex min-h-[460px] flex-col overflow-hidden rounded-[32px] bg-white">
                    <div className="grid h-64 place-items-center overflow-hidden bg-[#f0f0f2]">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="h-14 w-14 text-[#b7b7bc]" strokeWidth={1.35} />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <div className="flex items-center justify-between gap-4 text-[11px] font-semibold">
                        <span className="text-[#0071e3]">{product.category || typeLabel(product.product_type)}</span>
                        <span className={product.in_stock ? "text-[#248a3d]" : "text-[#bf4800]"}>
                          {product.in_stock ? "Disponível" : "Sem estoque"}
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em]">{product.name}</h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#6e6e73]">
                        {product.description || "Produto Koda."}
                      </p>
                      <div className="mt-auto pt-7">
                        <p className="text-2xl font-semibold tracking-[-.035em]">{money(product.unit_amount_cents, product.currency)}</p>
                        {genericPhysical ? (
                          <p className="mt-4 text-xs leading-relaxed text-[#86868b]">
                            Disponível no catálogo. A compra online deste item físico será habilitada quando a entrega estiver configurada.
                          </p>
                        ) : (
                          <a
                            href={`/checkout/${product.slug}`}
                            className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                              product.available ? "bg-[#0071e3] text-white hover:bg-[#0077ed]" : "pointer-events-none bg-[#e8e8ed] text-[#86868b]"
                            }`}
                          >
                            {product.available ? "Comprar" : "Indisponível"} <ArrowRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[32px] bg-white p-12 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-[#86868b]" />
              <h2 className="mt-5 text-2xl font-semibold">Nenhum produto encontrado.</h2>
              <p className="mt-2 text-sm text-[#6e6e73]">Tente outra busca ou categoria.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
