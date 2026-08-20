import { createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarDays, Clock3, CloudSun, Wifi } from "lucide-react";

import { ProductPhotoSlot } from "@/components/koda/ProductPhotoSlot";

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

function KodaBot() {
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
              href="/kodabot-i/comprar"
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
            <h1 className="mt-3 text-6xl font-semibold tracking-[-0.055em] sm:text-8xl">
              KodaBot
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#6e6e73] sm:text-5xl">
              Simples, útil e bonito para o seu dia.
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#6e6e73] sm:text-xl">
              Um assistente de mesa compacto para deixar tarefas, alertas, hora e informações úteis
              exatamente onde você precisa delas.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl px-5 sm:mt-16">
            <ProductPhotoSlot
              label="Aguardando kodabot-i-hero-light"
              className="h-[460px] sm:h-[680px]"
            />
          </div>
        </section>

        <section id="destaques" className="bg-[#f5f5f7] py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
                Veja os destaques.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              <article className="overflow-hidden rounded-[28px] bg-black text-white lg:col-span-2">
                <div className="p-8 sm:p-10">
                  <p className="text-sm font-semibold text-[#a1a1a6]">Informação na medida certa</p>
                  <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                    O que importa, sem abrir mais uma tela.
                  </h3>
                </div>
                <ProductPhotoSlot
                  label="Aguardando kodabot-i-kodaos-dark"
                  className="h-[420px] sm:h-[560px]"
                  dark
                />
              </article>

              <article className="rounded-[28px] bg-white p-8 shadow-sm sm:p-10">
                <Wifi className="h-9 w-9 text-[#0071e3]" />
                <p className="mt-10 text-sm font-semibold text-[#6e6e73]">Configuração simples</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  Ligue. Conecte. Pronto.
                </h3>
                <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">
                  Na primeira configuração, o KodaBot cria a rede KodaBot-Setup e guia a conexão ao
                  Wi‑Fi. Depois, ele volta à sua rede automaticamente.
                </p>
              </article>

              <article className="rounded-[28px] bg-[#e8f2ff] p-8 sm:p-10">
                <div className="grid grid-cols-2 gap-3">
                  {[Clock3, CalendarDays, Bell, CloudSun].map((Icon, index) => (
                    <div
                      key={index}
                      className="grid aspect-square place-items-center rounded-3xl bg-white/70"
                    >
                      <Icon className="h-9 w-9 text-[#0071e3]" />
                    </div>
                  ))}
                </div>
                <h3 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
                  Feito para o seu dia.
                </h3>
                <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">
                  Hora, agenda, tarefas, alarmes e informações do ambiente aparecem de forma direta
                  e fácil de consultar.
                </p>
              </article>

              <article className="relative overflow-hidden rounded-[28px] bg-white lg:col-span-2">
                <div className="grid items-center md:grid-cols-[0.8fr_1.2fr]">
                  <div className="p-8 sm:p-10">
                    <p className="text-sm font-semibold text-[#6e6e73]">Compacto de verdade</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                      Presença quando você precisa. Discrição quando não precisa.
                    </h3>
                  </div>
                  <ProductPhotoSlot label="Aguardando kodabot-i-hero-light" className="h-[430px]" />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white py-28 sm:py-40">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold text-[#6e6e73]">Design</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              Criado para morar na sua mesa.
            </h2>
            <p className="mt-8 max-w-3xl text-xl font-medium leading-relaxed text-[#6e6e73] sm:text-2xl">
              A tela touch de 2,8 polegadas fica na frente para ser consultada rapidamente, enquanto
              o corpo compacto mantém o KodaBot perto sem ocupar espaço demais.
            </p>

            <div className="mt-16 overflow-hidden bg-[#f5f5f7]">
              <ProductPhotoSlot
                label="Aguardando kodabot-i-product-cutout"
                className="h-[620px] sm:h-[820px]"
              />
            </div>
          </div>
        </section>

        <section
          id="experiencia"
          className="overflow-hidden bg-[#05070b] py-28 text-white sm:py-40"
        >
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-sm font-semibold text-white/55">Experiência</p>
            <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              Informação que chega antes de virar distração.
            </h2>
            <p className="mt-8 max-w-3xl text-xl font-medium leading-relaxed text-white/58 sm:text-2xl">
              O KodaBot foi pensado para mostrar o que você precisa sem puxar você para um feed, uma
              conversa ou mais uma sequência de notificações.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-7xl px-5">
            <ProductPhotoSlot
              label="Aguardando kodabot-i-lifestyle"
              className="h-[620px] sm:h-[850px]"
              dark
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
            <h2 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">
              KodaBot
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-[#6e6e73]">
              Garanta seu KodaBot por R$ 99,90 e escolha a proteção KodaCare ideal para ele.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-5">
              <a
                href="/kodabot-i/comprar"
                className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-medium text-white hover:bg-[#0077ed]"
              >
                Comprar
              </a>
              <a
                href="/suporte"
                className="py-3 text-sm font-medium text-[#0066cc] hover:underline"
              >
                Falar com a Koda ›
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}