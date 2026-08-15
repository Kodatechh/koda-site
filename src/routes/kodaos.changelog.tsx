import { createFileRoute } from "@tanstack/react-router";

import {
  ArrowLeft,
  ArrowRight,
  Bug,
  CheckCircle2,
  Download,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";


const title = "Changelog do KODA OS — histórico de desenvolvimento";
const description =
  "Acompanhe o desenvolvimento do KODA OS e as próximas etapas do sistema do KodaBot I.";

export const Route = createFileRoute("/kodaos/changelog")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Changelog,
});

const typeIcons = {
  feature: { Icon: Sparkles, label: "Novo" },
  improvement: { Icon: Zap, label: "Melhoria" },
  fix: { Icon: Bug, label: "Correção" },
  infrastructure: { Icon: Wrench, label: "Infraestrutura" },
  release: { Icon: CheckCircle2, label: "Lançamento" },
};

const changelog = [
  {
    version: "0.4",
    status: "Em desenvolvimento",
    date: "Agosto de 2026",
    highlights: [
      {
        type: "infrastructure",
        text: "Implementação do sistema de atualização OTA pela internet.",
      },
      {
        type: "improvement",
        text: "Preservação do fluxo atual de Wi‑Fi, captive portal e painel local durante as atualizações.",
      },
      {
        type: "feature",
        text: "Preparação para o KodaBot buscar novas versões do KODA OS sem cabo ou computador.",
      },
    ],
  },
  {
    version: "0.3",
    status: "Base atual",
    date: "Agosto de 2026",
    highlights: [
      {
        type: "feature",
        text: "Provisionamento Wi‑Fi pela rede KodaBot-Setup com captive portal.",
      },
      {
        type: "feature",
        text: "Salvamento de credenciais e reconexão automática ao Wi‑Fi.",
      },
      {
        type: "feature",
        text: "Painel local acessível pela rede e suporte a kodabot.local.",
      },
      {
        type: "infrastructure",
        text: "Boot automático do firmware pelo main.py.",
      },
    ],
  },
];

const futureItems = [
  "Interface completa na tela touch",
  "Tarefas, alarmes e rotinas",
  "Integração com dados e serviços online",
  "Expansão do ecossistema Koda",
];

function Changelog() {
  return (
    <main>

        <section className="hero-panel relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 accent-glow opacity-40 blur-2xl" />
          <div className="relative mx-auto max-w-4xl px-5 pb-14 pt-24 text-center sm:pt-32">
            <a
              href="/kodaos"
              className="fade-up inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para KODA OS
            </a>
            <h1 className="fade-up mt-6 text-5xl font-semibold leading-[0.95] sm:text-7xl">
              Changelog
            </h1>
            <p className="fade-up mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-foreground/65">
              Histórico completo de versões do KODA OS. Cada atualização, novo recurso e correção em um só lugar.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24">
          <div className="relative">
            <div className="absolute inset-y-0 left-6 w-px bg-border md:left-8" />

            {changelog.map((release, i) => {
              const isFirst = i === 0;
              return (
                <article
                  key={release.version}
                  className={`relative pl-16 md:pl-24 ${i !== changelog.length - 1 ? "pb-16" : ""}`}
                >
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-soft)] md:h-16 md:w-16">
                    <span className="text-[10px] font-semibold leading-none md:text-xs">
                      v{release.version.split(".").slice(0, 2).join(".")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      KODA OS {release.version}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] ${
                        isFirst
                          ? "bg-accent/10 text-accent"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {release.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{release.date}</p>

                  <ul className="mt-6 space-y-4">
                    {release.highlights.map((item) => {
                      const { Icon, label } = typeIcons[item.type as keyof typeof typeIcons];

                      return (
                        <li key={item.text} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                              item.type === "feature"
                                ? "bg-green-500/10 text-green-500"
                                : item.type === "improvement"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : item.type === "fix"
                                    ? "bg-red-500/10 text-red-500"
                                    : item.type === "release"
                                      ? "bg-accent/10 text-accent"
                                      : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                          </span>
                          <span className="text-sm leading-relaxed text-foreground">
                            {item.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {isFirst && (
                    <div className="mt-6 flex items-center gap-3">
                      <button className="inline-flex items-center gap-2 rounded-full bg-ink-foreground px-5 py-2.5 text-xs font-semibold text-ink transition-transform hover:-translate-y-0.5">
                        <Download className="h-3.5 w-3.5" />
                        Versão em desenvolvimento
                      </button>
                      <span className="text-xs text-muted-foreground">
                        Disponível apenas para beta testers.
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/60">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                No horizonte
              </p>
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">
                O que ainda está por vir.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                A gente não para. Aqui estão algumas das próximas ideias em pesquisa ou desenvolvimento para o KODA OS.
              </p>
            </div>
            <ul className="space-y-4">
              {futureItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24">
          <div className="ink-panel relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 accent-glow opacity-40 blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Quer testar antes de todo mundo?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-ink-foreground/65">
                Entre no programa beta do KODA OS e receba builds antecipados diretamente no seu KodaBot.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
                <a
                  href="/#comprar"
                  className="rounded-full bg-ink-foreground px-7 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
                >
                  Comprar KodaBot
                </a>
                <a
                  href="/kodaos"
                  className="rounded-full border border-ink-foreground/25 px-7 py-3 font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
                >
                  Conhecer KODA OS
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }


