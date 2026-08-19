import { createFileRoute } from "@tanstack/react-router";
import { Cable, Mic2, SlidersHorizontal, Speaker, Wifi } from "lucide-react";

export const Route = createFileRoute("/kodabot-pro/")({
  head: () => ({
    meta: [
      { title: "KodaBot Pro — Koda" },
      {
        name: "description",
        content: "Conheça o KodaBot Pro: a experiência Koda pensada primeiro para voz.",
      },
    ],
  }),
  component: KodaBotPro,
});

const features = [
  {
    icon: Mic2,
    title: "Feito para ouvir",
    text: "Microfones integrados dão ao KodaBot Pro uma experiência baseada em voz.",
  },
  {
    icon: Speaker,
    title: "Feito para responder",
    text: "Áudio integrado para respostas e feedback sem depender de uma tela.",
  },
  {
    icon: Cable,
    title: "USB‑C",
    text: "A primeira versão funciona ligada à energia por USB‑C, com uma arquitetura simples e confiável.",
  },
  {
    icon: SlidersHorizontal,
    title: "Controles físicos",
    text: "Controles essenciais continuam disponíveis mesmo quando você não quiser usar a voz.",
  },
  {
    icon: Wifi,
    title: "KodaCloud",
    text: "Conta, ativação e serviços conectados ao mesmo ecossistema Koda do KodaBot.",
  },
];

function VoiceVisual() {
  return (
    <div className="relative mx-auto mt-16 flex h-[360px] max-w-4xl items-center justify-center overflow-hidden rounded-[48px] border border-white/10 bg-white/[0.035] px-6 shadow-[0_50px_150px_rgba(40,95,255,.12)] sm:h-[480px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(64,120,255,.18),transparent_58%)]" />
      <div className="relative flex h-48 items-center gap-2 sm:gap-3">
        {[34, 72, 118, 168, 112, 190, 148, 84, 132, 62, 104].map((height, index) => (
          <span
            key={index}
            className="w-2.5 rounded-full bg-[#4d86ff] shadow-[0_0_24px_rgba(77,134,255,.6)] sm:w-4"
            style={{ height }}
          />
        ))}
      </div>
      <p className="absolute bottom-6 text-xs text-white/35">Visual abstrato de voz.</p>
    </div>
  );
}

function KodaBotPro() {
  return (
    <main className="bg-black text-white">
      <div className="sticky top-12 z-40 border-b border-white/10 bg-black/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-[52px] max-w-[1040px] items-center justify-between px-5">
          <a href="/kodabot-pro" className="text-lg font-semibold tracking-[-0.03em]">KodaBot Pro</a>
          <div className="flex items-center gap-5 text-xs">
            <a href="#destaques" className="hidden text-white/55 hover:text-white sm:inline">Visão geral</a>
            <a href="/kodabot-pro/tech-specs" className="text-white/55 hover:text-white">Especificações</a>
          </div>
        </div>
      </div>

      <section className="relative min-h-[calc(100vh-100px)] overflow-hidden px-5 py-24 text-center">
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-[#2997ff]">KodaBot Pro</p>
          <h1 className="mt-4 text-6xl font-semibold tracking-[-0.06em] sm:text-8xl">Feito para conversar.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-white/62 sm:text-4xl">
            A experiência Koda, pensada primeiro para voz.
          </p>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-white/48">
            Um assistente compacto, sem tela, com microfones, áudio integrado e controles físicos para uma interação mais natural.
          </p>
        </div>
        <VoiceVisual />
      </section>

      <section id="destaques" className="bg-[#0b0b0d] px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-white/40">Destaques</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Sem tela. Sem perder presença.</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className={`rounded-[30px] p-8 sm:p-10 ${index === 0 ? "bg-[#17305f] lg:col-span-2" : "bg-white/[0.06]"}`}>
                  <Icon className="h-8 w-8 text-[#5b9cff]" />
                  <h3 className="mt-10 text-3xl font-semibold tracking-[-0.04em]">{feature.title}</h3>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/52">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-[#2997ff]">Primeira geração Pro</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">Voz em primeiro lugar.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
            A página apresenta a direção do produto e sua arquitetura prevista. As imagens oficiais do KodaBot Pro serão usadas quando o design físico estiver fechado.
          </p>
          <a href="/kodabot-pro/tech-specs" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Ver especificações</a>
        </div>
      </section>
    </main>
  );
}
