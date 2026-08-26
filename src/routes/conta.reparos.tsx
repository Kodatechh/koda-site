/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { AccountSidebar } from "@/components/koda/AccountSidebar";
import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/conta/reparos")({ component: Repairs });
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
function Repairs() {
  const { user, loading } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (user)
      db.from("repair_requests")
        .select(
          "id,protocol,model,category,status,estimated_price_cents,final_price_cents,tracking_code,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }: any) => setItems(data ?? []));
  }, [user]);
  if (loading)
    return (
      <main className="grid min-h-[650px] place-items-center text-sm text-[#6e6e73]">
        Carregando reparos…
      </main>
    );
  return (
    <main className="mx-auto min-h-[650px] max-w-7xl px-5 py-14">
      <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <AccountSidebar />
        <div className="min-w-0">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-[-.05em]">Reparos.</h1>
            </div>
            <a
              href="/reparos/solicitar"
              className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Solicitar reparo
            </a>
          </div>
          <div className="mt-10 space-y-4">
            {items.map((r) => (
              <a
                key={r.id}
                href={`/conta/reparos/${r.id}`}
                className="block rounded-[28px] bg-white p-6 transition-transform hover:-translate-y-0.5"
              >
                <p className="font-mono text-xs text-[#86868b]">{r.protocol}</p>
                <div className="mt-2 flex justify-between gap-4">
                  <h2 className="text-xl font-semibold">{labels[r.status] ?? r.status}</h2>
                  {r.final_price_cents != null && (
                    <strong>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(r.final_price_cents / 100)}
                    </strong>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#6e6e73]">
                  {r.model} · {r.category}
                </p>
                {r.tracking_code && <p className="mt-3 text-sm">Rastreio: {r.tracking_code}</p>}
              </a>
            ))}
            {user && !items.length && (
              <div className="rounded-[28px] bg-white p-12 text-center">
                <Wrench className="mx-auto h-8 w-8 text-[#86868b]" />
                <p className="mt-4 text-sm text-[#6e6e73]">Nenhum reparo solicitado.</p>
              </div>
            )}
            {!user && (
              <a href="/conta/entrar?next=/conta/reparos">Entre para acompanhar reparos.</a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
