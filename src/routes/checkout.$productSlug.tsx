import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, ExternalLink, LoaderCircle, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { CardPaymentBrick } from "@/components/koda/CardPaymentBrick";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type CatalogProduct = {
  slug: string;
  name: string;
  description: string | null;
  available: boolean;
  currency: string;
  unit_amount_cents: number | null;
  in_stock: boolean;
};

type KodaPayStatus = {
  provider: "mercado_pago";
  payment_ready: boolean;
  methods: Array<"pix" | "card">;
  ready_methods: Array<"pix" | "card">;
  message: string;
};

type CatalogResponse = {
  product: CatalogProduct;
  koda_pay: KodaPayStatus;
};

type CreatedOrder = {
  id: string;
  order_number: number;
  display_number: string;
  status: string;
  currency: string;
  total_cents: number;
};

type PixPayment = {
  id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  status: string;
  status_detail: string | null;
  local_status: string;
  qr_code: string;
  qr_code_base64: string | null;
  ticket_url: string | null;
};

type PaymentMethod = "pix" | "card";

export const Route = createFileRoute("/checkout/$productSlug")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Koda Pay" },
      {
        name: "description",
        content: "Checkout seguro da Koda, com pagamentos processados pela camada Koda Pay.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function formatMoney(cents: number | null, currency = "BRL") {
  if (cents == null) return "Preço ainda não definido";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function CheckoutPage() {
  const { productSlug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadCatalog() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogResponse>("koda-pay-catalog", {
        body: { productSlug },
      });

      if (!alive) return;
      if (invokeError || !data?.product) {
        setError("Não foi possível carregar este produto agora.");
        setCatalog(null);
      } else {
        setCatalog(data);
        if (!data.koda_pay.ready_methods.includes("pix") && data.koda_pay.ready_methods.includes("card")) {
          setPaymentMethod("card");
        }
      }
      setLoading(false);
    }

    loadCatalog();
    return () => {
      alive = false;
    };
  }, [productSlug]);

  const totalCents = useMemo(() => {
    const unit = catalog?.product.unit_amount_cents;
    return unit == null ? null : unit * quantity;
  }, [catalog, quantity]);

  const pixReady = Boolean(catalog?.koda_pay.ready_methods.includes("pix"));
  const cardReady = Boolean(catalog?.koda_pay.ready_methods.includes("card"));
  const paymentLocked = Boolean(order || pix || submitting);

  async function generatePix(orderId: string) {
    const { data, error: invokeError } = await supabase.functions.invoke<{ payment: PixPayment }>("koda-pay-mercadopago-pix", {
      body: { orderId },
    });

    if (invokeError || !data?.payment?.qr_code) {
      setError("O pedido foi criado, mas não foi possível gerar o Pix. Nenhuma cobrança foi concluída.");
      return false;
    }

    setPix(data.payment);
    return true;
  }

  async function createPixOrder() {
    if (!user || !catalog?.product.available || paymentMethod !== "pix" || !pixReady || submitting) return;

    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ order: CreatedOrder }>("koda-pay-create-order", {
      body: { productSlug: catalog.product.slug, quantity },
    });

    if (invokeError || !data?.order) {
      setError("Não foi possível iniciar o pedido. Nenhuma cobrança foi feita.");
      setSubmitting(false);
      return;
    }

    setOrder(data.order);
    await generatePix(data.order.id);
    setSubmitting(false);
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código Pix manualmente.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-[#6e6e73]">
          <ShieldCheck className="h-4 w-4 text-[#0071e3]" />
          <span>Koda Pay · checkout seguro</span>
        </div>

        {loading || authLoading ? (
          <div className="grid min-h-[520px] place-items-center rounded-[36px] bg-white">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
              <p className="mt-3 text-sm text-[#6e6e73]">Preparando o checkout…</p>
            </div>
          </div>
        ) : error && !catalog ? (
          <div className="rounded-[36px] bg-white p-8 text-center sm:p-14">
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">Checkout indisponível.</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">{error}</p>
            <a href="/" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc]">Voltar para a Koda ›</a>
          </div>
        ) : catalog ? (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[36px] bg-white p-7 sm:p-10">
              <p className="text-sm font-semibold text-[#0071e3]">Seu pedido</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{catalog.product.name}</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
                {catalog.product.description ?? "Produto Koda."}
              </p>

              <div className="mt-9 rounded-[28px] bg-[#f5f5f7] p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86868b]">Valor unitário</p>
                    <p className="mt-2 text-2xl font-semibold">{formatMoney(catalog.product.unit_amount_cents, catalog.product.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86868b]">Quantidade</p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-white p-1">
                      <button type="button" disabled={paymentLocked} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40">−</button>
                      <span className="min-w-9 text-center text-sm font-semibold">{quantity}</span>
                      <button type="button" disabled={paymentLocked} onClick={() => setQuantity((value) => Math.min(20, value + 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40">+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-black/10 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <strong className="text-2xl">{formatMoney(totalCents, catalog.product.currency)}</strong>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#86868b]">Frete e condições finais serão exibidos antes de qualquer cobrança.</p>
                </div>
              </div>

              {!catalog.product.available && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
                  <p className="font-semibold">Este produto ainda não está disponível para compra.</p>
                  <p className="mt-1 text-amber-900/75">Preço e disponibilidade só serão publicados quando estiverem oficialmente definidos pela Koda.</p>
                </div>
              )}
            </section>

            <section className="rounded-[36px] bg-white p-7 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0071e3]">Pagamento</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Koda Pay</h2>
                </div>
                <LockKeyhole className="h-7 w-7 text-[#0071e3]" />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <button
                  type="button"
                  disabled={!pixReady || paymentLocked}
                  onClick={() => setPaymentMethod("pix")}
                  className={`rounded-2xl border p-5 text-left transition ${paymentMethod === "pix" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10 bg-white"} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <QrCode className="h-6 w-6 text-[#0071e3]" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-semibold">Pix</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${pixReady ? "text-[#0071e3]" : "text-[#86868b]"}`}>{pixReady ? "Pronto" : "Preparado"}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">QR Code e confirmação automática pelo Koda Pay.</p>
                </button>

                <button
                  type="button"
                  disabled={!cardReady || paymentLocked}
                  onClick={() => setPaymentMethod("card")}
                  className={`rounded-2xl border p-5 text-left transition ${paymentMethod === "card" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10 bg-white"} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <CreditCard className="h-6 w-6 text-[#0071e3]" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-semibold">Cartão</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${cardReady ? "text-[#0071e3]" : "text-[#86868b]"}`}>{cardReady ? "Pronto" : "Preparado"}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">MercadoPago.js + 3DS. A Koda não recebe PAN/CVV em formato bruto.</p>
                </button>
              </div>

              {paymentMethod === "pix" && (
                <>
                  {pix ? (
                    <div className="mt-6 rounded-[24px] border border-[#b8d9ff] bg-[#f5f9ff] p-5">
                      <div className="flex items-start gap-3">
                        <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
                        <div>
                          <p className="text-sm font-semibold">Escaneie para pagar com Pix</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">O pedido só será confirmado depois que o Koda Pay receber a confirmação do pagamento.</p>
                        </div>
                      </div>

                      {pix.qr_code_base64 && (
                        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 shadow-sm">
                          <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix do Koda Pay" className="h-52 w-52" />
                        </div>
                      )}

                      <div className="mt-5 rounded-2xl bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Pix Copia e Cola</p>
                        <p className="mt-2 max-h-20 overflow-hidden break-all font-mono text-[11px] leading-relaxed text-[#424245]">{pix.qr_code}</p>
                        <button type="button" onClick={copyPix} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0077ed]">
                          <Copy className="h-3.5 w-3.5" />{copied ? "Copiado" : "Copiar código Pix"}
                        </button>
                        {pix.ticket_url && (
                          <a href={pix.ticket_url} target="_blank" rel="noreferrer" className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc] hover:underline">
                            Abrir instruções <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : !catalog.koda_pay.payment_ready ? (
                    <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5">
                      <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
                        <div>
                          <p className="text-sm font-semibold">Integração preparada.</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">{catalog.koda_pay.message}</p>
                        </div>
                      </div>
                    </div>
                  ) : order ? (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                        <div>
                          <p className="text-sm font-semibold text-green-950">Pedido {order.display_number} iniciado.</p>
                          <p className="mt-1 text-xs text-green-900/75">A cobrança Pix ainda não foi gerada.</p>
                          <button type="button" onClick={() => generatePix(order.id)} className="mt-3 text-xs font-semibold text-[#0066cc] hover:underline">Tentar gerar Pix novamente</button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!user ? (
                    <a href={`/conta/entrar?returnTo=${encodeURIComponent(`/checkout/${productSlug}`)}`} className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed]">
                      Entrar para continuar
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={createPixOrder}
                      disabled={!catalog.product.available || !pixReady || submitting || Boolean(order)}
                      className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#d2d2d7]"
                    >
                      {submitting ? "Gerando Pix…" : pix ? "Pix gerado" : order ? "Pedido iniciado" : "Gerar Pix"}
                    </button>
                  )}
                </>
              )}

              {paymentMethod === "card" && (
                <>
                  <CardPaymentBrick
                    productSlug={catalog.product.slug}
                    quantity={quantity}
                    amountCents={totalCents}
                    enabled={Boolean(user) && catalog.product.available && cardReady}
                  />
                  {!user && (
                    <a href={`/conta/entrar?returnTo=${encodeURIComponent(`/checkout/${productSlug}`)}`} className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed]">
                      Entrar para continuar
                    </a>
                  )}
                </>
              )}

              {error && <p className="mt-4 text-center text-xs font-medium text-red-600">{error}</p>}

              <div className="mt-7 space-y-3 border-t border-black/10 pt-6 text-xs leading-relaxed text-[#6e6e73]">
                <p>• O preço do pedido é calculado no servidor da Koda, não no navegador.</p>
                <p>• Pix e cartão são processados pelo Mercado Pago dentro da camada Koda Pay.</p>
                <p>• Dados brutos de cartão e CVV não são armazenados pela Koda.</p>
                <p>• O pagamento é confirmado por webhook assinado antes de o pedido ser marcado como pago.</p>
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
