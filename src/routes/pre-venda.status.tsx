/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Factory, PackageCheck, Truck } from "lucide-react";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pre-venda/status")({
  head: () => ({ meta: [{ title: "Status da pré-venda — Koda" }] }),
  component: PreorderStatus,
});
type Status = {
  product_slug: string;
  product_name: string;
  release_at: string | null;
  estimated_ship_start_at: string | null;
  production_started: boolean;
  status_label: string;
  public_note: string | null;
};
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
        new Date(value.includes("T") ? value : `${value}T12:00:00`),
      )
    : "Ainda não anunciada";
}
function PreorderStatus() {
  const [items, setItems] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).rpc("get_public_preorder_status").then(({ data }: any) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, []);
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <header className="max-w-4xl">
          <p className="text-sm font-semibold text-[#0071e3]">Pré-venda KodaBot</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Da reserva até a sua mesa.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Acompanhe o planejamento geral. O status do seu pedido, pagamento e rastreio continua
            disponível em Minha Conta.
          </p>
        </header>
        {loading ? (
          <p className="mt-16 text-sm text-[#6e6e73]">Carregando planejamento…</p>
        ) : (
          <section className="mt-14 grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.product_slug} className="rounded-[34px] bg-white p-7 sm:p-10">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-[#0071e3]">{item.status_label}</p>
                    <h2 className="mt-2 text-4xl font-semibold tracking-[-.05em]">
                      {item.product_name}
                    </h2>
                  </div>
                  {item.production_started ? (
                    <Factory className="h-8 w-8 text-[#34c759]" />
                  ) : (
                    <CalendarDays className="h-8 w-8 text-[#0071e3]" />
                  )}
                </div>
                <div className="mt-9 space-y-3">
                  <Line icon={CalendarDays} label="Lançamento" value={date(item.release_at)} />
                  <Line
                    icon={PackageCheck}
                    label="Início estimado dos envios"
                    value={date(item.estimated_ship_start_at)}
                  />
                  <Line
                    icon={Factory}
                    label="Produção"
                    value={item.production_started ? "Iniciada" : "Ainda não marcada como iniciada"}
                  />
                  <Line
                    icon={Truck}
                    label="Rastreio individual"
                    value="Disponível após a postagem, em Minha Conta"
                  />
                </div>
                {item.public_note && (
                  <p className="mt-6 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
                    {item.public_note}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}
        <section className="mt-4 rounded-[34px] bg-[#1d1d1f] p-8 text-white sm:p-10">
          <CheckCircle2 className="h-7 w-7 text-[#64d2ff]" />
          <h2 className="mt-8 text-3xl font-semibold tracking-[-.04em]">Já fez a pré-venda?</h2>
          <p className="mt-3 text-sm text-white/65">
            Veja pagamento, endereço, cancelamento e rastreio no seu pedido. A Koda não exibe
            capacidade interna nem dados de outros clientes nesta página.
          </p>
          <a
            href="/conta/pedidos"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
          >
            Ver meus pedidos
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
function Line({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#f5f5f7] p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
      <div>
        <p className="text-xs font-semibold text-[#86868b]">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
