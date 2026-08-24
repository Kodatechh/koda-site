import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Cable,
  Check,
  LoaderCircle,
  MapPin,
  Recycle,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comprar")({
  head: () => ({
    meta: [
      { title: "Compra guiada — Koda" },
      {
        name: "description",
        content: "Monte sua compra do KodaBot, simule o frete e integre seu Trade In.",
      },
    ],
  }),
  component: GuidedPurchase,
});

type ShippingOption = {
  id: string;
  name: string;
  company?: string | null;
  price_cents: number;
  deadline_days: number | null;
};

type TradeInCredit = {
  id: string;
  coupon_code: string;
  final_credit_cents: number;
  source_model: "kodabot-i" | "kodabot-i-pro";
};

const steps = ["Modelo", "Trade In", "Acessórios", "Entrega", "Resumo"];

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function GuidedPurchase() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [model, setModel] = useState<"kodabot-i" | "kodabot-i-pro">("kodabot-i");
  const [tradeInChoice, setTradeInChoice] = useState<"yes" | "no" | null>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("coupon")
      ? "yes"
      : null,
  );
  const [credits, setCredits] = useState<TradeInCredit[]>([]);
  const [coupon, setCoupon] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("coupon") ?? ""),
  );
  const [adapter, setAdapter] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [shipping, setShipping] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCredits([]);
      setCoupon("");
      return;
    }
    supabase
      .from("trade_in_requests")
      .select("id,coupon_code,final_credit_cents,source_model")
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .not("coupon_code", "is", null)
      .order("customer_decision_at", { ascending: false })
      .then(({ data }) => {
        const available = (data ?? []) as TradeInCredit[];
        setCredits(available);
        setCoupon((current) =>
          available.some((credit) => credit.coupon_code === current)
            ? current
            : (available[0]?.coupon_code ?? ""),
        );
      });
  }, [user]);

  const selectedCredit = credits.find((credit) => credit.coupon_code === coupon) ?? null;
  const productPrice = model === "kodabot-i" ? 9990 : 12990;
  const subtotal = productPrice + (adapter && model === "kodabot-i" ? 1490 : 0);
  const estimatedTotal = Math.max(0, subtotal - (selectedCredit?.final_credit_cents ?? 0));
  const checkoutHref = useMemo(() => {
    const params = new URLSearchParams();
    if (adapter) params.set("adapter", "1");
    if (coupon) params.set("coupon", coupon);
    const cep = postalCode.replace(/\D/g, "");
    if (cep.length === 8) params.set("cep", cep);
    return `/checkout/kodabot-i${params.size ? `?${params.toString()}` : ""}`;
  }, [adapter, coupon, postalCode]);

  async function calculateShipping() {
    const cep = postalCode.replace(/\D/g, "");
    if (!user) {
      setShippingError("Entre na Conta Koda para consultar as opções reais de entrega.");
      return;
    }
    if (cep.length !== 8) {
      setShippingError("Digite um CEP válido com 8 números.");
      return;
    }
    setShippingLoading(true);
    setShippingError(null);
    const { data, error } = await supabase.functions.invoke<{
      configured: boolean;
      options: ShippingOption[];
    }>("koda-shipping", {
      body: { postalCode: cep, productSlug: "kodabot-i", quantity: 1 },
    });
    if (error || !data?.configured || !data.options?.length) {
      setShipping([]);
      setShippingError("Não foi possível calcular o frete para esse CEP agora.");
    } else {
      setShipping(data.options);
    }
    setShippingLoading(false);
  }

  function next() {
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:py-16">
        <header className="text-center">
          <p className="text-sm font-semibold text-[#0071e3]">Compra guiada</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Vamos montar seu Koda.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
            Escolha o modelo, veja seu Trade In, complete a alimentação e consulte a entrega antes
            de ir para o pagamento.
          </p>
        </header>

        <div className="mx-auto mt-10 flex max-w-3xl gap-1.5" aria-label="Progresso da compra">
          {steps.map((label, index) => (
            <div key={label} className="min-w-0 flex-1">
              <div
                className={`h-1 rounded-full ${index <= step ? "bg-[#0071e3]" : "bg-black/10"}`}
              />
              <p
                className={`mt-2 truncate text-[10px] ${index === step ? "font-semibold" : "text-[#86868b]"}`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <section className="mx-auto mt-8 min-h-[520px] max-w-4xl rounded-[40px] bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,.06)] sm:p-10">
          {step === 0 && (
            <div>
              <p className="text-sm text-[#86868b]">1 de 5</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Qual KodaBot?</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <ChoiceCard
                  active={model === "kodabot-i"}
                  onClick={() => setModel("kodabot-i")}
                  title="KodaBot"
                  eyebrow="Pré-venda disponível"
                  description="Tela touch, informações rápidas e o essencial à primeira vista."
                  price="R$ 99,90"
                  image="/kodabot-checkout-transparent-v1.png"
                />
                <ChoiceCard
                  active={model === "kodabot-i-pro"}
                  onClick={() => setModel("kodabot-i-pro")}
                  title="KodaBot Pro"
                  eyebrow="Lista de espera"
                  description="Experiência por voz e áudio. Ainda não disponível para compra."
                  price="Pré-venda futura: R$ 129,90"
                  icon={<Bot className="h-20 w-20" strokeWidth={1.1} />}
                  dark
                />
              </div>
              {model === "kodabot-i-pro" && (
                <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5 text-sm text-[#6e6e73]">
                  O Pro ainda não pode ser comprado. Você pode entrar na lista de espera e receber o
                  aviso quando a pré-venda começar.
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm text-[#86868b]">2 de 5</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">
                Tem um KodaBot para trocar?
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
                A análise é feita antes da compra: você envia gratuitamente, recebe a oferta e só
                então decide se quer usar o crédito.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setTradeInChoice("yes")}
                  className={`rounded-[26px] border p-6 text-left ${tradeInChoice === "yes" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"}`}
                >
                  <Recycle className="h-7 w-7 text-[#34a853]" />
                  <strong className="mt-8 block text-xl">Sim, quero avaliar</strong>
                  <span className="mt-2 block text-xs leading-relaxed text-[#6e6e73]">
                    Crédito estimado de até R$ 59,90 ou R$ 79,90.
                  </span>
                </button>
                <button
                  onClick={() => {
                    setTradeInChoice("no");
                    setCoupon("");
                  }}
                  className={`rounded-[26px] border p-6 text-left ${tradeInChoice === "no" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"}`}
                >
                  <ArrowRight className="h-7 w-7 text-[#0071e3]" />
                  <strong className="mt-8 block text-xl">Não tenho agora</strong>
                  <span className="mt-2 block text-xs leading-relaxed text-[#6e6e73]">
                    Continue sem crédito de troca.
                  </span>
                </button>
              </div>
              {tradeInChoice === "yes" && (
                <div className="mt-5 rounded-[24px] bg-[#f5f5f7] p-5">
                  {authLoading ? (
                    <p className="text-sm text-[#6e6e73]">Consultando sua conta…</p>
                  ) : !user ? (
                    <div>
                      <p className="text-sm font-semibold">Entre para verificar seu aparelho.</p>
                      <a
                        href="/conta/entrar?returnTo=%2Fcomprar"
                        className="mt-4 inline-flex rounded-full bg-[#1d1d1f] px-5 py-2.5 text-xs font-semibold text-white"
                      >
                        Entrar na Conta Koda
                      </a>
                    </div>
                  ) : credits.length ? (
                    <label className="block text-sm font-semibold">
                      Crédito disponível
                      <select
                        value={coupon}
                        onChange={(event) => setCoupon(event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 font-normal"
                      >
                        {credits.map((credit) => (
                          <option key={credit.id} value={credit.coupon_code}>
                            {credit.coupon_code} · {money(credit.final_credit_cents)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold">Nenhum crédito pronto para uso.</p>
                      <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
                        Comece a análise agora. Você poderá voltar à compra assim que aceitar a
                        oferta final.
                      </p>
                      <a
                        href="/trade-in?returnTo=comprar"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white"
                      >
                        Iniciar Trade In <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-[#86868b]">3 de 5</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">
                Como você vai ligar seu KodaBot?
              </h2>
              <div className="mt-8 grid gap-5 md:grid-cols-[1fr_240px] md:items-center">
                <div>
                  <div className="flex items-center gap-3 text-[#0071e3]">
                    <Cable className="h-5 w-5" />
                    <p className="text-sm font-semibold">Cabo Micro USB incluído</p>
                  </div>
                  <p className="mt-4 text-2xl font-semibold">Adicione o adaptador de tomada.</p>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
                    Adaptador bivolt USB-A de 5 V / 2 A por R$ 14,90 quando comprado junto do
                    KodaBot.
                  </p>
                  <button
                    onClick={() => setAdapter((current) => !current)}
                    className={`mt-6 rounded-full px-6 py-3 text-sm font-semibold ${adapter ? "bg-[#1d1d1f] text-white" : "bg-[#0071e3] text-white"}`}
                  >
                    {adapter ? "Adicionado ✓" : "Adicionar por R$ 14,90"}
                  </button>
                </div>
                <div className="grid h-56 place-items-center rounded-[28px] bg-[#f5f5f7] p-5">
                  <img
                    src="/koda-adaptador-usb-2a.webp"
                    alt="Adaptador de energia USB para KodaBot"
                    className="h-full w-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-[#86868b]">4 de 5</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Consulte a entrega.</h2>
              <p className="mt-4 text-sm text-[#6e6e73]">
                O valor final é confirmado no checkout depois que você preencher o endereço.
              </p>
              <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-[#86868b]" />
                  <input
                    value={postalCode}
                    onChange={(event) =>
                      setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    placeholder="Digite seu CEP"
                    inputMode="numeric"
                    className="h-12 w-full rounded-xl border border-black/10 pl-12 pr-4 outline-none focus:border-[#0071e3]"
                  />
                </label>
                <button
                  onClick={calculateShipping}
                  disabled={shippingLoading}
                  className="h-12 rounded-full bg-[#1d1d1f] px-6 text-sm font-semibold text-white disabled:opacity-45"
                >
                  {shippingLoading ? "Calculando…" : "Calcular frete"}
                </button>
              </div>
              {shippingError && <p className="mt-4 text-sm text-[#bf4800]">{shippingError}</p>}
              {shipping.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {shipping.map((option) => (
                    <div key={option.id} className="rounded-2xl border border-black/10 p-5">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#0071e3]" />
                        <p className="text-sm font-semibold">
                          {option.company || "Transportadora"}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-[#6e6e73]">{option.name}</p>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <strong>{money(option.price_cents)}</strong>
                        <span className="text-xs text-[#86868b]">
                          {option.deadline_days == null
                            ? "Prazo no checkout"
                            : `${option.deadline_days} dias úteis após a postagem`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!user && (
                <a
                  href="/conta/entrar?returnTo=%2Fcomprar"
                  className="mt-5 inline-flex text-sm font-semibold text-[#0066cc]"
                >
                  Entrar para consultar o frete real ›
                </a>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-sm text-[#86868b]">5 de 5</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Seu KodaBot.</h2>
              <div className="mt-8 grid gap-7 md:grid-cols-[220px_1fr]">
                <div className="grid h-64 place-items-center rounded-[28px] bg-[#f5f5f7] p-5">
                  <img
                    src="/kodabot-checkout-transparent-v1.png"
                    alt="KodaBot"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <div className="space-y-4 border-b border-black/10 pb-6 text-sm">
                    <SummaryRow label="KodaBot em pré-venda" value="R$ 99,90" />
                    <SummaryRow
                      label="Adaptador de tomada"
                      value={adapter ? "R$ 14,90" : "Não adicionado"}
                    />
                    <SummaryRow
                      label="Trade In"
                      value={
                        selectedCredit
                          ? `− ${money(selectedCredit.final_credit_cents)}`
                          : "Sem crédito"
                      }
                    />
                    <SummaryRow label="Frete" value="Confirmado no checkout" />
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-5">
                    <div>
                      <p className="text-xs text-[#86868b]">Subtotal antes do frete</p>
                      <p className="mt-1 text-3xl font-semibold tracking-[-.04em]">
                        {money(estimatedTotal)}
                      </p>
                    </div>
                    <a
                      href={checkoutHref}
                      className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
                    >
                      Ir para o checkout
                    </a>
                  </div>
                  <div className="mt-6 flex gap-3 rounded-2xl bg-[#eef6ff] p-4 text-xs leading-relaxed text-[#49647d]">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-[#0071e3]" />O preço de pré-venda
                    é validado no servidor. Envios começam em 17/10/2026 e poderão ser acompanhados
                    pela Conta Koda.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-black/10 pt-6">
            <button
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-2 text-sm font-semibold disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            {step < 4 &&
              (model === "kodabot-i-pro" && step === 0 ? (
                <a
                  href="/kodabot-pro#lista-de-espera"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
                >
                  Entrar na lista <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <button
                  onClick={next}
                  disabled={step === 1 && tradeInChoice == null}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  eyebrow,
  description,
  price,
  image,
  icon,
  dark = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  eyebrow: string;
  description: string;
  price: string;
  image?: string;
  icon?: ReactNode;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-[30px] border p-6 text-left transition ${active ? "border-[#0071e3] ring-4 ring-[#0071e3]/10" : "border-black/10"} ${dark ? "bg-[#111113] text-white" : "bg-white"}`}
    >
      {active && (
        <span className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-[#0071e3] text-white">
          <Check className="h-4 w-4" />
        </span>
      )}
      <div className="relative isolate flex h-44 items-center justify-center overflow-hidden rounded-[22px]">
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 m-auto block max-h-full max-w-full object-contain"
            style={{ width: "auto", height: "100%" }}
          />
        ) : (
          icon
        )}
      </div>
      <div className="relative z-10">
        <p className={`mt-5 text-xs font-semibold ${dark ? "text-[#2997ff]" : "text-[#0071e3]"}`}>
          {eyebrow}
        </p>
        <h3 className="mt-2 text-3xl font-semibold tracking-[-.05em]">{title}</h3>
        <p
          className={`mt-3 min-h-10 text-xs leading-relaxed ${dark ? "text-white/60" : "text-[#6e6e73]"}`}
        >
          {description}
        </p>
        <p className="mt-6 text-sm font-semibold">{price}</p>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-[#6e6e73]">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
