import { createFileRoute } from "@tanstack/react-router";
import { Check, Mic2, Minus, Monitor } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { compareSections, productNames, type ProductId } from "@/lib/koda-data";

const title = "Compare os modelos KodaBot — Koda";
const description = "Compare detalhadamente o KodaBot I e o KodaBot I Pro.";

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

const modelMeta: Record<ProductId, { href: string; subtitle: string; dark?: boolean }> = {
  "kodabot-i": { href: "/kodabot", subtitle: "Tela touch. Informação à primeira vista." },
  "kodabot-i-pro": { href: "/kodabot-pro", subtitle: "Voz. Áudio. Bateria integrada.", dark: true },
};

function ModelVisual({ id }: { id: ProductId }) {
  const pro = id === "kodabot-i-pro";
  return (
    <div className={`mx-auto grid aspect-[4/3] w-full max-w-[310px] place-items-center overflow-hidden rounded-[30px] ${pro ? "bg-black text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
      <div className="text-center">
        {pro ? <Mic2 className="mx-auto h-12 w-12 text-[#4d86ff]" /> : <Monitor className="mx-auto h-12 w-12 text-[#0071e3]" />}
        <p className="mt-5 text-lg font-semibold">{productNames[id]}</p>
        <p className={`mt-1 text-[11px] ${pro ? "text-white/40" : "text-[#86868b]"}`}>Foto oficial será adicionada</p>
      </div>
    </div>
  );
}

function Value({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-[#0071e3]" aria-label="Sim" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-[#86868b]" aria-label="Não" />;
  return <span className="block text-sm font-medium leading-relaxed">{value}</span>;
}

function Compare() {
  const ids: ProductId[] = ["kodabot-i", "kodabot-i-pro"];

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="mx-auto max-w-5xl px-5 pb-14 pt-16 sm:pt-24">
          <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Compare os modelos KodaBot.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73] sm:text-xl">
            Veja cada diferença importante — da forma de interação à energia, conectividade, KodaCloud e opções de reparo.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-10">
            {ids.map((id) => (
              <article key={id} className="text-center">
                <ModelVisual id={id} />
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#bf4800]">Em desenvolvimento</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{productNames[id]}</h2>
                <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-[#6e6e73] sm:text-sm">{modelMeta[id].subtitle}</p>
                <a href={modelMeta[id].href} className="mt-4 inline-flex rounded-full bg-[#0071e3] px-5 py-2 text-xs font-semibold text-white sm:text-sm">Saiba mais</a>
              </article>
            ))}
          </div>
        </section>

        <div className="sticky top-11 z-30 mt-8 border-y border-black/10 bg-white/92 backdrop-blur-xl">
          <div className="mx-auto grid max-w-5xl grid-cols-[minmax(115px,1fr)_repeat(2,minmax(135px,1fr))] items-center gap-x-3 px-5 py-3 text-xs sm:grid-cols-[220px_repeat(2,1fr)] sm:gap-x-8">
            <span className="font-semibold text-[#6e6e73]">Comparando</span>
            {ids.map((id) => <a key={id} href={modelMeta[id].href} className="text-center font-semibold hover:text-[#0071e3]">{productNames[id]}</a>)}
          </div>
        </div>

        <section className="mx-auto max-w-5xl px-5 pb-28">
          {compareSections.map((section) => (
            <section key={section.title} className="border-b border-black/15 py-14 sm:py-16">
              <div className="mb-8 max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{section.title}</h2>
                {section.description && <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{section.description}</p>}
              </div>

              <div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="grid grid-cols-[minmax(115px,1fr)_repeat(2,minmax(135px,1fr))] items-start gap-x-3 border-t border-black/10 py-6 sm:grid-cols-[220px_repeat(2,1fr)] sm:gap-x-8"
                    >
                      <div className="flex gap-2.5 pr-2 text-xs font-medium leading-relaxed sm:text-sm">
                        {Icon && <Icon className="mt-0.5 hidden h-4 w-4 shrink-0 text-[#86868b] sm:block" />}
                        <span>{item.label}</span>
                      </div>
                      {ids.map((id) => (
                        <div key={id} className="px-1 text-center text-[#1d1d1f]"><Value value={item.values[id]} /></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="mt-16 rounded-[30px] bg-[#f5f5f7] px-6 py-12 text-center sm:px-10">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Ainda não sabe qual escolher?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#6e6e73]">Na página inicial, o assistente “Ajude-me a escolher” faz algumas perguntas e recomenda o modelo mais adequado.</p>
            <a href="/#escolher" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Voltar para a página inicial ›</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
