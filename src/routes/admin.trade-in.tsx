import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Recycle, RefreshCw, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { AdminSectionNav } from "@/components/koda/AdminSectionNav";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/trade-in")({
  head: () => ({
    meta: [{ title: "Koda Trade In — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TradeInAdmin,
});

type RequestItem = {
  id: string;
  serial_number: string;
  source_model: string;
  estimated_credit_cents: number;
  final_credit_cents: number | null;
  powers_on: boolean;
  enclosure_intact: boolean;
  screen_intact: boolean;
  speaker_works: boolean | null;
  status: string;
  outbound_tracking_code: string | null;
  created_at: string;
};
const statuses = [
  "awaiting_shipment",
  "in_transit",
  "received",
  "inspecting",
  "offer_ready",
  "accepted",
  "return_requested",
  "returned",
  "completed",
  "cancelled",
] as const;

function TradeInAdmin() {
  const { user, loading, isFactoryAdmin, isSupportAdvanced } = useAuth();
  const allowed = Boolean(user && (isFactoryAdmin || isSupportAdvanced));
  const [items, setItems] = useState<RequestItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) return;
    setRefreshing(true);
    const { data } = await supabase
      .from("trade_in_requests")
      .select(
        "id,serial_number,source_model,estimated_credit_cents,final_credit_cents,powers_on,enclosure_intact,screen_intact,speaker_works,status,outbound_tracking_code,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as RequestItem[]);
    setRefreshing(false);
  }, [allowed]);
  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    const updates: { status: string; received_at?: string; inspected_at?: string } = { status };
    if (status === "received") updates.received_at = new Date().toISOString();
    if (status === "offer_ready") updates.inspected_at = new Date().toISOString();
    const { error } = await supabase.from("trade_in_requests").update(updates).eq("id", id);
    if (!error)
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function publishOffer(item: RequestItem, value: string) {
    const cents = Math.round(Number(value.replace(",", ".")) * 100);
    const maximum = item.source_model === "kodabot-i-pro" ? 7990 : 5990;
    if (!Number.isInteger(cents) || cents < 500 || cents > maximum) return;
    const { error } = await supabase
      .from("trade_in_requests")
      .update({
        final_credit_cents: cents,
        status: "offer_ready",
        inspected_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (!error)
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, final_credit_cents: cents, status: "offer_ready" }
            : currentItem,
        ),
      );
  }

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#6e6e73]">
        Validando acesso…
      </div>
    );
  if (!allowed)
    return (
      <main className="grid min-h-[650px] place-items-center text-center">
        <div>
          <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
          <h1 className="mt-5 text-4xl font-semibold">Acesso restrito.</h1>
          <a href="/admin" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
            Voltar ao Admin
          </a>
        </div>
      </main>
    );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <AdminSectionNav active="tradein" />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <section className="rounded-[32px] bg-white p-7 sm:p-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#34a853]">Koda · circularidade</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-[-.055em]">Trade In.</h1>
              <p className="mt-3 text-sm text-[#6e6e73]">
                Acompanhe postagem, recebimento e inspeção dos aparelhos.
              </p>
            </div>
            <button
              onClick={load}
              aria-label="Atualizar"
              className="grid h-10 w-10 place-items-center rounded-full border border-black/10"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>
        <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
          <div className="divide-y divide-black/10">
            {items.length ? (
              items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#86868b]">
                      {item.source_model === "kodabot-i-pro" ? "KodaBot Pro" : "KodaBot"}
                    </p>
                    <h2 className="mt-1 font-mono text-sm font-semibold">{item.serial_number}</h2>
                    <p className="mt-2 text-xs text-[#6e6e73]">
                      Estimativa: R${" "}
                      {(item.estimated_credit_cents / 100).toFixed(2).replace(".", ",")} ·{" "}
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                        new Date(item.created_at),
                      )}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:min-w-56">
                    {item.status === "inspecting" && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void publishOffer(item, String(form.get("offer") ?? ""));
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="offer"
                          inputMode="decimal"
                          defaultValue={(item.estimated_credit_cents / 100)
                            .toFixed(2)
                            .replace(".", ",")}
                          className="h-10 min-w-0 flex-1 rounded-full border border-black/10 px-4 text-xs"
                          aria-label="Oferta final em reais"
                        />
                        <button className="rounded-full bg-[#0071e3] px-4 text-xs font-semibold text-white">
                          Enviar oferta
                        </button>
                      </form>
                    )}
                    <select
                      value={item.status}
                      onChange={(event) => updateStatus(item.id, event.target.value)}
                      className="h-10 rounded-full border border-black/10 bg-[#f5f5f7] px-4 text-xs font-semibold"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))
            ) : (
              <div className="py-16 text-center">
                <Recycle className="mx-auto h-8 w-8 text-[#86868b]" />
                <p className="mt-4 text-sm text-[#6e6e73]">Nenhuma solicitação de Trade In.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function statusLabel(status: string) {
  return status === "awaiting_shipment"
    ? "Aguardando postagem"
    : status === "in_transit"
      ? "Em trânsito"
      : status === "received"
        ? "Recebido"
        : status === "inspecting"
          ? "Em inspeção"
          : status === "offer_ready"
            ? "Oferta enviada"
            : status === "accepted"
              ? "Oferta aceita"
              : status === "return_requested"
                ? "Devolução solicitada"
                : status === "returned"
                  ? "Devolvido"
                  : status === "completed"
                    ? "Cupom utilizado"
                    : "Cancelado";
}
