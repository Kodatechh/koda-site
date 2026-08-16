import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";
import type { CoverageStatus } from "@/lib/kodacare";

export const Route = createFileRoute("/conta/cobertura/$deviceId")({
  head: () => ({ meta: [{ title: "Cobertura do seu KodaBot — Koda" }] }),
  component: CoveragePage,
});

function CoveragePage() {
  const { deviceId } = Route.useParams();
  const { user, loading } = useAuth();
  const [coverage, setCoverage] = useState<CoverageStatus | null>(null);
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("devices").select("serial_number,model").eq("id", deviceId).maybeSingle(),
      supabase.rpc("get_device_kodacare_status", { _device_id: deviceId }),
    ]).then(([deviceResult, coverageResult]) => {
      if (!deviceResult.error) {
        setSerial(deviceResult.data?.serial_number ?? "");
        setModel(deviceResult.data?.model ?? "");
      }
      if (!coverageResult.error)
        setCoverage((coverageResult.data?.[0] as CoverageStatus | undefined) ?? null);
      setLoaded(true);
    });
  }, [user, deviceId]);
  if (loading || (!loaded && user))
    return (
      <div className="grid min-h-[680px] place-items-center text-sm text-[#6e6e73]">
        Carregando cobertura…
      </div>
    );
  if (!user || !serial)
    return (
      <main className="grid min-h-[680px] place-items-center px-5 text-center">
        <h1 className="text-4xl font-semibold">Cobertura não encontrada.</h1>
      </main>
    );
  const planName =
    coverage?.plan === "kodacare"
      ? "KodaCare"
      : coverage?.plan === "kodacare_plus_1y"
        ? "KodaCare+ — 1 ano"
        : coverage?.plan === "kodacare_plus_2y"
          ? "KodaCare+ — 2 anos"
          : "Garantia limitada Koda";
  const active = coverage?.coverage_status === "active";
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
      <a
        href={`/conta/dispositivo/${deviceId}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Meu KodaBot
      </a>
      <header className="py-14 text-center">
        <ShieldCheck className="mx-auto h-11 w-11 text-[#0071e3]" />
        <p className="mt-6 text-sm font-semibold text-[#0071e3]">
          {productNames[model as ProductId] ?? model} · {serial}
        </p>
        <h1 className="mx-auto mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">
          Sua cobertura
        </h1>
      </header>
      <section className="border-y border-black/10 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[#6e6e73]">Plano</p>
            <h2 className="mt-2 text-3xl font-semibold">{planName}</h2>
          </div>
          <span className={`text-sm font-semibold ${active ? "text-green-700" : "text-[#6e6e73]"}`}>
            {coverage?.coverage_status ? (active ? "Ativa" : "Expirada") : "Garantia padrão"}
          </span>
        </div>
        {coverage?.coverage_start && (
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#86868b]">Início</dt>
              <dd className="mt-1 font-semibold">{formatDate(coverage.coverage_start)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#86868b]">Término</dt>
              <dd className="mt-1 font-semibold">{formatDate(coverage.coverage_end)}</dd>
            </div>
          </dl>
        )}
      </section>
      <section className="py-12">
        <h2 className="text-3xl font-semibold">Benefícios</h2>
        <ul className="mt-7 space-y-4 text-sm">
          {coverage?.plan === "kodacare" ? (
            <Benefit text="Extensão da garantia de fábrica por mais 6 meses" />
          ) : coverage?.plan ? (
            <>
              <Benefit text="Proteção contra danos acidentais" />
              <Benefit text="Até 3 utilizações por ano" />
              <Benefit text="Franquia por ocorrência" />
              <Benefit text="Limpeza e revisão interna incluída" />
            </>
          ) : (
            <Benefit text="Garantia limitada conforme os termos do produto" />
          )}
        </ul>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
          Reparos em garantia dependem de diagnóstico. Danos acidentais exigem avaliação técnica,
          cobertura ativa e pagamento da franquia aplicável.
        </p>
      </section>
      {coverage?.accidental_damage_coverage && (
        <section className="border-t border-black/10 py-12">
          <p className="text-sm font-semibold text-[#0071e3]">Danos acidentais</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Proteção contra danos acidentais
          </h2>
          <p className="mt-5 text-xl font-semibold">
            {coverage.accidental_damage_uses_in_current_period ?? 0} de{" "}
            {coverage.accidental_damage_uses_per_year ?? 3} utilizada(s) neste período
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
            {(coverage.accidental_damage_uses_in_current_period ?? 0) >=
            (coverage.accidental_damage_uses_per_year ?? 3)
              ? "O limite anual foi atingido. Novas ocorrências estarão disponíveis no próximo período de cobertura."
              : "Ocorrências elegíveis estão sujeitas à avaliação técnica e à franquia aplicável."}
          </p>
          {coverage.accidental_damage_period_end && (
            <p className="mt-3 text-xs text-[#86868b]">
              Período atual até {formatDate(coverage.accidental_damage_period_end)}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e8f2ff] text-[#0071e3]">
        <Check className="h-3.5 w-3.5" />
      </span>
      {text}
    </li>
  );
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`))
    : "—";
}
