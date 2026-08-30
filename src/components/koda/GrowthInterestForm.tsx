import { type FormEvent, type ReactNode, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type Program = "refurbished" | "education" | "business";

export function GrowthInterestForm({
  program,
  buttonLabel,
  organizationLabel = "Organização",
}: {
  program: Program;
  buttonLabel: string;
  organizationLabel?: string;
}) {
  const organizational = program !== "refurbished";
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { error: invokeError } = await supabase.functions.invoke("koda-growth-interest", {
      body: {
        program,
        fullName: form.get("fullName"),
        email: form.get("email"),
        organization: form.get("organization"),
        contactRole: form.get("contactRole"),
        estimatedQuantity: form.get("estimatedQuantity"),
        message: form.get("message"),
        website: form.get("website"),
        consent: form.get("consent") === "on",
      },
    });
    setSending(false);
    if (invokeError) {
      setError("Não foi possível registrar seu interesse agora. Tente novamente em instantes.");
      return;
    }
    setSent(true);
  }

  if (sent)
    return (
      <div className="rounded-[28px] bg-[#f1fbf5] p-8 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-[#34c759]" />
        <h3 className="mt-4 text-2xl font-semibold">Interesse registrado.</h3>
        <p className="mt-2 text-sm text-[#6e6e73]">
          A Koda poderá entrar em contato quando houver uma próxima etapa real.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[30px] bg-white p-7 shadow-sm sm:p-9">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <input name="fullName" required className="contact-input" />
        </Field>
        <Field label="E-mail">
          <input name="email" required type="email" className="contact-input" />
        </Field>
      </div>
      {organizational && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={organizationLabel}>
            <input name="organization" required className="contact-input" />
          </Field>
          <Field label="Sua função">
            <input
              name="contactRole"
              className="contact-input"
              placeholder="Ex.: coordenação, TI, compras"
            />
          </Field>
        </div>
      )}
      <div className={organizational ? "grid gap-4 sm:grid-cols-[180px_1fr]" : ""}>
        {organizational && (
          <Field label="Quantidade estimada">
            <input
              name="estimatedQuantity"
              type="number"
              min="1"
              max="10000"
              className="contact-input"
            />
          </Field>
        )}
        <Field
          label={
            organizational
              ? "O que você gostaria de testar?"
              : "O que você procura em um recondicionado?"
          }
        >
          <textarea name="message" rows={4} className="contact-input h-auto py-3" />
        </Field>
      </div>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <label className="flex items-start gap-3 text-xs leading-relaxed text-[#6e6e73]">
        <input name="consent" type="checkbox" required className="mt-0.5" />
        Autorizo a Koda a usar estes dados para responder sobre este programa. Posso pedir a
        exclusão pelo suporte.
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={sending}
        className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-[#0071e3] px-7 text-sm font-semibold text-white disabled:opacity-55"
      >
        {sending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {sending ? "Enviando…" : buttonLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[#6e6e73]">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
