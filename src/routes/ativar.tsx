import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Cloud, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ativar")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token.trim() : "",
  }),
  head: () => ({
    meta: [
      { title: "Ativar KodaBot — KodaCloud" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Activate,
});

type ActivationState = "idle" | "claiming" | "success" | "error";

function Activate() {
  const { token } = Route.useSearch();
  const { user, session, loading } = useAuth();
  const [state, setState] = useState<ActivationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedToken = useRef<string | null>(null);

  const currentPath = useMemo(
    () => `/ativar${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    [token],
  );
  const signInHref = `/conta/entrar?next=${encodeURIComponent(currentPath)}`;
  const signUpHref = `/conta/criar?next=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    if (loading || !user || !session?.access_token || !token || attemptedToken.current === token) return;

    attemptedToken.current = token;
    setState("claiming");
    setError(null);

    const claim = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        if (!supabaseUrl) throw new Error("Configuração da KodaCloud indisponível.");

        const response = await fetch(`${supabaseUrl}/functions/v1/kodacloud-claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ claim_token: token }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const code = String(data?.error ?? "");
          if (code === "activation_expired") {
            throw new Error(
              "A sessão de ativação expirou. Volte ao KodaBot e gere uma nova ativação.",
            );
          }
          if (code === "device_already_activated") {
            throw new Error("Este KodaBot já está vinculado a uma Conta KODA.");
          }
          if (code === "invalid_activation_token") {
            throw new Error("Esta sessão de ativação não existe ou já não é válida.");
          }
          throw new Error("Não foi possível concluir a ativação. Tente novamente pelo KodaBot.");
        }

        setState("success");
      } catch (activationError) {
        setState("error");
        setError(
          activationError instanceof Error
            ? activationError.message
            : "Não foi possível concluir a ativação.",
        );
      }
    };

    void claim();
  }, [loading, session?.access_token, token, user]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto grid min-h-[690px] max-w-6xl place-items-center px-5 py-16">
        {loading ? (
          <div className="text-center">
            <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-[#0071e3]" />
            <p className="mt-4 text-sm text-[#6e6e73]">Preparando ativação…</p>
          </div>
        ) : !token ? (
          <div className="max-w-xl text-center">
            <ShieldCheck className="mx-auto h-11 w-11 text-[#0071e3]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              A ativação começa no próprio KodaBot.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
              Durante o primeiro setup, o aparelho prova sua identidade à KodaCloud e cria uma sessão temporária de ativação. O número de série, sozinho, não permite reivindicar um produto.
            </p>
            <a
              href="/suporte/configurar"
              className="mt-7 inline-flex text-sm font-semibold text-[#0066cc] hover:underline"
            >
              Ver como configurar um KodaBot ›
            </a>
          </div>
        ) : !user ? (
          <div className="max-w-xl text-center">
            <Cloud className="mx-auto h-11 w-11 text-[#0071e3]" />
            <p className="mt-6 text-sm font-semibold text-[#0071e3]">KodaCloud</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Entre para concluir a ativação.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
              Este KodaBot já iniciou uma sessão segura de ativação. Entre ou crie a Conta KODA que será a proprietária do produto.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={signInHref}
                className="rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white"
              >
                Entrar
              </a>
              <a
                href={signUpHref}
                className="rounded-full border border-black/15 bg-white px-7 py-3 text-sm font-semibold"
              >
                Criar conta
              </a>
            </div>
          </div>
        ) : state === "claiming" || state === "idle" ? (
          <div className="max-w-lg text-center">
            <LoaderCircle className="mx-auto h-11 w-11 animate-spin text-[#0071e3]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">
              Ativando seu KodaBot…
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">
              Estamos vinculando o aparelho à sua Conta KODA.
            </p>
          </div>
        ) : state === "success" ? (
          <div className="max-w-lg text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#34c759]" />
            <p className="mt-6 text-sm font-semibold text-[#34c759]">Ativação concluída</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Seu KodaBot está pronto.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">
              O produto foi vinculado automaticamente à sua Conta KODA e agora aparece em Meu KodaBot.
            </p>
            <a
              href="/conta"
              className="mt-7 inline-flex rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white"
            >
              Abrir Meu KodaBot
            </a>
          </div>
        ) : (
          <div className="max-w-lg text-center">
            <TriangleAlert className="mx-auto h-11 w-11 text-[#bf4800]" />
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">
              Não foi possível ativar.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">{error}</p>
            <a
              href="/suporte/configurar"
              className="mt-7 inline-flex text-sm font-semibold text-[#0066cc] hover:underline"
            >
              Ajuda com a configuração ›
            </a>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
