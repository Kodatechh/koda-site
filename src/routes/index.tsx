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
        content: "Conheça o KodaBot, o KodaBot Pro, o KODA OS, o KodaCare e a Conta Koda.",
      },
      { property: "og:title", content: "Koda — tecnologia para o seu dia" },
      { property: "og:description", content: "Produtos e serviços Koda, feitos para funcionar de forma simples." },
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
          <div className="mx-auto max-w-[1200px] px-5 pb-0 pt-16 sm:pt-24">
            <p className="text-sm font-semibold text-[#0071e3]">KodaBot</p>
            <h1 className="mx-auto mt-2 max-w-5xl text-6xl font-semibold tracking-[-.065em] sm:text-8xl lg:text-[104px] lg:leading-[.94]">
              O essencial, bem na sua mesa.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium leading-snug tracking-[-.025em] text-[#6e6e73] sm:text-2xl">
              Hora, clima, tarefas e alarmes em uma experiência simples, feita pela Koda.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[15px]">
              <a href="/kodabot" className="font-medium text-[#0066cc] hover:underline">
                Saiba mais ›
              </a>
              <a href="/kodabot-i/comprar" className="rounded-full bg-[#0071e3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0077ed]">
                Comprar
              </a>
            </div>
            <p className="mt-4 text-xs font-medium text-[#86868b]">Pré-venda por R$ 99,90</p>

            <a href="/kodabot" className="mt-10 block" aria-label="Conhecer o KodaBot">
              <ProductPhotoSlot label="KodaBot" className="mx-auto h-[430px] max-w-5xl sm:h-[620px]" />
            </a>
          </div>
        </section>

        <section className="overflow-hidden bg-black px-5 py-24 text-center text-white sm:py-36">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-[#2997ff]">KODA OS</p>
            <h2 className="mx-auto mt-2 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
              Feito para desaparecer no seu dia.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium leading-relaxed text-white/60 sm:text-2xl">
              Ligue, conecte e use. O sistema cuida da conexão, da hora e das atualizações para você.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <a href="/kodaos" className="rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed]">
                Conhecer o KODA OS
              </a>
              <a href="/kodaos/updates" className="py-3 text-[15px] font-medium text-[#2997ff] hover:underline">
                Atualizações ›
              </a>
            </div>
            <div className="mx-auto mt-16 max-w-5xl">
              <ProductPhotoSlot label="KODA OS" className="h-[420px] sm:h-[620px]" dark />
            </div>
          </div>
        </section>

        <section className="grid gap-3 px-3 lg:grid-cols-2">
          <article className="relative min-h-[620px] overflow-hidden bg-[#050505] px-7 pt-16 text-center text-white sm:px-10">
            <p className="text-sm font-semibold text-white/55">KodaBot Pro</p>
            <h2 className="mt-2 text-5xl font-semibold tracking-[-.055em] sm:text-6xl">Feito para conversar.</h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-white/62 sm:text-xl">
              A experiência Koda em um assistente pensado primeiro para voz.
            </p>
            <a href="/kodabot-pro" className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-[#2997ff] hover:underline">
              Conhecer o KodaBot Pro <span>›</span>
            </a>
            <div className="absolute inset-x-0 bottom-0 flex h-[340px] items-center justify-center overflow-hidden">
              <div className="relative flex h-48 w-[min(520px,86%)] items-center justify-center gap-2 rounded-[52px] border border-white/10 bg-white/[.045] px-8 shadow-[0_35px_110px_rgba(41,151,255,.14)] backdrop-blur">
                {[34, 72, 112, 150, 92, 130, 58, 102, 44].map((height, index) => (
                  <span key={index} className="w-3 rounded-full bg-[#4d86ff] shadow-[0_0_20px_rgba(77,134,255,.5)]" style={{ height }} />
                ))}
              </div>
            </div>
          </article>

          <article className="relative min-h-[620px] overflow-hidden bg-[var(--kodacare-red)] px-7 pt-16 text-center text-white sm:px-10">
            <ShieldCheck className="mx-auto h-8 w-8" />
            <p className="mt-5 text-sm font-semibold text-white/70">KodaCare</p>
            <h2 className="mx-auto mt-2 max-w-xl text-5xl font-semibold tracking-[-.055em] sm:text-6xl">
              Mais cuidado. Menos preocupação.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-white/76 sm:text-xl">
              Garantia adicional e opções KodaCare+ para proteger seu KodaBot por mais tempo.
            </p>
            <a href="/kodacare" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[var(--kodacare-red-dark)] transition-transform hover:scale-[1.015]">
              Conhecer o KodaCare
            </a>
            <div className="absolute inset-x-0 bottom-[-130px] mx-auto h-80 w-80 rounded-full bg-white/12 blur-[1px]" />
          </article>
        </section>

        <section className="bg-white px-5 py-24 text-center sm:py-36">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
            <h2 className="mx-auto mt-2 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
              Tudo do seu KodaBot. Em um só lugar.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium leading-relaxed text-[#6e6e73] sm:text-2xl">
              Pedidos, cobertura, dispositivos, reparos, suporte e atualizações conectados à sua conta.
            </p>
            <a href="/conta" className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed]">
              Acessar minha conta
            </a>
            <div className="mx-auto mt-14 grid h-64 w-64 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,white,#dce8ff_38%,#88aef8_70%,#315bba)] shadow-[0_35px_90px_rgba(57,101,190,.22)]">
              <Cloud className="h-24 w-24 text-white drop-shadow-lg" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 px-3 lg:grid-cols-2">
          <article className="relative min-h-[520px] overflow-hidden bg-[#eef5ff] px-7 pt-16 text-center sm:px-10">
            <p className="text-sm font-semibold text-[#6e6e73]">Escolha seu KodaBot</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Qual combina com você?</h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-[#424245]">
              Compare os modelos ou responda algumas perguntas e veja nossa recomendação.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-5">
              <a href="/comparar" className="inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline">Comparar modelos <span>›</span></a>
              <button onClick={() => setQuizOpen(true)} className="inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline">
                <Sparkles className="h-4 w-4" /> Ajude-me a escolher
              </button>
            </div>
          </article>

          <article className="relative min-h-[520px] overflow-hidden bg-white px-7 pt-16 text-center sm:px-10">
            <p className="text-sm font-semibold text-[#6e6e73]">Suporte Koda</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Ajuda quando você precisar.</h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-[#424245]">
              Configuração, reparo, garantia, manuais e atendimento para os produtos Koda.
            </p>
            <a href="/suporte" className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] hover:underline">
              Acessar suporte <ArrowUpRight className="h-4 w-4" />
            </a>
            <div className="absolute inset-x-0 bottom-[-80px] mx-auto grid h-64 w-64 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,white,#eff5ff_38%,#a9c5ff_70%,#5680d8)] opacity-95 shadow-[0_35px_90px_rgba(57,101,190,.2)]">
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
