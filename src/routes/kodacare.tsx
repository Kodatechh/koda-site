import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock3, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { formatBRL, kodaCarePlans } from "@/lib/kodacare";

export const Route = createFileRoute("/kodacare")({
  head: () => ({
    meta: [
      { title: "KodaCare — Proteção para seu KodaBot" },
      { name: "description", content: "Garantia estendida e proteção adicional para seu KodaBot." },
    ],
  }),
  component: KodaCarePage,
});

const faqs = [
  [
    "Quando posso contratar?",
    "Durante a compra ou em até 30 dias após a data de compra registrada.",
  ],
  [
    "Como funcionam os danos acidentais?",
    "No KodaCare+, cada ocorrência elegível exige franquia e há um limite de três utilizações por ano.",
  ],
  [
    "A limpeza está incluída?",
    "Sim. Limpeza e revisão interna têm valor zero durante a vigência do KodaCare+.",
  ],
  [
    "Todo reparo é coberto?",
    "Não. A cobertura depende do plano, da vigência e da avaliação técnica do dano.",
  ],
] as const;

function KodaCarePage() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="px-5 py-24 text-center sm:py-40">
          <ShieldCheck className="mx-auto h-11 w-11 text-[#0071e3]" />
          <p className="mt-7 text-sm font-semibold text-[#0066cc]">KodaCare</p>
          <h1 className="mx-auto mt-3 max-w-5xl text-6xl font-semibold tracking-[-0.065em] sm:text-8xl">
            Mais tranquilidade para aproveitar seu KodaBot.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-[#6e6e73]">
            Mais tempo de garantia ou proteção adicional para os imprevistos do dia a dia.
          </p>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 lg:grid-cols-3">
              {kodaCarePlans.map((plan, index) => (
                <article
                  key={plan.id}
                  className={`flex min-h-[440px] flex-col rounded-[32px] p-8 ${index === 0 ? "bg-white" : "bg-[#1d1d1f] text-white"}`}
                >
                  <p
                    className={`text-sm font-semibold ${index === 0 ? "text-[#0066cc]" : "text-[#2997ff]"}`}
                  >
                    {plan.duration}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{plan.name}</h2>
                  <p className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
                    {formatBRL(plan.price)}
                  </p>
                  <ul
                    className={`mt-10 space-y-4 text-sm leading-relaxed ${index === 0 ? "text-[#424245]" : "text-white/70"}`}
                  >
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-3">
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${index === 0 ? "text-[#0071e3]" : "text-[#2997ff]"}`}
                        />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/kodabot-i/comprar"
                    className={`mt-auto inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-semibold ${index === 0 ? "bg-[#0071e3] text-white" : "bg-white text-black"}`}
                  >
                    Escolher plano
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:py-36">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-[#0066cc]">Como funciona</p>
            <h2 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
              Proteção clara. Do começo ao cuidado.
            </h2>
            <div className="mt-16 grid gap-12 sm:grid-cols-3">
              <Step
                icon={Clock3}
                number="01"
                title="Escolha em 30 dias"
                text="Contrate na compra ou até 30 dias depois."
              />
              <Step
                icon={RotateCcw}
                number="02"
                title="Até 3 vezes ao ano"
                text="Use a proteção contra danos acidentais do KodaCare+."
              />
              <Step
                icon={Sparkles}
                number="03"
                title="Franquia por ocorrência"
                text="A avaliação confirma a elegibilidade e a franquia aplicável."
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-24 text-center sm:py-32">
          <p className="text-sm font-semibold text-[#0066cc]">Serviço e reparos</p>
          <h2 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
            Ajuda quando você precisa.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Consulte serviços, preços públicos e como a cobertura se aplica antes de solicitar uma
            avaliação.
          </p>
          <a
            href="/suporte/reparo"
            className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Ver serviço e reparos
          </a>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold text-[#0066cc]">Perguntas frequentes</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
              Bom saber.
            </h2>
            <div className="mt-12 divide-y divide-black/10">
              {faqs.map(([question, answer]) => (
                <article key={question} className="grid gap-3 py-7 sm:grid-cols-[0.8fr_1.2fr]">
                  <h3 className="font-semibold">{question}</h3>
                  <p className="text-sm leading-relaxed text-[#6e6e73]">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({
  icon: Icon,
  number,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span className="text-xs font-semibold text-[#86868b]">{number}</span>
      <Icon className="mt-8 h-8 w-8 text-[#0071e3]" />
      <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}
