import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, LoaderCircle, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
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
  payment_ready: boolean;
  methods: Array<"pix" | "card">;
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
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);

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

  async function createOrder() {
    if (!user || !catalog?.product.available || !catalog.koda_pay.payment_ready || submitting) return;

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
    setSubmitting(false);
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
                      <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-[#f5f5f7]">−</button>
                      <span className="min-w-9 text-center text-sm font-semibold">{quantity}</span>
                      <button type="button" onClick={() => setQuantity((value) => Math.min(20, value + 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-[#f5f5f7]">+</button>
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
                <div className="rounded-2xl border border-black/10 p-5">
                  <QrCode className="h-6 w-6 text-[#0071e3]" />
                  <p className="mt-4 font-semibold">Pix</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">Confirmação automática quando o conector bancário estiver ativo.</p>
                </div>
                <div className="rounded-2xl border border-black/10 p-5">
                  <CreditCard className="h-6 w-6 text-[#0071e3]" />
                  <p className="mt-4 font-semibold">Cartão</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">A Koda não armazenará número completo nem CVV do cartão.</p>
                </div>
              </div>

              {!catalog.koda_pay.payment_ready ? (
                <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
                    <div>
                      <p className="text-sm font-semibold">Pagamentos ainda não liberados.</p>
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
                      <p className="mt-1 text-xs text-green-900/75">Nenhuma cobrança é considerada concluída até a confirmação do Koda Pay.</p>
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
                  onClick={createOrder}
                  disabled={!catalog.product.available || !catalog.koda_pay.payment_ready || submitting || Boolean(order)}
                  className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#d2d2d7]"
                >
                  {submitting ? "Preparando pedido…" : order ? "Pedido iniciado" : "Continuar com Koda Pay"}
                </button>
              )}

              {error && <p className="mt-4 text-center text-xs font-medium text-red-600">{error}</p>}

              <div className="mt-7 space-y-3 border-t border-black/10 pt-6 text-xs leading-relaxed text-[#6e6e73]">
                <p>• O preço do pedido é calculado no servidor da Koda, não no navegador.</p>
                <p>• Dados sensíveis do meio de pagamento ficarão com a instituição financeira responsável pelo processamento.</p>
                <p>• O Koda Pay mantém pedido, status, conciliação e histórico dentro do ecossistema Koda.</p>
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
