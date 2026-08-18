import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Factory,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";
import { isDeviceOnline } from "@/lib/device-presence";

export const Route = createFileRoute("/fabrica")({
  head: () => ({
    meta: [{ title: "Produção — Koda" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: FactoryPage,
});
type Device = {
  id: string;
  serial_number: string;
  model: string;
  status: "not_activated" | "activated" | "service" | "retired";
  provisioning_status: "registered" | "provisioned" | "factory_tested" | "ready";
  manufactured_at: string | null;
  purchase_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  kodaos_version: string | null;
  hardware_revision: string | null;
  activated_at: string | null;
  owner_email_masked: string | null;
  notes: string | null;
  created_at: string;
  last_seen_at: string | null;
};
type Test = {
  component_name: string;
  status: "pending" | "passed" | "failed" | "not_applicable";
  tested_at: string | null;
  notes: string | null;
};
type FactoryIdentity = {
  serial: string;
  model: string;
  board_uid: string;
  device_secret_hex: string;
};
type FactoryProvisionResponse = {
  ok: true;
  device: {
    device_id: string;
    serial: string;
    model: string;
    board_uid: string;
    activation_status: "not_activated";
  };
  factory_identity: FactoryIdentity;
};
const TESTS: Record<string, string[]> = {
  "kodabot-i": ["display", "touch", "wifi", "buzzer", "bme280", "kodaos", "kodacloud"],
  "kodabot-i-pro": [
    "wifi",
    "microphones",
    "speaker",
    "buttons",
    "battery",
    "charging",
    "kodaos",
    "kodacloud",
  ],
};
const STAGE: Record<Device["provisioning_status"], number> = {
  registered: 0,
  provisioned: 1,
  factory_tested: 2,
  ready: 3,
};
const label = (s: Device["provisioning_status"]) =>
  s === "registered"
    ? "Aguardando provisionamento"
    : ({ provisioned: "Provisionado", factory_tested: "Testado", ready: "Pronto" } as const)[s];
const color = (s: Device["provisioning_status"]) =>
  ({
    registered: "bg-amber-50 text-amber-700",
    provisioned: "bg-blue-50 text-blue-700",
    factory_tested: "bg-violet-50 text-violet-700",
    ready: "bg-emerald-50 text-emerald-700",
  })[s];
const displayModel = (model: string) => productNames[model as ProductId] ?? model;

function FactoryPage() {
  const { user, loading, isFactoryAdmin } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [presenceNow, setPresenceNow] = useState(Date.now());
  async function load() {
    setBusy(true);
    const [deviceResult, presenceResult, healthResult] = await Promise.all([
      supabase.rpc("factory_list_devices"),
      supabase.from("devices").select("id,last_seen_at"),
      supabase.from("device_health").select("device_id,last_seen_at"),
    ]);
    if (!deviceResult.error) {
      const legacyLastSeen = new Map(
        (healthResult.data ?? []).map((health) => [health.device_id, health.last_seen_at]),
      );
      const lastSeen = new Map(
        (presenceResult.data ?? []).map((device) => [
          device.id,
          device.last_seen_at ?? legacyLastSeen.get(device.id) ?? null,
        ]),
      );
      const next = (deviceResult.data ?? []).map((device) => ({
        ...device,
        last_seen_at: lastSeen.get(device.id) ?? null,
      })) as Device[];
      setDevices(next);
      setEditing((old) => (old ? (next.find((d) => d.id === old.id) ?? null) : null));
    }
    setBusy(false);
  }
  useEffect(() => {
    if (isFactoryAdmin) void load();
  }, [isFactoryAdmin]);
  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? devices.filter((d) =>
          `${d.serial_number} ${d.model} ${label(d.provisioning_status)} ${d.owner_email_masked ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : devices;
  }, [devices, query]);
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">
        Validando acesso…
      </div>
    );
  if (!user)
    return (
      <Access
        icon={<Factory className="h-10 w-10 text-[#0071e3]" />}
        title="Entre na conta autorizada da Koda."
        text="A produção é protegida por uma função administrativa no KodaCloud."
        href="/conta/entrar"
        action="Entrar"
      />
    );
  if (!isFactoryAdmin)
    return (
      <Access
        icon={<ShieldCheck className="h-10 w-10 text-[#86868b]" />}
        title="Acesso restrito."
        text="Sua conta não possui a função administrativa exigida."
        href="/conta"
        action="Voltar para minha conta ›"
      />
    );
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      {feedback && (
        <div className="fixed right-5 top-24 z-[140] rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {feedback}
        </div>
      )}
      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <section className="rounded-[32px] bg-white p-7 sm:p-10">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Koda · Produção</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
                Central de fábrica
              </h1>
              <p className="mt-3 text-sm text-[#6e6e73]">
                Acompanhe cada KodaBot do cadastro até a ativação pelo cliente.
              </p>
            </div>
            <button
              onClick={() => setProvisioning(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Provisionar KodaBot
            </button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              "1. Registrado",
              "2. Provisionado",
              "3. Testado",
              "4. Pronto para venda",
              "5. Ativado pelo cliente",
            ].map((x) => (
              <div key={x} className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-xs font-semibold">
                {x}
              </div>
            ))}
          </div>
        </section>
        <section className="mt-5 rounded-[32px] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-.03em]">KodaBots em produção</h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                {devices.length} registro{devices.length === 1 ? "" : "s"} no KodaCloud
              </p>
            </div>
            <div className="flex gap-2">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar serial, modelo ou status"
                  className="h-10 w-full rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-4 text-sm outline-none"
                />
              </label>
              <button
                onClick={() => void load()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10"
                aria-label="Atualizar dispositivos"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[11px] uppercase tracking-[.12em] text-[#86868b]">
                  <th className="py-3 pr-5">Serial</th>
                  <th className="py-3 pr-5">Modelo</th>
                  <th className="py-3 pr-5">Produção</th>
                  <th className="py-3 pr-5">KODA OS</th>
                  <th className="py-3 pr-5">Conexão</th>
                  <th className="py-3 pr-5">Ativação</th>
                  <th className="py-3 pr-5">Proprietário</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-black/10">
                    <td className="py-4 pr-5 font-mono text-xs font-semibold">{d.serial_number}</td>
                    <td className="py-4 pr-5 font-medium">{displayModel(d.model)}</td>
                    <td className="py-4 pr-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${color(d.provisioning_status)}`}
                      >
                        {label(d.provisioning_status)}
                      </span>
                    </td>
                    <td className="py-4 pr-5 text-xs">{d.kodaos_version ?? "—"}</td>
                    <td className="py-4 pr-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDeviceOnline(d.last_seen_at, presenceNow) ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}
                      >
                        {isDeviceOnline(d.last_seen_at, presenceNow) ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="py-4 pr-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${d.status === "activated" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}
                      >
                        {d.status === "activated" ? "Ativado" : "Não ativado"}
                      </span>
                    </td>
                    <td className="py-4 pr-5 text-xs text-[#6e6e73]">
                      {d.owner_email_masked ?? "Nenhum"}
                    </td>
                    <td>
                      <button
                        onClick={() => setEditing(d)}
                        className="inline-flex items-center gap-1 font-semibold text-[#0066cc]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="py-12 text-center text-sm text-[#6e6e73]">
                Nenhum dispositivo encontrado.
              </p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      {provisioning && (
        <FactoryProvision onClose={() => setProvisioning(false)} onProvisioned={load} />
      )}
      {editing && (
        <DeviceModal
          device={editing}
          onClose={() => setEditing(null)}
          refresh={load}
          onDeleted={(device) => {
            setEditing(null);
            setDevices((current) => current.filter((item) => item.id !== device.id));
            setFeedback(`${device.serial_number} foi excluído.`);
            window.setTimeout(() => setFeedback(null), 3500);
            void load();
          }}
        />
      )}
    </div>
  );
}

const PROVISION_ERRORS: Record<string, string> = {
  serial_already_provisioned: "Este número de série já foi provisionado.",
  board_uid_already_provisioned: "Este Board UID já pertence a outro KodaBot.",
  invalid_serial: "Número de série inválido.",
  invalid_model: "Modelo inválido.",
  invalid_board_uid: "Board UID inválido.",
  forbidden: "Somente administradores podem provisionar dispositivos.",
};

function FactoryProvision({
  onClose,
  onProvisioned,
}: {
  onClose: () => void;
  onProvisioned: () => Promise<void>;
}) {
  const [serial, setSerial] = useState("");
  const [boardUid, setBoardUid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactoryProvisionResponse["device"] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedSerial = serial.trim().toUpperCase();
    const normalizedBoardUid = boardUid.trim().toLowerCase();

    if (normalizedSerial.length < 4) {
      setError(PROVISION_ERRORS["invalid_serial"] ?? "Número de série inválido.");
      return;
    }
    if (!/^[0-9a-f]{8,}$/.test(normalizedBoardUid)) {
      setError(PROVISION_ERRORS["invalid_board_uid"] ?? "Board UID inválido.");
      return;
    }

    setSaving(true);
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError || !authData.session) {
      setSaving(false);
      setError("Sua sessão expirou. Entre novamente para provisionar o KodaBot.");
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke(
      "kodacloud-factory-provision",
      {
        body: { serial: normalizedSerial, model: "kodabot-i", board_uid: normalizedBoardUid },
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
      },
    );

    if (invokeError) {
      let code = "provision_failed";
      if (invokeError instanceof FunctionsHttpError) {
        try {
          const payload = (await invokeError.context.json()) as { error?: unknown };
          if (typeof payload.error === "string") code = payload.error;
        } catch {
          // The response did not contain a JSON error code.
        }
      }
      setSaving(false);
      setError(
        PROVISION_ERRORS[code] ?? "Não foi possível provisionar o KodaBot. Tente novamente.",
      );
      return;
    }

    const response = data as FactoryProvisionResponse | null;
    const identity = response?.factory_identity;
    if (
      !response?.ok ||
      !identity ||
      typeof identity.serial !== "string" ||
      typeof identity.model !== "string" ||
      typeof identity.board_uid !== "string" ||
      typeof identity.device_secret_hex !== "string"
    ) {
      setSaving(false);
      setError("O KodaCloud retornou uma resposta inválida.");
      return;
    }

    const nextUrl = URL.createObjectURL(
      new Blob([JSON.stringify(identity, null, 2)], { type: "application/json" }),
    );
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setResult(response.device);
    setSaving(false);
    await onProvisioned();
  }

  function consumeDownload() {
    window.setTimeout(() => {
      setDownloadUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }, 0);
  }

  return (
    <Modal title="Provisionar novo KodaBot" close={onClose}>
      {result ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" /> KodaBot provisionado com sucesso
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Info title="Serial" value={result.serial} />
            <Info title="Modelo" value={displayModel(result.model)} />
            <Info title="Board UID" value={result.board_uid} />
            <Info title="Status" value="Não ativado" />
          </div>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download="factory_identity.json"
              onClick={consumeDownload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" /> Baixar factory_identity.json
            </a>
          ) : (
            <p className="rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
              O arquivo de identidade já foi disponibilizado. Por segurança, o segredo não pode ser
              consultado novamente nesta página.
            </p>
          )}
          <p className="text-xs leading-relaxed text-[#6e6e73]">
            Guarde o arquivo em local seguro e grave-o no aparelho. O segredo de fábrica não é
            exibido nem armazenado pelo site.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Modelo">
            <select className="input" value="kodabot-i" disabled>
              <option value="kodabot-i">KodaBot I</option>
            </select>
          </Field>
          <Field label="Número de série">
            <input
              required
              value={serial}
              onChange={(event) => setSerial(event.target.value.toUpperCase())}
              placeholder="KBP-0001"
              autoComplete="off"
              spellCheck={false}
              className="input font-mono"
            />
          </Field>
          <Field label="Board UID">
            <input
              required
              value={boardUid}
              onChange={(event) => setBoardUid(event.target.value.toLowerCase())}
              placeholder="49b0eb4b537cd293"
              autoComplete="off"
              spellCheck={false}
              className="input font-mono"
            />
          </Field>
          <div className="rounded-2xl bg-[#f5f5f7] p-4 text-xs leading-relaxed text-[#6e6e73]">
            A identidade será criada uma única vez pelo KodaCloud. O segredo ficará disponível
            somente no arquivo gerado para gravação no aparelho.
          </div>
          {error && (
            <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <button
            disabled={saving}
            className="w-full rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Provisionando…" : "Provisionar KodaBot"}
          </button>
        </form>
      )}
    </Modal>
  );
}

function DeviceModal({
  device,
  onClose,
  refresh,
  onDeleted,
}: {
  device: Device;
  onClose: () => void;
  refresh: () => Promise<void>;
  onDeleted: (device: Device) => void;
}) {
  const [tests, setTests] = useState<Test[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmationSerial, setConfirmationSerial] = useState("");
  const [deleting, setDeleting] = useState(false);
  const components = TESTS[device.model] || [];
  const stage = STAGE[device.provisioning_status];
  const loadTests = useCallback(async () => {
    const { data } = await supabase.rpc("get_device_factory_tests", { _device_id: device.id });
    setTests((data ?? []) as Test[]);
  }, [device.id]);
  useEffect(() => {
    if (stage >= 1) void loadTests();
  }, [loadTests, stage]);
  async function update(component: string, status: string) {
    const { error: err } = await supabase.rpc("update_device_factory_test", {
      _device_id: device.id,
      _component_name: component,
      _status: status,
    });
    if (err) setError(err.message);
    else await loadTests();
  }
  async function transition(kind: "tested" | "ready") {
    setBusy(true);
    const result =
      kind === "tested"
        ? await supabase.rpc("mark_device_factory_tested", { _device_id: device.id })
        : await supabase.rpc("mark_device_ready_for_sale", { _device_id: device.id });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else await refresh();
  }
  async function deleteDevice() {
    if (confirmationSerial !== device.serial_number) return;
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.rpc("factory_delete_device", {
      _device_id: device.id,
    });
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted(device);
  }
  const passed =
    components.length > 0 &&
    components.every((c) => tests.find((t) => t.component_name === c)?.status === "passed");
  return (
    <Modal
      title={`${device.serial_number} · ${productNames[device.model as ProductId] ?? device.model}`}
      close={onClose}
    >
      {confirmingDelete ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-red-50 p-5">
            <h3 className="text-xl font-semibold text-red-900">Excluir {device.serial_number}?</h3>
            <p className="mt-2 text-sm leading-relaxed text-red-900/70">
              Esta ação remove permanentemente este aparelho do KodaCloud e não pode ser desfeita.
            </p>
          </div>
          <Field label={`Para confirmar, digite: ${device.serial_number}`}>
            <input
              autoFocus
              value={confirmationSerial}
              onChange={(event) => setConfirmationSerial(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="input font-mono"
            />
          </Field>
          {error && (
            <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={() => {
                setConfirmingDelete(false);
                setConfirmationSerial("");
                setError(null);
              }}
              disabled={deleting}
              className="rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={() => void deleteDevice()}
              disabled={confirmationSerial !== device.serial_number || deleting}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {deleting ? "Excluindo…" : "Excluir permanentemente"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            {["Registrado", "Provisionado", "Testado", "Pronto para venda", "Ativado"].map(
              (x, i) => (
                <Timeline
                  key={x}
                  text={x}
                  done={i < 4 ? stage >= i : device.status === "activated"}
                />
              ),
            )}
          </div>
          {stage === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold">Aguardando provisionamento</p>
              <p className="mt-2 text-xs">
                Conclua o provisionamento pela ação principal da Central de fábrica.
              </p>
            </div>
          )}
          {stage >= 1 && (
            <div>
              <h3 className="text-sm font-semibold">Testes de fábrica</h3>
              <div className="mt-3 space-y-2">
                {components.map((c) => {
                  const test = tests.find((t) => t.component_name === c);
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between rounded-xl bg-[#f5f5f7] p-3"
                    >
                      <span className="text-sm font-medium">{c}</span>
                      <select
                        disabled={stage !== 1}
                        value={test?.status || "pending"}
                        onChange={(e) => void update(c, e.target.value)}
                        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                      >
                        <option value="pending">Pendente</option>
                        <option value="passed">Aprovado</option>
                        <option value="failed">Reprovado</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              {stage === 1 && (
                <button
                  onClick={() => void transition("tested")}
                  disabled={!passed || busy}
                  className="mt-4 w-full rounded-full bg-[#0071e3] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Marcar como Testado
                </button>
              )}
            </div>
          )}
          {stage === 2 && (
            <button
              onClick={() => void transition("ready")}
              disabled={busy}
              className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white"
            >
              Pronto para venda
            </button>
          )}
          {error && (
            <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
          <div className="border-t border-black/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86868b]">
              Ações administrativas
            </p>
            <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-[#f5f5f7] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Excluir este KodaBot do KodaCloud.</p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  Disponível apenas para aparelhos não ativados e sem proprietário.
                </p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setConfirmingDelete(true);
                }}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Excluir KodaBot
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Access(p: { icon: ReactNode; title: string; text: string; href: string; action: string }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Nav />
      <main className="grid min-h-[650px] place-items-center px-5">
        <div className="max-w-lg text-center">
          <div className="flex justify-center">{p.icon}</div>
          <h1 className="mt-5 text-4xl font-semibold">{p.title}</h1>
          <p className="mt-4 text-sm text-[#6e6e73]">{p.text}</p>
          <a
            href={p.href}
            className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            {p.action}
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
function MiniStep({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white p-3 text-xs font-semibold">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 text-[#86868b]" />
      )}
      {text}
    </div>
  );
}
function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-[11px] text-[#6e6e73]">{title}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
function Timeline({ text, done }: { text: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {done ? (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <Circle className="h-5 w-5 text-[#c7c7cc]" />
      )}
      <span className={`text-sm ${done ? "font-semibold" : "text-[#6e6e73]"}`}>{text}</span>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-3 backdrop-blur-sm">
      <button onClick={close} className="absolute inset-0" aria-label="Fechar" />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button onClick={close} aria-label="Fechar janela">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[#6e6e73]">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
const styles = `.input{width:100%;padding:.625rem .75rem;border:1px solid rgba(0,0,0,.1);border-radius:.75rem;font-size:.875rem;outline:none}.input:focus{border-color:#0071e3}`;
if (typeof document !== "undefined" && !document.getElementById("factory-styles")) {
  const s = document.createElement("style");
  s.id = "factory-styles";
  s.textContent = styles;
  document.head.appendChild(s);
}
