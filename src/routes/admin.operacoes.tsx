/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  MessageSquare,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { AdminSectionNav } from "@/components/koda/AdminSectionNav";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/operacoes")({
  head: () => ({
    meta: [{ title: "Operações — Koda Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: OperationsPage,
});

type Summary = {
  orders: { preorders: number; paid: number; awaiting_payment: number; attention: number };
  funnel: Record<string, number>;
  growth: Record<string, number>;
  growth_entries: Array<{
    id: string;
    program: string;
    email: string;
    full_name: string | null;
    organization: string | null;
    estimated_quantity: number | null;
    created_at: string;
  }>;
  capacity: Array<{
    product_id: string;
    slug: string;
    name: string;
    planned_capacity: number | null;
    reserved_units: number;
    production_started: boolean;
    estimated_ship_start_at: string | null;
    public_note: string | null;
  }>;
  operations: Array<{
    order_id: string;
    order_number: number;
    order_status: string;
    operation_status: string;
    shipping_label_status: string;
    attention_reason: string | null;
    updated_at: string;
  }>;
  evolution: { feedback: number; beta: number; research: number; pro_waitlist: number };
};

const db = supabase as any;
const opLabels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  queued: "Na fila",
  component_reserved: "Componentes reservados",
  in_production: "Em produção",
  quality_check: "Controle de qualidade",
  packaging: "Embalagem",
  ready_to_ship: "Pronto para envio",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  attention: "Requer atenção",
};

function OperationsPage() {
  const { user, loading: authLoading, isFactoryAdmin } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || !isFactoryAdmin) return;
    setLoading(true);
    const [summaryResult, questionResult, reviewResult, knowledgeResult] = await Promise.all([
      db.rpc("get_operations_summary"),
      db
        .from("product_questions")
        .select("id,question,answer,status,created_at,commerce_products(name)")
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("product_reviews")
        .select("id,rating,title,body,verified_purchase,status,created_at,commerce_products(name)")
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("support_knowledge_articles")
        .select("id,slug,title,category,body,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);
    if (!summaryResult.error) setSummary(summaryResult.data as Summary);
    if (!questionResult.error) setQuestions(questionResult.data ?? []);
    if (!reviewResult.error) setReviews(reviewResult.data ?? []);
    if (!knowledgeResult.error) setKnowledge(knowledgeResult.data ?? []);
    setLoading(false);
  }, [user, isFactoryAdmin]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function updateOperation(orderId: string, operationStatus: string) {
    const { error } = await db
      .from("order_operations")
      .update({ operation_status: operationStatus, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
    setMessage(error ? "Não foi possível atualizar a etapa." : "Etapa operacional atualizada.");
    if (!error) void load();
  }

  async function saveCapacity(item: Summary["capacity"][number], values: FormData) {
    const capacity = String(values.get("capacity") ?? "").trim();
    const { error } = await db.from("preorder_capacity_plans").upsert(
      {
        product_id: item.product_id,
        planned_capacity: capacity ? Number(capacity) : null,
        reserved_units: Number(values.get("reserved") ?? 0),
        production_started: values.get("started") === "on",
        estimated_ship_start_at: values.get("ship") || null,
        public_note: String(values.get("note") ?? "").trim() || null,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    );
    setMessage(
      error
        ? "Não foi possível salvar a capacidade."
        : "Planejamento salvo e refletido no status público.",
    );
    if (!error) void load();
  }

  async function moderate(
    table: "product_questions" | "product_reviews",
    id: string,
    status: "published" | "rejected",
    answer?: string,
  ) {
    const payload =
      table === "product_questions"
        ? {
            status,
            answer: answer || null,
            answered_by: user?.id,
            answered_at: answer ? new Date().toISOString() : null,
          }
        : { status };
    const { error } = await db.from(table).update(payload).eq("id", id);
    setMessage(error ? "Não foi possível concluir a moderação." : "Moderação concluída.");
    if (!error) void load();
  }

  async function createKnowledge(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    const slug = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const { error } = await db.from("support_knowledge_articles").insert({
      slug,
      title,
      category: form.get("category"),
      body: String(form.get("body") ?? "").trim(),
      status: "draft",
      created_by: user?.id,
    });
    setMessage(
      error
        ? "Não foi possível criar o artigo."
        : "Rascunho criado. Aprove-o somente após revisão humana.",
    );
    if (!error) void load();
  }

  async function setKnowledgeStatus(id: string, status: "approved" | "archived") {
    const { error } = await db
      .from("support_knowledge_articles")
      .update({
        status,
        approved_by: status === "approved" ? user?.id : null,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setMessage(
      error
        ? "Não foi possível atualizar a fonte."
        : status === "approved"
          ? "Fonte aprovada para o assistente."
          : "Fonte arquivada.",
    );
    if (!error) void load();
  }

  if (authLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">
        Validando acesso…
      </div>
    );
  if (!user || !isFactoryAdmin) return <Access />;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <AdminSectionNav active="operations" />
      {message && (
        <button
          onClick={() => setMessage("")}
          className="fixed right-5 top-24 z-[140] rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {message}
        </button>
      )}
      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <section className="rounded-[34px] bg-white p-7 sm:p-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#0071e3]">Etapas 5, 6 e 7</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
                Operações e evolução.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
                Conversão, capacidade real, fila de pedidos e sinais dos clientes em uma visão
                protegida.
              </p>
            </div>
            <button
              onClick={() => void load()}
              className="grid h-11 w-11 place-items-center rounded-full border border-black/10"
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {summary && (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                icon={Rocket}
                label="Pré-vendas"
                value={summary.orders.preorders}
                note={`${summary.orders.awaiting_payment} aguardando pagamento`}
              />
              <Metric
                icon={ClipboardCheck}
                label="Pedidos pagos"
                value={summary.orders.paid}
                note={`${summary.orders.attention} requerem atenção`}
              />
              <Metric
                icon={Users}
                label="Lista KodaBot Pro"
                value={summary.evolution.pro_waitlist}
                note={`${Object.values(summary.growth).reduce((a, b) => a + b, 0)} contatos de programas`}
              />
              <Metric
                icon={Activity}
                label="Sinais de evolução"
                value={summary.evolution.feedback + summary.evolution.research}
                note={`${summary.evolution.beta} no programa beta`}
              />
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-2">
              <Panel
                title="Capacidade da pré-venda"
                text="Defina limites somente quando a produção confirmar os números."
              >
                <div className="space-y-3">
                  {summary.capacity.map((item) => (
                    <form
                      key={item.product_id}
                      action={(form) => void saveCapacity(item, form)}
                      className="rounded-2xl bg-[#f5f5f7] p-4"
                    >
                      <strong>{item.name}</strong>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Field
                          name="capacity"
                          label="Capacidade"
                          defaultValue={item.planned_capacity ?? ""}
                          placeholder="Não definida"
                        />
                        <Field
                          name="reserved"
                          label="Unidades reservadas"
                          defaultValue={item.reserved_units}
                        />
                        <Field
                          name="ship"
                          label="Início estimado dos envios"
                          type="date"
                          defaultValue={item.estimated_ship_start_at ?? ""}
                        />
                        <Field
                          name="note"
                          label="Nota pública"
                          defaultValue={item.public_note ?? ""}
                        />
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium">
                        <input
                          name="started"
                          type="checkbox"
                          defaultChecked={item.production_started}
                        />{" "}
                        Produção iniciada
                      </label>
                      <button className="mt-3 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white">
                        Salvar
                      </button>
                    </form>
                  ))}
                </div>
              </Panel>
              <Panel
                title="Funil dos últimos 30 dias"
                text="Métricas sem nome, e-mail, endereço, IP ou navegador bruto."
              >
                <div className="space-y-3">
                  {Object.entries(summary.funnel).length ? (
                    Object.entries(summary.funnel).map(([name, count]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm"
                      >
                        <span>{name.replaceAll("_", " ")}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  ) : (
                    <Empty text="Os eventos começam a aparecer conforme os novos fluxos forem usados." />
                  )}
                </div>
              </Panel>
            </section>

            <PanelWrap
              title="Base de conhecimento aprovada"
              text="O assistente usa somente artigos aprovados. Sem fonte aprovada, ele organiza o relato e encaminha para a equipe."
            >
              <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                <form
                  action={(form) => void createKnowledge(form)}
                  className="rounded-2xl bg-[#f5f5f7] p-4"
                >
                  <Field name="title" label="Título" minLength={3} required />
                  <label className="mt-3 block text-xs font-medium text-[#6e6e73]">
                    Categoria
                    <select
                      name="category"
                      className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                    >
                      <option value="produto">Produto</option>
                      <option value="reparo">Reparo</option>
                      <option value="garantia">Garantia</option>
                      <option value="conta">Conta</option>
                      <option value="kodaos">KODA OS</option>
                      <option value="pedido">Pedido</option>
                      <option value="seguranca">Segurança</option>
                      <option value="outro">Outro</option>
                    </select>
                  </label>
                  <label className="mt-3 block text-xs font-medium text-[#6e6e73]">
                    Conteúdo revisado
                    <textarea
                      name="body"
                      minLength={20}
                      required
                      className="mt-1 min-h-40 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#0071e3]"
                    />
                  </label>
                  <button className="mt-3 rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-semibold text-white">
                    Criar rascunho
                  </button>
                </form>
                <div className="space-y-3">
                  {knowledge.map((article) => (
                    <article key={article.id} className="rounded-2xl bg-[#f5f5f7] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-[#0071e3]">
                            {article.category} · {article.status}
                          </p>
                          <strong className="mt-1 block">{article.title}</strong>
                        </div>
                        <div className="flex gap-2">
                          {article.status !== "approved" && (
                            <button
                              onClick={() => void setKnowledgeStatus(article.id, "approved")}
                              className="rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Aprovar
                            </button>
                          )}
                          {article.status !== "archived" && (
                            <button
                              onClick={() => void setKnowledgeStatus(article.id, "archived")}
                              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
                            >
                              Arquivar
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[#6e6e73]">
                        {article.body}
                      </p>
                    </article>
                  ))}
                  {!knowledge.length && (
                    <Empty text="Nenhuma fonte cadastrada. O assistente continuará sem dar procedimentos." />
                  )}
                </div>
              </div>
            </PanelWrap>

            <PanelWrap
              title="Fila operacional"
              text="O envio por transportadora permanece aguardando configuração de um fornecedor real."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-xs text-[#86868b]">
                      <th className="py-3">Pedido</th>
                      <th>Status comercial</th>
                      <th>Operação</th>
                      <th>Etiqueta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.operations.map((item) => (
                      <tr key={item.order_id} className="border-b border-black/5">
                        <td className="py-4 font-semibold">#{item.order_number}</td>
                        <td>{item.order_status}</td>
                        <td>
                          <select
                            value={item.operation_status}
                            onChange={(e) => void updateOperation(item.order_id, e.target.value)}
                            className="rounded-xl border border-black/10 bg-white px-3 py-2"
                          >
                            {Object.entries(opLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {item.shipping_label_status === "not_requested"
                            ? "Fornecedor não configurado"
                            : item.shipping_label_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!summary.operations.length && <Empty text="Nenhum pedido na fila." />}
              </div>
            </PanelWrap>

            <section className="mt-4 grid gap-4 xl:grid-cols-2">
              <Panel
                title="Perguntas de produto"
                text="Respostas só aparecem na loja depois da aprovação."
              >
                <div className="space-y-3">
                  {questions.map((q) => (
                    <Question key={q.id} item={q} onModerate={moderate} />
                  ))}
                  {!questions.length && <Empty text="Nenhuma pergunta pendente." />}
                </div>
              </Panel>
              <Panel
                title="Avaliações"
                text="A compra verificada é calculada a partir de pedidos reais."
              >
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl bg-[#f5f5f7] p-4">
                      <div className="flex justify-between gap-3">
                        <strong>{r.title}</strong>
                        <span className="text-xs">
                          {r.rating}/5 {r.verified_purchase ? "· compra verificada" : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#6e6e73]">{r.body}</p>
                      {r.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => void moderate("product_reviews", r.id, "published")}
                            className="rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Publicar
                          </button>
                          <button
                            onClick={() => void moderate("product_reviews", r.id, "rejected")}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
                          >
                            Recusar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!reviews.length && <Empty text="Nenhuma avaliação enviada." />}
                </div>
              </Panel>
            </section>

            <PanelWrap
              title="Programas e contatos"
              text="Leads de Recondicionados, Educação e Empresas ficam somente no Admin."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.growth_entries.map((lead) => (
                  <div key={lead.id} className="rounded-2xl bg-[#f5f5f7] p-4">
                    <p className="text-xs font-semibold uppercase text-[#0071e3]">{lead.program}</p>
                    <strong className="mt-1 block">{lead.full_name || lead.email}</strong>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      {lead.organization || lead.email}
                      {lead.estimated_quantity ? ` · ${lead.estimated_quantity} unidades` : ""}
                    </p>
                  </div>
                ))}
                {!summary.growth_entries.length && <Empty text="Nenhum contato recebido." />}
              </div>
            </PanelWrap>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Access() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Nav />
      <main className="grid min-h-[650px] place-items-center px-5 text-center">
        <div>
          <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">Acesso restrito.</h1>
          <a
            href="/conta/entrar?next=%2Fadmin%2Foperacoes"
            className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Entrar
          </a>
        </div>
      </main>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6">
      <Icon className="h-6 w-6 text-[#0071e3]" />
      <p className="mt-8 text-xs font-semibold text-[#6e6e73]">{label}</p>
      <strong className="mt-1 block text-4xl tracking-[-.05em]">{value}</strong>
      <p className="mt-2 text-xs text-[#86868b]">{note}</p>
    </div>
  );
}
function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="rounded-[32px] bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-semibold tracking-[-.035em]">{title}</h2>
      <p className="mt-2 text-sm text-[#6e6e73]">{text}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
function PanelWrap(props: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <Panel {...props} />
    </div>
  );
}
function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="text-xs font-medium text-[#6e6e73]">
      {label}
      <input
        {...props}
        className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]"
      />
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-[#f5f5f7] p-5 text-sm text-[#6e6e73]">{text}</p>;
}
function Question({
  item,
  onModerate,
}: {
  item: any;
  onModerate: (
    table: "product_questions",
    id: string,
    status: "published" | "rejected",
    answer?: string,
  ) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(item.answer ?? "");
  return (
    <div className="rounded-2xl bg-[#f5f5f7] p-4">
      <strong className="text-sm">{item.question}</strong>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Resposta da Koda"
        className="mt-3 min-h-20 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none"
      />
      {item.status === "pending" && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => void onModerate("product_questions", item.id, "published", answer)}
            disabled={!answer.trim()}
            className="rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Responder e publicar
          </button>
          <button
            onClick={() => void onModerate("product_questions", item.id, "rejected")}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
          >
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}
