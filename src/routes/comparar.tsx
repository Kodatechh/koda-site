import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Minus } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { compareSections, type ProductId } from "@/lib/koda-data";
import { supabase } from "@/integrations/supabase/client";

const title = "Compare os modelos de KodaBot — Koda";
const description = "Compare KodaBot e KodaBot Pro lado a lado.";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Compare,
});

type CatalogProduct = {
  slug: string;
  name: string;
  image_url: string | null;
  unit_amount_cents: number | null;
  currency: string;
  available: boolean;
};

type CatalogResponse = { products: CatalogProduct[] };

const ids: ProductId[] = ["kodabot-i", "kodabot-i-pro"];
const names: Record<ProductId, string> = {
  "kodabot-i": "KodaBot",
  "kodabot-i-pro": "KodaBot Pro",
};
const subtitles: Record<ProductId, string> = {
  "kodabot-i": "Tela touch. Informação à primeira vista.",
  "kodabot-i-pro": "Voz, áudio e inteligência Koda.",
};
const hrefs: Record<ProductId, string> = {
  "kodabot-i": "/kodabot",
  "kodabot-i-pro": "/kodabot-pro",
};
const checkoutHrefs: Record<ProductId, string> = {
  "kodabot-i": "/checkout/kodabot-i",
  "kodabot-i-pro": "/checkout/kodabot-i-pro",
};

function money(cents: number | null | undefined, currency = "BRL") {
  if (cents == null) return "Preço em breve";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function ProductFallback({ id }: { id: ProductId }) {
  if (id === "kodabot-i") {
    return (
      <div className="relative mx-auto h-[220px] w-[190px] sm:h-[260px] sm:w-[220px]">
        <div className="absolute inset-x-3 bottom-4 top-3 rounded-[34px] bg-[#dadce2] shadow-[inset_0_0_0_1px_rgba(0,0,0,.06),0_18px_45px_rgba(0,0,0,.08)]">
          <div className="absolute left-1/2 top-8 h-[142px] w-[104px] -translate-x-1/2 overflow-hidden rounded-[13px] bg-[#111216] sm:h-[168px] sm:w-[122px]">
            <div className="p-3 text-left text-white">
              <p className="text-[8px] font-semibold opacity-55">KODA OS</p>
              <p className="mt-5 text-2xl font-semibold tracking-[-.06em]">10:42</p>
              <div className="mt-5 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="mt-2 h-1.5 w-16 rounded-full bg-white/10" />
              <div className="mt-2 h-1.5 w-10 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[220px] w-[190px] sm:h-[260px] sm:w-[220px]">
      <div className="absolute inset-x-7 bottom-5 top-8 overflow-hidden rounded-[46px] bg-[#151517] shadow-[0_20px_48px_rgba(0,0,0,.14)]">
        <div className="absolute inset-x-5 top-7 grid grid-cols-7 gap-[5px] opacity-55">
          {Array.from({ length: 56 }).map((_, index) => (
            <span key={index} className="h-[3px] w-[3px] rounded-full bg-white/55" />
          ))}
        </div>
        <div className="absolute bottom-6 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/15" />
      </div>
    </div>
  );
}

function ProductVisual({ id, catalog }: { id: ProductId; catalog?: CatalogProduct }) {
  if (catalog?.image_url) {
    return (
      <div className="mx-auto grid h-[220px] w-full place-items-center sm:h-[260px]">
        <img
          src={catalog.image_url}
          alt={names[id]}
          className="max-h-full max-w-[280px] object-contain"
        />
      </div>
    );
  }
  return <ProductFallback id={id} />;
}

function Value({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="mx-auto h-6 w-6 stroke-[1.7] text-[#1d1d1f]" aria-label="Sim" />;
  if (value === false)
    return <Minus className="mx-auto h-6 w-6 stroke-[1.5] text-[#86868b]" aria-label="Não" />;
  return (
    <span className="mx-auto block max-w-[270px] text-center text-[13px] font-normal leading-[1.45] text-[#1d1d1f] sm:text-sm">
      {value}
    </span>
  );
}

function ProductSelector({
  value,
  other,
  onChange,
}: {
  value: ProductId;
  other: ProductId;
  onChange: (id: ProductId) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ProductId)}
        className="h-12 w-full appearance-none rounded-[12px] border border-black/20 bg-white px-4 pr-10 text-[14px] font-semibold outline-none transition-colors focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
        aria-label="Escolher modelo para comparar"
      >
        {ids.map((id) => (
          <option key={id} value={id} disabled={id === other}>
            {names[id]}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2 fill-[#1d1d1f]"
        aria-hidden="true"
      >
        <path d="M0 0h10L5 6z" />
      </svg>
    </div>
  );
}

function Compare() {
  const [left, setLeft] = useState<ProductId>("kodabot-i");
  const [right, setRight] = useState<ProductId>("kodabot-i-pro");
  const [catalog, setCatalog] = useState<Record<string, CatalogProduct>>({});

  useEffect(() => {
    let alive = true;
    supabase.functions
      .invoke<CatalogResponse>("koda-pay-catalog", { body: { list: true } })
      .then(({ data }) => {
        if (!alive || !data?.products) return;
        setCatalog(Object.fromEntries(data.products.map((product) => [product.slug, product])));
      });
    return () => {
      alive = false;
    };
  }, []);

  const compared = useMemo(() => [left, right] as const, [left, right]);

  const changeLeft = (id: ProductId) => {
    if (id === right) setRight(left);
    setLeft(id);
  };
  const changeRight = (id: ProductId) => {
    if (id === left) setLeft(right);
    setRight(id);
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="mx-auto max-w-[980px] px-5 pb-10 pt-14 sm:pb-12 sm:pt-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="max-w-[640px] text-[40px] font-semibold leading-[1.04] tracking-[-.055em] sm:text-[56px]">
              Compare os modelos de KodaBot
            </h1>
            <div className="shrink-0 space-y-2 pb-1 text-[13px] font-semibold text-[#0066cc]">
              <a href="/loja" className="flex items-center gap-0.5 hover:underline">
                Comprar KodaBot <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a href="/suporte/contato" className="flex items-center gap-0.5 hover:underline">
                Precisa de ajuda para escolher? <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[980px] px-5 pb-8">
          <div className="grid grid-cols-2 gap-5 sm:gap-10">
            <ProductSelector value={left} other={right} onChange={changeLeft} />
            <ProductSelector value={right} other={left} onChange={changeRight} />
          </div>
        </section>

        <section className="mx-auto max-w-[980px] px-5 pb-14">
          <div className="grid grid-cols-2 gap-5 sm:gap-10">
            {compared.map((id) => {
              const product = catalog[id];
              return (
                <article key={id} className="min-w-0 text-center">
                  <ProductVisual id={id} {...(product ? { catalog: product } : {})} />
                  <p className="mt-4 min-h-4 text-[11px] font-semibold text-[#bf4800]">
                    {id === "kodabot-i-pro" ? "Em desenvolvimento" : ""}
                  </p>
                  <h2 className="mt-1 text-[21px] font-semibold tracking-[-.035em] sm:text-[28px]">
                    {names[id]}
                  </h2>
                  <p className="mx-auto mt-2 max-w-[290px] min-h-10 text-[12px] leading-relaxed text-[#6e6e73] sm:text-[13px]">
                    {subtitles[id]}
                  </p>
                  <p className="mt-4 text-[13px] font-semibold">
                    {product
                      ? money(product.unit_amount_cents, product.currency)
                      : id === "kodabot-i"
                        ? "R$ 99,90"
                        : "R$ 129,90"}
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <a
                      href={checkoutHrefs[id]}
                      className={`rounded-full bg-[#0071e3] px-5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0077ed] ${product && !product.available ? "pointer-events-none opacity-35" : ""}`}
                    >
                      Comprar
                    </a>
                    <a
                      href={hrefs[id]}
                      className="flex items-center text-[12px] font-semibold text-[#0066cc] hover:underline"
                    >
                      Saiba mais <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[980px] px-5 pb-24">
          {compareSections.map((section) => (
            <section key={section.title} className="border-b border-black/[.14] py-12 sm:py-16">
              <div className="mb-9">
                <h2 className="text-[28px] font-semibold tracking-[-.04em] sm:text-[34px]">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#6e6e73]">
                    {section.description}
                  </p>
                )}
              </div>

              <div className="space-y-0">
                {section.items.map((item, index) => (
                  <div
                    key={item.label}
                    className={`${index === 0 ? "border-t" : ""} border-black/[.1] py-7`}
                  >
                    <div className="mb-5 flex items-center gap-2 text-[12px] font-semibold text-[#6e6e73] sm:text-[13px]">
                      {item.icon && <item.icon className="h-4 w-4 stroke-[1.6] text-[#86868b]" />}
                      <span>{item.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-5 sm:gap-10">
                      {compared.map((id) => (
                        <div key={id} className="min-w-0 text-center">
                          <Value value={item.values[id]} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="py-16 text-center sm:py-20">
            <h2 className="text-[32px] font-semibold tracking-[-.045em] sm:text-[42px]">
              Encontre o KodaBot ideal para você.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-[#6e6e73]">
              Compare as diferenças, conheça cada modelo e escolha o que combina mais com a forma
              como você usa a Koda.
            </p>
            <a
              href="/loja"
              className="mt-6 inline-flex items-center text-[14px] font-semibold text-[#0066cc] hover:underline"
            >
              Ver a Loja Koda <ChevronRight className="h-4 w-4" />
            </a>
          </section>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
