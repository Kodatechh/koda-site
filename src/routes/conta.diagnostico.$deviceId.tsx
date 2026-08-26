/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, Wifi } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";

export const Route = createFileRoute("/conta/diagnostico/$deviceId")({
  head: () => ({ meta: [{ title: "Diagnóstico do KodaBot — Conta Koda" }] }),
  component: DeviceDiagnostics,
});

function DeviceDiagnostics() {
  const { deviceId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [device, setDevice] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [deviceResult, healthResult, componentResult] = await Promise.all([
      db
        .from("devices")
        .select("id,serial_number,model,kodaos_version,last_seen_at")
        .eq("id", deviceId)
        .eq("owner_user_id", user.id)
        .maybeSingle(),
      db
        .from("device_health")
        .select(
          "online,last_seen_at,system_status,display_status,touch_status,sensor_status,audio_status,storage_status,last_diagnostic_at",
        )
        .eq("device_id", deviceId)
        .maybeSingle(),
      db
        .from("device_components")
        .select("id,component_type,status,updated_at")
        .eq("device_id", deviceId)
        .order("component_type"),
    ]);
    if (deviceResult.error) setError("Não foi possível acessar este KodaBot.");
    setDevice(deviceResult.data);
    setHealth(healthResult.data);
    setComponents(componentResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, deviceId]);

  const lastSeen = health?.last_seen_at ?? device?.last_seen_at;
  const connection = useMemo(() => friendlyLastSeen(lastSeen), [lastSeen]);

  async function requestDiagnostic() {
    if (requesting) return;
    setRequesting(true);
    setError(null);
    setRequestMessage(null);
    const { error: commandError } = await db.rpc("request_device_command", {
      _device_id: deviceId,
      _command: "run_diagnostics",
      _payload: { requested_from: "owner_portal" },
    });
    if (commandError) {
      setError(
        "Não foi possível solicitar a verificação agora. Confira se o KodaBot está conectado e tente novamente.",
      );
    } else {
      setRequestMessage(
        "Verificação solicitada. Assim que o KodaBot responder, você receberá uma notificação.",
      );
      window.setTimeout(() => void load(), 2500);
    }
    setRequesting(false);
  }

  if (authLoading || loading)
    return (
      <main className="grid min-h-[650px] place-items-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#86868b]" />
      </main>
    );
  if (!user || !device)
    return (
      <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-16">
        <h1 className="text-4xl font-semibold">Diagnóstico indisponível.</h1>
        <p className="mt-3 text-[#6e6e73]">
          Entre na conta proprietária para consultar este KodaBot.
        </p>
      </main>
    );

  const checks = [
    ["Sistema", health?.system_status],
    ["Tela", health?.display_status],
    ["Touch", health?.touch_status],
    ["Sensores", health?.sensor_status],
    ["Áudio", health?.audio_status],
    ["Armazenamento", health?.storage_status],
  ].filter(([, value]) => value != null);

  return (
    <main className="mx-auto min-h-[650px] max-w-5xl px-5 py-12 sm:py-20">
      <a
        href={`/conta/dispositivo/${deviceId}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Meu KodaBot
      </a>
      <header className="py-12">
        <Activity className="h-9 w-9 text-[#0071e3]" />
        <p className="mt-5 text-sm font-semibold text-[#0071e3]">
          {productNames[device.model as ProductId] ?? device.model} · {device.serial_number}
        </p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Diagnóstico.</h1>
        <p className="mt-5 max-w-2xl text-[#6e6e73]">
          Uma leitura clara dos dados enviados pelo seu KodaBot. Nenhum controle remoto ou dado
          privado é exposto aqui.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        <StatusCard
          icon={Wifi}
          title="Conexão"
          value={health?.online ? "Online" : "Offline"}
          detail={connection}
          good={Boolean(health?.online)}
        />
        <StatusCard
          icon={Activity}
          title="Sistema"
          value={`KODA OS ${device.kodaos_version ?? "não informado"}`}
          detail={
            health?.last_diagnostic_at
              ? `Última verificação ${friendlyLastSeen(health.last_diagnostic_at).toLowerCase()}`
              : "Aguardando a próxima verificação do dispositivo."
          }
          good={normal(health?.system_status)}
        />
      </section>
      <section className="mt-4 rounded-[30px] bg-white p-7 sm:p-9">
        <h2 className="text-2xl font-semibold">Componentes</h2>
        {checks.length || components.length ? (
          <div className="mt-5 divide-y divide-black/10">
            {checks.map(([label, value]) => (
              <CheckRow key={label} label={label} status={String(value)} />
            ))}
            {components.map((component) => (
              <CheckRow
                key={component.id}
                label={friendlyComponent(component.component_type)}
                status={component.status}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#6e6e73]">
            Seu KodaBot ainda não enviou uma verificação de componentes.
          </p>
        )}
      </section>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          onClick={requestDiagnostic}
          disabled={requesting}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
        >
          {requesting ? "Solicitando…" : "Executar novo diagnóstico"}
        </button>
        <a
          href={`/reparos/solicitar?device=${deviceId}`}
          className="rounded-full bg-[#e8e8ed] px-6 py-3 text-sm font-semibold"
        >
          Solicitar reparo
        </a>
      </div>
      {requestMessage && (
        <p role="status" className="mt-5 text-sm text-green-700">
          {requestMessage}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
  good,
}: {
  icon: typeof Wifi;
  title: string;
  value: string;
  detail: string;
  good: boolean;
}) {
  return (
    <article className="rounded-[30px] bg-white p-7">
      <Icon className={`h-7 w-7 ${good ? "text-green-600" : "text-[#86868b]"}`} />
      <p className="mt-7 text-sm text-[#86868b]">{title}</p>
      <h2 className="mt-1 text-2xl font-semibold">{value}</h2>
      <p className="mt-3 text-sm text-[#6e6e73]">{detail}</p>
    </article>
  );
}
function CheckRow({ label, status }: { label: string; status: string }) {
  const good = normal(status);
  return (
    <div className="flex items-center justify-between gap-5 py-4 text-sm">
      <span className="font-medium">{label}</span>
      <span
        className={`inline-flex items-center gap-2 ${good ? "text-green-700" : "text-amber-700"}`}
      >
        {good ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
        {friendlyStatus(status)}
      </span>
    </div>
  );
}
function normal(value: unknown) {
  return ["ok", "healthy", "normal", "online", "operational", "passed"].includes(
    String(value ?? "").toLowerCase(),
  );
}
function friendlyStatus(value: string) {
  return normal(value) ? "Tudo certo" : value ? "Precisa de atenção" : "Sem dados";
}
function friendlyComponent(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
function friendlyLastSeen(value: string | null) {
  if (!value) return "Ainda não recebemos uma conexão recente.";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Seu KodaBot se conectou agora.";
  if (minutes < 60)
    return `Seu KodaBot se conectou há ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Seu KodaBot se conectou há ${hours} hora${hours === 1 ? "" : "s"}.`;
  return `Última conexão em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}.`;
}
