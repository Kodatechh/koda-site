import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type FinanceSummary = {
  metrics: {
    orders: number;
    awaiting_payment: number;
    paid_orders: number;
    confirmed_revenue_cents: number;
    refunded_cents: number;
  };
  products: Array<{
    id: string;
    slug: string;
    name: string;
    active: boolean;
    currency: string;
    unit_amount_cents: number | null;
    track_stock: boolean;
    stock_quantity: number | null;
    updated_at: string;
  }>;
  orders: Array<{
    id: string;
    order_number: number;
    status: string;
    currency: string;
    subtotal_cents: number;
    shipping_cents: number;
    discount_cents: number;
    total_cents: number;
    customer_name: string | null;
    customer_email: string | null;
    shipping_address: Record<string, unknown> | null;
    tracking_code: string | null;
    created_at: string;
    paid_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    updated_at: string;
    order_items: Array<{ id: string; product_name: string; quantity: number; total_amount_cents: number }>;
  }>;
  payments: Array<{
    id: string;
    order_id: string;
    provider_key: string;
    method: string;
    status: string;
    amount_cents: number;
    card_brand: string | null;
    card_last4: string | null;
    created_at: string;
    paid_at: string | null;
  }>;
  refunds: Array<{
    id: string;
    order_id: string;
    payment_id: string;
    amount_cents: number;
    status: string;
    reason: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
};

export const Route = createFileRoute("/financeiro-interno")({
  head: () => ({ meta: [{ title: "Koda Pay — Financeiro interno" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: FinanceConsole,
});

function money(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function orderLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    pending_payment: "Aguardando pagamento",
    paid: "Pago · aguardando preparação",
    processing: "Preparando",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
    refunded: "Estornado",
    partially_refunded: "Estorno parcial",
  };
  return labels[status] ?? status;
}

function FinanceConsole() {
  const { user, loading: authLoading, isFactoryAdmin } = useAuth();
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  async function load() {
    if (!user || !isFactoryAdmin) return;
    setLoading(true);
    setError(null);
    const { data: response, error: invokeError } = await supabase.functions.invoke<FinanceSummary>("koda-pay-admin-summary", { body: {} });
    if (invokeError || !response) {
      setError("Não foi possível carregar o financeiro do Koda Pay.");
      setData(null);
    } else {
      setData(response);
    }
    setLoading(false);
  }

  async function runOrderAction(orderId: string, action: "start_processing" | "mark_shipped" | "mark_delivered") {
    if (actionId) return;
    setActionId(orderId);
    setError(null);
    const { error: invokeError } = await supabase.functions.invoke("koda-pay-admin-order", {
      body: {
        orderId,
        action,
        trackingCode: action === "mark_shipped" ? tracking[orderId]?.trim() : undefined,
      },
    });
    if (invokeError) {
      setError(action === "mark_shipped" && !tracking[orderId]?.trim() ? "Informe um código de rastreio antes de marcar o pedido como enviado." : "Não foi possível atualizar este pedido.");
    } else {
      await load();
    }
    setActionId(null);
  }

  useEffect(() => {
    if (!authLoading && user && isFactoryAdmin) load();
  }, [authLoading, user?.id, isFactoryAdmin]);

  if (authLoading) return <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">Validando acesso…</div>;

  if (!user || !isFactoryAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Nav />
        <main className="grid min-h-[650px] place-items-center px-5 text-center">
          <div>
            <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
            <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em]">{user ? "Acesso restrito." : "Entre na conta da equipe Koda."}</h1>
            <p className="mt-3 text-sm text-[#6e6e73]">Somente administradores da Koda podem gerenciar pedidos e pagamentos.</p>
            <a href={user ? "/conta" : "/conta/entrar"} className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">Voltar ›</a>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <section className="rounded-[38px] bg-white p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Koda · equipe interna</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-[-.06em]">Pedidos e Koda Pay.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">Pagamento continua sendo definido pelo processador. Aqui a equipe cuida apenas da operação depois da confirmação: preparar, enviar e concluir a entrega.</p>
            </div>
            <button onClick={load} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold transition-colors hover:bg-[#f5f5f7] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </section>

        {error && <div className="mt-4 rounded-[24px] bg-red-50 p-5 text-sm text-red-700">{error}</div>}

        {loading && !data ? (
          <div className="mt-4 grid min-h-[320px] place-items-center rounded-[32px] bg-white"><div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" /><p className="mt-3 text-sm text-[#6e6e73]">Carregando dados…</p></div></div>
        ) : data ? (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={ShoppingBag} label="Pedidos recentes" value={String(data.metrics.orders)} note={`${data.metrics.awaiting_payment} aguardando pagamento`} />
              <Metric icon={Banknote} label="Receita confirmada" value={money(data.metrics.confirmed_revenue_cents)} note={`${data.metrics.paid_orders} pedidos pagos`} />
              <Metric icon={CreditCard} label="Pagamentos" value={String(data.payments.length)} note="Últimos 50 registros" />
              <Metric icon={RefreshCw} label="Estornado" value={money(data.metrics.refunded_cents)} note={`${data.refunds.length} solicitações recentes`} />
            </section>

            <section className="mt-4 rounded-[34px] bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold text-[#6e6e73]">Operação</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em]">Pedidos para acompanhar.</h2>
              <div className="mt-7 space-y-3">
                {data.orders.map((order) => (
                  <article key={order.id} className="rounded-[26px] border border-black/[.08] p-5 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-semibold">KD-{String(order.order_number).padStart(6, "0")}</span>
                          <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-semibold text-[#6e6e73]">{orderLabel(order.status)}</span>
                        </div>
                        <p className="mt-3 text-lg font-semibold tracking-[-.025em]">{order.order_items?.map((item) => `${item.quantity}× ${item.product_name}`).join(" · ") || "Pedido Koda"}</p>
                        <p className="mt-1 text-xs text-[#86868b]">{order.customer_name ?? "Cliente"} · {order.customer_email ?? "sem e-mail"} · {date(order.created_at)}</p>
                        <p className="mt-2 text-sm font-semibold">{money(order.total_cents, order.currency)}</p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                        {order.status === "paid" && (
                          <button disabled={actionId === order.id} onClick={() => runOrderAction(order.id, "start_processing")} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:opacity-50">
                            <PackageCheck className="h-4 w-4" /> Preparar pedido
                          </button>
                        )}
                        {order.status === "processing" && (
                          <>
                            <input value={tracking[order.id] ?? ""} onChange={(event) => setTracking((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Código de rastreio" className="h-10 min-w-[210px] rounded-full border border-black/10 px-4 text-sm outline-none focus:border-[#0071e3]/60" />
                            <button disabled={actionId === order.id || !(tracking[order.id]?.trim())} onClick={() => runOrderAction(order.id, "mark_shipped")} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:bg-[#d2d2d7]">
                              <Truck className="h-4 w-4" /> Marcar enviado
                            </button>
                          </>
                        )}
                        {order.status === "shipped" && (
                          <button disabled={actionId === order.id} onClick={() => runOrderAction(order.id, "mark_delivered")} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
                            <CheckCircle2 className="h-4 w-4" /> Marcar entregue
                          </button>
                        )}
                        {order.status === "delivered" && <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#248a3d]"><CheckCircle2 className="h-4 w-4" /> Concluído</span>}
                        {order.tracking_code && <span className="font-mono text-xs text-[#86868b]">{order.tracking_code}</span>}
                      </div>
                    </div>
                  </article>
                ))}
                {!data.orders.length && <p className="py-10 text-center text-sm text-[#6e6e73]">Nenhum pedido registrado ainda.</p>}
              </div>
            </section>

            <section className="mt-4 rounded-[34px] bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold text-[#6e6e73]">Catálogo</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em]">Produtos no Koda Pay.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {data.products.map((product) => (
                  <article key={product.id} className="rounded-[24px] border border-black/[.08] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-semibold">{product.name}</p><p className="mt-1 font-mono text-xs text-[#86868b]">{product.slug}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.active ? "bg-green-50 text-green-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>{product.active ? "À venda" : "Desativado"}</span>
                    </div>
                    <p className="mt-6 text-2xl font-semibold">{product.unit_amount_cents == null ? "Preço não definido" : money(product.unit_amount_cents, product.currency)}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof ShoppingBag; label: string; value: string; note: string }) {
  return <article className="rounded-[30px] bg-white p-6"><Icon className="h-5 w-5 text-[#0071e3]" /><p className="mt-5 text-xs font-semibold uppercase tracking-[.1em] text-[#86868b]">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-2 text-xs text-[#6e6e73]">{note}</p></article>;
}
