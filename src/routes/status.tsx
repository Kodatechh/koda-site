/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/status")({ component: Status });
type State = "checking" | "operational" | "degraded";
type Service = { name: string; state: State };
function Status() {
  const db = supabase as any;
  const [services, setServices] = useState<Service[]>(
    ["KodaCloud", "Ativação", "Atualizações", "KodaPay", "Conta Koda"].map((name) => ({
      name,
      state: "checking",
    })),
  );
  useEffect(() => {
    let alive = true;
    Promise.all([
      db.from("devices").select("id", { head: true, count: "exact" }).limit(1),
      db.from("koda_activation_sessions").select("id", { head: true, count: "exact" }).limit(1),
      db.from("koda_os_releases").select("id", { head: true, count: "exact" }).limit(1),
      supabase.functions.invoke("koda-pay-connector-health"),
      supabase.auth.getSession(),
    ]).then((results) => {
      if (!alive) return;
      setServices((current) =>
        current.map((service, index) => ({
          name: service.name,
          state: (results[index] as any)?.error ? "degraded" : "operational",
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  const allGood = services.every((s) => s.state === "operational");
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-20">
        <p className={`text-sm font-semibold ${allGood ? "text-[#34c759]" : "text-[#ff9500]"}`}>
          Status da Koda
        </p>
        <h1 className="mt-3 text-6xl font-semibold tracking-[-.06em]">
          {allGood ? "Todos os sistemas operacionais." : "Verificando os serviços."}
        </h1>
        <p className="mt-5 text-[#6e6e73]">
          Estado público dos serviços essenciais da Koda. Nenhum detalhe interno é exibido.
        </p>
        <div className="mt-12 overflow-hidden rounded-[30px] bg-white">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between border-b border-black/10 p-6 last:border-0"
            >
              <strong>{s.name}</strong>
              {s.state === "checking" ? (
                <span className="flex items-center gap-2 text-sm text-[#86868b]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Verificando
                </span>
              ) : s.state === "operational" ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Operacional
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Instabilidade
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
