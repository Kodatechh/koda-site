import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, Download, Factory, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, AlertCircle, X } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";

export const Route = createFileRoute("/fabrica")({
  head: () => ({ meta: [{ title: "Menu de Fábrica — Koda" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: FactoryPage,
});

type FactoryDevice = {
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
};

type FactoryTest = {
  component_name: string;
  status: "pending" | "passed" | "failed" | "not_applicable";
  tested_at: string | null;
  notes: string | null;
};

const FACTORY_TEST_COMPONENTS: Record<string, string[]> = {
  "kodabot-i": ["display", "touch", "wifi", "buzzer", "bme280", "kodaos", "kodacloud"],
  "kodabot-i-pro": ["wifi", "microphones", "speaker", "buttons", "battery", "charging", "kodaos", "kodacloud"],
};

const FACTORY_CLOUD_URL = import.meta.env["VITE_SUPABASE_URL"];

const PROVISIONING_STAGE: Record<FactoryDevice["provisioning_status"], number> = {
  registered: 0,
  provisioned: 1,
  factory_tested: 2,
  ready: 3,
};

function getProvisioningStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    registered: "Registrado",
    provisioned: "Provisionado",
    factory_tested: "Testado",
    ready: "Pronto para venda",
  };
  return labels[status] || status;
}

function getProvisioningStatusColor(status: string): string {
  const colors: Record<string, string> = {
    registered: "bg-blue-50 text-blue-700",
    provisioned: "bg-indigo-50 text-indigo-700",
    factory_tested: "bg-purple-50 text-purple-700",
    ready: "bg-green-50 text-green-700",
  };
  return colors[status] || "bg-gray-50 text-gray-700";
}

function FactoryPage() {
  const { user, loading, isFactoryAdmin } = useAuth();
  const [devices, setDevices] = useState<FactoryDevice[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FactoryDevice | null>(null);
  const [lastCredential, setLastCredential] = useState<{ serial: string; secret: string; model: string; kodaos_version: string; cloud_url: string } | null>(null);

  async function loadDevices() {
    setListLoading(true);
    const { data, error } = await supabase.rpc("factory_list_devices");
    if (!error) setDevices((data ?? []) as FactoryDevice[]);
    setListLoading(false);
  }

  useEffect(() => {
    if (isFactoryAdmin) loadDevices();
  }, [isFactoryAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => `${d.serial_number} ${d.model} ${d.provisioning_status} ${d.owner_email_masked ?? ""}`.toLowerCase().includes(q));
  }, [devices, query]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">Validando acesso…</div>;

  if (!user) {
    return <div className="min-h-screen bg-[#f5f5f7]"><Nav/><main className="grid min-h-[650px] place-items-center px-5"><div className="max-w-lg text-center"><Factory className="mx-auto h-10 w-10 text-[#0071e3]"/><h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em]">Entre na conta autorizada da Koda.</h1><p className="mt-4 text-sm text-[#6e6e73]">O Menu de Fábrica é protegido por uma função administrativa no Supabase.</p><a href="/conta/entrar" className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Entrar</a></div></main><SiteFooter/></div>;
  }

  if (!isFactoryAdmin) {
    return <div className="min-h-screen bg-[#f5f5f7]"><Nav/><main className="grid min-h-[650px] place-items-center px-5"><div className="max-w-lg text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]"/><h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em]">Acesso restrito.</h1><p className="mt-4 text-sm text-[#6e6e73]">Sua conta está autenticada, mas não possui a função administrativa exigida pelo banco de dados.</p><a href="/conta" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Voltar para minha conta ›</a></div></main><SiteFooter/></div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <section className="rounded-[32px] bg-black p-7 text-white sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#5b9cff]">Koda · acesso administrativo</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Menu de Fábrica</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">Sistema completo de provisionamento de KodaBots. Da fabricação até a ativação do cliente.</p></div><button onClick={()=>setFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"><Plus className="h-4 w-4"/> Novo KodaBot</button></div>
        </section>

        {lastCredential && (
          <section className="mt-4 rounded-[28px] border border-amber-300 bg-amber-50 p-6">
            <div className="flex items-start gap-4"><KeyRound className="mt-1 h-6 w-6 shrink-0 text-amber-700"/><div className="min-w-0 flex-1"><p className="font-semibold">Provisioning package criado para {lastCredential.serial}</p><p className="mt-2 text-sm leading-relaxed text-amber-900/70">O pacote contém a credencial de ativação apenas nesta sessão. Após fechar, será impossível recuperar do banco. Use o provisionador local para escrever no KodaBot.</p><div className="mt-4 flex gap-2"><button onClick={() => downloadProvisioningPackage(lastCredential)} className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"><Download className="h-4 w-4"/> Baixar pacote JSON</button><button onClick={() => navigator.clipboard.writeText(JSON.stringify({schema: 1, serial_number: lastCredential.serial, model: lastCredential.model, activation_secret: lastCredential.secret, kodaos_version: lastCredential.kodaos_version, cloud_url: lastCredential.cloud_url}, null, 2))} className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"><Copy className="h-4 w-4"/> Copiar JSON</button></div></div><button onClick={()=>setLastCredential(null)} className="text-amber-700"><X className="h-4 w-4"/></button></div>
          </section>
        )}

        <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Dispositivos</h2><p className="mt-1 text-sm text-[#6e6e73]">{devices.length} registro{devices.length === 1 ? "" : "s"} no KodaCloud</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar serial, modelo, status" className="h-10 rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-4 text-sm outline-none focus:border-[#0071e3]"/></label><button onClick={loadDevices} className="grid h-10 w-10 place-items-center rounded-full border border-black/10" aria-label="Atualizar"><RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`}/></button></div></div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-black/10 text-[11px] uppercase tracking-[0.12em] text-[#86868b]"><th className="py-3 pr-5">Serial</th><th className="py-3 pr-5">Modelo</th><th className="py-3 pr-5">Provisionamento</th><th className="py-3 pr-5">Ativação</th><th className="py-3 pr-5">KODA OS</th><th className="py-3 pr-5">Garantia</th><th className="py-3 pr-5">Proprietário</th><th className="py-3">Ações</th></tr></thead>
              <tbody>{filtered.map((device)=><tr key={device.id} className="border-b border-black/10"><td className="py-4 pr-5 font-mono text-xs font-semibold">{device.serial_number}</td><td className="py-4 pr-5 font-medium">{productNames[device.model as ProductId] ?? device.model}</td><td className="py-4 pr-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getProvisioningStatusColor(device.provisioning_status)}`}>{getProvisioningStatusLabel(device.provisioning_status)}</span></td><td className="py-4 pr-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${device.status === "activated" ? "bg-green-50 text-green-700" : device.status === "not_activated" ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-700"}`}>{device.status === "activated" ? "Ativado" : device.status === "not_activated" ? "Não ativado" : device.status}</span></td><td className="py-4 pr-5 text-xs">{device.kodaos_version ?? "—"}</td><td className="py-4 pr-5 text-xs text-[#6e6e73]">{device.warranty_end ?? "—"}</td><td className="py-4 pr-5 text-xs text-[#6e6e73]">{device.owner_email_masked ?? "—"}</td><td className="py-4"><button onClick={()=>setEditing(device)} className="inline-flex items-center gap-1 font-semibold text-[#0066cc] hover:underline"><Pencil className="h-3.5 w-3.5"/> Ver</button></td></tr>)}</tbody>
            </table>
            {!filtered.length && <p className="py-12 text-center text-sm text-[#6e6e73]">Nenhum dispositivo encontrado.</p>}
          </div>
        </section>
      </main>

      <SiteFooter />
      {formOpen && <RegisterDeviceModal onClose={()=>setFormOpen(false)} onSuccess={(serial, secret, model, kodaos_version, cloud_url)=>{setFormOpen(false);setLastCredential({serial,secret, model, kodaos_version, cloud_url});loadDevices();}} />}
      {editing && <ViewDeviceModal device={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);loadDevices();}} />}
    </div>
  );
}

function downloadProvisioningPackage(credential: { serial: string; secret: string; model: string; kodaos_version: string; cloud_url: string }) {
  const packageData = {
    schema: 1,
    serial_number: credential.serial,
    model: credential.model,
    activation_secret: credential.secret,
    kodaos_version: credential.kodaos_version,
    cloud_url: credential.cloud_url,
  };

  const json = JSON.stringify(packageData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${credential.serial}.koda-provision.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function RegisterDeviceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (serial: string, secret: string, model: string, kodaos_version: string, cloud_url: string) => void }) {
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState<ProductId>("kodabot-i");
  const [manufacturedAt, setManufacturedAt] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyStart, setWarrantyStart] = useState("");
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [version, setVersion] = useState("0.4");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");

    const { data: deviceId, error: rpcError } = await supabase.rpc("factory_register_device", {
      _serial_number: serial,
      _model: model,
      _activation_secret: secret,
      _manufactured_at: manufacturedAt || null,
      _purchase_date: purchaseDate || null,
      _warranty_start: warrantyStart || null,
      _warranty_end: warrantyEnd || null,
      _kodaos_version: version || null,
      _notes: notes || null,
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (deviceId) {
      onSuccess(
        serial.trim().toUpperCase(),
        secret,
        model,
        version || "0.4",
        FACTORY_CLOUD_URL,
      );
    }
  }

  return <Modal title="Novo KodaBot" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Número de série"><input required value={serial} onChange={(e)=>setSerial(e.target.value.toUpperCase())} placeholder="KBP-0001" className="factory-input font-mono"/></Field><Field label="Modelo"><select value={model} onChange={(e)=>setModel(e.target.value as ProductId)} className="factory-input"><option value="kodabot-i">KodaBot I</option><option value="kodabot-i-pro">KodaBot I Pro</option></select></Field><Field label="Data de fabricação"><input type="date" value={manufacturedAt} onChange={(e)=>setManufacturedAt(e.target.value)} className="factory-input"/></Field><Field label="Data de compra"><input type="date" value={purchaseDate} onChange={(e)=>setPurchaseDate(e.target.value)} className="factory-input"/></Field><Field label="Início da garantia"><input type="date" value={warrantyStart} onChange={(e)=>setWarrantyStart(e.target.value)} className="factory-input"/></Field><Field label="Expiração da garantia"><input type="date" value={warrantyEnd} onChange={(e)=>setWarrantyEnd(e.target.value)} className="factory-input"/></Field><Field label="Versão KODA OS"><input value={version} onChange={(e)=>setVersion(e.target.value)} className="factory-input"/></Field></div><Field label="Notas internas"><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} className="factory-input h-auto py-3"/></Field><div className="rounded-2xl bg-[#f5f5f7] p-4"><p className="text-xs font-semibold">Credencial gerada automaticamente</p><p className="mt-2 text-[11px] leading-relaxed text-[#6e6e73]">Uma credencial de ativação será gerada e exibida após o cadastro. Ela será armazenada apenas como hash no banco de dados.</p></div>{error&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="flex gap-3"><button type="submit" disabled={saving} className="flex-1 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Cadastrando..." : "Cadastrar KodaBot"}</button></div></form></Modal>;
}

function ViewDeviceModal({ device, onClose, onSaved }: { device: FactoryDevice; onClose: () => void; onSaved: () => void }) {
  const [tests, setTests] = useState<FactoryTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const testComponents = FACTORY_TEST_COMPONENTS[device.model] || [];

  useEffect(() => {
    loadTests();
  }, [device.id]);

  async function loadTests() {
    setTestsLoading(true);
    const { data, error: err } = await supabase.rpc("get_device_factory_tests", { _device_id: device.id });
    if (!err) {
      setTests((data ?? []) as FactoryTest[]);
    }
    setTestsLoading(false);
  }

  async function updateTest(component: string, status: string) {
    setError(null);
    const { error: err } = await supabase.rpc("update_device_factory_test", {
      _device_id: device.id,
      _component_name: component,
      _status: status,
    });
    if (err) setError(err.message);
    else loadTests();
  }

  async function markAsFactoryTested() {
    setMarking(true);
    setError(null);
    const { error: err } = await supabase.rpc("mark_device_factory_tested", { _device_id: device.id });
    setMarking(false);
    if (err) {
      setError(err.message);
    } else {
      onSaved();
    }
  }

  async function markAsReadyForSale() {
    setMarking(true);
    setError(null);
    const { error: err } = await supabase.rpc("mark_device_ready_for_sale", { _device_id: device.id });
    setMarking(false);
    if (err) {
      setError(err.message);
    } else {
      onSaved();
    }
  }

  const allTestsPassed = testComponents.length > 0 && testComponents.every((c) => {
    const test = tests.find((t) => t.component_name === c);
    return test?.status === "passed";
  });

  const provisioningStage = PROVISIONING_STAGE[device.provisioning_status];

  return <Modal title={`${device.serial_number} · ${productNames[device.model as ProductId]}`} onClose={onClose}><div className="space-y-6"><div className="rounded-xl bg-[#f5f5f7] p-4"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-[#6e6e73]">Provisionamento</p><p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getProvisioningStatusColor(device.provisioning_status)}`}>{getProvisioningStatusLabel(device.provisioning_status)}</p></div><div><p className="text-xs text-[#6e6e73]">Ativação</p><p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${device.status === "activated" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>{device.status === "activated" ? "Ativado" : "Não ativado"}</p></div></div></div><div><h3 className="text-sm font-semibold">Timeline de Provisionamento</h3><div className="mt-3 space-y-2"><ProvisioningStep label="Registrado" active={provisioningStage >= 0} /><ProvisioningStep label="Provisionado" active={provisioningStage >= 1} /><ProvisioningStep label="Testado" active={provisioningStage >= 2} /><ProvisioningStep label="Pronto para venda" active={provisioningStage >= 3} /><ProvisioningStep label="Ativado (cliente)" active={device.status === "activated"} /></div></div>{testComponents.length > 0 && (<div><h3 className="text-sm font-semibold">Testes de Fábrica</h3><div className="mt-3 space-y-2">{testComponents.map((component) => {const test = tests.find((t) => t.component_name === component);return (<div key={component} className="flex items-center justify-between rounded-lg bg-[#f5f5f7] p-3"><span className="text-sm">{component}</span><select value={test?.status || "pending"} onChange={(e) => updateTest(component, e.target.value)} className="rounded border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:border-[#0071e3]"><option value="pending">Pendente</option><option value="passed">Aprovado</option><option value="failed">Reprovado</option></select></div>)})}</div></div>)}{error && <div className="rounded-lg bg-red-50 p-3 flex gap-2"><AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5"/><p className="text-sm text-red-700">{error}</p></div>}<div className="flex gap-2"><button onClick={markAsFactoryTested} disabled={!allTestsPassed || marking || device.provisioning_status !== "provisioned"} className="flex-1 rounded-full bg-[#0071e3] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">{marking ? "Salvando..." : "Marcar como Testado"}</button><button onClick={markAsReadyForSale} disabled={marking || device.provisioning_status !== "factory_tested"} className="flex-1 rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">{marking ? "Salvando..." : "Pronto para Venda"}</button></div></div></Modal>;
}

function ProvisioningStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full ${active ? "bg-green-600" : "bg-gray-300"}`} />
      <span className={`text-xs ${active ? "text-[#1d1d1f] font-semibold" : "text-[#6e6e73]"}`}>{label}</span>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-3 backdrop-blur-sm">
      <button onClick={onClose} className="absolute inset-0 h-full w-full" aria-label="Fechar" />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-[#f5f5f7] p-2">
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

const styles = `
  .factory-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 0.75rem;
    font-size: 0.875rem;
    outline: none;
  }
  .factory-input:focus {
    border-color: #0071e3;
  }
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
}
