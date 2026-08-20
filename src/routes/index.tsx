import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Cloud, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { ProductPhotoSlot } from "@/components/koda/ProductPhotoSlot";
import { ProductQuiz } from "@/components/koda/ProductQuiz";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Koda — tecnologia para o seu dia" },
      {
        name: "description",
        content: "Conheça o KodaBot, o KodaBot Pro, o KODA OS e a KodaCloud.",
      },
      { property: "og:title", content: "Koda — tecnologia para o seu dia" },
      {
        property: "og:description",
        content: "Conheça os produtos e serviços da Koda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <div id="top" className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />

      <main className="space-y-3 pb-3">
        <section className="relative overflow-hidden bg-white text-center">
          <div className="mx-auto max-w-6xl px-5 pb-0 pt-14 sm:pt-20">
            <p className="text-sm font-semibold text-[#0071e3]">Pré-venda por R$ 99,90</p>
            <h1 className="mt-1 text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">KodaBot</h1>
            <p className="mx-auto mt-3 max-w-xl text-xl font-medium tracking-[-0.02em] sm:text-2xl">
              Simples, útil e bonito para o seu dia.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[15px]">
              <a href="/kodabot" className="font-medium text-[#0066cc] hover:underline">
                Saiba mais ›
              </a>
              <a
                href="/checkout/kodabot-i"
                className="rounded-full bg-[#0071e3] px-5 py-2.5 font-medium text-white"
              >
                Comprar
              </a>
            </div>

            <a
              href="/kodabot"
              className="mx-auto mt-8 block max-w-[1100px]"
              aria-label="Conhecer o KodaBot"
            >
              <div className="relative h-[390px] overflow-hidden sm:h-[590px]">
                <img
                  src="/kodabot-home-hero-v3.png"
                  alt="KodaBot com corpo transparente e tela KODA OS"
                  className="h-full w-full object-cover object-center"
                  fetchPriority="high"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>
            </a>
          </div>
        </section>

        <section className="overflow-hidden bg-[#f5f5f7] px-5 py-24 text-center sm:py-36">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-[#0066cc]">KODA OS</p>
            <h2 className="mt-1 text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">
              Feito para funcionar de forma simples.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-xl font-medium text-[#6e6e73] sm:text-2xl">
              Ligue, conecte e use. O essencial aparece quando você precisa.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-5">
              <a
                href="/kodaos"
                className="rounded-full bg-[#0071e3] px-5 py-2.5 text-[15px] font-medium text-white hover:bg-[#0077ed]"
              >
                Conhecer o KODA OS
              </a>
              <a
                href="/kodaos/updates"
                className="py-2.5 text-[15px] font-medium text-[#0066cc] hover:underline"
              >
                Atualizações ›
              </a>
            </div>
            <div className="mx-auto mt-16 max-w-5xl">
              <ProductPhotoSlot
                label="Aguardando kodabot-i-kodaos-dark"
                className="h-[420px] sm:h-[620px]"
                dark
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 px-3 lg:grid-cols-2">
          <article
            id="kodabot-pro"
            className="relative min-h-[610px] overflow-hidden bg-[#000] px-6 pt-14 text-center text-white sm:px-10"
          >
            <p className="text-sm font-semibold text-white/55">KodaBot Pro</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              KodaBot Pro
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium text-white/78 sm:text-xl">
              A experiência Koda, agora feita para conversar.
            </p>
            <a
              href="/kodabot-pro"
              className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-[#2997ff] hover:underline"
            >
              Saiba mais <span>›</span>
            </a>

            <div className="absolute inset-x-0 bottom-0 flex h-[350px] items-center justify-center overflow-hidden">
              {/* Visual abstrato de voz: não representa a aparência física final do produto. */}
              <div className="relative flex h-48 w-[min(520px,86%)] items-center justify-center gap-2 rounded-[48px] border border-white/10 bg-white/[0.04] px-8 shadow-[0_30px_100px_rgba(35,90,255,.12)] backdrop-blur">
                {[34, 72, 112, 150, 92, 130, 58, 102, 44].map((height, index) => (
                  <span
                    key={index}
                    className="w-3 rounded-full bg-[#4d86ff] shadow-[0_0_20px_rgba(77,134,255,.55)]"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </article>

          <article className="relative min-h-[610px] overflow-hidden bg-white px-6 pt-14 text-center sm:px-10">
            <p className="text-sm font-semibold text-[#6e6e73]">KodaCloud</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Uma conta. Todos os seus KodaBots.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium text-[#424245] sm:text-xl">
              Ativação, garantia, suporte e informações do seu produto em um só lugar.
            </p>
            <a
              href="/conta"
              className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline"
            >
              Minha Conta KodaCloud <span>›</span>
            </a>
            <div className="absolute inset-x-0 bottom-12 mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,white,#dce8ff_38%,#88aef8_70%,#315bba)] shadow-[0_35px_90px_rgba(57,101,190,.25)]">
              <Cloud className="h-24 w-24 text-white drop-shadow-lg" />
            </div>
          </article>
        </section>

        <section className="relative overflow-hidden bg-[#f5f5f7] px-5 py-24 text-center sm:py-32">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#0071e3]" />
          <p className="mt-6 text-sm font-semibold text-[#0071e3]">KodaCare</p>
          <h2 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
            Mais cuidado para o seu KodaBot.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Garantia estendida e proteção contra danos acidentais com franquia no KodaCare+.
          </p>
          <a
            href="/kodacare"
            className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Conhecer o KodaCare
          </a>
        </section>

        <section className="grid gap-3 px-3 lg:grid-cols-2">
          <article
            id="escolher"
            className="relative min-h-[520px] overflow-hidden bg-[#eef5ff] px-6 pt-14 text-center sm:px-10"
          >
            <p className="text-sm font-semibold text-[#6e6e73]">Escolha seu KodaBot</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Qual KodaBot combina com você?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium text-[#424245]">
              Compare os modelos ou responda algumas perguntas e veja nossa recomendação.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-4">
              <a
                href="/comparar"
                className="inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline"
              >
                Comparar modelos <span>›</span>
              </a>
              <button
                onClick={() => setQuizOpen(true)}
                className="inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline"
              >
                <Sparkles className="h-4 w-4" /> Ajude-me a escolher
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-10 mx-auto grid h-56 max-w-md grid-cols-2 gap-4 px-8">
              <div className="grid place-items-center rounded-[32px] bg-white shadow-xl">
                <div>
                  <p className="text-2xl font-semibold">KodaBot</p>
                  <p className="mt-1 text-xs text-[#86868b]">Tela touch</p>
                </div>
              </div>
              <div className="grid place-items-center rounded-[32px] bg-[#111] text-white shadow-xl">
                <div>
                  <p className="text-2xl font-semibold">Pro</p>
                  <p className="mt-1 text-xs text-white/50">Voz</p>
                </div>
              </div>
            </div>
          </article>

          <article className="relative min-h-[520px] overflow-hidden bg-white px-6 pt-14 text-center sm:px-10">
            <p className="text-sm font-semibold text-[#6e6e73]">Suporte Koda</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Ajuda quando você precisar.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium text-[#424245]">
              Configuração, reparo, garantia, manuais e atendimento para os produtos Koda.
            </p>
            <a
              href="/suporte"
              className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline"
            >
              Acessar suporte <ArrowUpRight className="h-4 w-4" />
            </a>
            <div className="absolute inset-x-0 bottom-0 mx-auto grid h-64 w-64 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,white,#eff5ff_38%,#a9c5ff_70%,#5680d8)] opacity-95 shadow-[0_35px_90px_rgba(57,101,190,.20)]">
              <UserRound className="h-24 w-24 text-white" />
            </div>
          </article>
        </section>
      </main>

      <SiteFooter />
      <ProductQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </div>
  );
}
