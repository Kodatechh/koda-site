/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, Wrench } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { productNames, type ProductId } from "@/lib/koda-data";

export const Route = createFileRoute("/reparos/solicitar")({
  head: () => ({ meta: [{ title: "Solicitar reparo — Koda" }] }),
  component: RepairRequestPage,
});

type Device = { id: string; serial_number: string; model: string };
type Service = { id: string; model: string; name: string; category: string; price_cents: number };
const categories = [
  ["display", "Tela"],
  ["touch", "Touch"],
  ["controller", "Placa/controlador"],
  ["sensor", "Sensor"],
  ["audio", "Áudio"],
  ["shell", "Carcaça"],
  ["power", "Alimentação"],
  ["software", "Software/KODA OS"],
  ["other", "Outro"],
] as const;
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function RepairRequestPage() {
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [devices, setDevices] = useState<Device[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [model, setModel] = useState("kodabot-i");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [shippingMethod, setShippingMethod] = useState("shipping");
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      db
        .from("devices")
        .select("id,serial_number,model")
        .eq("owner_user_id", user.id)
        .neq("status", "retired"),
      db
        .from("repair_services")
        .select("id,model,name,category,price_cents")
        .eq("active", true)
        .order("price_cents"),
    ]).then(([d, s]: any[]) => {
      const ownedDevices = d.data ?? [];
      setDevices(ownedDevices);
      setServices(s.data ?? []);
      const requestedDevice = new URLSearchParams(window.location.search).get("device");
      if (requestedDevice && ownedDevices.some((device: Device) => device.id === requestedDevice)) {
        setDeviceId(requestedDevice);
      }
    });
  }, [user]);
  const selectedDevice = devices.find((d) => d.id === deviceId);
  useEffect(() => {
    if (selectedDevice) setModel(selectedDevice.model);
  }, [selectedDevice]);
  const available = useMemo(() => services.filter((s) => s.model === model), [services, model]);
  const selectedService = available.find((s) => s.id === serviceId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || sending) return;
    setError(null);
    if (description.trim().length < 10) {
      setError("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }
    if (shippingMethod === "shipping" && address.trim().length < 10) {
      setError("Informe o endereço para envio.");
      return;
    }
    setSending(true);
    const { data: request, error: insertError } = await db.rpc("create_repair_request", {
      _device_id: deviceId || null,
      _model: model,
      _category: category,
      _description: description.trim(),
      _requested_service_id: serviceId || null,
      _shipping_method: shippingMethod,
      _shipping_address: shippingMethod === "shipping" ? { formatted: address.trim() } : null,
    });
    if (insertError || !request) {
      setError(insertError?.message ?? "Não foi possível criar a solicitação.");
      setSending(false);
      return;
    }
    for (const file of files) {
      const path = `${request.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("repair-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!uploadError)
        await db
          .from("repair_attachments")
          .insert({ repair_request_id: request.id, storage_path: path, mime_type: file.type });
    }
    setProtocol(request.protocol);
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-20">
        {authLoading ? (
          <p className="text-center text-sm text-[#6e6e73]">Carregando…</p>
        ) : !user ? (
          <Login />
        ) : protocol ? (
          <div className="rounded-[34px] bg-white p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#34c759]" />
            <h1 className="mt-5 text-4xl font-semibold">Reparo solicitado.</h1>
            <p className="mt-3 text-[#6e6e73]">
              Protocolo <strong>{protocol}</strong>. Você acompanhará cada etapa na Conta Koda.
            </p>
            <a
              href="/conta/reparos"
              className="mt-7 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Acompanhar reparo
            </a>
          </div>
        ) : (
          <>
            <header className="mb-10">
              <Wrench className="h-9 w-9 text-[#0071e3]" />
              <p className="mt-5 text-sm font-semibold text-[#0071e3]">Assistência Koda</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">
                Solicitar reparo.
              </h1>
              <p className="mt-5 max-w-2xl text-[#6e6e73]">
                Conte o que aconteceu. A cobertura e o valor final serão confirmados após
                diagnóstico.
              </p>
            </header>
            <form onSubmit={submit} className="space-y-5 rounded-[34px] bg-white p-7 sm:p-10">
              <Field title="1. Dispositivo">
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="contact-input"
                >
                  <option value="">Produto sem serial vinculado</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {productNames[d.model as ProductId] ?? d.model} · {d.serial_number}
                    </option>
                  ))}
                </select>
                {!deviceId && (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="contact-input mt-3"
                  >
                    <option value="kodabot-i">KodaBot I</option>
                    <option value="kodabot-i-pro">KodaBot I Pro</option>
                  </select>
                )}
              </Field>
              <Field title="2. Problema">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="contact-input"
                >
                  {categories.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="contact-input mt-3 h-auto py-3"
                  placeholder="Descreva sintomas, quando começou e o que você já tentou."
                />
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="mt-3 block w-full text-sm"
                />
              </Field>
              <Field title="3. Serviço">
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="contact-input"
                >
                  <option value="">Não sei / Quero diagnóstico</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {money(s.price_cents)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field title="4. KodaCare">
                <p className="text-sm text-[#6e6e73]">
                  Se houver cobertura ativa, ela será vinculada automaticamente. A elegibilidade e
                  eventual franquia só são confirmadas no diagnóstico.
                </p>
              </Field>
              <Field title="5. Logística">
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="contact-input"
                >
                  <option value="shipping">Envio pelo cliente</option>
                  <option value="local">Entrega local, quando combinada com a Koda</option>
                </select>
                {shippingMethod === "shipping" && (
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="contact-input mt-3 h-auto py-3"
                    placeholder="Endereço completo para instruções de envio"
                  />
                )}
              </Field>
              <Field title="6. Confirmação">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Modelo:</strong> {productNames[model as ProductId] ?? model}
                  </p>
                  <p>
                    <strong>Serviço:</strong> {selectedService?.name ?? "Diagnóstico"}
                  </p>
                  <p>
                    <strong>Estimativa inicial:</strong> {money(selectedService?.price_cents ?? 0)}
                  </p>
                </div>
              </Field>
              {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
              <button
                disabled={sending}
                className="flex h-12 items-center gap-2 rounded-full bg-[#0071e3] px-7 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {sending ? "Solicitando…" : "Solicitar reparo"}
              </button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/10 pb-6 last:border-0">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Login() {
  return (
    <div className="rounded-[34px] bg-white p-10 text-center">
      <h1 className="text-4xl font-semibold">Entre para solicitar reparo.</h1>
      <a
        href="/conta/entrar?next=/reparos/solicitar"
        className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
      >
        Entrar na Conta Koda
      </a>
    </div>
  );
}
