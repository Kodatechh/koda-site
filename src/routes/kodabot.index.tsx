import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Minus,
  Monitor,
  Plus,
  Touchpad,
  Wifi,
} from "lucide-react";

export const Route = createFileRoute("/kodabot/")({
  head: () => ({
    meta: [
      { title: "KodaBot — Koda" },
      {
        name: "description",
        content:
          "Conheça o KodaBot: um assistente compacto de mesa com tela touch, Wi‑Fi e KODA OS.",
      },
      { property: "og:title", content: "KodaBot — Koda" },
      {
        property: "og:description",
        content: "Seu dia em um só olhar. Conheça o KodaBot e o KODA OS.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KodaBot,
});

const features = [
  {
    title: "Tela e toque",
    description:
      "A tela touch de 2,8 polegadas reúne hora, alertas e controles em uma interface direta.",
    image: "/kodabot-feature-screen-v1.png",
    alt: "Close da tela touch do KodaBot com a interface KODA OS",
    position: "center",
  },
  {
    title: "Rotina à primeira vista",
    description:
      "Tarefas, lembretes, alarmes e calendário aparecem sem abrir o celular ou entrar em um feed.",
    image: "/kodabot-feature-routine-v1.png",
    alt: "KodaBot integrado a uma rotina de estudos em uma mesa",
    position: "center",
  },
  {
    title: "Hardware",
    description:
      "Uma visualização técnica reúne a tela de 2,8 polegadas, a placa principal, o sensor ambiental e a alimentação dentro do corpo compacto.",
    image: "/kodabot-feature-hardware-v1.png",
    alt: "Visualização técnica artificial dos principais componentes do KodaBot",
    position: "center",
  },
  {
    title: "Informações do ambiente",
    description:
      "O sensor BME280 permite consultar temperatura, umidade e pressão diretamente no KodaBot.",
    image: "/kodabot-feature-environment-v1.png",
    alt: "KodaBot em uma sala com iluminação que representa as condições do ambiente",
    position: "center",
  },
  {
    title: "KODA OS",
    description:
      "Uma interface criada para o KodaBot, com painel local e base preparada para atualizações OTA.",
    image: "/kodabot-dark-explorer-v1.png",
    alt: "KodaBot com a interface KODA OS em um estúdio escuro",
    position: "68% center",
  },
] as const;

function KodaBot() {
  const [activeFeature, setActiveFeature] = useState(0);

  const moveFeature = (direction: number) => {
    setActiveFeature((current) => (current + direction + features.length) % features.length);
  };

  return (
    <>
      <div className="sticky top-11 z-40 border-b border-black/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-5 py-3">
          <a href="/kodabot" className="text-lg font-semibold tracking-[-0.03em]">
            KodaBot
          </a>
          <div className="flex items-center gap-5 text-xs">
            <a href="#destaques" className="hidden text-[#424245] hover:text-black sm:inline">
              Visão geral
            </a>
            <a
              href="/kodabot/por-dentro"
              className="hidden text-[#424245] hover:text-black md:inline"
            >
              Por dentro
            </a>
            <a
              href="/kodabot/tech-specs"
              className="hidden text-[#424245] hover:text-black sm:inline"
            >
              Especificações
            </a>
            <a href="/kodaos" className="hidden text-[#424245] hover:text-black lg:inline">
              KODA OS
            </a>
            <a
              href="/checkout/kodabot-i"
              className="rounded-full bg-[#0071e3] px-4 py-1.5 font-medium text-white hover:bg-[#0077ed]"
            >
              Comprar
            </a>
          </div>
        </div>
      </div>

      <main>
        <section className="overflow-hidden bg-white pt-16 text-center sm:pt-24">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold text-[#0071e3]">Pré-venda · R$ 99,90</p>
            <h1 className="mt-3 text-6xl font-semibold tracking-[-0.055em] sm:text-8xl">KodaBot</h1>
            <p className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#6e6e73] sm:text-5xl">
              Simples, útil e bonito para o seu dia.
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#6e6e73] sm:text-xl">
              Um assistente de mesa compacto para deixar tarefas, alertas, hora e informações úteis
              exatamente onde você precisa delas.
            </p>
          </div>

          <div className="mx-auto mt-8 h-[500px] max-w-[1400px] sm:h-[720px]">
            <img
              src="/kodabot-home-hero-v3.png"
              alt="KodaBot com corpo transparente em fotografia de estúdio"
              className="h-full w-full object-cover object-[72%_center]"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 7%, black 88%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 7%, black 88%, transparent 100%)",
              }}
            />
          </div>
        </section>

        <section id="destaques" className="relative bg-black text-white">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-24 sm:pt-32">
            <p className="text-sm font-semibold text-white/50">Conheça de perto</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              Tudo o que importa. Bem na sua frente.
            </h2>
          </div>

          <div className="mx-auto min-h-[760px] max-w-[1500px] px-5 pb-20 lg:min-h-[880px]">
            <div className="relative grid overflow-hidden lg:min-h-[760px] lg:grid-cols-[390px_1fr] lg:items-center">
              <div className="relative z-10 order-2 pb-8 pt-4 lg:order-1 lg:py-16">
                <div className="mb-6 hidden gap-3 lg:flex">
                  <button
                    type="button"
                    onClick={() => moveFeature(-1)}
                    aria-label="Destaque anterior"
                    className="grid h-11 w-11 place-items-center rounded-full bg-[#1d1d1f] text-white transition hover:bg-[#2d2d2f]"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeature(1)}
                    aria-label="Próximo destaque"
                    className="grid h-11 w-11 place-items-center rounded-full bg-[#1d1d1f] text-white transition hover:bg-[#2d2d2f]"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {features.map((feature, index) => {
                    const active = activeFeature === index;
                    return (
                      <button
                        key={feature.title}
                        type="button"
                        onClick={() => setActiveFeature(index)}
                        aria-expanded={active}
                        className={`w-full rounded-[24px] px-5 text-left transition-all duration-500 ${
                          active ? "bg-[#1d1d1f] py-5" : "bg-[#111113] py-3.5 hover:bg-[#18181a]"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-[15px] font-semibold">{feature.title}</span>
                          {active ? (
                            <Minus className="h-4 w-4 shrink-0 text-white/60" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-white/60" />
                          )}
                        </span>
                        <span
                          className={`grid overflow-hidden transition-all duration-500 ${
                            active
                              ? "mt-3 grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <span className="min-h-0 text-sm leading-relaxed text-white/62">
                            {feature.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative order-1 h-[470px] lg:order-2 lg:h-[760px]">
                {features.map((feature, index) => {
                  const active = activeFeature === index;
                  return (
                    <img
                      key={feature.image}
                      src={feature.image}
                      alt={active ? feature.alt : ""}
                      aria-hidden={!active}
                      className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        active
                          ? "scale-100 opacity-100 blur-0"
                          : "pointer-events-none scale-[1.025] opacity-0 blur-[3px]"
                      }`}
                      style={{ objectPosition: feature.position }}
                    />
                  );
                })}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black via-black/55 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-black px-5 pb-28 text-white sm:pb-40">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[32px] bg-[#1d1d1f] p-8 md:col-span-2 sm:p-10">
              <Touchpad className="h-10 w-10 text-[#28d7d7]" />
              <h3 className="mt-16 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
                Toque. Veja. Continue o seu dia.
              </h3>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
                Tela touch de 2,8 polegadas e interface visual feita para consultas rápidas.
              </p>
            </article>

            <article className="rounded-[32px] bg-[#1d1d1f] p-8 sm:p-10">
              <Wifi className="h-10 w-10 text-[#5e9cff]" />
              <h3 className="mt-16 text-3xl font-semibold tracking-[-0.04em]">Wi‑Fi de 2,4 GHz.</h3>
              <p className="mt-4 text-base leading-relaxed text-white/55">
                Configuração guiada pela rede KodaBot-Setup e acesso local em kodabot.local.
              </p>
            </article>

            <article className="rounded-[32px] bg-[#1d1d1f] p-8 sm:p-10">
              <CloudSun className="h-10 w-10 text-[#ff9f0a]" />
              <h3 className="mt-16 text-3xl font-semibold tracking-[-0.04em]">
                O ambiente também conta.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-white/55">
                Temperatura, umidade e pressão medidas pelo sensor BME280.
              </p>
            </article>

            <article className="rounded-[32px] bg-[#1d1d1f] p-8 md:col-span-2 sm:p-10">
              <div className="flex gap-4 text-[#30d158]">
                <CalendarDays className="h-10 w-10" />
                <Bell className="h-10 w-10" />
                <Monitor className="h-10 w-10" />
              </div>
              <h3 className="mt-16 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
                Hora, tarefas, alarmes e alertas. Sem mais uma distração.
              </h3>
            </article>
          </div>
        </section>

        <section className="overflow-hidden bg-white py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold text-[#6e6e73]">Design</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              Criado para morar na sua mesa.
            </h2>
            <p className="mt-8 max-w-3xl text-xl font-medium leading-relaxed text-[#6e6e73] sm:text-2xl">
              Transparente por fora. Direto ao ponto por dentro. O KodaBot permanece perto sem
              dominar o espaço.
            </p>
          </div>
          <div className="mx-auto mt-10 h-[560px] max-w-[1500px] sm:h-[820px]">
            <img
              src="/kodabot-home-hero-v3.png"
              alt="Design transparente do KodaBot"
              className="h-full w-full object-cover object-[72%_center]"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 16%, black 88%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 16%, black 88%, transparent 100%)",
              }}
            />
          </div>
        </section>

        <section className="bg-[#f5f5f7] py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold text-[#6e6e73]">KODA OS</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              O sistema que faz o KodaBot parecer simples.
            </h2>
            <p className="mt-8 max-w-3xl text-xl font-medium leading-relaxed text-[#6e6e73] sm:text-2xl">
              Provisionamento Wi‑Fi, painel local, sincronização pela internet e a base para
              atualizações OTA ficam sob o KODA OS — sem transformar configuração em trabalho
              técnico.
            </p>

            <a
              href="/kodaos"
              className="mt-8 inline-flex text-lg font-medium text-[#0066cc] hover:underline"
            >
              Conhecer o KODA OS ›
            </a>
          </div>
        </section>

        <section id="disponibilidade" className="bg-white py-28 text-center sm:py-36">
          <div className="mx-auto max-w-3xl px-5">
            <p className="text-sm font-semibold text-[#0071e3]">Pré-venda disponível</p>
            <h2 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">KodaBot</h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-[#6e6e73]">
              Garanta seu KodaBot por R$ 99,90 e escolha a proteção KodaCare ideal para ele.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-5">
              <a
                href="/checkout/kodabot-i"
                className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-medium text-white hover:bg-[#0077ed]"
              >
                Comprar
              </a>
              <a href="/loja" className="py-3 text-sm font-medium text-[#0066cc] hover:underline">
                Ver acessórios ›
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
