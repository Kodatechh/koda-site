import { FormEvent, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cloud } from "lucide-react";

import { GoogleSignInButton } from "@/components/koda/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/conta";
}

export const Route = createFileRoute("/conta/criar")({
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search["next"]) }),
  head: () => ({ meta: [{ title: "Criar Conta KodaCloud — Koda" }] }),
  component: SignUp,
});

function SignUp() {
  const { next } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signInHref = useMemo(() => `/conta/entrar?next=${encodeURIComponent(next)}`, [next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined;
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.session) window.location.href = next;
    else setMessage(next.startsWith("/ativar")
      ? "Conta criada. Confirme o cadastro pelo e-mail e você voltará para concluir a ativação do KodaBot."
      : "Conta criada. Verifique seu e-mail para confirmar o cadastro e depois entre na KodaCloud.");
  }

  return (
    <main className="mx-auto grid min-h-[760px] max-w-6xl place-items-center px-5 py-16">
      <div className="w-full max-w-md rounded-[30px] bg-white p-7 shadow-sm sm:p-9">
        <Cloud className="h-9 w-9 text-[#0071e3]" />
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">Crie sua Conta KodaCloud.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">Ela será usada no site e também durante a ativação inicial de um KodaBot.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-xs font-medium text-[#6e6e73]">Nome<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-black/15 px-4 text-sm outline-none focus:border-[#0071e3]" autoComplete="name" /></label>
          <label className="block text-xs font-medium text-[#6e6e73]">E-mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-black/15 px-4 text-sm outline-none focus:border-[#0071e3]" autoComplete="email" /></label>
          <label className="block text-xs font-medium text-[#6e6e73]">Senha<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-black/15 px-4 text-sm outline-none focus:border-[#0071e3]" autoComplete="new-password" /></label>
          <label className="block text-xs font-medium text-[#6e6e73]">Confirmar senha<input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-black/15 px-4 text-sm outline-none focus:border-[#0071e3]" autoComplete="new-password" /></label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-green-50 p-3 text-xs text-green-700">{message}</p>}
          <button disabled={loading} className="h-12 w-full rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-60">{loading ? "Criando…" : "Criar conta"}</button>
        </form>
        <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-black/10" /><span className="text-[11px] text-[#86868b]">ou</span><span className="h-px flex-1 bg-black/10" /></div>
        <GoogleSignInButton redirectPath={next} />
        <p className="mt-6 text-center text-sm">Já tem conta? <a href={signInHref} className="font-semibold text-[#0066cc] hover:underline">Entrar</a></p>
        <p className="mt-4 text-center text-xs leading-relaxed text-[#86868b]">Ao criar uma conta, você concorda com a forma como a Koda trata os dados descrita em <a href="/privacidade" className="text-[#0066cc] hover:underline">Privacidade e segurança</a>.</p>
      </div>
    </main>
  );
}
