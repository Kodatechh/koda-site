/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Circle, CreditCard, MapPin, Package, Truck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/pedidos/$orderId")({ component: OrderDetail });

type Address = {
  recipient?: string;
  postal_code?: string;
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
};

type Order = {
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
  shipping_address: Address | null;
  tracking_code: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  order_items: Array<{
    id: string;
    product_name: string;
    product_slug: string;
    quantity: number;
    unit_amount_cents: number;
    total_amount_cents: number;
  }>;
};

type Payment = {
  id: string;
  method: string;
  status: string;
  amount_cents: number;
  provider_key: string;
  card_brand: string | null;
  card_last4: string | null;
  created_at: string;
  paid_at: string | null;
};

type OrderEvent = {
  id: string;
  status: string | null;
  title: string;
  body: string | null;
  created_at: string;
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

function money(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function prettyDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      const [orderResult, paymentResult, eventResult] = await Promise.all([
        db.from("orders")
          .select("id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,customer_name,customer_email,shipping_address,tracking_code,created_at,paid_at,shipped_at,delivered_at,order_items(id,product_name,product_slug,quantity,unit_amount_cents,total_amount_cents)")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .maybeSingle(),
        db.from("payments")
          .select("id,method,status,amount_cents,provider_key,card_brand,card_last4,created_at,paid_at")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        db.from("order_events")
          .select("id,status,title,body,created_at")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      if (orderResult.error || !orderResult.data) {
        setError("Não encontramos este pedido na sua Conta Koda.");
        setOrder(null);
      } else {
        setOrder(orderResult.data);
        setPayments(paymentResult.data ?? []);
        setEvents(eventResult.data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, [user?.id, orderId]);

  const fallbackTimeline = useMemo(() => {
    if (!order || events.length) return [];
    const timeline: OrderEvent[] = [
      { id: "created", status: "draft", title: "Pedido recebido", body: "Seu pedido foi registrado na Koda.", created_at: order.created_at },
    ];
    if (order.paid_at) timeline.unshift({ id: "paid", status: "paid", title: "Pagamento confirmado", body: "Recebemos a confirmação do pagamento.", created_at: order.paid_at });
    if (order.shipped_at) timeline.unshift({ id: "shipped", status: "shipped", title: "Pedido enviado", body: order.tracking_code ? `Código de rastreio: ${order.tracking_code}` : "Seu pedido está a caminho.", created_at: order.shipped_at });
    if (order.delivered_at) timeline.unshift({ id: "delivered", status: "delivered", title: "Pedido entregue", body: "Entrega concluída.", created_at: order.delivered_at });
    return timeline;
  }, [order, events]);

  if (authLoading || loading) {
    return <main className="mx-auto min-h-[680px] max-w-5xl px-5 py-14 text-sm text-[#86868b]">Carregando pedido…</main>;
  }
  if (!user) {
    return <main className="mx-auto min-h-[680px] max-w-5xl px-5 py-14"><a href={`/conta/entrar?next=${encodeURIComponent(`/conta/pedidos/${orderId}`)}`} className="text-sm font-semibold text-[#0066cc]">Entre para ver este pedido ›</a></main>;
  }
  if (error || !order) {
    return (
      <main className="mx-auto min-h-[680px] max-w-5xl px-5 py-14">
        <a href="/conta/pedidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc]"><ArrowLeft className="h-4 w-4" /> Pedidos</a>
        <div className="mt-8 rounded-[38px] bg-white p-12 text-center"><h1 className="text-4xl font-semibold tracking-[-.05em]">Pedido não encontrado.</h1><p className="mt-3 text-sm text-[#6e6e73]">{error}</p></div>
      </main>
    );
  }

  const timeline = events.length ? events : fallbackTimeline;
  const address = order.shipping_address;
  const display = `KD-${String(order.order_number).padStart(6, "0")}`;

  return (
    <main className="mx-auto min-h-[680px] max-w-5xl px-5 py-12 sm:py-16">
      <a href="/conta/pedidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Todos os pedidos
      </a>

      <section className="mt-8 rounded-[40px] bg-white p-7 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-[#86868b]">{display}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{labels[order.status] ?? order.status}</h1>
            <p className="mt-3 text-sm text-[#6e6e73]">Feito em {prettyDate(order.created_at)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-[#86868b]">Total</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-.04em]">{money(order.total_cents, order.currency)}</p>
          </div>
        </div>

        {order.tracking_code && (
          <div className="mt-8 flex items-center gap-3 rounded-[24px] bg-[#f5f9ff] p-5">
            <Truck className="h-5 w-5 text-[#0071e3]" />
            <div><p className="text-sm font-semibold">Rastreio</p><p className="mt-1 font-mono text-xs text-[#6e6e73]">{order.tracking_code}</p></div>
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[36px] bg-white p-7 sm:p-9">
          <div className="flex items-center gap-3"><Package className="h-5 w-5 text-[#0071e3]" /><h2 className="text-2xl font-semibold tracking-[-.04em]">Itens</h2></div>
          <div className="mt-6 divide-y divide-black/[.07]">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-5 py-5 first:pt-0 last:pb-0">
                <div><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-xs text-[#86868b]">Quantidade {item.quantity}</p></div>
                <p className="font-semibold">{money(item.total_amount_cents, order.currency)}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 space-y-3 border-t border-black/10 pt-6 text-sm">
            <Row label="Subtotal" value={money(order.subtotal_cents, order.currency)} />
            {order.discount_cents > 0 && <Row label="Desconto" value={`− ${money(order.discount_cents, order.currency)}`} />}
            {order.shipping_cents > 0 && <Row label="Frete" value={money(order.shipping_cents, order.currency)} />}
            <div className="flex items-center justify-between border-t border-black/10 pt-4 text-base font-semibold"><span>Total</span><span>{money(order.total_cents, order.currency)}</span></div>
          </div>
        </section>

        <section className="rounded-[36px] bg-white p-7 sm:p-9">
          <h2 className="text-2xl font-semibold tracking-[-.04em]">Acompanhamento</h2>
          <div className="mt-7 space-y-0">
            {timeline.map((event, index) => (
              <div key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
                {index < timeline.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-black/10" />}
                <span className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${index === 0 ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#86868b]"}`}>
                  {index === 0 ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                </span>
                <div><p className="text-sm font-semibold">{event.title}</p>{event.body && <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">{event.body}</p>}<p className="mt-1.5 text-[11px] text-[#86868b]">{prettyDate(event.created_at)}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-[32px] bg-white p-7">
          <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-[#0071e3]" /><h2 className="text-xl font-semibold tracking-[-.03em]">Pagamento</h2></div>
          {payments.length ? (
            <div className="mt-5 space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-start justify-between gap-4 border-t border-black/[.07] pt-4 first:border-0 first:pt-0">
                  <div><p className="text-sm font-semibold">{payment.method === "pix" ? "Pix" : "Cartão"}</p><p className="mt-1 text-xs text-[#86868b]">{payment.status === "paid" ? "Pago" : payment.status}{payment.card_last4 ? ` · final ${payment.card_last4}` : ""}</p></div>
                  <p className="text-sm font-semibold">{money(payment.amount_cents, order.currency)}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-[#6e6e73]">Nenhum pagamento registrado ainda.</p>}
        </section>

        <section className="rounded-[32px] bg-white p-7">
          <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-[#0071e3]" /><h2 className="text-xl font-semibold tracking-[-.03em]">Entrega</h2></div>
          {address ? (
            <address className="mt-5 not-italic text-sm leading-6 text-[#6e6e73]">
              <strong className="text-[#1d1d1f]">{address.recipient}</strong><br />
              {address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ""}<br />
              {address.neighborhood} · {address.city}/{address.state}<br />
              {address.postal_code ? `CEP ${address.postal_code}` : ""}
            </address>
          ) : <p className="mt-4 text-sm text-[#6e6e73]">Este pedido não possui entrega física registrada.</p>}
        </section>
      </div>

      <div className="mt-8 text-center">
        <a href="/conta/suporte" className="text-sm font-semibold text-[#0066cc] hover:underline">Precisa de ajuda com este pedido? ›</a>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-[#6e6e73]"><span>{label}</span><span>{value}</span></div>;
}
