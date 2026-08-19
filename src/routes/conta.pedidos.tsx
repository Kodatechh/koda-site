/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Package, Truck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/pedidos")({ component: Orders });

type Order = {
  id: string;
  order_number: number;
  status: string;
  currency: string;
  total_cents: number;
  created_at: string;
  tracking_code: string | null;
  order_items: Array<{ id: string; product_name: string; quantity: number; total_amount_cents: number }>;
};

const labels: Record<string, string> = {
  draft: "Pedido recebido",
  pending_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  processing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
};

const statusTone: Record<string, string> = {
  paid: "text-[#248a3d]",
  processing: "text-[#0071e3]",
  shipped: "text-[#0071e3]",
  delivered: "text-[#248a3d]",
  pending_payment: "text-[#9a6700]",
  cancelled: "text-[#86868b]",
  refunded: "text-[#86868b]",
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function Orders() {
  const { user, loading } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<Order[]>([]);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setQuerying(true);
    db.from("orders")
      .select("id,order_number,status,currency,total_cents,created_at,tracking_code,order_items(id,product_name,quantity,total_amount_cents)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }: any) => {
        setItems(data ?? []);
        setError(queryError ? "Não foi possível carregar seus pedidos agora." : null);
        setQuerying(false);
      });
  }, [user?.id]);

  if (loading) return <Main><p className="text-sm text-[#86868b]">Carregando…</p></Main>;
  if (!user) {
    return (
      <Main>
        <div className="rounded-[38px] bg-white px-7 py-14 text-center">
          <h1 className="text-4xl font-semibold tracking-[-.05em]">Seus pedidos ficam na Conta Koda.</h1>
          <a href="/conta/entrar?next=/conta/pedidos" className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Entrar</a>
        </div>
      </Main>
    );
  }

  return (
    <Main>
      <section className="pb-9 pt-2">
        <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-.06em] sm:text-6xl">Pedidos.</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6e73]">
          Acompanhe pagamento, preparação, envio e entrega em um só lugar.
        </p>
      </section>

      {querying ? (
        <div className="rounded-[34px] bg-white p-10 text-sm text-[#86868b]">Buscando seus pedidos…</div>
      ) : error ? (
        <div className="rounded-[34px] bg-white p-10 text-sm text-red-600">{error}</div>
      ) : items.length ? (
        <div className="overflow-hidden rounded-[34px] bg-white">
          {items.map((order, index) => (
            <a
              key={order.id}
              href={`/conta/pedidos/${order.id}`}
              className={`group block p-6 transition-colors hover:bg-[#fafafa] sm:p-8 ${index ? "border-t border-black/[.07]" : ""}`}
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-mono text-xs text-[#86868b]">KD-{String(order.order_number).padStart(6, "0")}</p>
                    <span className={`text-xs font-semibold ${statusTone[order.status] ?? "text-[#6e6e73]"}`}>{labels[order.status] ?? order.status}</span>
                  </div>
                  <h2 className="mt-3 truncate text-2xl font-semibold tracking-[-.035em]">
                    {order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(" · ") || "Pedido Koda"}
                  </h2>
                  <p className="mt-2 text-sm text-[#86868b]">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(order.created_at))}
                  </p>
                  {order.tracking_code && (
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#6e6e73]">
                      <Truck className="h-4 w-4 text-[#0071e3]" /> Rastreio {order.tracking_code}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
                  <strong className="text-xl tracking-[-.03em]">{money(order.total_cents, order.currency)}</strong>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7] text-[#0066cc] transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-[38px] bg-white p-12 text-center sm:p-16">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f5f5f7]">
            <Package className="h-6 w-6 text-[#86868b]" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-.045em]">Nenhum pedido ainda.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6e6e73]">Quando você comprar algo na Koda, o acompanhamento aparece aqui.</p>
          <a href="/" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">Conhecer produtos ›</a>
        </div>
      )}
    </Main>
  );
}

function Main({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[680px] max-w-5xl px-5 py-12 sm:py-16">{children}</main>;
}
