import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Cloud,
  Gauge,
  Headphones,
  LogOut,
  Package,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";

export const Route = createFileRoute("/conta/")({
  head: () => ({ meta: [{ title: "Minha Conta KodaCloud — Koda" }] }),
  component: Account,
});

type SupportCaseSummary = {
  id: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  created_at: string;
};
type DeviceSummary = {
  id: string;
  serial_number: string;
  model: string;
  status: "not_activated" | "activated" | "service" | "retired";
  purchase_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  kodaos_version: string | null;
  activated_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function Account() {
  const { user, loading, isFactoryAdmin, isSupportAgent, signOut } = useAuth();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [cases, setCases] = useState<SupportCaseSummary[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (!user) {
      setDevices([]);
      setCases([]);
      setProfileName("");
      return;
    }
    setLoadingDevices(true);
    Promise.all([
      supabase
        .from("devices")
        .select(
          "id,serial_number,model,status,purchase_date,warranty_start,warranty_end,kodaos_version,activated_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("support_cases")
        .select("id,category,subject,status,created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]).then(([devicesResult, profileResult, casesResult]) => {
      if (!devicesResult.error) setDevices((devicesResult.data ?? []) as DeviceSummary[]);
      if (!profileResult.error)
        setProfileName(profileResult.data?.full_name ?? user.user_metadata?.["full_name"] ?? "");
      if (!casesResult.error) setCases((casesResult.data ?? []) as SupportCaseSummary[]);
      setLoadingDevices(false);
    });
  }, [user]);

  const firstName = useMemo(
    () => profileName.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "",
    [profileName, user],
  );
  async function saveName() {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ full_name: profileName.trim() || null })
      .eq("user_id", user.id);
    setEditingName(false);
  }

  if (loading)
    return (
      <main className="grid min-h-[620px] place-items-center">
        <p className="text-sm text-[#6e6e73]">Carregando KodaCloud…</p>
      </main>
    );
  if (!user)
    return (
      <main className="mx-auto grid min-h-[680px] max-w-6xl place-items-center px-5 py-16">
        <div className="max-w-2xl text-center">
          <Cloud className="mx-auto h-12 w-12 text-[#0071e3]" />
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
            Seus KodaBots. Uma conta.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#6e6e73]">
            Entre na KodaCloud para ver dispositivos ativados, garantia, KODA OS e atalhos de
            suporte.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/conta/entrar"
              className="rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white"
            >
              Entrar
            </a>
            <a
              href="/conta/criar"
              className="rounded-full border border-black/15 bg-white px-7 py-3 text-sm font-semibold"
            >
              Criar conta
            </a>
          </div>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <section className="rounded-[32px] bg-white p-7 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0071e3]">Conta KodaCloud</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Olá{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-[#6e6e73]">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSupportAgent && (
              <a
                href="/suporte-interno"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f5f5f7] px-5 py-2.5 text-xs font-semibold"
              >
                <Headphones className="h-3.5 w-3.5" /> Koda Support
              </a>
            )}
            {isFactoryAdmin && (
              <a
                href="/fabrica"
                className="rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white"
              >
                Menu de Fábrica
              </a>
            )}
            <button
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-5 py-2.5 text-xs font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
        <div className="mt-8 border-t border-black/10 pt-6">
          {!editingName ? (
            <button
              onClick={() => setEditingName(true)}
              className="text-xs font-semibold text-[#0066cc] hover:underline"
            >
              Editar nome da conta
            </button>
          ) : (
            <div className="flex max-w-md gap-2">
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-black/15 px-3 text-sm outline-none focus:border-[#0071e3]"
              />
              <button
                onClick={saveName}
                className="rounded-full bg-[#0071e3] px-4 text-xs font-semibold text-white"
              >
                Salvar
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-[32px] bg-white p-7 sm:p-10">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#6e6e73]">Meu KodaBot</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Meus dispositivos.
            </h2>
          </div>
          <Package className="h-8 w-8 text-[#0071e3]" />
        </div>
        {loadingDevices ? (
          <p className="py-14 text-center text-sm text-[#6e6e73]">Carregando seus KodaBots…</p>
        ) : devices.length === 0 ? (
          <div className="mt-8 rounded-[26px] bg-[#f5f5f7] p-7 text-center sm:p-10">
            <Cloud className="mx-auto h-8 w-8 text-[#0071e3]" />
            <h3 className="mt-5 text-2xl font-semibold">Nenhum KodaBot ativado nesta conta.</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
              Quando um KodaBot novo for ativado durante o primeiro setup com esta Conta KodaCloud,
              ele aparecerá automaticamente aqui.
            </p>
            <a
              href="/suporte/configurar"
              className="mt-6 inline-flex text-sm font-semibold text-[#0066cc] hover:underline"
            >
              Como configurar ›
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {devices.map((device) => {
              const modelName = productNames[device.model as ProductId] ?? device.model;
              const warrantyActive = device.warranty_end
                ? new Date(`${device.warranty_end}T23:59:59`) >= new Date()
                : null;
              return (
                <article key={device.id} className="rounded-[26px] bg-[#f5f5f7] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">
                        {device.status === "activated" ? "Ativado" : device.status}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        {modelName}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-[#6e6e73]">
                        {device.serial_number}
                      </p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-[#34c759]" />
                  </div>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#6e6e73]">KODA OS</dt>
                      <dd className="font-medium">{device.kodaos_version ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#6e6e73]">Data de compra</dt>
                      <dd className="font-medium">{formatDate(device.purchase_date)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#6e6e73]">Garantia até</dt>
                      <dd className="font-medium">{formatDate(device.warranty_end)}</dd>
                    </div>
                    {warrantyActive !== null && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#6e6e73]">Cobertura</dt>
                        <dd
                          className={
                            warrantyActive
                              ? "font-semibold text-green-700"
                              : "font-semibold text-[#6e6e73]"
                          }
                        >
                          {warrantyActive ? "Dentro do período" : "Período expirado"}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-6 flex flex-wrap gap-4 border-t border-black/10 pt-5 text-xs font-semibold text-[#0066cc]">
                    <a
                      href={`/conta/dispositivo/${device.id}`}
                      className="inline-flex items-center gap-1"
                    >
                      <Gauge className="h-3.5 w-3.5" /> Gerenciar
                    </a>
                    <a
                      href={`/reparos/solicitar?device=${device.id}`}
                      className="inline-flex items-center gap-1"
                    >
                      <Wrench className="h-3.5 w-3.5" /> Reparo
                    </a>
                    <a href="/suporte/garantia" className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Garantia
                    </a>
                    <a href="/suporte/manuais" className="inline-flex items-center gap-1">
                      <Settings2 className="h-3.5 w-3.5" /> Manuais
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-[32px] bg-white p-7 sm:p-10">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#6e6e73]">Suporte</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Atendimentos recentes.
            </h2>
          </div>
          <a
            href="/suporte/contato"
            className="text-xs font-semibold text-[#0066cc] hover:underline"
          >
            Novo atendimento
          </a>
        </div>
        {cases.length ? (
          <div className="mt-7 divide-y divide-black/10 border-y border-black/10">
            {cases.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#86868b]">
                    {item.category}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{item.subject}</p>
                  <p className="mt-1 text-xs text-[#86868b]">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                      new Date(item.created_at),
                    )}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#6e6e73]">
                  {item.status === "open"
                    ? "Aberto"
                    : item.status === "in_progress"
                      ? "Em atendimento"
                      : item.status === "waiting_customer"
                        ? "Aguardando você"
                        : item.status === "resolved"
                          ? "Resolvido"
                          : "Fechado"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl bg-[#f5f5f7] p-6 text-sm text-[#6e6e73]">
            Nenhum atendimento registrado nesta conta.
          </div>
        )}
      </section>

      <nav
        aria-label="Áreas da Conta Koda"
        className="mt-4 grid gap-3 rounded-[30px] bg-white p-5 sm:grid-cols-4"
      >
        <a href="/conta/pedidos" className="rounded-2xl bg-[#f5f5f7] p-4 text-sm font-semibold">
          Pedidos
        </a>
        <a href="/conta/reparos" className="rounded-2xl bg-[#f5f5f7] p-4 text-sm font-semibold">
          Reparos
        </a>
        <a
          href="/conta/notificacoes"
          className="rounded-2xl bg-[#f5f5f7] p-4 text-sm font-semibold"
        >
          Notificações
        </a>
        <a
          href="/conta/configuracoes"
          className="rounded-2xl bg-[#f5f5f7] p-4 text-sm font-semibold"
        >
          Configurações
        </a>
      </nav>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <a
          href="/suporte/garantia"
          className="rounded-[30px] bg-white p-7 transition-transform hover:-translate-y-1"
        >
          <ShieldCheck className="h-7 w-7 text-[#0071e3]" />
          <h2 className="mt-10 text-2xl font-semibold">Garantia e cobertura</h2>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Consulte a cobertura vinculada ao seu dispositivo.
          </p>
        </a>
        <a
          href="/kodaos/updates"
          className="rounded-[30px] bg-white p-7 transition-transform hover:-translate-y-1"
        >
          <CalendarDays className="h-7 w-7 text-[#0071e3]" />
          <h2 className="mt-10 text-2xl font-semibold">Atualizações do KODA OS</h2>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Veja versões, novidades e melhorias do sistema.
          </p>
        </a>
      </section>
    </main>
  );
}
