import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, PackageCheck, Recycle, ShieldCheck, Truck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trade-in")({
  head: () => ({
    meta: [
      { title: "Koda Trade In" },
      {
        name: "description",
        content: "Envie seu KodaBot usado e receba crédito na compra de um novo.",
      },
    ],
  }),
  component: TradeInPage,
});

type Device = {
  id: string;
  serial_number: string;
  model: "kodabot-i" | "kodabot-i-pro";
  status: string;
};
const credits = { "kodabot-i": 5990, "kodabot-i-pro": 7990 } as const;
const names = { "kodabot-i": "KodaBot", "kodabot-i-pro": "KodaBot Pro" } as const;
type ConditionKey = "powersOn" | "enclosureIntact" | "screenIntact";
const initialAnswers: Record<ConditionKey, boolean> = {
  powersOn: true,
  enclosureIntact: true,
  screenIntact: true,
};
const conditionQuestions: Array<[ConditionKey, string]> = [
  ["powersOn", "Ele liga e inicia normalmente?"],
  ["enclosureIntact", "A estrutura está inteira?"],
  ["screenIntact", "A tela está sem trincas?"],
];

function TradeInPage() {
  const { user, loading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("devices")
      .select("id,serial_number,model,status")
      .eq("owner_user_id", user.id)
      .in("model", ["kodabot-i", "kodabot-i-pro"])
      .in("status", ["activated", "service"])
      .order("activated_at", { ascending: false })
      .then(({ data }) => {
        const eligible = (data ?? []) as Device[];
        setDevices(eligible);
        setDeviceId(eligible[0]?.id ?? "");
      });
  }, [user]);

  const selected = useMemo(
    () => devices.find((device) => device.id === deviceId) ?? null,
    [devices, deviceId],
  );
  const eligible = answers.powersOn && answers.enclosureIntact && answers.screenIntact;
  const credit = selected ? credits[selected.model] : 0;

  async function continueToCheckout() {
    if (!user || !selected || !eligible || submitting) return;
    setSubmitting(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("trade_in_requests")
      .insert({
        user_id: user.id,
        device_id: selected.id,
        source_model: selected.model,
        serial_number: selected.serial_number,
        credit_cents: credit,
        powers_on: answers.powersOn,
        enclosure_intact: answers.enclosureIntact,
        screen_intact: answers.screenIntact,
      })
      .select("id")
      .single();
    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "Este KodaBot já possui uma avaliação de Trade In em andamento."
          : "Não foi possível iniciar o Trade In agora.",
      );
      setSubmitting(false);
      return;
    }
    window.location.href = `/checkout/kodabot-i?tradeIn=${data.id}`;
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28">
          <Recycle className="mx-auto h-10 w-10 text-[#34c759]" />
          <p className="mt-5 text-sm font-semibold">Koda Trade In</p>
          <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Um novo KodaBot por menos.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Envie seu KodaBot usado pelos Correios. Depois da inspeção, o crédito fica confirmado na
            compra do próximo.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-20">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(credits).map(([model, value]) => (
              <article key={model} className="rounded-[32px] bg-[#f5f5f7] p-8 text-center">
                <p className="text-sm font-semibold text-[#6e6e73]">
                  Seu {names[model as keyof typeof names]}
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-[-.05em]">
                  R$ {(value / 100).toFixed(2).replace(".", ",")}
                </p>
                <p className="mt-2 text-sm text-[#6e6e73]">de crédito estimado</p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl">
            <h2 className="text-center text-4xl font-semibold tracking-[-.05em]">
              Veja seu crédito.
            </h2>
            {loading ? (
              <p className="py-12 text-center text-sm text-[#6e6e73]">Carregando sua conta…</p>
            ) : !user ? (
              <div className="mt-8 rounded-[30px] bg-[#f5f5f7] p-8 text-center">
                <h3 className="text-2xl font-semibold">Entre na Conta Koda.</h3>
                <p className="mt-3 text-sm text-[#6e6e73]">
                  O KodaBot usado precisa estar vinculado à sua conta.
                </p>
                <a
                  href="/conta/entrar?next=%2Ftrade-in"
                  className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
                >
                  Entrar
                </a>
              </div>
            ) : devices.length === 0 ? (
              <div className="mt-8 rounded-[30px] bg-[#f5f5f7] p-8 text-center">
                <h3 className="text-2xl font-semibold">Nenhum KodaBot elegível.</h3>
                <p className="mt-3 text-sm text-[#6e6e73]">
                  Ative ou vincule seu KodaBot à conta antes de solicitar o Trade In.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-5 rounded-[32px] border border-black/10 p-6 sm:p-8">
                <label className="block text-sm font-semibold">
                  Qual KodaBot você vai enviar?
                  <select
                    value={deviceId}
                    onChange={(event) => setDeviceId(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-black/15 bg-white px-4 font-normal"
                  >
                    <option value="">Selecione</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {names[device.model]} · {device.serial_number}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-3 border-y border-black/10 py-5">
                  {conditionQuestions.map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-5 text-sm">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={answers[key]}
                        onChange={(event) =>
                          setAnswers((current) => ({ ...current, [key]: event.target.checked }))
                        }
                        className="h-5 w-5 accent-[#0071e3]"
                      />
                    </label>
                  ))}
                </div>
                <div className={`rounded-2xl p-5 ${eligible ? "bg-[#f1fbf5]" : "bg-amber-50"}`}>
                  <p className="text-sm font-semibold">
                    {eligible
                      ? `Crédito estimado: R$ ${(credit / 100).toFixed(2).replace(".", ",")}`
                      : "Este aparelho não atende aos critérios do programa."}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
                    O valor será confirmado após a inspeção física. Antes de postar, remova o
                    KodaBot da sua conta e apague seus dados.
                  </p>
                </div>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button
                  onClick={continueToCheckout}
                  disabled={!selected || !eligible || submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-45"
                >
                  {submitting ? "Preparando…" : "Usar crédito na compra"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-4xl font-semibold tracking-[-.05em]">Como funciona.</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Step
                icon={Check}
                title="1. Veja o valor"
                text="Responda às perguntas e reserve o crédito na compra."
              />
              <Step
                icon={Truck}
                title="2. Envie pelos Correios"
                text="Depois do pedido, siga as instruções de postagem disponíveis na Conta Koda."
              />
              <Step
                icon={PackageCheck}
                title="3. A Koda inspeciona"
                text="Conferimos o aparelho e confirmamos o valor informado."
              />
            </div>
            <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-5 text-xs leading-relaxed text-[#6e6e73]">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#0071e3]" />A estimativa exige que o
              aparelho ligue, tenha estrutura e tela intactas. Se a condição real for diferente, a
              Koda informará o resultado antes de concluir o Trade In. Não envie acessórios. A
              postagem e a inspeção não transferem automaticamente dados da sua conta.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ icon: Icon, title, text }: { icon: typeof Check; title: string; text: string }) {
  return (
    <article className="rounded-[30px] bg-white p-7">
      <Icon className="h-7 w-7 text-[#0071e3]" />
      <h3 className="mt-10 text-2xl font-semibold tracking-[-.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}
