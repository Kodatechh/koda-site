/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, LoaderCircle, Wrench } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/reparos/$repairId")({
  head: () => ({ meta: [{ title: "Detalhes do reparo — Koda" }] }),
  component: RepairDetails,
});

const labels: Record<string, string> = {
  requested: "Solicitado",
  awaiting_shipment: "Aguardando seu envio",
  received: "Recebido",
  diagnosing: "Em diagnóstico",
  awaiting_approval: "Aguardando sua aprovação",
  approved: "Orçamento aprovado",
  repairing: "Em reparo",
  ready: "Pronto",
  return_shipping: "Em retorno",
  completed: "Concluído",
  cancelled: "Cancelado",
};
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function RepairDetails() {
  const { repairId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: queryError } = await db
      .from("repair_requests")
      .select(
        "id,protocol,model,category,description,status,estimated_price_cents,final_price_cents,payment_order_id,shipping_method,tracking_code,created_at,repair_quote_items(id,description,amount_cents,covered_by_kodacare),repair_events(id,title,details,created_at)",
      )
      .eq("id", repairId)
      .eq("user_id", user.id)
      .maybeSingle();
    setRepair(data);
    setError(queryError?.message ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, repairId]);

  const quoteTotal = useMemo(
    () =>
      (repair?.repair_quote_items ?? []).reduce(
        (sum: number, item: any) => sum + item.amount_cents,
        0,
      ),
    [repair],
  );

  async function decide(approved: boolean) {
    if (acting) return;
    setActing(true);
    setError(null);
    const { data: updated, error: rpcError } = await db.rpc("approve_repair_quote", {
      _repair_id: repairId,
      _approved: approved,
    });
    if (rpcError) {
      setError("Não foi possível registrar sua decisão. Atualize a página e tente novamente.");
      setActing(false);
      return;
    }
    if (approved && updated?.payment_order_id) {
      window.location.assign(`/checkout/reparo/${repairId}`);
      return;
    }
    await load();
    setActing(false);
  }

  if (authLoading || loading)
    return <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">Carregando…</main>;
  if (!user)
    return (
      <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">
        <a href={`/conta/entrar?next=/conta/reparos/${repairId}`}>Entre para ver este reparo.</a>
      </main>
    );
  if (!repair)
    return (
      <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">
        <h1 className="text-4xl font-semibold">Reparo não encontrado.</h1>
        <p className="mt-3 text-[#6e6e73]">Ele não existe ou não pertence à sua Conta Koda.</p>
      </main>
    );

  return (
    <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">
      <a href="/conta/reparos" className="text-sm font-semibold text-[#0071e3]">
        ← Todos os reparos
      </a>
      <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-xs text-[#86868b]">{repair.protocol}</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-.05em]">
            {labels[repair.status] ?? repair.status}
          </h1>
        </div>
        <Wrench className="h-10 w-10 text-[#0071e3]" />
      </div>

      <section className="mt-9 rounded-[30px] bg-white p-7 sm:p-9">
        <h2 className="text-2xl font-semibold">Solicitação</h2>
        <p className="mt-4 text-sm text-[#6e6e73]">{repair.description}</p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#86868b]">Modelo</dt>
            <dd className="font-semibold">{repair.model}</dd>
          </div>
          <div>
            <dt className="text-[#86868b]">Categoria</dt>
            <dd className="font-semibold">{repair.category}</dd>
          </div>
          {repair.tracking_code && (
            <div>
              <dt className="text-[#86868b]">Rastreio</dt>
              <dd className="font-semibold">{repair.tracking_code}</dd>
            </div>
          )}
        </dl>
      </section>

      {(repair.repair_quote_items?.length > 0 || repair.status === "awaiting_approval") && (
        <section className="mt-4 rounded-[30px] bg-white p-7 sm:p-9">
          <h2 className="text-2xl font-semibold">Orçamento</h2>
          <div className="mt-5 divide-y divide-black/10">
            {repair.repair_quote_items.map((item: any) => (
              <div key={item.id} className="flex justify-between gap-5 py-3 text-sm">
                <span>
                  {item.description}
                  {item.covered_by_kodacare && (
                    <small className="ml-2 text-green-700">Coberto pelo KodaCare</small>
                  )}
                </span>
                <strong>{money(item.amount_cents)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-xl">
            <strong>Total</strong>
            <strong>{money(repair.final_price_cents ?? quoteTotal)}</strong>
          </div>
          {repair.status === "awaiting_approval" && (
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => decide(true)}
                disabled={acting}
                className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {acting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Aprovar e finalizar pagamento"}
              </button>
              <button
                onClick={() => decide(false)}
                disabled={acting}
                className="rounded-full bg-[#e8e8ed] px-6 py-3 text-sm font-semibold disabled:opacity-50"
              >
                Recusar
              </button>
            </div>
          )}
          {repair.status === "approved" && repair.payment_order_id && (
            <a
              href={`/checkout/reparo/${repairId}`}
              className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
            >
              Finalizar pagamento
            </a>
          )}
        </section>
      )}

      <section className="mt-4 rounded-[30px] bg-white p-7 sm:p-9">
        <h2 className="text-2xl font-semibold">Acompanhamento</h2>
        <ol className="mt-6 space-y-5">
          {(repair.repair_events ?? []).map((event: any, index: number) => (
            <li key={event.id} className="flex gap-4">
              {index === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-[#34c759]" />
              ) : (
                <Clock3 className="h-5 w-5 text-[#86868b]" />
              )}
              <div>
                <p className="font-semibold">{event.title}</p>
                {event.details && <p className="text-sm text-[#6e6e73]">{event.details}</p>}
                <time className="text-xs text-[#86868b]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.created_at))}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
