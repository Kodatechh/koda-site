import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/atendimentos/$caseId")({
  head: () => ({ meta: [{ title: "Atendimento — Conta Koda" }] }),
  component: CustomerCase,
});

type CaseData = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  created_at: string;
};
type Note = { id: string; body: string; author_user_id: string | null; created_at: string };

function CustomerCase() {
  const { caseId } = Route.useParams();
  const { user, loading } = useAuth();
  const [supportCase, setSupportCase] = useState<CaseData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [caseResult, notesResult] = await Promise.all([
      supabase
        .from("support_cases")
        .select("id,subject,message,category,status,created_at")
        .eq("id", caseId)
        .eq("owner_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("support_case_notes")
        .select("id,body,author_user_id,created_at")
        .eq("case_id", caseId)
        .eq("visibility", "customer")
        .order("created_at"),
    ]);
    setSupportCase(caseResult.data as CaseData | null);
    setNotes((notesResult.data ?? []) as Note[]);
  }, [caseId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply() {
    if (!user || !supportCase || !reply.trim() || busy) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("support_case_notes").insert({
      case_id: supportCase.id,
      author_user_id: user.id,
      body: reply.trim(),
      visibility: "customer",
    });
    if (insertError) setError("Não foi possível enviar sua resposta. Tente novamente.");
    else {
      setReply("");
      await load();
    }
    setBusy(false);
  }

  if (loading)
    return (
      <main className="grid min-h-[620px] place-items-center text-sm text-[#6e6e73]">
        Carregando atendimento…
      </main>
    );
  if (!user)
    return (
      <main className="grid min-h-[620px] place-items-center text-center">
        <div>
          <h1 className="text-3xl font-semibold">Entre para ver este atendimento.</h1>
          <a
            href={`/conta/entrar?next=${encodeURIComponent(`/conta/atendimentos/${caseId}`)}`}
            className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
          >
            Entrar
          </a>
        </div>
      </main>
    );
  if (!supportCase)
    return (
      <main className="grid min-h-[620px] place-items-center text-center">
        <div>
          <h1 className="text-3xl font-semibold">Atendimento não encontrado.</h1>
          <a href="/conta" className="mt-5 inline-flex text-sm font-semibold text-[#0066cc]">
            Voltar à conta
          </a>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <a
        href="/conta"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc]"
      >
        <ArrowLeft className="h-4 w-4" /> Minha conta
      </a>
      <header className="mt-8 rounded-[32px] bg-white p-7 sm:p-9">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#86868b]">
              {supportCase.category}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
              {supportCase.subject}
            </h1>
          </div>
          <span className="shrink-0 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-semibold">
            {statusLabel(supportCase.status)}
          </span>
        </div>
      </header>
      <section className="mt-4 space-y-3 rounded-[32px] bg-white p-6 sm:p-8">
        <Message author="Você" body={supportCase.message} createdAt={supportCase.created_at} mine />
        {notes.map((note) => (
          <Message
            key={note.id}
            author={note.author_user_id === user.id ? "Você" : "Equipe Koda"}
            body={note.body}
            createdAt={note.created_at}
            mine={note.author_user_id === user.id}
          />
        ))}
        {supportCase.status !== "closed" && (
          <div className="border-t border-black/10 pt-5">
            <label className="text-xs font-medium text-[#6e6e73]">
              Responder
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                placeholder="Escreva sua mensagem…"
                className="mt-2 w-full resize-none rounded-2xl border border-black/10 p-4 text-sm outline-none focus:border-[#0071e3]"
              />
            </label>
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
            <div className="mt-3 flex justify-end">
              <button
                onClick={sendReply}
                disabled={!reply.trim() || busy}
                className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? "Enviando…" : "Enviar resposta"}
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[#86868b]">
        <MessageCircle className="h-3.5 w-3.5" /> O histórico fica salvo na sua Conta KodaCloud.
      </p>
    </main>
  );
}

function Message({
  author,
  body,
  createdAt,
  mine,
}: {
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
}) {
  return (
    <article
      className={`max-w-[88%] rounded-2xl p-4 ${mine ? "ml-auto bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}
    >
      <div className="flex items-center justify-between gap-4 text-xs">
        <strong>{author}</strong>
        <time className={mine ? "text-white/70" : "text-[#86868b]"}>
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
            new Date(createdAt),
          )}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </article>
  );
}

function statusLabel(status: string) {
  return status === "open"
    ? "Aberto"
    : status === "in_progress"
      ? "Em atendimento"
      : status === "waiting_customer"
        ? "Aguardando você"
        : status === "resolved"
          ? "Resolvido"
          : "Fechado";
}
