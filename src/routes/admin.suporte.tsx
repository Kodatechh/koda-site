import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Headphones,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";
import { isDeviceOnline } from "@/lib/device-presence";

export const Route = createFileRoute("/admin/suporte")({
  head: () => ({
    meta: [
      { title: "Koda Support — Console interno" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SupportConsole,
});

type Device = {
  id: string;
  serial_number: string;
  model: string;
  status: string;
  kodaos_version: string | null;
  warranty_end: string | null;
  owner_user_id: string | null;
  activated_at: string | null;
  last_seen_at: string | null;
};
type CaseItem = {
  id: string;
  owner_user_id: string;
  device_id: string | null;
  category: string;
  subject: string;
  status: string;
  created_at: string;
};
type Health = {
  device_id: string;
  online: boolean;
  last_seen_at: string | null;
  wifi_status: string | null;
  wifi_signal: number | null;
  diagnostics: Record<string, unknown>;
  updated_at: string;
};
type DeviceCommand = {
  id: string;
  device_id: string;
  status: "pending" | "delivered" | "completed" | "failed" | "cancelled";
  result: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

function SupportConsole() {
  const { user, loading, isSupportAgent, isSupportAdvanced } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [requestingDiagnostic, setRequestingDiagnostic] = useState<string | null>(null);
  const [presenceNow, setPresenceNow] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [serialConfirmation, setSerialConfirmation] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetComplete, setResetComplete] = useState(false);

  async function load() {
    if (!isSupportAgent) return;
    setRefreshing(true);
    const [devicesResult, casesResult, healthResult, commandsResult] = await Promise.all([
      supabase
        .from("devices")
        .select(
          "id,serial_number,model,status,kodaos_version,warranty_end,owner_user_id,activated_at,last_seen_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("support_cases")
        .select("id,owner_user_id,device_id,category,subject,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("device_health")
        .select("device_id,online,last_seen_at,wifi_status,wifi_signal,diagnostics,updated_at")
        .limit(100),
      supabase
        .from("device_commands")
        .select("id,device_id,status,result,created_at,completed_at")
        .eq("command", "run_diagnostics")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (!devicesResult.error) setDevices((devicesResult.data ?? []) as Device[]);
    if (!casesResult.error) setCases((casesResult.data ?? []) as CaseItem[]);
    if (!healthResult.error) setHealth((healthResult.data ?? []) as Health[]);
    if (!commandsResult.error) setCommands((commandsResult.data ?? []) as DeviceCommand[]);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, [isSupportAgent]);
  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const healthByDevice = useMemo(
    () => new Map(health.map((item) => [item.device_id, item])),
    [health],
  );
  const commandByDevice = useMemo(() => {
    const result = new Map<string, DeviceCommand>();
    commands.forEach((command) => {
      if (!result.has(command.device_id)) result.set(command.device_id, command);
    });
    return result;
  }, [commands]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((item) =>
      `${item.serial_number} ${item.model} ${item.status}`.toLowerCase().includes(q),
    );
  }, [devices, query]);

  async function runDiagnostic(device: Device) {
    if (!user || !isSupportAdvanced || requestingDiagnostic) return;
    const current = commandByDevice.get(device.id);
    if (current && ["pending", "delivered"].includes(current.status)) return;
    setRequestingDiagnostic(device.id);
    setDiagnosticError(null);
    const { error } = await supabase.rpc("request_device_command", {
      _device_id: device.id,
      _command: "run_diagnostics",
      _payload: { source: "koda_support" },
    });
    if (error) setDiagnosticError(error.message);
    else await load();
    setRequestingDiagnostic(null);
  }

  function openDeviceDetails(device: Device) {
    setSelectedDevice(device);
    setSerialConfirmation("");
    setResetReason("");
    setResetError(null);
    setResetComplete(false);
  }

  async function restoreDevice() {
    if (
      !selectedDevice ||
      serialConfirmation !== selectedDevice.serial_number ||
      resetReason.trim().length < 10 ||
      resetting
    )
      return;
    const confirmed = window.confirm(
      `Esta ação removerá o vínculo atual e rotacionará definitivamente a credencial de ${selectedDevice.serial_number}. Deseja continuar?`,
    );
    if (!confirmed) return;

    setResetting(true);
    setResetError(null);
    const { data, error } = await supabase.rpc("support_factory_reset_device", {
      _device_id: selectedDevice.id,
      _reason: resetReason.trim(),
    });
    if (error || !data?.[0]) {
      setResetError(error?.message ?? "A restauração não retornou o pacote de recuperação.");
      setResetting(false);
      return;
    }

    const oneTimeResult = data[0];
    const packageJson = JSON.stringify(
      {
        serial: oneTimeResult.serial,
        model: oneTimeResult.model,
        board_uid: oneTimeResult.board_uid,
        device_secret_hex: oneTimeResult.device_secret_hex,
      },
      null,
      2,
    );
    oneTimeResult.device_secret_hex = "";
    const blobUrl = URL.createObjectURL(new Blob([packageJson], { type: "application/json" }));
    const download = document.createElement("a");
    download.href = blobUrl;
    download.download = `${selectedDevice.serial_number}.koda-support-restore.json`;
    download.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);

    setSerialConfirmation("");
    setResetReason("");
    setResetComplete(true);
    setResetting(false);
    await load();
  }

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">
        Validando acesso…
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Nav />
        <main className="grid min-h-[650px] place-items-center px-5 text-center">
          <div>
            <Headphones className="mx-auto h-10 w-10 text-[#0071e3]" />
            <h1 className="mt-5 text-4xl font-semibold">Entre na conta da equipe Koda.</h1>
            <a
              href="/conta/entrar"
              className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
            >
              Entrar
            </a>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  if (!isSupportAgent)
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <Nav />
        <main className="grid min-h-[650px] place-items-center px-5 text-center">
          <div>
            <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
            <h1 className="mt-5 text-4xl font-semibold">Acesso restrito.</h1>
            <p className="mt-3 text-sm text-[#6e6e73]">
              Esta conta não possui uma função de suporte no KodaCloud.
            </p>
            <a href="/conta" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
              Voltar para Minha Conta ›
            </a>
          </div>
        </main>
        <SiteFooter />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <section className="rounded-[34px] bg-white p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Koda · equipe interna</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Koda Support
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
                Dispositivos, cobertura, saúde, diagnósticos e atendimentos em um só lugar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Serial ou modelo"
                  className="h-10 rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-4 text-sm outline-none focus:border-[#0071e3]"
                />
              </label>
              <button
                onClick={load}
                className="grid h-10 w-10 place-items-center rounded-full border border-black/10"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric label="Dispositivos" value={String(devices.length)} />
          <Metric
            label="Online agora"
            value={String(
              devices.filter((device) =>
                isDeviceOnline(
                  device.last_seen_at ?? healthByDevice.get(device.id)?.last_seen_at,
                  presenceNow,
                ),
              ).length,
            )}
          />
          <Metric
            label="Atendimentos abertos"
            value={String(
              cases.filter((item) => !["resolved", "closed"].includes(item.status)).length,
            )}
          />
        </section>

        <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-[#6e6e73]">Dispositivos</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Visão técnica.</h2>
            </div>
            <Activity className="h-8 w-8 text-[#0071e3]" />
          </div>
          <div className="mt-6 overflow-x-auto">
            {diagnosticError && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                Não foi possível solicitar o diagnóstico: {diagnosticError}
              </p>
            )}
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[11px] uppercase tracking-[0.12em] text-[#86868b]">
                  <th className="py-3 pr-5">Serial</th>
                  <th className="py-3 pr-5">Modelo</th>
                  <th className="py-3 pr-5">Estado</th>
                  <th className="py-3 pr-5">KODA OS</th>
                  <th className="py-3 pr-5">Wi‑Fi</th>
                  <th className="py-3 pr-5">Último contato</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => {
                  const itemHealth = healthByDevice.get(device.id);
                  const online = isDeviceOnline(
                    device.last_seen_at ?? itemHealth?.last_seen_at,
                    presenceNow,
                  );
                  const diagnostic = commandByDevice.get(device.id);
                  const diagnosticBusy =
                    requestingDiagnostic === device.id ||
                    diagnostic?.status === "pending" ||
                    diagnostic?.status === "delivered";
                  return (
                    <tr key={device.id} className="border-b border-black/10">
                      <td className="py-4 pr-5 font-mono text-xs font-semibold">
                        {device.serial_number}
                      </td>
                      <td className="py-4 pr-5 font-medium">
                        {productNames[device.model as ProductId] ?? device.model}
                      </td>
                      <td className="py-4 pr-5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${online ? "bg-green-50 text-green-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}
                        >
                          {online ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="py-4 pr-5">{device.kodaos_version ?? "—"}</td>
                      <td className="py-4 pr-5 text-[#6e6e73]">
                        {itemHealth?.wifi_status ?? "—"}
                        {itemHealth?.wifi_signal != null ? ` · ${itemHealth.wifi_signal}%` : ""}
                      </td>
                      <td className="py-4 pr-5 text-[#6e6e73]">
                        {itemHealth?.last_seen_at
                          ? new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(itemHealth.last_seen_at))
                          : "—"}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {isSupportAdvanced && (
                            <button
                              onClick={() => runDiagnostic(device)}
                              disabled={!online || diagnosticBusy}
                              className="inline-flex items-center gap-1 font-semibold text-[#0066cc] disabled:cursor-not-allowed disabled:text-[#86868b]"
                            >
                              <Wrench className="h-3.5 w-3.5" />{" "}
                              {requestingDiagnostic === device.id
                                ? "Solicitando…"
                                : diagnostic?.status === "pending"
                                  ? "Aguardando aparelho"
                                  : diagnostic?.status === "delivered"
                                    ? "Diagnosticando…"
                                    : diagnostic?.status === "completed"
                                      ? "Diagnosticar novamente"
                                      : "Diagnosticar"}
                            </button>
                          )}
                          <button
                            onClick={() => openDeviceDetails(device)}
                            className="font-semibold text-[#0066cc]"
                          >
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="py-10 text-center text-sm text-[#6e6e73]">
                Nenhum dispositivo encontrado.
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
          <div>
            <p className="text-sm font-semibold text-[#6e6e73]">Atendimentos</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Casos recentes.</h2>
          </div>
          <div className="mt-6 divide-y divide-black/10">
            {cases.length ? (
              cases.slice(0, 20).map((item) => (
                <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#86868b]">
                      {item.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{item.subject}</p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.created_at))}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#6e6e73]">
                    {caseLabel(item.status)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-[#6e6e73]">Nenhum atendimento registrado.</p>
            )}
          </div>
        </section>
        <Dialog
          open={selectedDevice !== null}
          onOpenChange={(open) => {
            if (!open && !resetting) setSelectedDevice(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[28px]">
            <DialogHeader>
              <DialogTitle>Detalhes do KodaBot</DialogTitle>
              <DialogDescription>
                {selectedDevice?.serial_number} ·{" "}
                {selectedDevice
                  ? (productNames[selectedDevice.model as ProductId] ?? selectedDevice.model)
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {selectedDevice && (
              <div className="mt-2">
                <dl className="grid gap-3 rounded-2xl bg-[#f5f5f7] p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#86868b]">Status</dt>
                    <dd className="mt-1 font-semibold">{selectedDevice.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[#86868b]">KODA OS</dt>
                    <dd className="mt-1 font-semibold">{selectedDevice.kodaos_version ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[#86868b]">Ativado em</dt>
                    <dd className="mt-1 font-semibold">
                      {selectedDevice.activated_at
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                            new Date(selectedDevice.activated_at),
                          )
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#86868b]">Garantia até</dt>
                    <dd className="mt-1 font-semibold">
                      {selectedDevice.warranty_end
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                            new Date(`${selectedDevice.warranty_end}T00:00:00`),
                          )
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex gap-3">
                    <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                    <div>
                      <h2 className="font-semibold text-red-950">Restaurar de fábrica</h2>
                      <p className="mt-1 text-sm leading-relaxed text-red-900/75">
                        Remove o vínculo com a Conta Koda, revoga a credencial atual e prepara este
                        KodaBot para uma nova configuração.
                      </p>
                    </div>
                  </div>
                  {resetComplete ? (
                    <div className="mt-5 rounded-xl bg-white p-4 text-sm leading-relaxed text-[#1d1d1f]">
                      <p className="font-semibold">Restauração iniciada.</p>
                      <p className="mt-2">
                        O vínculo anterior foi removido e a credencial do dispositivo foi
                        rotacionada.
                      </p>
                      <p className="mt-2">
                        Conecte o KodaBot ao computador da assistência, restaure o KODA OS e grave o
                        pacote de recuperação recém-baixado.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <label className="block text-sm font-medium text-red-950">
                        Serial para confirmar
                        <input
                          value={serialConfirmation}
                          onChange={(event) => setSerialConfirmation(event.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={selectedDevice.serial_number}
                          className="mt-2 h-11 w-full rounded-xl border border-red-200 bg-white px-4 font-mono outline-none focus:border-red-600"
                        />
                      </label>
                      <label className="block text-sm font-medium text-red-950">
                        Motivo da restauração
                        <textarea
                          value={resetReason}
                          onChange={(event) => setResetReason(event.target.value)}
                          rows={3}
                          placeholder="Descreva o motivo (mínimo de 10 caracteres)"
                          className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-600"
                        />
                      </label>
                      {resetError && (
                        <p role="alert" className="text-sm font-medium text-red-700">
                          {resetError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={restoreDevice}
                        disabled={
                          resetting ||
                          serialConfirmation !== selectedDevice.serial_number ||
                          resetReason.trim().length < 10
                        }
                        className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {resetting ? "Restaurando…" : "Restaurar de fábrica"}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] bg-white p-6">
      <p className="text-xs font-semibold text-[#86868b]">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}
function caseLabel(status: string) {
  return status === "open"
    ? "Aberto"
    : status === "in_progress"
      ? "Em atendimento"
      : status === "waiting_customer"
        ? "Aguardando cliente"
        : status === "resolved"
          ? "Resolvido"
          : "Fechado";
}
