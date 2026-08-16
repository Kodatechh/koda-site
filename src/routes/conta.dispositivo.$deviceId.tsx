import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, Clock3, DownloadCloud, Gauge, History, MessageSquareText, RefreshCw, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Unplug, Wifi } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";

export const Route = createFileRoute("/conta/dispositivo/$deviceId")({
  head: () => ({ meta: [{ title: "Meu KodaBot — KodaCloud" }] }),
  component: DevicePage,
});

type Device = {
  id: string;
  serial_number: string;
  model: string;
  status: string;
  warranty_end: string | null;
  kodaos_version: string | null;
  activated_at: string | null;
};

type Health = {
  online: boolean;
  last_seen_at: string | null;
  wifi_status: string | null;
  wifi_signal: number | null;
  uptime_seconds: number | null;
  last_boot_reason: string | null;
  checks: Record<string, string>;
  last_diagnostic_at: string | null;
};

type DeviceEvent = { id: string; event_type: string; details: Record<string, unknown>; created_at: string };

type Preferences = { brightness?: number; volume?: number; time_format?: "12h" | "24h"; city?: string; automatic_updates?: boolean };

function DevicePage() {
  const { deviceId } = Route.useParams();
  const { user, loading } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [prefs, setPrefs] = useState<Preferences>({ brightness: 70, volume: 60, time_format: "24h", automatic_updates: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  async function load() {
    if (!user) return;
    const [deviceResult, healthResult, eventsResult, preferencesResult] = await Promise.all([
      supabase.from("devices").select("id,serial_number,model,status,warranty_end,kodaos_version,activated_at").eq("id", deviceId).maybeSingle(),
      supabase.from("device_health").select("online,last_seen_at,wifi_status,wifi_signal,uptime_seconds,last_boot_reason,checks,last_diagnostic_at").eq("device_id", deviceId).maybeSingle(),
      supabase.from("device_events").select("id,event_type,details,created_at").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(20),
      supabase.from("device_preferences").select("preferences").eq("device_id", deviceId).maybeSingle(),
    ]);
    if (!deviceResult.error) setDevice(deviceResult.data as Device | null);
    if (!healthResult.error) setHealth((healthResult.data as Health | null) ?? null);
    if (!eventsResult.error) setEvents((eventsResult.data ?? []) as DeviceEvent[]);
    if (!preferencesResult.error && preferencesResult.data?.preferences) setPrefs(preferencesResult.data.preferences as Preferences);
  }

  useEffect(() => { load(); }, [user, deviceId]);

  async function queueCommand(command: string, payload: Record<string, unknown> = {}) {
    if (!user || !device) return;
    setBusy(command); setMessage(null);
    const { error } = await supabase.from("device_commands").insert({ device_id: device.id, requested_by: user.id, command, payload });
    setBusy(null);
    setMessage(error ? error.message : "Comando enviado ao KodaBot. Ele será executado assim que estiver online.");
  }

  async function savePreferences(e: FormEvent) {
    e.preventDefault();
    if (!user || !device) return;
    setBusy("preferences"); setMessage(null);
    const { error } = await supabase.from("device_preferences").upsert({ device_id: device.id, owner_user_id: user.id, preferences: prefs, updated_at: new Date().toISOString() }, { onConflict: "device_id" });
    if (!error) await queueCommand("sync_preferences", prefs as Record<string, unknown>);
    else { setBusy(null); setMessage(error.message); }
  }

  async function sendFeedback(e: FormEvent) {
    e.preventDefault();
    if (!user || !device || !feedback.trim()) return;
    setBusy("feedback");
    const { error } = await supabase.from("device_feedback").insert({ device_id: device.id, owner_user_id: user.id, message: feedback.trim(), kodaos_version: device.kodaos_version });
    setBusy(null);
    setMessage(error ? error.message : "Feedback enviado. Obrigado por ajudar a melhorar o KodaBot.");
    if (!error) setFeedback("");
  }

  const warrantyActive = useMemo(() => device?.warranty_end ? new Date(`${device.warranty_end}T23:59:59`) >= new Date() : null, [device]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">Carregando KodaCloud…</div>;
  if (!user) return <main className="grid min-h-[650px] place-items-center px-5 text-center"><div><h1 className="text-4xl font-semibold">Entre para gerenciar seu KodaBot.</h1><a href="/conta/entrar" className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Entrar</a></div></main>;
  if (!device) return <main className="grid min-h-[650px] place-items-center px-5 text-center"><div><h1 className="text-4xl font-semibold">KodaBot não encontrado.</h1><a href="/conta" className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">Voltar para Minha Conta ›</a></div></main>;

  const modelName = productNames[device.model as ProductId] ?? device.model;

  return <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <a href="/conta" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]"><ArrowLeft className="h-3.5 w-3.5"/> Minha Conta</a>
      <section className="mt-4 rounded-[34px] bg-white p-7 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-semibold text-[#0071e3]">{modelName}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{device.serial_number}</h1><p className="mt-3 text-sm text-[#6e6e73]">KODA OS {device.kodaos_version ?? "—"}</p></div>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${health?.online ? "bg-green-50 text-green-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}><span className={`h-2 w-2 rounded-full ${health?.online ? "bg-green-500" : "bg-[#86868b]"}`}/>{health?.online ? "Online" : "Offline"}</div>
        </div>
        {message && <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">{message}</div>}
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Activity className="h-6 w-6"/>} label="Saúde" value={health?.last_diagnostic_at ? "Diagnóstico disponível" : "Pronto para verificar"} detail={health?.last_seen_at ? `Último contato ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(health.last_seen_at))}` : "Ainda sem telemetria"}/>
        <InfoCard icon={<Wifi className="h-6 w-6"/>} label="Conexão" value={health?.wifi_status ?? (health?.online ? "Conectado" : "Offline")} detail={health?.wifi_signal != null ? `Sinal ${health.wifi_signal}%` : ""}/>
        <InfoCard icon={<ShieldCheck className="h-6 w-6"/>} label="Garantia" value={warrantyActive === null ? "Sem data registrada" : warrantyActive ? "Cobertura ativa" : "Período encerrado"} detail={device.warranty_end ? `Até ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${device.warranty_end}T12:00:00`))}` : ""}/>
      </section>

      <section className="mt-4 rounded-[32px] bg-white p-7 sm:p-9">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#6e6e73]">Diagnóstico</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Saúde do KodaBot.</h2></div><Gauge className="h-8 w-8 text-[#0071e3]"/></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.keys(health?.checks ?? {}).length ? Object.entries(health?.checks ?? {}).map(([name, status]) => <div key={name} className="rounded-2xl bg-[#f5f5f7] p-4"><p className="text-xs font-semibold capitalize">{name.replaceAll("_", " ")}</p><p className={`mt-2 text-sm font-semibold ${status === "ok" ? "text-green-700" : status === "warning" ? "text-amber-700" : "text-[#6e6e73]"}`}>{status === "ok" ? "Tudo certo" : status === "warning" ? "Atenção" : status}</p></div>) : <p className="col-span-full text-sm text-[#6e6e73]">Execute um diagnóstico para verificar os componentes compatíveis com este modelo.</p>}</div>
        <button onClick={()=>queueCommand("run_diagnostic")} disabled={busy === "run_diagnostic"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === "run_diagnostic" ? "animate-spin" : ""}`}/> Executar diagnóstico</button>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={savePreferences} className="rounded-[32px] bg-white p-7 sm:p-9">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#6e6e73]">Personalização</p><h2 className="mt-1 text-2xl font-semibold">Configurações remotas.</h2></div><SlidersHorizontal className="h-7 w-7 text-[#0071e3]"/></div>
          <label className="mt-7 block text-xs font-semibold">Brilho · {prefs.brightness ?? 70}%<input type="range" min="10" max="100" value={prefs.brightness ?? 70} onChange={(e)=>setPrefs({...prefs, brightness:Number(e.target.value)})} className="mt-2 w-full"/></label>
          <label className="mt-5 block text-xs font-semibold">Volume · {prefs.volume ?? 60}%<input type="range" min="0" max="100" value={prefs.volume ?? 60} onChange={(e)=>setPrefs({...prefs, volume:Number(e.target.value)})} className="mt-2 w-full"/></label>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Formato da hora<select value={prefs.time_format ?? "24h"} onChange={(e)=>setPrefs({...prefs,time_format:e.target.value as "12h"|"24h"})} className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-sm"><option value="24h">24 horas</option><option value="12h">12 horas</option></select></label><label className="text-xs font-semibold">Cidade do clima<input value={prefs.city ?? ""} onChange={(e)=>setPrefs({...prefs,city:e.target.value})} placeholder="Rio de Janeiro" className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-sm"/></label></div>
          <label className="mt-5 flex items-center justify-between rounded-2xl bg-[#f5f5f7] p-4 text-sm"><span><strong className="block">Atualizações automáticas</strong><span className="text-xs text-[#6e6e73]">Instalar novas versões estáveis automaticamente.</span></span><input type="checkbox" checked={prefs.automatic_updates ?? true} onChange={(e)=>setPrefs({...prefs,automatic_updates:e.target.checked})}/></label>
          <button disabled={busy === "preferences"} className="mt-6 rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Salvar e sincronizar</button>
        </form>

        <div className="rounded-[32px] bg-white p-7 sm:p-9">
          <div><p className="text-sm font-semibold text-[#6e6e73]">Ações</p><h2 className="mt-1 text-2xl font-semibold">Controle do dispositivo.</h2></div>
          <div className="mt-6 grid gap-3"><ActionButton icon={<RotateCcw className="h-5 w-5"/>} title="Reiniciar KodaBot" text="Solicita uma reinicialização segura." onClick={()=>queueCommand("restart")}/><ActionButton icon={<DownloadCloud className="h-5 w-5"/>} title="Verificar atualizações" text="Pede ao KodaBot para procurar uma nova versão estável." onClick={()=>queueCommand("check_update")}/><ActionButton icon={<Settings2 className="h-5 w-5"/>} title="Restaurar preferências da conta" text="Reenvia as configurações salvas no KodaCloud." onClick={()=>queueCommand("sync_preferences", prefs as Record<string, unknown>)}/></div>
        </div>
      </section>

      <section className="mt-4 rounded-[32px] bg-white p-7 sm:p-9">
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#6e6e73]">Histórico</p><h2 className="mt-1 text-2xl font-semibold">Linha do tempo.</h2></div><History className="h-7 w-7 text-[#0071e3]"/></div>
        <div className="mt-6 divide-y divide-black/10">{events.length ? events.map((event)=><div key={event.id} className="flex gap-4 py-4"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#86868b]"/><div><p className="text-sm font-semibold">{eventLabel(event.event_type)}</p><p className="mt-1 text-xs text-[#86868b]">{new Intl.DateTimeFormat("pt-BR", { dateStyle:"medium", timeStyle:"short" }).format(new Date(event.created_at))}</p></div></div>) : <p className="py-6 text-sm text-[#6e6e73]">Nenhum evento registrado ainda.</p>}</div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={sendFeedback} className="rounded-[32px] bg-white p-7 sm:p-9"><MessageSquareText className="h-7 w-7 text-[#0071e3]"/><h2 className="mt-7 text-2xl font-semibold">Enviar feedback.</h2><p className="mt-2 text-sm text-[#6e6e73]">Modelo e versão do KODA OS serão associados ao relato para facilitar a análise.</p><textarea value={feedback} onChange={(e)=>setFeedback(e.target.value)} rows={4} placeholder="Conte o que aconteceu ou o que você gostaria de ver no KodaBot." className="mt-5 w-full rounded-2xl border border-black/10 p-4 text-sm outline-none focus:border-[#0071e3]"/><button className="mt-4 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white">Enviar feedback</button></form>
        <div className="rounded-[32px] bg-white p-7 sm:p-9"><Unplug className="h-7 w-7 text-[#ff3b30]"/><h2 className="mt-7 text-2xl font-semibold">Transferir propriedade.</h2><p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">Desvincula este KodaBot da sua Conta KodaCloud. O próximo proprietário ainda precisará ativá-lo fisicamente pelo primeiro setup.</p><a href="/suporte/contato" className="mt-5 inline-flex text-xs font-semibold text-[#0066cc]">Solicitar transferência com o suporte ›</a></div>
      </section>
    </main>
  </div>;
}

function InfoCard({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="rounded-[28px] bg-white p-6"><div className="text-[#0071e3]">{icon}</div><p className="mt-7 text-xs font-semibold text-[#86868b]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p>{detail&&<p className="mt-1 text-xs text-[#86868b]">{detail}</p>}</div>}
function ActionButton({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button onClick={onClick} className="flex items-start gap-4 rounded-2xl bg-[#f5f5f7] p-4 text-left transition-transform hover:-translate-y-0.5"><span className="mt-0.5 text-[#0071e3]">{icon}</span><span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-[#6e6e73]">{text}</span></span></button>}
function eventLabel(type:string){const labels:Record<string,string>={factory_registered:"Registrado na fábrica",activation_started:"Ativação iniciada",activated:"Ativado no KodaCloud",diagnostic_completed:"Diagnóstico concluído",update_installed:"KODA OS atualizado",repair_opened:"Reparo iniciado",repair_completed:"Reparo concluído",ownership_released:"Propriedade liberada"};return labels[type]??type.replaceAll("_"," ");}
