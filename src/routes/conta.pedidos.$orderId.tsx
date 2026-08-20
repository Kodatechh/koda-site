/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  ReceiptText,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/pedidos/$orderId")({
  head: () => ({
    meta: [{ title: "Acompanhar pedido — Koda" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: OrderDetailPage,
});

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
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
  shipping_service: string | null;
  shipping_deadline_days: number | null;
  shipping_address: Record<string, any> | null;
  tracking_code: string | null;
  tracking_url: string | null;
  fulfillment_status: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  order_items: OrderItem[];
};

type OrderEvent = {
  id: string;
  event_type: string;
  status: string | null;
  title: string;
  body: string | null;
  created_at: string;
};

type FiscalDocument = {
  status: string;
  document_type: string;
  document_number: string | null;
  series: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  authorized_at: string | null;
  email_sent_at: string | null;
};

const statusLabels: Record<string, string> = {
  draft: "Pedido recebido",
  pending_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  processing: "Preparando seu pedido",
  shipped: "Pedido enviado",
  delivered: "Entregue",
  cancelled: "Pedido cancelado",
  payment_failed: "Pagamento não aprovado",
  refunded: "Pagamento estornado",
};

function money(cents: number | null | undefined, currency = "BRL") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [fiscal, setFiscal] = useState<FiscalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }
    const userId = user.id;
    let alive = true;
    async function load() {
      setLoading(true);
      const [orderResult, eventsResult, fiscalResult] = await Promise.all([
        db
          .from("orders")
          .select(
            "id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,shipping_service,shipping_deadline_days,shipping_address,tracking_code,tracking_url,fulfillment_status,created_at,paid_at,fulfilled_at,order_items(id,product_name,quantity,unit_amount_cents,total_amount_cents)",
          )
          .eq("id", orderId)
          .eq("user_id", userId)
          .maybeSingle(),
        db
          .from("order_events")
          .select("id,event_type,status,title,body,created_at")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        db
          .from("fiscal_documents")
          .select(
            "status,document_type,document_number,series,pdf_url,xml_url,authorized_at,email_sent_at",
          )
          .eq("order_id", orderId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (!alive) return;
      if (!orderResult.data) {
        setNotFound(true);
        setOrder(null);
      } else {
        setOrder(orderResult.data);
        setEvents(eventsResult.data ?? []);
        setFiscal(fiscalResult.data ?? null);
      }
      setLoading(false);
    }
    void load();
    const timer = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [user?.id, orderId, authLoading]);

  const stages = useMemo(() => {
    if (!order) return [];
    const paid =
      ["paid", "processing", "shipped", "delivered"].includes(order.status) ||
      Boolean(order.paid_at);
    const preparing = ["processing", "shipped", "delivered"].includes(order.status);
    const shipped = ["shipped", "delivered"].includes(order.status) || Boolean(order.tracking_code);
    const delivered = order.status === "delivered";
    return [
      {
        label: "Pagamento",
        detail: paid ? "Confirmado" : "Aguardando confirmação",
        done: paid,
        icon: ReceiptText,
      },
      {
        label: "Preparação",
        detail: preparing ? "Seu pedido entrou em preparação" : "Começa depois da confirmação",
        done: preparing,
        icon: Package,
      },
      {
        label: "Envio",
        detail: shipped ? "Postado para entrega" : "Você receberá o rastreio aqui",
        done: shipped,
        icon: Truck,
      },
      {
        label: "Entrega",
        detail: delivered ? "Pedido entregue" : "A caminho de você",
        done: delivered,
        icon: CheckCircle2,
      },
    ];
  }, [order]);

  if (authLoading || loading)
    return (
      <Main>
        <div className="grid min-h-[520px] place-items-center text-sm text-[#6e6e73]">
          Carregando seu pedido…
        </div>
      </Main>
    );
  if (!user)
    return (
      <Main>
        <div className="rounded-[32px] bg-white p-10 text-center">
          <h1 className="text-3xl font-semibold tracking-[-.04em]">
            Entre para acompanhar seu pedido.
          </h1>
          <a
            href={`/conta/entrar?returnTo=${encodeURIComponent(`/conta/pedidos/${orderId}`)}`}
            className="mt-6 inline-flex rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white"
          >
            Entrar na Conta Koda
          </a>
        </div>
      </Main>
    );
  if (notFound || !order)
    return (
      <Main>
        <div className="rounded-[32px] bg-white p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-[#86868b]" />
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em]">Pedido não encontrado.</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">Ele pode não pertencer a esta Conta Koda.</p>
          <a
            href="/conta/pedidos"
            className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]"
          >
            Voltar aos pedidos
          </a>
        </div>
      </Main>
    );

  const displayNumber = `KD-${String(order.order_number).padStart(6, "0")}`;
  const address = order.shipping_address ?? {};
  const cancelled = ["cancelled", "payment_failed", "refunded"].includes(order.status);

  return (
    <Main>
      <a
        href="/conta/pedidos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc]"
      >
        <ArrowLeft className="h-4 w-4" />
        Pedidos
      </a>

      <header className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-sm font-semibold ${cancelled ? "text-[#bf4800]" : "text-[#248a3d]"}`}>
            {statusLabels[order.status] ?? order.status}
          </p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-.06em] sm:text-6xl">
            {displayNumber}
          </h1>
          <p className="mt-3 text-sm text-[#86868b]">Criado em {dateTime(order.created_at)}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-[#86868b]">Total</p>
          <p className="mt-1 text-3xl font-semibold tracking-[-.04em]">
            {money(order.total_cents, order.currency)}
          </p>
        </div>
      </header>

      {!cancelled && (
        <section className="mt-9 rounded-[32px] bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold">Acompanhe seu Koda</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-4 sm:gap-3">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="relative flex gap-4 sm:block">
                  {index < stages.length - 1 && (
                    <div
                      className={`absolute left-[17px] top-9 h-[calc(100%+4px)] w-px sm:left-[35px] sm:top-[18px] sm:h-px sm:w-[calc(100%-22px)] ${stage.done ? "bg-[#248a3d]" : "bg-black/10"}`}
                    />
                  )}
                  <div
                    className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${stage.done ? "bg-[#248a3d] text-white" : "bg-[#f5f5f7] text-[#86868b]"}`}
                  >
                    {stage.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="sm:mt-4">
                    <p className="text-sm font-semibold">{stage.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">
                      {stage.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <section className="rounded-[32px] bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-[#0071e3]" />
              <h2 className="text-xl font-semibold tracking-[-.03em]">Itens do pedido</h2>
            </div>
            <div className="mt-6 divide-y divide-black/10">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.product_name}</p>
                    <p className="mt-1 text-xs text-[#86868b]">Quantidade {item.quantity}</p>
                  </div>
                  <strong className="text-sm">
                    {money(item.total_amount_cents, order.currency)}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          {events.length > 0 && (
            <section className="rounded-[32px] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-xl font-semibold tracking-[-.03em]">Atualizações</h2>
              </div>
              <div className="mt-6 space-y-5">
                {[...events].reverse().map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="relative">
                      <div
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`}
                      />
                      {index < events.length - 1 && (
                        <div className="absolute left-[4px] top-5 h-[calc(100%+10px)] w-px bg-black/10" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{event.title}</p>
                      {event.body && (
                        <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">{event.body}</p>
                      )}
                      <p className="mt-1.5 text-[10px] text-[#86868b]">
                        {dateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-[32px] bg-white p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Resumo</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[#6e6e73]">Produtos</span>
                <span>{money(order.subtotal_cents, order.currency)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#6e6e73]">Entrega</span>
                <span>
                  {order.shipping_cents === 0
                    ? "Grátis"
                    : money(order.shipping_cents, order.currency)}
                </span>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#6e6e73]">Desconto</span>
                  <span>− {money(order.discount_cents, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-black/10 pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{money(order.total_cents, order.currency)}</span>
              </div>
            </div>
          </section>

          {order.shipping_service && (
            <section className="rounded-[32px] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-lg font-semibold">Entrega</h2>
              </div>
              <p className="mt-5 text-sm font-semibold">{order.shipping_service}</p>
              {order.shipping_deadline_days != null && (
                <p className="mt-1 text-xs text-[#6e6e73]">
                  Prazo estimado: até {order.shipping_deadline_days} dias úteis após a postagem.
                </p>
              )}
              {order.tracking_code && (
                <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#86868b]">
                    Código de rastreio
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">{order.tracking_code}</p>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Rastrear pedido <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          {address["street"] && (
            <section className="rounded-[32px] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-lg font-semibold">Endereço de entrega</h2>
              </div>
              <p className="mt-5 text-sm font-semibold">{address["recipient"]}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">
                {address["street"]}, {address["number"]}
                {address["complement"] ? ` · ${address["complement"]}` : ""}
                <br />
                {address["neighborhood"]}
                <br />
                {address["city"]} - {address["state"]} · CEP {address["postal_code"]}
              </p>
            </section>
          )}

          {fiscal && (
            <section className="rounded-[32px] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-lg font-semibold">Documento fiscal</h2>
              </div>
              {fiscal.status === "authorized" ? (
                <>
                  <p className="mt-5 text-sm font-semibold">Documento autorizado</p>
                  {fiscal.document_number && (
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      Nº {fiscal.document_number}
                      {fiscal.series ? ` · Série ${fiscal.series}` : ""}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {fiscal.pdf_url && (
                      <a
                        href={fiscal.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        Abrir PDF <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {fiscal.xml_url && (
                      <a
                        href={fiscal.xml_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2 text-xs font-semibold"
                      >
                        XML <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {fiscal.email_sent_at && (
                    <p className="mt-3 text-[10px] text-[#86868b]">Também enviado por e-mail.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-5 text-sm font-semibold">Em processamento</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">
                    Assim que autorizado, o documento aparecerá aqui e poderá ser enviado para o
                    e-mail da compra.
                  </p>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </Main>
  );
}

function Main({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[720px] max-w-6xl px-5 py-10 sm:py-14">{children}</main>;
}
