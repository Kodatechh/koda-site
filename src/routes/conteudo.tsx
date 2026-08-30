import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, HeartHandshake, Sparkles, Wrench } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/conteudo")({
  head: () => ({
    meta: [
      { title: "Conteúdo Koda" },
      { name: "description", content: "Guias Koda para configurar, usar e cuidar do seu KodaBot." },
    ],
  }),
  component: ContentPage,
});

const guides = [
  {
    icon: Sparkles,
    label: "Começar",
    title: "Primeiros passos com o KodaBot",
    text: "Da energia à conexão Wi-Fi e ativação na Conta Koda.",
    href: "/suporte/configurar",
  },
  {
    icon: BookOpen,
    label: "Experiência",
    title: "Informação sem distração",
    text: "Entenda a proposta do KodaBot e os recursos já confirmados.",
    href: "/kodabot",
  },
  {
    icon: Wrench,
    label: "Cuidado",
    title: "Reparo e assistência",
    text: "Diagnóstico, orçamento e acompanhamento em um fluxo único.",
    href: "/suporte/reparo",
  },
  {
    icon: HeartHandshake,
    label: "Circularidade",
    title: "Trade In Koda",
    text: "Como enviar seu KodaBot para avaliação ao comprar o próximo.",
    href: "/trade-in",
  },
];

function ContentPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-sm font-semibold text-[#0071e3]">Conteúdo Koda</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-semibold leading-[.94] tracking-[-.07em] sm:text-8xl">
              Use melhor. Cuide por mais tempo.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
              Guias diretos baseados nos recursos e serviços que a Koda já oferece — sem artigos
              genéricos ou funções inventadas.
            </p>
          </div>
        </section>
        <section className="px-5 py-20">
          <div className="mx-auto grid max-w-[1080px] gap-4 md:grid-cols-2">
            {guides.map(({ icon: Icon, label, title, text, href }) => (
              <a
                key={title}
                href={href}
                className="group min-h-[330px] rounded-[34px] bg-white p-9 transition-transform hover:-translate-y-1"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef6ff] text-[#0071e3]">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-16 text-xs font-semibold uppercase tracking-[.12em] text-[#86868b]">
                  {label}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-.045em]">{title}</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6e6e73]">{text}</p>
                <span className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]">
                  Ler guia <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
