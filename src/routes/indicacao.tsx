import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Link2, Share2, UserPlus } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type ReferralSummary = { code: string; total_referrals: number };
type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export const Route = createFileRoute("/indicacao")({
  validateSearch: (search: Record<string, unknown>) => ({
    codigo: typeof search["codigo"] === "string" ? search["codigo"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Indique a Koda" }] }),
  component: ReferralPage,
});

function ReferralPage() {
  const { user, loading } = useAuth();
  const { codigo } = Route.useSearch();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const rpc = (supabase as unknown as RpcClient).rpc.bind(supabase);
    async function load() {
      if (codigo) {
        const { data } = await rpc("register_referral_attribution", { _code: codigo });
        if (alive && data === true) setMessage("Indicação registrada na sua Conta Koda.");
      }
      const { data, error } = await rpc("get_referral_summary");
      const first = Array.isArray(data) ? (data[0] as ReferralSummary | undefined) : undefined;
      if (!alive) return;
      if (error || !first) setMessage("Não foi possível carregar seu link agora.");
      else setSummary(first);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [codigo, user]);

  const link =
    summary && typeof window !== "undefined"
      ? `${window.location.origin}/indicacao?codigo=${summary.code}`
      : "";
  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  async function share() {
    if (!link) return;
    if (navigator.share)
      await navigator.share({ title: "Conheça a Koda", text: "Conheça o KodaBot.", url: link });
    else await copy();
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 py-24 text-center sm:py-32">
          <UserPlus className="mx-auto h-9 w-9 text-[#0071e3]" />
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.065em] sm:text-7xl">
            Apresente a Koda para alguém.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Seu link registra quem conheceu a Koda por você. Neste momento, o programa não promete
            desconto, pagamento ou recompensa; qualquer benefício futuro terá regras próprias
            publicadas antes de valer.
          </p>
        </section>
        <section className="px-5 py-20">
          <div className="mx-auto max-w-3xl rounded-[36px] bg-white p-8 shadow-sm sm:p-12">
            {loading ? (
              <p className="text-center text-sm text-[#6e6e73]">Carregando sua Conta Koda…</p>
            ) : !user ? (
              <div className="text-center">
                <Link2 className="mx-auto h-8 w-8 text-[#0071e3]" />
                <h2 className="mt-5 text-3xl font-semibold">Entre para criar seu link.</h2>
                <p className="mt-3 text-sm text-[#6e6e73]">
                  A indicação fica vinculada à sua conta.
                </p>
                <a
                  href={`/conta/entrar?next=${encodeURIComponent(`/indicacao${codigo ? `?codigo=${codigo}` : ""}`)}`}
                  className="mt-7 inline-flex rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white"
                >
                  Entrar na Conta Koda
                </a>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-[#0071e3]">Seu link</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-.05em]">
                  Compartilhe de forma simples.
                </h2>
                {message && (
                  <p
                    role="status"
                    className="mt-4 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]"
                  >
                    {message}
                  </p>
                )}
                <div className="mt-8 flex items-center gap-2 rounded-2xl bg-[#f5f5f7] p-3">
                  <input
                    readOnly
                    aria-label="Link de indicação"
                    value={link}
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copiar link"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[#34c759]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    aria-label="Compartilhar link"
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#0071e3] text-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-8 border-t border-black/10 pt-6">
                  <p className="text-4xl font-semibold">{summary?.total_referrals ?? 0}</p>
                  <p className="mt-1 text-sm text-[#6e6e73]">
                    {summary?.total_referrals === 1
                      ? "conta chegou pela sua indicação"
                      : "contas chegaram pela sua indicação"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
