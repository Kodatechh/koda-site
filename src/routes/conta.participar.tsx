/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, FlaskConical, Lightbulb, MessageSquare, ShieldCheck, Star } from "lucide-react";

import { AccountSidebar } from "@/components/koda/AccountSidebar";
import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/participar")({
  head: () => ({ meta: [{ title: "Ajude a evoluir — Conta Koda" }] }),
  component: ParticipatePage,
});

const db = supabase as any;
type Device = {
  id: string;
  serial_number: string;
  model: string;
  display_name: string | null;
  kodaos_version: string | null;
};
type Product = { id: string; name: string };

function ParticipatePage() {
  const { user, loading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      db
        .from("devices")
        .select("id,serial_number,model,display_name,kodaos_version")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false }),
      db.from("commerce_products").select("id,name").eq("active", true).order("sort_order"),
    ]).then(([deviceResult, productResult]) => {
      if (!deviceResult.error) setDevices(deviceResult.data ?? []);
      if (!productResult.error) setProducts(productResult.data ?? []);
    });
  }, [user]);

  async function submitFeedback(form: FormData) {
    if (!user) return;
    setBusy(true);
    const deviceId = String(form.get("device") ?? "") || null;
    const selected = devices.find((device) => device.id === deviceId);
    const { error } = await db.from("device_feedback").insert({
      owner_user_id: user.id,
      device_id: deviceId,
      category: form.get("category"),
      message: String(form.get("message") ?? "").trim(),
      rating: Number(form.get("rating")),
      kodaos_version: selected?.kodaos_version ?? null,
    });
    setMessage(
      error
        ? "Não foi possível enviar seu feedback."
        : "Obrigado. Seu feedback entrou na fila de evolução da Koda.",
    );
    setBusy(false);
  }

  async function joinBeta(form: FormData) {
    if (!user) return;
    setBusy(true);
    const deviceId = String(form.get("device") ?? "") || null;
    const { error } = await db.from("koda_beta_enrollments").upsert(
      {
        user_id: user.id,
        device_id: deviceId,
        status: "interested",
        accepted_risk_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    setMessage(
      error
        ? "Não foi possível registrar o interesse."
        : "Interesse registrado. Isso não instala versões beta automaticamente.",
    );
    setBusy(false);
  }

  async function setHealthConsent(deviceId: string, consented: boolean) {
    if (!user) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await db.from("device_health_consents").upsert(
      {
        device_id: deviceId,
        user_id: user.id,
        consented,
        consented_at: consented ? now : null,
        revoked_at: consented ? null : now,
        updated_at: now,
      },
      { onConflict: "device_id" },
    );
    setMessage(
      error
        ? "Não foi possível salvar a escolha."
        : consented
          ? "Compartilhamento de saúde autorizado."
          : "Autorização revogada.",
    );
    setBusy(false);
  }

  async function submitResearch(form: FormData) {
    if (!user) return;
    setBusy(true);
    const { error } = await db.from("product_research_votes").insert({
      user_id: user.id,
      topic: form.get("topic"),
      choice: String(form.get("choice") ?? "").trim(),
      details: String(form.get("details") ?? "").trim() || null,
    });
    setMessage(
      error
        ? "Não foi possível enviar a ideia."
        : "Ideia registrada para o planejamento de produto.",
    );
    setBusy(false);
  }

  async function submitReview(form: FormData) {
    setBusy(true);
    const { error } = await db.rpc("submit_verified_product_review", {
      _product_id: form.get("product"),
      _rating: Number(form.get("rating")),
      _title: String(form.get("title") ?? ""),
      _body: String(form.get("body") ?? ""),
    });
    setMessage(
      error
        ? "Não foi possível enviar a avaliação. Confira os campos."
        : "Avaliação recebida e enviada para moderação.",
    );
    setBusy(false);
  }

  if (loading)
    return (
      <main className="grid min-h-[650px] place-items-center text-sm text-[#6e6e73]">
        Carregando Conta Koda…
      </main>
    );
  if (!user)
    return (
      <main className="grid min-h-[650px] place-items-center px-5 text-center">
        <div>
          <FlaskConical className="mx-auto h-10 w-10 text-[#0071e3]" />
          <h1 className="mt-5 text-4xl font-semibold">Entre para participar.</h1>
          <a
            href="/conta/entrar?next=%2Fconta%2Fparticipar"
            className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Entrar
          </a>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      {message && (
        <button
          onClick={() => setMessage("")}
          className="fixed right-5 top-24 z-[140] rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {message}
        </button>
      )}
      <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <AccountSidebar />
        <div className="min-w-0">
          <header className="rounded-[32px] bg-white p-7 sm:p-10">
            <p className="text-sm font-semibold text-[#0071e3]">Koda · evolução contínua</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
              Ajude a construir o próximo passo.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
              Feedback real orienta o KODA OS, o suporte e os próximos acessórios. Você escolhe se
              quer participar do beta e compartilhar a saúde do dispositivo.
            </p>
          </header>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card
              icon={MessageSquare}
              title="Feedback e falhas"
              text="Conte o que funcionou, o que falhou e o que deve melhorar."
            >
              <form action={(form) => void submitFeedback(form)} className="space-y-3">
                <Select name="device" label="KodaBot (opcional)">
                  <option value="">Feedback geral</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name || d.serial_number}
                    </option>
                  ))}
                </Select>
                <Select name="category" label="Assunto">
                  <option value="general">Experiência geral</option>
                  <option value="failure">Falha ou erro</option>
                  <option value="kodaos">KODA OS</option>
                  <option value="accessory">Acessórios</option>
                  <option value="support">Suporte</option>
                </Select>
                <Select name="rating" label="Satisfação">
                  <option value="5">5 — Muito satisfeito</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1 — Insatisfeito</option>
                </Select>
                <Textarea name="message" label="Mensagem" minLength={10} required />
                <Submit busy={busy}>Enviar feedback</Submit>
              </form>
            </Card>
            <Card
              icon={FlaskConical}
              title="Programa beta"
              text="Registre interesse. Convites e versões dependem de compatibilidade e liberação da Koda."
            >
              <form action={(form) => void joinBeta(form)} className="space-y-3">
                <Select name="device" label="KodaBot">
                  <option value="">Programa geral</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name || d.serial_number}
                    </option>
                  ))}
                </Select>
                <div className="rounded-2xl bg-[#f5f5f7] p-4 text-xs leading-relaxed text-[#6e6e73]">
                  Versões beta podem conter falhas. Entrar nesta lista não muda o canal do seu
                  KodaBot nem instala software sem confirmação.
                </div>
                <Submit busy={busy}>Registrar interesse</Submit>
              </form>
            </Card>
            <Card
              icon={Activity}
              title="Saúde do KodaBot"
              text="O compartilhamento é opcional, por dispositivo e pode ser revogado."
            >
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="rounded-2xl bg-[#f5f5f7] p-4">
                    <strong className="text-sm">
                      {device.display_name || device.serial_number}
                    </strong>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      Permite usar diagnósticos técnicos para prevenção e suporte. Não inclui
                      conteúdo pessoal.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => void setHealthConsent(device.id, true)}
                        className="rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Autorizar
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void setHealthConsent(device.id, false)}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
                      >
                        Revogar
                      </button>
                    </div>
                  </div>
                ))}
                {!devices.length && (
                  <p className="rounded-2xl bg-[#f5f5f7] p-5 text-sm text-[#6e6e73]">
                    Ative um KodaBot para controlar o compartilhamento de saúde.
                  </p>
                )}
              </div>
            </Card>
            <Card
              icon={Lightbulb}
              title="Pesquisa de produto"
              text="Ajude a priorizar acessórios, recursos e o futuro KodaBot Pro."
            >
              <form action={(form) => void submitResearch(form)} className="space-y-3">
                <Select name="topic" label="Tema">
                  <option value="accessory">Novo acessório</option>
                  <option value="feature">Recurso do KodaBot</option>
                  <option value="kodaos">KODA OS</option>
                  <option value="kodabot_pro">KodaBot Pro</option>
                </Select>
                <Input
                  name="choice"
                  label="O que você gostaria de ver?"
                  minLength={2}
                  maxLength={120}
                  required
                />
                <Textarea name="details" label="Por quê? (opcional)" />
                <Submit busy={busy}>Enviar ideia</Submit>
              </form>
            </Card>
          </div>
          <div className="mt-4">
            <Card
              icon={Star}
              title="Avalie uma compra"
              text="A marca de compra verificada vem de um pedido pago real; nunca é adicionada manualmente."
            >
              <form
                action={(form) => void submitReview(form)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Select name="product" label="Produto">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Select name="rating" label="Nota">
                  <option value="5">5 — Excelente</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1 — Ruim</option>
                </Select>
                <Input name="title" label="Título" minLength={2} maxLength={100} required />
                <div className="sm:col-span-2">
                  <Textarea name="body" label="Sua experiência" minLength={10} required />
                </div>
                <div>
                  <Submit busy={busy}>Enviar avaliação</Submit>
                </div>
              </form>
            </Card>
          </div>
          <section className="mt-4 rounded-[32px] bg-[#1d1d1f] p-7 text-white sm:p-10">
            <ShieldCheck className="h-7 w-7 text-[#64d2ff]" />
            <h2 className="mt-7 text-3xl font-semibold tracking-[-.04em]">
              Você mantém o controle.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              Dados de saúde só serão usados quando houver consentimento. Feedback e pesquisa não
              ativam recursos, não prometem lançamento e não substituem um chamado de suporte.
            </p>
            <a href="/suporte" className="mt-6 inline-flex text-sm font-semibold text-[#64d2ff]">
              Preciso de suporte ›
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof MessageSquare;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] bg-white p-7 sm:p-8">
      <Icon className="h-7 w-7 text-[#0071e3]" />
      <h2 className="mt-8 text-2xl font-semibold tracking-[-.04em]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{text}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-semibold text-[#6e6e73]">
      {label}
      <input
        {...props}
        className="mt-1.5 h-11 w-full rounded-xl border border-black/10 px-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]"
      />
    </label>
  );
}
function Textarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-xs font-semibold text-[#6e6e73]">
      {label}
      <textarea
        {...props}
        className="mt-1.5 min-h-24 w-full rounded-xl border border-black/10 p-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]"
      />
    </label>
  );
}
function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-[#6e6e73]">
      {label}
      <select
        {...props}
        className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]"
      >
        {children}
      </select>
    </label>
  );
}
function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      disabled={busy}
      className="rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}
