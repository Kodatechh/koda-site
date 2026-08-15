import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, Factory, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, X } from "lucide-react";

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
  manufactured_at: string | null;
  purchase_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  kodaos_version: string | null;
  activated_at: string | null;
  owner_email_masked: string | null;
  notes: string | null;
  created_at: string;
};

function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function FactoryPage() {
  const { user, loading, isFactoryAdmin } = useAuth();
  const [devices, setDevices] = useState<FactoryDevice[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FactoryDevice | null>(null);
  const [lastCredential, setLastCredential] = useState<{ serial: string; secret: string } | null>(null);

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
    return devices.filter((d) => `${d.serial_number} ${d.model} ${d.status} ${d.owner_email_masked ?? ""}`.toLowerCase().includes(q));
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
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#5b9cff]">Koda · acesso administrativo</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Menu de Fábrica</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">Cadastre cada KodaBot antes da venda. O aparelho nasce no KodaCloud como <strong className="text-white/75">Não ativado</strong> e ganha um proprietário somente no primeiro setup.</p></div><button onClick={()=>setFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"><Plus className="h-4 w-4"/> Adicionar KodaBot</button></div>
        </section>

        {lastCredential && (
          <section className="mt-4 rounded-[28px] border border-amber-300 bg-amber-50 p-6">
            <div className="flex items-start gap-4"><KeyRound className="mt-1 h-6 w-6 shrink-0 text-amber-700"/><div className="min-w-0 flex-1"><p className="font-semibold">Credencial de ativação criada para {lastCredential.serial}</p><p className="mt-2 text-sm leading-relaxed text-amber-900/70">Ela é exibida apenas nesta sessão. O banco guarda somente o hash. Provisione essa credencial no dispositivo/firmware durante a fabricação para que o KodaBot possa provar sua identidade no primeiro setup.</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-mono text-xs"><span className="min-w-0 flex-1 break-all">{lastCredential.secret}</span><button onClick={()=>navigator.clipboard.writeText(lastCredential.secret)} className="p-2 text-amber-700"><Copy className="h-4 w-4"/></button></div></div><button onClick={()=>setLastCredential(null)}><X className="h-4 w-4"/></button></div>
          </section>
        )}

        <section className="mt-4 rounded-[32px] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Dispositivos cadastrados</h2><p className="mt-1 text-sm text-[#6e6e73]">{devices.length} registro{devices.length === 1 ? "" : "s"} no KodaCloud</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar serial" className="h-10 rounded-full border border-black/10 bg-[#f5f5f7] pl-9 pr-4 text-sm outline-none focus:border-[#0071e3]"/></label><button onClick={loadDevices} className="grid h-10 w-10 place-items-center rounded-full border border-black/10" aria-label="Atualizar"><RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`}/></button></div></div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-black/10 text-[11px] uppercase tracking-[0.12em] text-[#86868b]"><th className="py-3 pr-5">Serial</th><th className="py-3 pr-5">Modelo</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Compra</th><th className="py-3 pr-5">Garantia</th><th className="py-3 pr-5">KODA OS</th><th className="py-3 pr-5">Proprietário</th><th className="py-3">Ações</th></tr></thead>
              <tbody>{filtered.map((device)=><tr key={device.id} className="border-b border-black/10"><td className="py-4 pr-5 font-mono text-xs font-semibold">{device.serial_number}</td><td className="py-4 pr-5 font-medium">{productNames[device.model as ProductId] ?? device.model}</td><td className="py-4 pr-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${device.status === "activated" ? "bg-green-50 text-green-700" : device.status === "not_activated" ? "bg-amber-50 text-amber-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>{device.status === "activated" ? "Ativado" : device.status === "not_activated" ? "Não ativado" : device.status}</span></td><td className="py-4 pr-5 text-[#6e6e73]">{device.purchase_date ?? "—"}</td><td className="py-4 pr-5 text-[#6e6e73]">{device.warranty_end ?? "—"}</td><td className="py-4 pr-5">{device.kodaos_version ?? "—"}</td><td className="py-4 pr-5 text-[#6e6e73]">{device.owner_email_masked ?? "—"}</td><td className="py-4"><button onClick={()=>setEditing(device)} className="inline-flex items-center gap-1 font-semibold text-[#0066cc] hover:underline"><Pencil className="h-3.5 w-3.5"/> Editar</button></td></tr>)}</tbody>
            </table>
            {!filtered.length && <p className="py-12 text-center text-sm text-[#6e6e73]">Nenhum dispositivo encontrado.</p>}
          </div>
        </section>
      </main>

      <SiteFooter />
      {formOpen && <RegisterDeviceModal onClose={()=>setFormOpen(false)} onSuccess={(serial,secret)=>{setFormOpen(false);setLastCredential({serial,secret});loadDevices();}} />}
      {editing && <EditDeviceModal device={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);loadDevices();}} />}
    </div>
  );
}

function RegisterDeviceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (serial:string,secret:string)=>void }) {
  const [serial,setSerial]=useState(""); const [model,setModel]=useState<ProductId>("kodabot-i"); const [manufacturedAt,setManufacturedAt]=useState(""); const [purchaseDate,setPurchaseDate]=useState(""); const [warrantyStart,setWarrantyStart]=useState(""); const [warrantyEnd,setWarrantyEnd]=useState(""); const [version,setVersion]=useState("0.4"); const [notes,setNotes]=useState(""); const [secret,setSecret]=useState(""); const [error,setError]=useState<string|null>(null); const [saving,setSaving]=useState(false);
  useEffect(()=>setSecret(generateSecret()),[]);
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);setError(null);const{error:rpcError}=await supabase.rpc("factory_register_device",{_serial_number:serial,_model:model,_activation_secret:secret,_manufactured_at:manufacturedAt||null,_purchase_date:purchaseDate||null,_warranty_start:warrantyStart||null,_warranty_end:warrantyEnd||null,_kodaos_version:version||null,_notes:notes||null});setSaving(false);if(rpcError){setError(rpcError.message);return;}onSuccess(serial.trim().toUpperCase(),secret);}
  return <Modal title="Adicionar KodaBot" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Número de série"><input required value={serial} onChange={(e)=>setSerial(e.target.value.toUpperCase())} placeholder="KBI-000001" className="factory-input font-mono"/></Field><Field label="Modelo"><select value={model} onChange={(e)=>setModel(e.target.value as ProductId)} className="factory-input"><option value="kodabot-i">KodaBot I</option><option value="kodabot-i-pro">KodaBot I Pro</option></select></Field><Field label="Data de fabricação"><input type="date" value={manufacturedAt} onChange={(e)=>setManufacturedAt(e.target.value)} className="factory-input"/></Field><Field label="Data de compra"><input type="date" value={purchaseDate} onChange={(e)=>setPurchaseDate(e.target.value)} className="factory-input"/></Field><Field label="Início da garantia"><input type="date" value={warrantyStart} onChange={(e)=>setWarrantyStart(e.target.value)} className="factory-input"/></Field><Field label="Expiração da garantia"><input type="date" value={warrantyEnd} onChange={(e)=>setWarrantyEnd(e.target.value)} className="factory-input"/></Field><Field label="Versão inicial"><input value={version} onChange={(e)=>setVersion(e.target.value)} className="factory-input"/></Field></div><Field label="Notas internas"><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} className="factory-input h-auto py-3"/></Field><div className="rounded-2xl bg-[#f5f5f7] p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Credencial de ativação</p><button type="button" onClick={()=>setSecret(generateSecret())} className="text-xs font-semibold text-[#0066cc]">Gerar outra</button></div><p className="mt-2 break-all font-mono text-xs text-[#6e6e73]">{secret}</p><p className="mt-2 text-[11px] leading-relaxed text-[#86868b]">O status inicial será Não ativado. A credencial será armazenada somente como hash.</p></div>{error&&<p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<button disabled={saving||!secret} className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white disabled:opacity-50">{saving?"Cadastrando…":"Cadastrar KodaBot"}</button></form></Modal>;
}

function EditDeviceModal({device,onClose,onSaved}:{device:FactoryDevice;onClose:()=>void;onSaved:()=>void}){const[purchase,setPurchase]=useState(device.purchase_date??"");const[start,setStart]=useState(device.warranty_start??"");const[end,setEnd]=useState(device.warranty_end??"");const[version,setVersion]=useState(device.kodaos_version??"");const[notes,setNotes]=useState(device.notes??"");const[error,setError]=useState<string|null>(null);async function save(e:FormEvent){e.preventDefault();setError(null);const{error:updateError}=await supabase.from("devices").update({purchase_date:purchase||null,warranty_start:start||null,warranty_end:end||null,kodaos_version:version||null,notes:notes||null}).eq("id",device.id);if(updateError){setError(updateError.message);return;}onSaved();}return <Modal title={`Editar ${device.serial_number}`} onClose={onClose}><form onSubmit={save} className="space-y-4"><div className="rounded-xl bg-[#f5f5f7] p-4 text-sm"><p><strong>{productNames[device.model as ProductId] ?? device.model}</strong></p><p className="mt-1 text-xs text-[#6e6e73]">Status: {device.status === "activated"?"Ativado":"Não ativado"} · Proprietário: {device.owner_email_masked??"—"}</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Data de compra"><input type="date" value={purchase} onChange={(e)=>setPurchase(e.target.value)} className="factory-input"/></Field><Field label="Início da garantia"><input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="factory-input"/></Field><Field label="Fim da garantia"><input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="factory-input"/></Field><Field label="KODA OS"><input value={version} onChange={(e)=>setVersion(e.target.value)} className="factory-input"/></Field></div><Field label="Notas internas"><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} className="factory-input h-auto py-3"/></Field>{error&&<p className="text-xs text-red-600">{error}</p>}<button className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white">Salvar alterações</button></form></Modal>}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-3 backdrop-blur-sm"><button onClick={onClose} className="absolute inset-0 h-full w-full" aria-label="Fechar"/><div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2><button onClick={onClose} className="rounded-full bg-[#f5f5f7] p-2"><X className="h-4 w-4"/></button></div>{children}</div></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-xs font-medium text-[#6e6e73]">{label}<div className="mt-1.5">{children}</div></label>}
