/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CloudDownload,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";
import type { CoverageStatus } from "@/lib/kodacare";
import { isDeviceOnline } from "@/lib/device-presence";

export const Route = createFileRoute("/conta/dispositivo/$deviceId")({
  head: () => ({ meta: [{ title: "Meu KodaBot — Conta Koda" }] }),
  component: DevicePage,
});

type Device = {
  id: string;
  serial_number: string;
  model: string;
  status: string;
  purchase_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  kodaos_version: string | null;
  activated_at: string | null;
  manufactured_at: string | null;
  last_seen_at: string | null;
};
type Health = { online: boolean; last_seen_at: string | null };
type TimelineEvent = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  href?: string;
};
function DevicePage() {
  const { deviceId } = Route.useParams();
  const { user, loading } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [coverage, setCoverage] = useState<CoverageStatus | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [presenceNow, setPresenceNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!user) return;
    const db = supabase as any;
    Promise.all([
      supabase
        .from("devices")
        .select(
          "id,serial_number,model,status,purchase_date,warranty_start,warranty_end,kodaos_version,activated_at,manufactured_at,last_seen_at",
        )
        .eq("id", deviceId)
        .eq("owner_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("device_health")
        .select("online,last_seen_at")
        .eq("device_id", deviceId)
        .maybeSingle(),
      supabase.rpc("get_device_kodacare_status", { _device_id: deviceId }),
      db
        .from("device_events")
        .select("id,event_type,details,created_at")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("repair_requests")
        .select("id,protocol,repair_events(id,event_type,title,details,created_at)")
        .eq("device_id", deviceId)
        .eq("user_id", user.id),
    ]).then(([deviceResult, healthResult, coverageResult, eventResult, repairResult]) => {
      if (!deviceResult.error) setDevice(deviceResult.data as Device | null);
      if (!healthResult.error) setHealth(healthResult.data as Health | null);
      if (!coverageResult.error)
        setCoverage((coverageResult.data?.[0] as CoverageStatus | undefined) ?? null);
      const deviceItems = (eventResult.data ?? [])
        .map(toDeviceTimeline)
        .filter(Boolean) as TimelineEvent[];
      const repairItems = (repairResult.data ?? []).flatMap((repair: any) =>
        (repair.repair_events ?? []).map((event: any) => ({
          id: event.id,
          title: event.title,
          body: repairEventBody(event.details, repair.protocol),
          created_at: event.created_at,
          href: `/conta/reparos/${repair.id}`,
        })),
      );
      setTimeline(
        [...deviceItems, ...repairItems]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 12),
      );
      setLoaded(true);
    });
  }, [user, deviceId]);
  const warrantyActive = useMemo(
    () =>
      device?.warranty_end ? new Date(`${device.warranty_end}T23:59:59`) >= new Date() : false,
    [device],
  );
  if (loading || (!loaded && user))
    return (
      <div className="grid min-h-[680px] place-items-center text-sm text-[#6e6e73]">
        Carregando seu KodaBot…
      </div>
    );
  if (!user)
    return (
      <main className="grid min-h-[680px] place-items-center px-5 text-center">
        <div>
          <h1 className="text-4xl font-semibold">Entre para ver seu KodaBot.</h1>
          <a
            href="/conta/entrar"
            className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Entrar
          </a>
        </div>
      </main>
    );
  if (!device)
    return (
      <main className="grid min-h-[680px] place-items-center px-5 text-center">
        <div>
          <h1 className="text-4xl font-semibold">KodaBot não encontrado.</h1>
          <a href="/conta" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
            Voltar para Minha Conta
          </a>
        </div>
      </main>
    );
  const modelName = productNames[device.model as ProductId] ?? device.model;
  const online = isDeviceOnline(device.last_seen_at ?? health?.last_seen_at, presenceNow);
  const careName = coverage?.plan
    ? coverage.plan === "kodacare"
      ? "KodaCare"
      : coverage.plan === "kodacare_plus_1y"
        ? "KodaCare+ — 1 ano"
        : "KodaCare+ — 2 anos"
    : null;
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      <a
        href="/conta"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Minha Conta
      </a>
      <header className="py-12 sm:py-20">
        <p className="text-sm font-semibold text-[#0071e3]">{modelName}</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Meu KodaBot</h1>
            <p className="mt-4 text-lg text-[#6e6e73]">
              KODA OS {device.kodaos_version ?? "—"} · {device.serial_number}
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${online ? "bg-[#34c759]" : "bg-[#86868b]"}`}
            />
            {online ? "Online" : "Offline"}
          </p>
        </div>
      </header>
      <section className="border-t border-black/10 py-12 sm:grid sm:grid-cols-[220px_1fr] sm:gap-14">
        <h2 className="text-sm font-semibold text-[#6e6e73]">Cobertura</h2>
        <div className="mt-6 sm:mt-0">
          {careName ? (
            <>
              <ShieldCheck className="h-8 w-8 text-[#0071e3]" />
              <h3 className="mt-5 text-3xl font-semibold">{careName}</h3>
              <p className="mt-2 text-lg text-[#424245]">Seu KodaBot está coberto.</p>
              <ul className="mt-6 space-y-2 text-sm text-[#6e6e73]">
                {coverage?.accidental_damage_coverage && <li>Proteção contra danos acidentais</li>}
                {coverage?.accidental_damage_deductible_required && (
                  <li>
                    {coverage.accidental_damage_uses_in_current_period ?? 0} de{" "}
                    {coverage.accidental_damage_uses_per_year ?? 3} utilizações neste período
                  </li>
                )}
                {coverage?.accidental_damage_deductible_required && (
                  <li>Franquia aplicável por ocorrência</li>
                )}
                {coverage?.cleaning_and_inspection_included && (
                  <li>Limpeza e revisão interna incluída</li>
                )}
              </ul>
              <a
                href={`/conta/cobertura/${device.id}`}
                className="mt-7 inline-flex items-center text-sm font-semibold text-[#0066cc]"
              >
                Ver detalhes da cobertura <ChevronRight className="h-4 w-4" />
              </a>
            </>
          ) : (
            <>
              <h3 className="text-3xl font-semibold">Garantia limitada Koda</h3>
              <p className="mt-3 text-[#6e6e73]">
                {warrantyActive
                  ? "Cobertura de garantia ativa."
                  : device.warranty_end
                    ? "O período de garantia terminou."
                    : "Consulte o suporte para confirmar sua cobertura."}
              </p>
              {coverage?.eligible && (
                <div className="mt-8 rounded-[24px] bg-[#eef5ff] p-6">
                  <p className="text-sm font-semibold text-[#0071e3]">Adicione KodaCare</p>
                  <h4 className="mt-2 text-2xl font-semibold">
                    Você ainda pode adicionar cobertura.
                  </h4>
                  <p className="mt-2 text-sm text-[#6e6e73]">
                    {coverage.eligibility_days_remaining}{" "}
                    {coverage.eligibility_days_remaining === 1 ? "dia restante" : "dias restantes"}.
                  </p>
                  <a
                    href="/kodacare"
                    className="mt-5 inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    Conhecer o KodaCare
                  </a>
                </div>
              )}
              <a
                href={`/conta/cobertura/${device.id}`}
                className="mt-7 inline-flex items-center text-sm font-semibold text-[#0066cc]"
              >
                Ver cobertura <ChevronRight className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
      </section>
      <section className="border-t border-black/10 py-12 sm:grid sm:grid-cols-[220px_1fr] sm:gap-14">
        <div>
          <h2 className="text-sm font-semibold text-[#6e6e73]">Linha do tempo</h2>
          <p className="mt-3 max-w-[190px] text-xs leading-relaxed text-[#86868b]">
            Ativação, diagnósticos e serviços deste KodaBot em um só lugar.
          </p>
        </div>
        <div className="mt-7 sm:mt-0">
          {timeline.length ? (
            <ol className="space-y-0">
              {timeline.map((event, index) => (
                <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className="absolute left-[9px] top-5 h-[calc(100%-4px)] w-px bg-black/10" />
                  )}
                  <CheckCircle2 className="relative z-10 mt-0.5 h-5 w-5 shrink-0 bg-[#f5f5f7] text-[#34c759]" />
                  <div className="min-w-0">
                    {event.href ? (
                      <a href={event.href} className="font-semibold text-[#0066cc] hover:underline">
                        {event.title}
                      </a>
                    ) : (
                      <p className="font-semibold">{event.title}</p>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">{event.body}</p>
                    <time className="mt-1 block text-xs text-[#86868b]">
                      {formatDateTime(event.created_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[#6e6e73]">
              Os próximos eventos deste KodaBot aparecerão aqui.
            </p>
          )}
        </div>
      </section>
      <section className="border-t border-black/10 py-12 sm:grid sm:grid-cols-[220px_1fr] sm:gap-14">
        <h2 className="text-sm font-semibold text-[#6e6e73]">Suporte e serviço</h2>
        <div className="mt-6 grid gap-3 sm:mt-0 sm:grid-cols-3">
          <ServiceLink href="/suporte/contato" icon={CircleHelp} title="Obter suporte" />
          <ServiceLink
            href={`/reparos/solicitar?device=${device.id}`}
            icon={Wrench}
            title="Solicitar reparo"
          />
          <ServiceLink href="/suporte/reparo" icon={ShieldCheck} title="Ver preços de reparo" />
          <ServiceLink
            href={`/conta/diagnostico/${device.id}`}
            icon={Activity}
            title="Ver diagnóstico"
          />
          <ServiceLink href="/kodaos/updates" icon={CloudDownload} title="Ver atualizações" />
        </div>
      </section>
      <section className="border-t border-black/10 py-12 sm:grid sm:grid-cols-[220px_1fr] sm:gap-14">
        <h2 className="text-sm font-semibold text-[#6e6e73]">Informações</h2>
        <dl className="mt-6 divide-y divide-black/10 sm:mt-0">
          <Info label="Modelo" value={modelName} />
          <Info label="Número de série" value={device.serial_number} />
          <Info label="KODA OS" value={device.kodaos_version ?? "—"} />
          <Info label="Data de compra" value={formatDate(device.purchase_date)} />
          <Info
            label="Garantia"
            value={device.warranty_end ? `Até ${formatDate(device.warranty_end)}` : "Não informada"}
          />
          <Info label="KodaCare" value={careName ?? "Não contratado"} />
        </dl>
      </section>
    </main>
  );
}

function toDeviceTimeline(event: any): TimelineEvent | null {
  const command = event.details?.command;
  const labels: Record<string, [string, string]> = {
    activated: ["KodaBot ativado", "Vinculado com segurança à sua Conta KodaCloud."],
    activation_started: ["Ativação iniciada", "O KodaBot iniciou uma sessão segura de ativação."],
    ownership_released: [
      "Propriedade liberada",
      "O vínculo anterior deste dispositivo foi removido.",
    ],
  };
  if (event.event_type === "command_requested" && command === "run_diagnostics")
    return {
      id: event.id,
      title: "Diagnóstico solicitado",
      body: "Aguardando o KodaBot executar a verificação.",
      created_at: event.created_at,
    };
  if (event.event_type === "command_completed" && command === "run_diagnostics")
    return {
      id: event.id,
      title: "Diagnóstico concluído",
      body:
        event.details?.status === "failed"
          ? "A verificação não foi concluída."
          : "Os resultados mais recentes já estão disponíveis.",
      created_at: event.created_at,
    };
  const label = labels[event.event_type];
  return label
    ? { id: event.id, title: label[0], body: label[1], created_at: event.created_at }
    : null;
}

function repairEventBody(details: unknown, protocol: string) {
  if (typeof details === "string" && details.trim()) return details;
  if (details && typeof details === "object" && "message" in details)
    return String((details as { message?: unknown }).message ?? `Reparo ${protocol} atualizado.`);
  return `O reparo ${protocol} recebeu uma nova atualização.`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function ServiceLink({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: typeof Wrench;
  title: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-[22px] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <Icon className="h-6 w-6 text-[#0071e3]" />
      <strong className="mt-8 flex items-center text-sm">
        {title}
        <ChevronRight className="ml-auto h-4 w-4 text-[#86868b] transition-transform group-hover:translate-x-1" />
      </strong>
    </a>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-4 text-sm">
      <dt className="text-[#6e6e73]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
        new Date(`${value}T12:00:00`),
      )
    : "Não informada";
}
