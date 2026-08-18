/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
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
};
function Orders() {
  const { user, loading } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<Order[]>([]);
  useEffect(() => {
    if (user)
      db.from("orders")
        .select(
          "id,order_number,status,currency,total_cents,created_at,tracking_code,order_items(id,product_name,quantity,total_amount_cents)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }: any) => setItems(data ?? []));
  }, [user]);
  if (loading) return <Main>Carregando…</Main>;
  if (!user)
    return (
      <Main>
        <a href="/conta/entrar?next=/conta/pedidos">Entre para ver seus pedidos.</a>
      </Main>
    );
  return (
    <Main>
      <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-[-.05em]">Pedidos.</h1>
      <div className="mt-10 space-y-4">
        {items.map((o) => (
          <article key={o.id} className="rounded-[28px] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-[#86868b]">
                  KD-{String(o.order_number).padStart(6, "0")}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{labels[o.status] ?? o.status}</h2>
                <p className="mt-1 text-xs text-[#86868b]">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                    new Date(o.created_at),
                  )}
                </p>
              </div>
              <strong>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: o.currency }).format(
                  o.total_cents / 100,
                )}
              </strong>
            </div>
            <div className="mt-5 border-t border-black/10 pt-4">
              {o.order_items.map((i) => (
                <p key={i.id} className="text-sm text-[#6e6e73]">
                  {i.quantity}× {i.product_name}
                </p>
              ))}
              {o.tracking_code && (
                <p className="mt-3 text-sm">
                  <strong>Rastreio:</strong> {o.tracking_code}
                </p>
              )}
            </div>
          </article>
        ))}
        {!items.length && (
          <div className="rounded-[28px] bg-white p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-[#86868b]" />
            <h2 className="mt-4 text-2xl font-semibold">Nenhum pedido ainda.</h2>
          </div>
        )}
      </div>
    </Main>
  );
}
function Main({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[650px] max-w-5xl px-5 py-14">{children}</main>;
}
