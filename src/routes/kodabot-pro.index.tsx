import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BatteryCharging,
  CheckCircle2,
  LoaderCircle,
  Mic2,
  SlidersHorizontal,
  Speaker,
  Wifi,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/kodabot-pro/")({
  head: () => ({
    meta: [
      { title: "KodaBot Pro — Koda" },
      {
        name: "description",
        content: "KodaBot Pro: o assistente de voz da Koda, em desenvolvimento.",
      },
    ],
  }),
  component: KodaBotPro,
});

const features = [
  {
    icon: Mic2,
    title: "Feito para ouvir",
    text: "Microfones integrados para uma experiência baseada em voz. A configuração final ainda está em desenvolvimento.",
  },
  {
    icon: Speaker,
    title: "Feito para responder",
    text: "Áudio integrado para respostas e feedback sem depender de uma tela.",
  },
  {
    icon: BatteryCharging,
    title: "Bateria integrada",
    text: "O Pro foi pensado para poder funcionar longe da tomada, com carregamento por USB‑C.",
  },
  {
    icon: SlidersHorizontal,
    title: "Controles físicos",
    text: "Controles essenciais continuam disponíveis mesmo quando você não quiser usar a voz.",
  },
  {
    icon: Wifi,
    title: "KodaCloud",
    text: "A ativação, a conta e os serviços do produto serão integrados ao mesmo ecossistema KodaCloud do site.",
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
      <p className="absolute bottom-6 text-xs text-white/35">
        Visual abstrato de voz — não representa o design físico final.
      </p>
    </div>
  );
}

function KodaBotPro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError("Confirme que deseja receber novidades do KodaBot Pro.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ ok?: boolean }>(
      "koda-product-waitlist",
      {
        body: {
          productSlug: "kodabot-i-pro",
          email,
          fullName,
          consent,
          company: "",
        },
      },
    );
    if (invokeError || !data?.ok) {
      setError("Não foi possível salvar seu interesse agora. Confira o e-mail e tente novamente.");
    } else {
      setComplete(true);
    }
    setSubmitting(false);
  }

  return (
    <main className="bg-black text-white">
      <div className="sticky top-11 z-40 border-b border-white/10 bg-black/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-5">
          <a href="/kodabot-pro" className="text-lg font-semibold tracking-[-0.03em]">
            KodaBot Pro
          </a>
          <div className="flex items-center gap-5 text-xs">
            <a href="#destaques" className="hidden text-white/55 hover:text-white sm:inline">
              Visão geral
            </a>
            <a href="/kodabot-pro/tech-specs" className="text-white/55 hover:text-white">
              Especificações
            </a>
          </div>
        </div>
      </div>

      <section className="relative min-h-[calc(100vh-96px)] overflow-hidden px-5 py-24 text-center">
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-white/50">Em desenvolvimento</p>
          <h1 className="mt-4 text-6xl font-semibold tracking-[-0.055em] sm:text-8xl">
            KodaBot Pro
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-white/62 sm:text-4xl">
            A experiência Koda, agora feita para conversar.
          </p>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-white/48">
            Um assistente de voz compacto, sem tela, pensado para respostas rápidas, áudio integrado
            e uma interação mais natural com o ecossistema Koda.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#lista-de-espera"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
            >
              Entrar na lista de espera
            </a>
            <a
              href="/comparar"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Comparar modelos
            </a>
          </div>
          <p className="mt-5 text-xs text-white/38">
            Pré-venda futura por R$ 129,90 · preço após o lançamento: R$ 199,90 · sem data de
            lançamento definida.
          </p>
        </div>
        <VoiceVisual />
      </section>

      <section
        id="lista-de-espera"
        className="scroll-mt-24 bg-white px-5 py-24 text-[#1d1d1f] sm:py-32"
      >
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0071e3]">KodaBot Pro</p>
            <h2 className="mt-4 text-5xl font-semibold tracking-[-.055em] sm:text-6xl">
              Saiba primeiro.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#6e6e73]">
              O Pro ainda não está à venda. Entre na lista para receber novidades, a data oficial e
              o aviso de abertura da pré-venda.
            </p>
          </div>
          <div className="rounded-[34px] bg-[#f5f5f7] p-7 sm:p-10">
            {complete ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-[#248a3d]" />
                <h3 className="mt-5 text-2xl font-semibold">Você está na lista.</h3>
                <p className="mt-2 text-sm text-[#6e6e73]">
                  Vamos avisar quando houver uma novidade real sobre o KodaBot Pro.
                </p>
              </div>
            ) : (
              <form onSubmit={joinWaitlist} className="space-y-4">
                <label className="block text-xs font-semibold">
                  Nome
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={120}
                    autoComplete="name"
                    className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  />
                </label>
                <label className="block text-xs font-semibold">
                  E-mail
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                    autoComplete="email"
                    className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  />
                </label>
                <label className="flex items-start gap-3 text-xs leading-relaxed text-[#6e6e73]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-black/20 accent-[#0071e3]"
                  />
                  Quero receber por e-mail novidades e a abertura da pré-venda do KodaBot Pro.
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:opacity-45"
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {submitting ? "Salvando…" : "Quero ser avisado"}
                </button>
                {error && <p className="text-center text-xs font-medium text-red-600">{error}</p>}
                <p className="text-center text-[10px] leading-relaxed text-[#86868b]">
                  Você poderá pedir a remoção do seu e-mail a qualquer momento.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section id="destaques" className="bg-[#0b0b0d] px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-white/40">Destaques</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">
            Sem tela. Sem perder presença.
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className={`rounded-[30px] p-8 sm:p-10 ${index === 0 ? "bg-[#17305f] lg:col-span-2" : "bg-white/[0.06]"}`}
                >
                  <Icon className="h-8 w-8 text-[#5b9cff]" />
                  <h3 className="mt-10 text-3xl font-semibold tracking-[-0.04em]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/52">
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-white/40">Ainda em desenvolvimento</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
            O design final vem depois.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
            Enquanto a engenharia do primeiro protótipo é fechada, esta página evita renders que
            possam ser confundidos com a aparência real do produto. As fotos oficiais entrarão aqui
            quando existirem.
          </p>
          <a
            href="/kodabot-pro/tech-specs"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
          >
            Ver especificações
          </a>
        </div>
      </section>
    </main>
  );
}
