import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trade-in")({
  head: () => ({
    meta: [
      { title: "Avaliação do seu KodaBot — Koda" },
      {
        name: "description",
        content: "Envie seu KodaBot para análise e receba uma oferta para o próximo.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TradeInPage,
});

type Model = "kodabot-i" | "kodabot-i-pro";
type Device = { id: string; serial_number: string; model: Model; status: string };
type TradeInRequest = {
  id: string;
  source_model: Model;
  serial_number: string;
  estimated_credit_cents: number;
  final_credit_cents: number | null;
  coupon_code: string | null;
  status: string;
};
type ConditionKey = "powersOn" | "enclosureIntact" | "screenIntact" | "speakerWorks";

const names: Record<Model, string> = { "kodabot-i": "KodaBot", "kodabot-i-pro": "KodaBot Pro" };
const initialAnswers: Record<ConditionKey, boolean> = {
  powersOn: true,
  enclosureIntact: true,
  screenIntact: true,
  speakerWorks: true,
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function estimate(model: Model, answers: Record<ConditionKey, boolean>) {
  const value =
    model === "kodabot-i"
      ? 5990 -
        (answers.powersOn ? 0 : 2990) -
        (answers.enclosureIntact ? 0 : 1500) -
        (answers.screenIntact ? 0 : 1500)
      : 7990 -
        (answers.powersOn ? 0 : 3990) -
        (answers.enclosureIntact ? 0 : 2000) -
        (answers.speakerWorks ? 0 : 2000);
  return Math.max(500, value);
}

function TradeInPage() {
  const { user, loading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [answers, setAnswers] = useState(initialAnswers);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("devices")
        .select("id,serial_number,model,status")
        .eq("owner_user_id", user.id)
        .in("model", ["kodabot-i", "kodabot-i-pro"])
        .in("status", ["activated", "service"])
        .order("activated_at", { ascending: false }),
      supabase
        .from("trade_in_requests")
        .select(
          "id,source_model,serial_number,estimated_credit_cents,final_credit_cents,coupon_code,status",
        )
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled,returned)")
        .order("created_at", { ascending: false }),
    ]).then(([deviceResult, requestResult]) => {
      const eligible = (deviceResult.data ?? []) as Device[];
      setDevices(eligible);
      setDeviceId(eligible[0]?.id ?? "");
      setRequests((requestResult.data ?? []) as TradeInRequest[]);
    });
  }, [user]);

  const selected = useMemo(
    () => devices.find((device) => device.id === deviceId) ?? null,
    [devices, deviceId],
  );
  const credit = selected ? estimate(selected.model, answers) : 0;
  const questions: Array<[ConditionKey, string, number]> =
    selected?.model === "kodabot-i-pro"
      ? [
          ["powersOn", "Ele liga e inicia normalmente?", 3990],
          ["enclosureIntact", "A estrutura está inteira?", 2000],
          ["speakerWorks", "O alto-falante funciona normalmente?", 2000],
        ]
      : [
          ["powersOn", "Ele liga e inicia normalmente?", 2990],
          ["enclosureIntact", "A estrutura está inteira?", 1500],
          ["screenIntact", "A tela está sem trincas?", 1500],
        ];

  async function requestInspection() {
    if (!user || !selected || !termsAccepted || submitting) return;
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
        estimated_credit_cents: credit,
        powers_on: answers.powersOn,
        enclosure_intact: answers.enclosureIntact,
        screen_intact: selected.model === "kodabot-i" ? answers.screenIntact : true,
        speaker_works: selected.model === "kodabot-i-pro" ? answers.speakerWorks : null,
        status: "awaiting_shipment",
        terms_accepted_at: new Date().toISOString(),
      })
      .select(
        "id,source_model,serial_number,estimated_credit_cents,final_credit_cents,coupon_code,status",
      )
      .single();
    if (insertError || !data)
      setError(
        insertError?.code === "23505"
          ? "Este KodaBot já possui uma avaliação em andamento."
          : "Não foi possível solicitar a análise agora.",
      );
    else {
      setRequests((current) => [data as TradeInRequest, ...current]);
      setTermsAccepted(false);
    }
    setSubmitting(false);
  }

  async function decide(request: TradeInRequest, accept: boolean) {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("respond_trade_in_offer", {
      _request_id: request.id,
      _accept: accept,
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (rpcError || !result) setError("Não foi possível registrar sua decisão agora.");
    else {
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: result.status, coupon_code: result.coupon_code }
            : item,
        ),
      );
      if (accept && result.coupon_code) {
        const guided = new URLSearchParams(window.location.search).get("returnTo") === "comprar";
        window.location.href = guided
          ? `/comprar?coupon=${encodeURIComponent(result.coupon_code)}`
          : `/checkout/kodabot-i?coupon=${encodeURIComponent(result.coupon_code)}`;
      }
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28">
          <Recycle className="mx-auto h-10 w-10 text-[#34c759]" />
          <p className="mt-5 text-sm font-semibold">Avaliação para compra</p>
          <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Seu KodaBot vale crédito.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Aceitamos aparelhos com danos. A estimativa começa em R$ 59,90 para KodaBot e R$ 79,90
            para KodaBot Pro, e é confirmada depois da análise física.
          </p>
        </section>

        {user && requests.length > 0 && (
          <section className="mx-auto max-w-4xl px-5 pt-16">
            <h2 className="text-3xl font-semibold tracking-[-.04em]">
              Suas avaliações em andamento.
            </h2>
            <div className="mt-6 space-y-4">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[28px] border border-black/10 p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {names[request.source_model]} · {request.serial_number}
                      </p>
                      <p className="mt-1 text-xs text-[#6e6e73]">{statusLabel(request.status)}</p>
                    </div>
                    <strong>
                      {formatMoney(request.final_credit_cents ?? request.estimated_credit_cents)}
                    </strong>
                  </div>
                  {request.status === "offer_ready" && request.final_credit_cents != null && (
                    <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5">
                      <p className="text-sm font-semibold">
                        Oferta final: {formatMoney(request.final_credit_cents)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
                        Aceitando, você recebe um cupom para o próximo KodaBot. Recusando, o
                        aparelho será devolvido e o frete de devolução será cobrado de você.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          disabled={submitting}
                          onClick={() => decide(request, true)}
                          className="rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white"
                        >
                          Aceitar e receber cupom
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => decide(request, false)}
                          className="rounded-full border border-black/15 px-5 py-2.5 text-xs font-semibold"
                        >
                          Recusar e solicitar devolução
                        </button>
                      </div>
                    </div>
                  )}
                  {request.status === "accepted" && request.coupon_code && (
                    <div className="mt-5 rounded-2xl bg-[#f1fbf5] p-5">
                      <p className="text-xs text-[#568064]">Seu cupom</p>
                      <p className="mt-1 font-mono text-lg font-semibold">{request.coupon_code}</p>
                      <a
                        href={`/checkout/kodabot-i?coupon=${encodeURIComponent(request.coupon_code)}`}
                        className="mt-3 inline-flex text-xs font-semibold text-[#0066cc]"
                      >
                        Comprar KodaBot <ArrowRight className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-center text-4xl font-semibold tracking-[-.05em]">
            Solicite a análise.
          </h2>
          {loading ? (
            <p className="py-12 text-center text-sm text-[#6e6e73]">Carregando sua conta…</p>
          ) : !user ? (
            <div className="mt-8 rounded-[30px] bg-[#f5f5f7] p-8 text-center">
              <h3 className="text-2xl font-semibold">Entre na Conta Koda.</h3>
              <p className="mt-3 text-sm text-[#6e6e73]">
                O aparelho precisa estar vinculado à sua conta.
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
              <h3 className="text-2xl font-semibold">Nenhum KodaBot disponível.</h3>
              <p className="mt-3 text-sm text-[#6e6e73]">
                Ative ou vincule um KodaBot antes de solicitar a análise.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-5 rounded-[32px] border border-black/10 p-6 sm:p-8">
              <label className="block text-sm font-semibold">
                Qual KodaBot você vai enviar?
                <select
                  value={deviceId}
                  onChange={(event) => {
                    setDeviceId(event.target.value);
                    setAnswers(initialAnswers);
                  }}
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
              <div className="space-y-4 border-y border-black/10 py-5">
                {questions.map(([key, label, deduction]) => (
                  <div key={key}>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      Se não: redução de {formatMoney(deduction)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Choice
                        active={answers[key]}
                        onClick={() => setAnswers((current) => ({ ...current, [key]: true }))}
                      >
                        Sim
                      </Choice>
                      <Choice
                        active={!answers[key]}
                        onClick={() => setAnswers((current) => ({ ...current, [key]: false }))}
                      >
                        Não
                      </Choice>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-[#f1fbf5] p-5">
                <p className="text-sm font-semibold">Crédito estimado: {formatMoney(credit)}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
                  Mesmo quando as reduções zerarem a avaliação, oferecemos R$ 5,00 para incentivar a
                  reciclagem responsável.
                </p>
              </div>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-[#6e6e73]">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#0071e3]"
                />
                <span>
                  Aceito os termos da análise: a postagem para a central é gratuita; o valor só é
                  confirmado após inspeção; posso aceitar a oferta e receber um cupom ou recusar e
                  pagar o frete de devolução.
                </span>
              </label>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button
                onClick={requestInspection}
                disabled={!selected || !termsAccepted || submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-45"
              >
                {submitting ? "Enviando…" : "Solicitar análise gratuita"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <section className="bg-[#f5f5f7] px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-4xl font-semibold tracking-[-.05em]">Como funciona.</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-5">
              <Step
                icon={Check}
                title="1. Solicite"
                text="Responda sobre a condição e aceite os termos."
              />
              <Step icon={Truck} title="2. Envie" text="A postagem para análise é gratuita." />
              <Step
                icon={PackageCheck}
                title="3. Análise"
                text="A central inspeciona e informa o valor final."
              />
              <Step
                icon={CircleDollarSign}
                title="4. Decida"
                text="Aceite a oferta ou solicite a devolução paga."
              />
              <Step
                icon={Recycle}
                title="5. Use"
                text="Se aceitar, use o cupom no próximo KodaBot."
              />
            </div>
            <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-5 text-xs leading-relaxed text-[#6e6e73]">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#0071e3]" />
              Não envie acessórios. A postagem para análise não transfere automaticamente a
              propriedade do aparelho. A transferência ocorre somente após sua aceitação da oferta.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-xs font-semibold ${active ? "bg-[#1d1d1f] text-white" : "border border-black/15 bg-white"}`}
    >
      {children}
    </button>
  );
}

function Step({ icon: Icon, title, text }: { icon: typeof Check; title: string; text: string }) {
  return (
    <article className="rounded-[26px] bg-white p-6">
      <Icon className="h-6 w-6 text-[#0071e3]" />
      <h3 className="mt-8 text-xl font-semibold tracking-[-.04em]">{title}</h3>
      <p className="mt-3 text-xs leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}

function statusLabel(status: string) {
  return (
    (
      {
        awaiting_shipment: "Aguardando postagem",
        in_transit: "Em trânsito para a central",
        received: "Recebido pela central",
        inspecting: "Em análise",
        offer_ready: "Oferta pronta para sua decisão",
        accepted: "Oferta aceita",
        return_requested: "Devolução solicitada",
        returned: "Aparelho devolvido",
        completed: "Cupom utilizado",
        cancelled: "Cancelado",
      } as Record<string, string>
    )[status] ?? status
  );
}
