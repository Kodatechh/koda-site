import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
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

const ids: ProductId[] = ["kodabot-i", "kodabot-i-pro"];
const modelMeta: Record<ProductId, { href: string; eyebrow: string; subtitle: string }> = {
  "kodabot-i": {
    href: "/kodabot",
    eyebrow: "Tela touch",
    subtitle: "Informação à primeira vista.",
  },
  "kodabot-i-pro": {
    href: "/kodabot-pro",
    eyebrow: "Voz e áudio",
    subtitle: "Bateria integrada e controles físicos.",
  },
};

function ProductVisual({ id }: { id: ProductId }) {
  if (id === "kodabot-i")
    return (
      <div className="flex h-[220px] items-center justify-center sm:h-[310px]">
        <img
          src="/kodabot-white.jpg"
          alt="KodaBot I"
          className="h-full w-full object-contain mix-blend-multiply"
        />
      </div>
    );
  return (
    <div
      className="flex h-[220px] items-center justify-center sm:h-[310px]"
      aria-label="Representação do KodaBot I Pro"
    >
      <div className="relative h-36 w-36 rounded-[38px] bg-gradient-to-b from-[#29292b] to-black shadow-[0_24px_50px_rgba(0,0,0,.25)] sm:h-48 sm:w-48 sm:rounded-[50px]">
        <div className="absolute inset-x-8 top-7 flex justify-between">
          <span className="h-2 w-2 rounded-full bg-[#2997ff]" />
          <span className="h-2 w-2 rounded-full bg-white/25" />
        </div>
        <div className="absolute inset-x-8 bottom-8 h-1 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

function Value({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <>
        <Check className="mx-auto h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Sim</span>
      </>
    );
  if (value === false)
    return (
      <>
        <Minus className="mx-auto h-5 w-5 text-[#86868b]" aria-hidden="true" />
        <span className="sr-only">Não</span>
      </>
    );
  return <span className="block text-[12px] font-medium leading-[1.45] sm:text-sm">{value}</span>;
}

function Compare() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <header className="mx-auto max-w-[1024px] px-5 pb-12 pt-16 text-center sm:pb-16 sm:pt-24 lg:px-3">
          <p className="text-sm font-semibold text-[#6e6e73]">KodaBot</p>
          <h1 className="mt-2 text-[42px] font-semibold leading-[1.05] tracking-[-.055em] sm:text-6xl">
            Qual KodaBot combina com você?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Compare os dois modelos em desenvolvimento usando apenas as especificações confirmadas
            pela Koda.
          </p>
        </header>

        <section className="mx-auto max-w-[1024px] px-5 lg:px-3" aria-label="Modelos comparados">
          <div className="grid grid-cols-2 gap-x-5 sm:gap-x-12">
            {ids.map((id) => (
              <article key={id} className="border-b border-black/15 pb-9 text-center">
                <ProductVisual id={id} />
                <p className="mt-7 text-[11px] font-semibold text-[#bf4800]">Em desenvolvimento</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.035em] sm:text-3xl">
                  {productNames[id]}
                </h2>
                <p className="mt-2 text-xs font-semibold sm:text-sm">{modelMeta[id].eyebrow}</p>
                <p className="mx-auto mt-1 min-h-10 max-w-[250px] text-[11px] leading-relaxed text-[#6e6e73] sm:text-sm">
                  {modelMeta[id].subtitle}
                </p>
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a
                    href={modelMeta[id].href}
                    className="rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0077ed]"
                  >
                    Saiba mais
                  </a>
                  {id === "kodabot-i" && (
                    <a
                      href="/kodabot-i/comprar"
                      className="text-xs font-semibold text-[#0066cc] hover:underline"
                    >
                      Comprar ›
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="sticky top-12 z-30 border-b border-black/10 bg-white/90 backdrop-blur-2xl">
          <div className="mx-auto grid max-w-[1024px] grid-cols-[90px_repeat(2,minmax(0,1fr))] items-center gap-x-3 px-5 py-3 sm:grid-cols-[210px_repeat(2,1fr)] sm:gap-x-10 lg:px-3">
            <span className="text-[10px] font-semibold text-[#6e6e73] sm:text-xs">Comparar</span>
            {ids.map((id) => (
              <a
                key={id}
                href={modelMeta[id].href}
                className="truncate text-center text-[11px] font-semibold hover:text-[#0066cc] sm:text-sm"
              >
                {productNames[id]}
              </a>
            ))}
          </div>
        </div>

        <section className="mx-auto max-w-[1024px] px-5 pb-24 lg:px-3">
          {compareSections.map((section) => (
            <section key={section.title} className="border-b border-black/15 py-12 sm:py-16">
              <h2 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
                {section.title}
              </h2>
              {section.description && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#6e6e73] sm:text-sm">
                  {section.description}
                </p>
              )}
              <div className="mt-7">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="grid grid-cols-[90px_repeat(2,minmax(0,1fr))] items-start gap-x-3 border-t border-black/[.09] py-5 sm:grid-cols-[210px_repeat(2,1fr)] sm:gap-x-10 sm:py-6"
                    >
                      <div className="flex gap-2 text-[10px] font-medium leading-relaxed text-[#424245] sm:text-sm">
                        {Icon && (
                          <Icon className="mt-0.5 hidden h-4 w-4 shrink-0 text-[#86868b] sm:block" />
                        )}
                        <span>{item.label}</span>
                      </div>
                      {ids.map((id) => (
                        <div key={id} className="px-1 text-center">
                          <Value value={item.values[id]} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
              Conheça a família KodaBot.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
              Explore cada modelo em detalhes ou use o assistente da Koda para descobrir qual se
              encaixa melhor na sua rotina.
            </p>
            <a
              href="/#escolher"
              className="mt-6 inline-flex text-sm font-semibold text-[#0066cc] hover:underline"
            >
              Ajude-me a escolher ›
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
