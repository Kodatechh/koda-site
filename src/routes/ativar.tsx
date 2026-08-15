import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Cloud, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ativar")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code.trim().toUpperCase() : "",
  }),
  head: () => ({ meta: [{ title: "Ativar KodaBot — KodaCloud" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Activate,
});

type ActivationState = "idle" | "claiming" | "success" | "error";

function Activate() {
  const { code } = Route.useSearch();
  const { user, loading } = useAuth();
  const [state, setState] = useState<ActivationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedCode = useRef<string | null>(null);

  const currentPath = useMemo(() => `/ativar${code ? `?code=${encodeURIComponent(code)}` : ""}`, [code]);
  const signInHref = `/conta/entrar?next=${encodeURIComponent(currentPath)}`;
  const signUpHref = `/conta/criar?next=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    if (loading || !user || !code || attemptedCode.current === code) return;
    attemptedCode.current = code;
    setState("claiming");
    setError(null);

    supabase.rpc("claim_device_activation", { _activation_code: code }).then(({ error: activationError }) => {
      if (activationError) {
        setState("error");
        setError(
          activationError.message.toLowerCase().includes("expired")
            ? "A sessão de ativação expirou. Volte ao KodaBot e gere uma nova ativação durante o setup."
            : "Não foi possível concluir a ativação. A sessão pode já ter sido usada ou não está mais disponível.",
        );
        return;
      }
      setState("success");
    });
  }, [code, loading, user]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto grid min-h-[690px] max-w-6xl place-items-center px-5 py-16">
        {loading ? (
          <div className="text-center"><LoaderCircle className="mx-auto h-9 w-9 animate-spin text-[#0071e3]" /><p className="mt-4 text-sm text-[#6e6e73]">Preparando ativação…</p></div>
        ) : !code ? (
          <div className="max-w-xl text-center">
            <ShieldCheck className="mx-auto h-11 w-11 text-[#0071e3]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">A ativação começa no próprio KodaBot.</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#6e6e73]">Durante o primeiro setup, o aparelho valida sua identidade com a KodaCloud e abre uma sessão temporária de ativação. Você não precisa — e não pode — reivindicar um produto apenas digitando o número de série.</p>
            <a href="/suporte/configurar" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Ver como configurar um KodaBot ›</a>
          </div>
        ) : !user ? (
          <div className="max-w-xl text-center">
            <Cloud className="mx-auto h-11 w-11 text-[#0071e3]" />
            <p className="mt-6 text-sm font-semibold text-[#0071e3]">KodaCloud</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Entre para concluir a ativação.</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#6e6e73]">Este KodaBot já iniciou uma sessão segura de ativação. Entre ou crie a Conta KodaCloud que será a proprietária do produto.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={signInHref} className="rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white">Entrar</a>
              <a href={signUpHref} className="rounded-full border border-black/15 bg-white px-7 py-3 text-sm font-semibold">Criar conta</a>
            </div>
          </div>
        ) : state === "claiming" || state === "idle" ? (
          <div className="max-w-lg text-center">
            <LoaderCircle className="mx-auto h-11 w-11 animate-spin text-[#0071e3]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">Ativando seu KodaBot…</h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">Estamos vinculando o aparelho à sua Conta KodaCloud.</p>
          </div>
        ) : state === "success" ? (
          <div className="max-w-lg text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#34c759]" />
            <p className="mt-6 text-sm font-semibold text-[#34c759]">Ativação concluída</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Seu KodaBot está pronto.</h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">O produto foi vinculado automaticamente à sua Conta KodaCloud e agora aparece em Meu KodaBot com garantia, software, manuais e suporte.</p>
            <a href="/conta" className="mt-7 inline-flex rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white">Abrir Meu KodaBot</a>
          </div>
        ) : (
          <div className="max-w-lg text-center">
            <TriangleAlert className="mx-auto h-11 w-11 text-[#bf4800]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">Não foi possível ativar.</h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">{error}</p>
            <a href="/suporte/configurar" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Ajuda com a configuração ›</a>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
