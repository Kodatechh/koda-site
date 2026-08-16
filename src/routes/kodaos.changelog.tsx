import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CloudDownload, Server, Wifi } from "lucide-react";

export const Route = createFileRoute("/kodaos/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog do KODA OS — Koda" },
      {
        name: "description",
        content: "Veja as novidades e melhorias publicadas em cada versão do KODA OS.",
      },
    ],
  }),
  component: Changelog,
});

const CHANGELOG_URL = "https://qqvwnsemihkknzodkxob.supabase.co/functions/v1/koda-os-changelog";

type PublicRelease = {
  version: string;
  target_model: string;
  channel: string;
  published_at: string;
  changelog: string[];
};

const developmentHistory = [
  {
    version: "0.4",
    status: "Em desenvolvimento",
    date: "Agosto de 2026",
    icon: CloudDownload,
    items: [
      "Infraestrutura de atualização pela internet.",
      "Preservação do fluxo atual de Wi‑Fi e captive portal durante a evolução do firmware.",
      "Base para consulta segura de novas versões publicadas pela Koda.",
    ],
  },
  {
    version: "0.3",
    status: "Base anterior",
    date: "Agosto de 2026",
    icon: Wifi,
    items: [
      "KodaBot-Setup para provisionamento inicial de Wi‑Fi.",
      "Captive portal com scan e seleção de redes.",
      "Credenciais salvas e reconexão automática.",
      "Painel local acessível pela rede e suporte a kodabot.local.",
      "Boot automático do firmware por main.py.",
    ],
  },
];

function formatReleaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function Changelog() {
  const [releases, setReleases] = useState<PublicRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadChangelog() {
      try {
        const response = await fetch(CHANGELOG_URL, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Changelog HTTP ${response.status}`);
        const payload = await response.json();
        if (!cancelled) {
          setReleases(Array.isArray(payload?.releases) ? payload.releases : []);
          setFailed(false);
        }
      } catch (error) {
        console.error("[Koda] changelog", error);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChangelog();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <section className="bg-black px-5 py-20 text-center text-white sm:py-28">
        <a href="/kodaos" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para KODA OS
        </a>
        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Changelog</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/55">
          As novidades de cada versão publicada do KODA OS, direto do KodaCloud.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
        <div className="mb-10">
          <p className="text-sm font-semibold text-[#6e6e73]">Atualizações publicadas</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">O que mudou.</h2>
        </div>

        {loading && (
          <div className="rounded-[28px] bg-[#f5f5f7] p-8 text-sm text-[#6e6e73]">
            Carregando as versões publicadas…
          </div>
        )}

        {!loading && failed && (
          <div className="rounded-[28px] bg-[#f5f5f7] p-8">
            <p className="font-semibold">Não foi possível carregar o changelog agora.</p>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">Tente novamente em alguns instantes.</p>
          </div>
        )}

        {!loading && !failed && releases.length === 0 && (
          <div className="rounded-[28px] bg-[#f5f5f7] p-8">
            <p className="font-semibold">Nenhuma atualização pública ainda.</p>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
              Quando uma nova versão for publicada pela Koda, as mudanças aparecerão aqui automaticamente.
            </p>
          </div>
        )}

        {!loading && !failed && releases.length > 0 && (
          <div className="space-y-12">
            {releases.map((release, index) => (
              <article key={`${release.target_model}-${release.version}`} className="grid gap-6 border-t border-black/10 pt-8 sm:grid-cols-[160px_1fr]">
                <div>
                  <p className="text-3xl font-semibold">{release.version}</p>
                  <p className="mt-1 capitalize text-xs text-[#86868b]">{formatReleaseDate(release.published_at)}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <CloudDownload className="h-6 w-6 text-[#0071e3]" />
                    <h2 className="text-2xl font-semibold">KODA OS {release.version}</h2>
                    {index === 0 && (
                      <span className="rounded-full bg-[#e8f2ff] px-2.5 py-1 text-[11px] font-semibold text-[#0066cc]">Mais recente</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#86868b]">{release.target_model}</p>
                  {release.changelog.length > 0 ? (
                    <ul className="mt-5 space-y-3">
                      {release.changelog.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#6e6e73]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34c759]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-5 text-sm text-[#86868b]">Esta versão não possui detalhes públicos adicionais.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-20 border-t border-black/10 pt-12">
          <p className="text-sm font-semibold text-[#6e6e73]">Histórico de desenvolvimento</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#86868b]">
            Registros anteriores à publicação automática das versões pelo Koda Admin.
          </p>
          <div className="mt-10 space-y-12">
            {developmentHistory.map((release) => {
              const Icon = release.icon;
              return (
                <article key={release.version} className="grid gap-6 border-t border-black/10 pt-8 sm:grid-cols-[160px_1fr]">
                  <div>
                    <p className="text-3xl font-semibold">{release.version}</p>
                    <p className="mt-1 text-xs text-[#86868b]">{release.date}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-[#0071e3]" />
                      <h2 className="text-2xl font-semibold">KODA OS {release.version}</h2>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#bf4800]">{release.status}</p>
                    <ul className="mt-5 space-y-3">
                      {release.items.map((item) => (
                        <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#6e6e73]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34c759]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-16 rounded-[28px] bg-[#f5f5f7] p-7">
          <Server className="h-7 w-7 text-[#0071e3]" />
          <h2 className="mt-7 text-2xl font-semibold">Um changelog conectado ao produto.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
            As versões públicas vêm da mesma publicação usada para distribuir atualizações aos KodaBots. O que é rascunho ou está pausado não aparece nesta página.
          </p>
        </div>
      </section>
    </main>
  );
}
