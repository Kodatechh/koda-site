import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, LoaderCircle, RefreshCw, ShieldCheck, ShoppingBag } from "lucide-react";

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
    total_cents: number;
    customer_name: string | null;
    customer_email: string | null;
    created_at: string;
    paid_at: string | null;
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
  head: () => ({
    meta: [
      { title: "Koda Pay — Financeiro interno" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
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
    paid: "Pago",
    processing: "Em produção",
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

  async function load() {
    if (!user || !isFactoryAdmin) return;
    setLoading(true);
    setError(null);
    const { data: response, error: invokeError } = await supabase.functions.invoke<FinanceSummary>("koda-pay-admin-summary", {
      body: {},
    });

    if (invokeError || !response) {
      setError("Não foi possível carregar o financeiro do Koda Pay.");
      setData(null);
    } else {
      setData(response);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && user && isFactoryAdmin) load();
  }, [authLoading, user?.id, isFactoryAdmin]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">Validando acesso…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Nav />
        <main className="grid min-h-[650px] place-items-center px-5 text-center">
          <div>
            <ShieldCheck className="mx-auto h-10 w-10 text-[#0071e3]" />
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">Entre na conta da equipe Koda.</h1>
            <a href="/conta/entrar" className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Entrar</a>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!isFactoryAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Nav />
        <main className="grid min-h-[650px] place-items-center px-5 text-center">
          <div>
            <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">Acesso restrito.</h1>
            <p className="mt-3 text-sm text-[#6e6e73]">Somente administradores da Koda podem acessar dados financeiros.</p>
            <a href="/conta" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">Voltar para Minha Conta ›</a>
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
        <section className="rounded-[34px] bg-white p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Koda · equipe interna</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Koda Pay</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">Pedidos, pagamentos, estornos e catálogo financeiro em uma visão protegida pelo KodaCloud.</p>
            </div>
            <button onClick={load} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </section>

        {loading && !data ? (
          <div className="mt-4 grid min-h-[320px] place-items-center rounded-[32px] bg-white">
            <div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]"/><p className="mt-3 text-sm text-[#6e6e73]">Carregando dados financeiros…</p></div>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-[32px] bg-white p-8 text-center text-sm text-red-600">{error}</div>
        ) : data ? (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={ShoppingBag} label="Pedidos recentes" value={String(data.metrics.orders)} note={`${data.metrics.awaiting_payment} aguardando pagamento`} />
              <Metric icon={Banknote} label="Receita confirmada" value={money(data.metrics.confirmed_revenue_cents)} note={`${data.metrics.paid_orders} pedidos pagos`} />
              <Metric icon={CreditCard} label="Pagamentos" value={String(data.payments.length)} note="Últimos 50 registros" />
              <Metric icon={RefreshCw} label="Estornado" value={money(data.metrics.refunded_cents)} note={`${data.refunds.length} solicitações recentes`} />
            </section>

            <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
              <div><p className="text-sm font-semibold text-[#6e6e73]">Catálogo</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Produtos no Koda Pay.</h2></div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {data.products.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-black/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-semibold">{product.name}</p><p className="mt-1 font-mono text-xs text-[#86868b]">{product.slug}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.active ? "bg-green-50 text-green-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>{product.active ? "À venda" : "Desativado"}</span>
                    </div>
                    <p className="mt-6 text-2xl font-semibold">{product.unit_amount_cents == null ? "Preço não definido" : money(product.unit_amount_cents, product.currency)}</p>
                    <p className="mt-2 text-xs text-[#86868b]">{product.track_stock ? `Estoque: ${product.stock_quantity ?? 0}` : "Estoque não controlado"}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
              <div><p className="text-sm font-semibold text-[#6e6e73]">Pedidos</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Atividade recente.</h2></div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead><tr className="border-b border-black/10 text-[11px] uppercase tracking-[0.12em] text-[#86868b]"><th className="py-3 pr-5">Pedido</th><th className="py-3 pr-5">Cliente</th><th className="py-3 pr-5">Valor</th><th className="py-3 pr-5">Criado</th><th className="py-3">Status</th></tr></thead>
                  <tbody>{data.orders.map((order) => <tr key={order.id} className="border-b border-black/10"><td className="py-4 pr-5 font-mono text-xs font-semibold">KD-{String(order.order_number).padStart(6,"0")}</td><td className="py-4 pr-5"><p className="font-medium">{order.customer_name ?? "—"}</p><p className="mt-0.5 text-xs text-[#86868b]">{order.customer_email ?? ""}</p></td><td className="py-4 pr-5 font-semibold">{money(order.total_cents, order.currency)}</td><td className="py-4 pr-5 text-[#6e6e73]">{date(order.created_at)}</td><td className="py-4"><span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-semibold text-[#6e6e73]">{orderLabel(order.status)}</span></td></tr>)}</tbody>
                </table>
                {!data.orders.length && <p className="py-10 text-center text-sm text-[#6e6e73]">Nenhum pedido registrado ainda.</p>}
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
  return <article className="rounded-[28px] bg-white p-6"><Icon className="h-5 w-5 text-[#0071e3]"/><p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#86868b]">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-2 text-xs text-[#6e6e73]">{note}</p></article>;
}
