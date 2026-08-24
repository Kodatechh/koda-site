/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, MailCheck, PackageCheck, Truck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pedido-confirmado/$orderId")({
  head: () => ({
    meta: [{ title: "Pedido confirmado — Koda" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ConfirmationPage,
});

type ConfirmedOrder = {
  id: string;
  order_number: number;
  status: string;
  sales_mode: "standard" | "preorder";
  total_cents: number;
  currency: string;
  release_at: string | null;
  estimated_ship_start_at: string | null;
  customer_email: string | null;
  order_items: Array<{ id: string; product_name: string; quantity: number }>;
};

function ConfirmationPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }
    (supabase as any)
      .from("orders")
      .select(
        "id,order_number,status,sales_mode,total_cents,currency,release_at,estimated_ship_start_at,customer_email,order_items(id,product_name,quantity)",
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: ConfirmedOrder | null }) => {
        setOrder(data);
        setLoading(false);
      });
  }, [authLoading, orderId, user]);

  if (authLoading || loading) {
    return (
      <Page>
        <div className="grid min-h-[560px] place-items-center text-sm text-[#6e6e73]">
          Confirmando seu pedido…
        </div>
      </Page>
    );
  }

  if (!user) {
    return (
      <Page>
        <section className="rounded-[38px] bg-white p-10 text-center">
          <h1 className="text-4xl font-semibold tracking-[-.05em]">
            Entre para ver a confirmação.
          </h1>
          <a
            href={`/conta/entrar?returnTo=${encodeURIComponent(`/pedido-confirmado/${orderId}`)}`}
            className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Entrar na Conta Koda
          </a>
        </section>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page>
        <section className="rounded-[38px] bg-white p-10 text-center">
          <h1 className="text-4xl font-semibold tracking-[-.05em]">Pedido não encontrado.</h1>
          <a
            href="/conta/pedidos"
            className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]"
          >
            Ver meus pedidos ›
          </a>
        </section>
      </Page>
    );
  }

  const paymentConfirmed = ["paid", "processing", "shipped", "delivered"].includes(order.status);
  if (!paymentConfirmed) {
    return (
      <Page>
        <section className="rounded-[38px] bg-white p-10 text-center">
          <h1 className="text-4xl font-semibold tracking-[-.05em]">
            Pagamento ainda não confirmado.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
            Assim que o Koda Pay confirmar o pagamento, sua reserva aparecerá aqui.
          </p>
          <a
            href={`/conta/pedidos/${order.id}`}
            className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Acompanhar pagamento
          </a>
        </section>
      </Page>
    );
  }

  const preorder = order.sales_mode === "preorder";
  const displayNumber = `KD-${String(order.order_number).padStart(6, "0")}`;

  return (
    <Page>
      <section className="overflow-hidden rounded-[42px] bg-white shadow-[0_20px_70px_rgba(0,0,0,.05)]">
        <div className="bg-[linear-gradient(145deg,#eff8ff,#fff)] px-7 py-14 text-center sm:px-14 sm:py-20">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#248a3d] text-white">
            <Check className="h-8 w-8" />
          </div>
          <p className="mt-7 text-sm font-semibold text-[#248a3d]">
            {preorder ? "Pré-venda confirmada" : "Pedido confirmado"}
          </p>
          <h1 className="mx-auto mt-2 max-w-3xl text-5xl font-semibold tracking-[-.065em] sm:text-7xl">
            {preorder ? "Seu KodaBot está reservado." : "Tudo certo com sua compra."}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73]">
            Pedido {displayNumber}.{" "}
            {preorder
              ? "Você receberá atualizações até a preparação e o envio da sua unidade."
              : "Você pode acompanhar preparação, envio e entrega pela Conta Koda."}
          </p>
        </div>

        <div className="p-7 sm:p-12">
          {preorder && (
            <div className="grid gap-3 sm:grid-cols-4">
              <Stage icon={Check} title="Reservado" text="Pagamento confirmado" done />
              <Stage icon={CalendarDays} title="Lançamento" text="17 de outubro de 2026" />
              <Stage icon={PackageCheck} title="Preparação" text="Começa após o lançamento" />
              <Stage icon={Truck} title="Envio" text="Rastreio na Conta Koda" />
            </div>
          )}

          <div className={`grid gap-6 ${preorder ? "mt-10" : ""} md:grid-cols-2`}>
            <div className="rounded-[28px] bg-[#f5f5f7] p-6">
              <p className="text-xs font-semibold text-[#86868b]">Itens</p>
              <div className="mt-4 space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                    <span>{item.product_name}</span>
                    <strong>× {item.quantity}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] bg-[#f5f5f7] p-6">
              <MailCheck className="h-6 w-6 text-[#0071e3]" />
              <h2 className="mt-5 text-xl font-semibold tracking-[-.03em]">
                Confirmação por e-mail
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
                {order.customer_email
                  ? `Enviaremos a confirmação e as próximas atualizações para ${order.customer_email}.`
                  : "As próximas atualizações também ficarão disponíveis na sua Conta Koda."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={`/conta/pedidos/${order.id}`}
              className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
            >
              Acompanhar {preorder ? "pré-venda" : "pedido"}
            </a>
            <a href="/loja" className="rounded-full bg-[#f5f5f7] px-6 py-3 text-sm font-semibold">
              Voltar à loja
            </a>
          </div>
        </div>
      </section>
    </Page>
  );
}

function Stage({
  icon: Icon,
  title,
  text,
  done = false,
}: {
  icon: typeof Check;
  title: string;
  text: string;
  done?: boolean;
}) {
  return (
    <article className={`rounded-[24px] p-5 ${done ? "bg-[#eaf8ee]" : "bg-[#f5f5f7]"}`}>
      <span
        className={`grid h-9 w-9 place-items-center rounded-full ${done ? "bg-[#248a3d] text-white" : "bg-white text-[#86868b]"}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="mt-5 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
