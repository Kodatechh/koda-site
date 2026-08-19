import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Copy,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Truck,
} from "lucide-react";

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
  status: string;
  local_status: string;
  qr_code: string;
  qr_code_base64: string | null;
  ticket_url: string | null;
};

type ShippingAddress = {
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
};

const emptyAddress: ShippingAddress = {
  recipient: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  phone: "",
};

export const Route = createFileRoute("/checkout/$productSlug")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Koda" },
      { name: "description", content: "Checkout seguro da Koda com pagamento pelo Koda Pay." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function formatMoney(cents: number | null, currency = "BRL") {
  if (cents == null) return "Preço ainda não definido";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function makeReference() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function CheckoutPage() {
  const { productSlug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [checkoutReference] = useState(makeReference);

  useEffect(() => {
    let alive = true;
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogResponse>(
        "koda-pay-catalog",
        { body: { productSlug } },
      );
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

  useEffect(() => {
    if (!order?.id || !user || ["paid", "processing", "shipped", "delivered"].includes(order.status)) return;
    let alive = true;
    const check = async () => {
      const { data } = await db
        .from("orders")
        .select("id,order_number,status,currency,total_cents")
        .eq("id", order.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (alive && data?.status && data.status !== order.status) {
        setOrder((current) => (current ? { ...current, ...data, display_number: current.display_number } : current));
      }
    };
    const timer = window.setInterval(check, 3000);
    check();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [order?.id, order?.status, user?.id]);

  const totalCents = useMemo(() => {
    const unit = catalog?.product.unit_amount_cents;
    return unit == null ? null : unit * quantity;
  }, [catalog, quantity]);

  const needsShipping = Boolean(catalog?.product.slug.startsWith("kodabot"));
  const addressValid = useMemo(() => {
    if (!needsShipping) return true;
    return Boolean(
      address.recipient.trim() &&
        address.postalCode.replace(/\D/g, "").length === 8 &&
        address.street.trim() &&
        address.number.trim() &&
        address.neighborhood.trim() &&
        address.city.trim() &&
        /^[A-Za-z]{2}$/.test(address.state.trim()),
    );
  }, [address, needsShipping]);

  const paid = Boolean(order && ["paid", "processing", "shipped", "delivered"].includes(order.status));

  async function generatePix(orderId: string) {
    const { data, error: invokeError } = await supabase.functions.invoke<{ payment: PixPayment }>(
      "koda-pay-mercadopago-pix",
      { body: { orderId } },
    );
    if (invokeError || !data?.payment?.qr_code) {
      setError("Seu pedido foi criado, mas não conseguimos gerar o Pix agora. Você pode tentar novamente sem criar outro pedido.");
      return false;
    }
    setPix(data.payment);
    return true;
  }

  async function createOrder() {
    if (!user || !catalog?.product.available || !catalog.koda_pay.ready_methods.includes("pix") || submitting) return;
    if (!addressValid) {
      setError("Confira os dados de entrega antes de continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ order: CreatedOrder }>(
      "koda-pay-create-order",
      {
        body: {
          productSlug: catalog.product.slug,
          quantity,
          checkoutReference,
          shippingAddress: needsShipping ? address : undefined,
        },
      },
    );

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

  function updateAddress(field: keyof ShippingAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: field === "state" ? value.toUpperCase().slice(0, 2) : value }));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:py-16">
        <div className="mb-10 flex items-center gap-2 text-xs font-semibold text-[#6e6e73]">
          <ShieldCheck className="h-4 w-4 text-[#0071e3]" />
          Koda Pay · checkout seguro
        </div>

        {loading || authLoading ? (
          <div className="grid min-h-[560px] place-items-center rounded-[38px] bg-white">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
              <p className="mt-3 text-sm text-[#6e6e73]">Preparando sua compra…</p>
            </div>
          </div>
        ) : error && !catalog ? (
          <EmptyCheckout title="Checkout indisponível." body={error} />
        ) : catalog ? (
          paid && order ? (
            <section className="mx-auto max-w-3xl rounded-[40px] bg-white px-7 py-16 text-center sm:px-14 sm:py-20">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eaf8ee] text-[#248a3d]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="mt-7 text-sm font-semibold text-[#248a3d]">Pagamento confirmado</p>
              <h1 className="mx-auto mt-2 max-w-xl text-5xl font-semibold tracking-[-.06em] sm:text-6xl">
                Seu pedido está com a Koda.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#6e6e73]">
                {order.display_number} foi confirmado. Você pode acompanhar preparação, envio e entrega pela Conta Koda.
              </p>
              <a href={`/conta/pedidos/${order.id}`} className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]">
                Acompanhar pedido
              </a>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
              <section className="rounded-[38px] bg-white p-7 sm:p-10">
                <p className="text-sm font-semibold text-[#0071e3]">Seu pedido</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{catalog.product.name}</h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
                  {catalog.product.description ?? "Produto Koda."}
                </p>

                <div className="mt-9 border-t border-black/10 pt-7">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs text-[#86868b]">Valor unitário</p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-.03em]">{formatMoney(catalog.product.unit_amount_cents, catalog.product.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#86868b]">Quantidade</p>
                      <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-[#f5f5f7] p-1">
                        <button type="button" disabled={Boolean(order)} onClick={() => setQuantity((v) => Math.max(1, v - 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-white disabled:opacity-40">−</button>
                        <span className="min-w-9 text-center text-sm font-semibold">{quantity}</span>
                        <button type="button" disabled={Boolean(order)} onClick={() => setQuantity((v) => Math.min(20, v + 1))} className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-white disabled:opacity-40">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-7 flex items-end justify-between border-t border-black/10 pt-6">
                    <div>
                      <p className="text-xs text-[#86868b]">Total do pedido</p>
                      <p className="mt-1 text-sm text-[#6e6e73]">Cobrança única pelo Koda Pay</p>
                    </div>
                    <strong className="text-3xl tracking-[-.04em]">{formatMoney(totalCents, catalog.product.currency)}</strong>
                  </div>
                </div>

                {needsShipping && !order && (
                  <div className="mt-10 border-t border-black/10 pt-8">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-[#0071e3]" />
                      <div>
                        <h2 className="text-xl font-semibold tracking-[-.03em]">Entrega</h2>
                        <p className="mt-0.5 text-xs text-[#86868b]">Informe onde você quer receber o produto.</p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Field label="Nome de quem recebe" value={address.recipient} onChange={(v) => updateAddress("recipient", v)} className="sm:col-span-2" />
                      <Field label="CEP" value={address.postalCode} onChange={(v) => updateAddress("postalCode", v.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" />
                      <Field label="Telefone" value={address.phone} onChange={(v) => updateAddress("phone", v)} inputMode="tel" />
                      <Field label="Rua / avenida" value={address.street} onChange={(v) => updateAddress("street", v)} className="sm:col-span-2" />
                      <Field label="Número" value={address.number} onChange={(v) => updateAddress("number", v)} />
                      <Field label="Complemento" value={address.complement} onChange={(v) => updateAddress("complement", v)} />
                      <Field label="Bairro" value={address.neighborhood} onChange={(v) => updateAddress("neighborhood", v)} />
                      <Field label="Cidade" value={address.city} onChange={(v) => updateAddress("city", v)} />
                      <Field label="UF" value={address.state} onChange={(v) => updateAddress("state", v)} maxLength={2} />
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[38px] bg-white p-7 sm:p-9 lg:sticky lg:top-20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0071e3]">Pagamento</p>
                    <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em]">Pix</h2>
                  </div>
                  <LockKeyhole className="h-6 w-6 text-[#0071e3]" />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">
                  O pagamento só é confirmado depois que o Koda Pay recebe a confirmação do processador.
                </p>

                {pix ? (
                  <div className="mt-7 rounded-[26px] bg-[#f5f9ff] p-5">
                    <div className="flex items-start gap-3">
                      <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
                      <div>
                        <p className="text-sm font-semibold">Escaneie para pagar</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">A página atualiza automaticamente assim que o pagamento for confirmado.</p>
                      </div>
                    </div>
                    {pix.qr_code_base64 && (
                      <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 shadow-sm">
                        <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="h-52 w-52" />
                      </div>
                    )}
                    <div className="mt-5 rounded-2xl bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#86868b]">Pix Copia e Cola</p>
                      <p className="mt-2 max-h-16 overflow-hidden break-all font-mono text-[11px] leading-relaxed text-[#424245]">{pix.qr_code}</p>
                      <button type="button" onClick={copyPix} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0077ed]">
                        <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado" : "Copiar código Pix"}
                      </button>
                    </div>
                  </div>
                ) : order ? (
                  <div className="mt-7 rounded-[24px] bg-[#f5f5f7] p-5">
                    <p className="text-sm font-semibold">{order.display_number}</p>
                    <p className="mt-1 text-xs text-[#6e6e73]">O pedido já existe. Tente gerar o Pix novamente sem criar outro pedido.</p>
                    <button type="button" onClick={() => generatePix(order.id)} className="mt-4 text-sm font-semibold text-[#0066cc] hover:underline">Gerar Pix novamente ›</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={createOrder}
                    disabled={!user || submitting || !catalog.product.available || !catalog.koda_pay.ready_methods.includes("pix") || !addressValid}
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#d2d2d7]"
                  >
                    {submitting ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Criando pedido…</> : `Pagar ${formatMoney(totalCents, catalog.product.currency)}`}
                  </button>
                )}

                {!user && (
                  <a href={`/conta/entrar?next=${encodeURIComponent(`/checkout/${productSlug}`)}`} className="mt-6 block text-center text-sm font-semibold text-[#0066cc] hover:underline">
                    Entre na Conta Koda para continuar ›
                  </a>
                )}
                {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-xs leading-relaxed text-red-700">{error}</p>}
                <div className="mt-7 flex items-start gap-3 border-t border-black/10 pt-6 text-xs leading-relaxed text-[#86868b]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" />
                  Valores são calculados no servidor. Dados de pagamento não são armazenados pela página da Koda.
                </div>
              </section>
            </div>
          )
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, className = "", inputMode, maxLength }: { label: string; value: string; onChange: (value: string) => void; className?: string; inputMode?: "text" | "numeric" | "tel"; maxLength?: number }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-[#6e6e73]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        maxLength={maxLength}
        className="h-12 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 text-sm outline-none transition-[border-color,box-shadow,background-color] focus:border-[#0071e3]/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,113,227,.08)]"
      />
    </label>
  );
}

function EmptyCheckout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[38px] bg-white p-8 text-center sm:p-14">
      <h1 className="text-4xl font-semibold tracking-[-.05em]">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">{body}</p>
      <a href="/" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc]">Voltar para a Koda ›</a>
    </div>
  );
}
