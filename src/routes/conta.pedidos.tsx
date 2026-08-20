/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Package, Truck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — Koda" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Orders,
});

type Order = {
  id: string;
  order_number: number;
  status: string;
  currency: string;
  total_cents: number;
  created_at: string;
  tracking_code: string | null;
  shipping_service: string | null;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    total_amount_cents: number;
  }>;
};

const labels: Record<string, string> = {
  draft: "Pedido recebido",
  pending_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  processing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  payment_failed: "Pagamento não aprovado",
  refunded: "Estornado",
};

function Orders() {
  const { user, loading } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrdersLoading(false);
      return;
    }
    let alive = true;
    db.from("orders")
      .select("id,order_number,status,currency,total_cents,created_at,tracking_code,shipping_service,order_items(id,product_name,quantity,total_amount_cents)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (alive) {
          setItems(data ?? []);
          setOrdersLoading(false);
        }
      });
    return () => { alive = false; };
  }, [user?.id]);

  if (loading || ordersLoading) return <Main><div className="grid min-h-[520px] place-items-center text-sm text-[#6e6e73]">Carregando seus pedidos…</div></Main>;
  if (!user) return <Main><div className="rounded-[32px] bg-white p-10 text-center"><h1 className="text-3xl font-semibold tracking-[-.04em]">Entre para ver seus pedidos.</h1><a href="/conta/entrar?returnTo=/conta/pedidos" className="mt-6 inline-flex rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white">Entrar na Conta Koda</a></div></Main>;

  return (
    <Main>
      <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-[-.05em] sm:text-6xl">Seus pedidos.</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">Pagamento, preparação, envio, rastreio e documentação ficam reunidos aqui.</p>

      <div className="mt-10 space-y-4">
        {items.map((o) => (
          <a key={o.id} href={`/conta/pedidos/${o.id}`} className="group block rounded-[28px] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,.06)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="font-mono text-xs text-[#86868b]">KD-{String(o.order_number).padStart(6, "0")}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-.025em]">{labels[o.status] ?? o.status}</h2>
                <p className="mt-1 text-xs text-[#86868b]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(o.created_at))}</p>
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#6e6e73]">{o.order_items.map((i) => <span key={i.id}>{i.quantity}× {i.product_name}</span>)}</div>
                {o.tracking_code && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-semibold"><Truck className="h-3.5 w-3.5 text-[#0071e3]" />Rastreio {o.tracking_code}</div>}
              </div>
              <div className="flex items-center gap-4"><strong className="text-lg tracking-[-.02em]">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: o.currency }).format(o.total_cents / 100)}</strong><ChevronRight className="h-5 w-5 text-[#86868b] transition group-hover:translate-x-1 group-hover:text-[#0071e3]" /></div>
            </div>
          </a>
        ))}

        {!items.length && <div className="rounded-[28px] bg-white p-12 text-center"><Package className="mx-auto h-8 w-8 text-[#86868b]" /><h2 className="mt-4 text-2xl font-semibold">Nenhum pedido ainda.</h2><p className="mx-auto mt-2 max-w-sm text-sm text-[#6e6e73]">Quando você comprar um produto Koda, ele aparecerá aqui para acompanhamento.</p><a href="/loja" className="mt-6 inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white">Ir para a Loja Koda</a></div>}
      </div>
    </Main>
  );
}

function Main({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[650px] max-w-5xl px-5 py-14">{children}</main>;
}
