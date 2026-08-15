import { FormEvent, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Eye, EyeOff } from "lucide-react";

import { GoogleSignInButton } from "@/components/koda/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/conta";
}

export const Route = createFileRoute("/conta/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search.next) }),
  head: () => ({ meta: [{ title: "Entrar na KodaCloud — Koda" }] }),
  component: SignIn,
});

function SignIn() {
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHref = useMemo(() => `/conta/criar?next=${encodeURIComponent(next)}`, [next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("Não foi possível entrar. Confira seu e-mail e senha.");
      return;
    }
    window.location.href = next;
  }

  return (
    <main className="mx-auto grid min-h-[720px] max-w-6xl place-items-center px-5 py-16">
      <div className="w-full max-w-md rounded-[30px] bg-white p-7 shadow-sm sm:p-9">
        <Cloud className="h-9 w-9 text-[#0071e3]" />
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">Entrar na KodaCloud.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
          A mesma conta usada para ativar seus KodaBots, consultar garantia e acessar suporte.
        </p>

        {next.startsWith("/ativar") && (
          <div className="mt-5 rounded-2xl bg-[#eef5ff] p-4 text-xs leading-relaxed text-[#315b8a]">
            Depois do login, você voltará automaticamente para concluir a ativação do seu KodaBot.
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-xs font-medium text-[#6e6e73]">
            E-mail
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-black/15 px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]" autoComplete="email" />
          </label>
          <label className="block text-xs font-medium text-[#6e6e73]">
            Senha
            <div className="relative mt-1.5">
              <input required type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-black/15 px-4 pr-11 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3]" autoComplete="current-password" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <button disabled={loading} className="h-12 w-full rounded-full bg-[#0071e3] text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-black/10" /><span className="text-[11px] text-[#86868b]">ou</span><span className="h-px flex-1 bg-black/10" /></div>
        <GoogleSignInButton redirectPath={next} />
        <div className="mt-7 space-y-2 text-center text-sm">
          <p>Não tem conta? <a href={createHref} className="font-semibold text-[#0066cc] hover:underline">Criar Conta KodaCloud</a></p>
          <a href="/conta/recuperar" className="block text-xs text-[#0066cc] hover:underline">Esqueci minha senha</a>
        </div>
      </div>
    </main>
  );
}
