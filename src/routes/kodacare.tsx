import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Clock3, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-white text-[#1d1d1f] [--care-red:#d70015] [--care-red-dark:#9f0011] [--care-tint:#fff5f5]">
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-black/[0.045] px-5 py-20 sm:py-28 lg:py-32">
          <div className="pointer-events-none absolute right-[-14rem] top-[-18rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(215,0,21,.10),rgba(215,0,21,0)_68%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
            <div>
              <p className="text-sm font-semibold text-[var(--care-red)]">KodaCare</p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[.96] tracking-[-0.06em] sm:text-7xl">
                Proteção para seguir em frente.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#6e6e73] sm:text-xl">
                Mais tempo de garantia e cuidado adicional para o seu KodaBot, em uma experiência
                simples do início ao reparo.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <a
                  href="#planos"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--care-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--care-red-dark)]"
                >
                  Ver planos <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/suporte/reparo"
                  className="text-sm font-semibold text-[var(--care-red)] hover:underline"
                >
                  Entender reparos
                </a>
              </div>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[460px]">
              <div className="absolute inset-[7%] rounded-[34%] bg-[linear-gradient(145deg,#f20b26,#b90016)] shadow-[0_45px_100px_-38px_rgba(160,0,17,.55)]" />
              <div className="absolute inset-[7%] rounded-[34%] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.38),transparent_32%)]" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-36 w-36 place-items-center rounded-[38px] border border-white/35 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-md sm:h-44 sm:w-44">
                  <ShieldCheck
                    className="h-20 w-20 text-white sm:h-24 sm:w-24"
                    strokeWidth={1.45}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="scroll-mt-16 bg-[#f5f5f7] px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-semibold text-[var(--care-red)]">Escolha seu cuidado</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
                Cobertura clara, sem ruído.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73]">
                Compare o tempo de cobertura e os benefícios. Para contratar, você precisa ter um
                KodaBot ativado e vinculado à sua Conta Koda.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {kodaCarePlans.map((plan, index) => (
                <article
                  key={plan.id}
                  className={`relative flex min-h-[460px] flex-col overflow-hidden rounded-[32px] border bg-white p-8 shadow-[0_24px_70px_-48px_rgba(0,0,0,.38)] ${index === 1 ? "border-[var(--care-red)] ring-1 ring-[var(--care-red)]/15" : "border-black/[0.055]"}`}
                >
                  {index === 1 && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-[var(--care-red)]" />
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-[var(--care-red)]">{plan.duration}</p>
                    {index === 1 && (
                      <span className="rounded-full bg-[var(--care-tint)] px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--care-red)]">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{plan.name}</h2>
                  <p className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
                    {formatBRL(plan.price)}
                  </p>
                  <ul className="mt-10 space-y-4 text-sm leading-relaxed text-[#424245]">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-3">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--care-tint)]">
                          <Check className="h-3 w-3 text-[var(--care-red)]" strokeWidth={2.5} />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/checkout/${plan.id.replaceAll("_", "-")}`}
                    className={`mt-auto inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${index === 1 ? "bg-[var(--care-red)] text-white hover:bg-[var(--care-red-dark)]" : "bg-[#1d1d1f] text-white hover:bg-black"}`}
                  >
                    Escolher plano <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:py-36">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-[var(--care-red)]">Como funciona</p>
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
          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[40px] bg-[#f5f5f7] text-left lg:grid-cols-[1fr_.72fr]">
            <div className="p-9 sm:p-14 lg:p-16">
              <p className="text-sm font-semibold text-[var(--care-red)]">Serviço e reparos</p>
              <h2 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
                Ajuda quando você precisa.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
                Consulte serviços, preços públicos e como a cobertura se aplica antes de solicitar
                uma avaliação.
              </p>
              <a
                href="/suporte/reparo"
                className="mt-8 inline-flex rounded-full bg-[var(--care-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--care-red-dark)]"
              >
                Ver serviço e reparos
              </a>
            </div>
            <div className="relative min-h-[320px] bg-[linear-gradient(145deg,#f20b26,#b90016)] lg:min-h-full">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(255,255,255,.32),transparent_34%)]" />
              <div className="absolute inset-0 grid place-items-center">
                <Sparkles className="h-24 w-24 text-white" strokeWidth={1.25} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold text-[var(--care-red)]">Perguntas frequentes</p>
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
      <span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--care-tint)]">
        <Icon className="h-6 w-6 text-[var(--care-red)]" />
      </span>
      <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}
