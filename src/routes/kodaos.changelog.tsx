import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, CloudDownload, Server, Wifi } from "lucide-react";

export const Route = createFileRoute("/kodaos/changelog")({
  head: () => ({ meta: [{ title: "Changelog do KODA OS — Koda" }] }),
  component: Changelog,
});

const releases = [
  {
    version: "0.4",
    status: "Em desenvolvimento",
    date: "Agosto de 2026",
    icon: CloudDownload,
    items: [
      "Infraestrutura de atualização OTA pela internet.",
      "Preservação do fluxo atual de Wi‑Fi e captive portal durante a evolução do firmware.",
      "Base para consulta segura de novas versões publicadas pela Koda.",
    ],
  },
  {
    version: "0.3",
    status: "Base atual",
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

function Changelog() {
  return (
    <main>
      <section className="bg-black px-5 py-20 text-center text-white sm:py-28">
        <a href="/kodaos" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft className="h-3.5 w-3.5"/> Voltar para KODA OS</a>
        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Changelog</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/55">O que foi implementado e o que está em desenvolvimento no firmware do KodaBot I.</p>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
        <div className="space-y-12">
          {releases.map((release) => { const Icon=release.icon; return (
            <article key={release.version} className="grid gap-6 border-t border-black/10 pt-8 sm:grid-cols-[160px_1fr]">
              <div><p className="text-3xl font-semibold">{release.version}</p><p className="mt-1 text-xs text-[#86868b]">{release.date}</p></div>
              <div><div className="flex items-center gap-3"><Icon className="h-6 w-6 text-[#0071e3]"/><h2 className="text-2xl font-semibold">KODA OS {release.version}</h2></div><p className="mt-2 text-sm font-semibold text-[#bf4800]">{release.status}</p><ul className="mt-5 space-y-3">{release.items.map((item)=><li key={item} className="flex gap-3 text-sm leading-relaxed text-[#6e6e73]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34c759]"/>{item}</li>)}</ul></div>
            </article>
          ); })}
        </div>
        <div className="mt-16 rounded-[28px] bg-[#f5f5f7] p-7"><Server className="h-7 w-7 text-[#0071e3]"/><h2 className="mt-7 text-2xl font-semibold">Sem promessas fictícias.</h2><p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">O changelog mostra apenas funções que já existem ou estão efetivamente em desenvolvimento. Recursos futuros só entram quando fizerem parte do projeto real.</p></div>
      </section>
    </main>
  );
}
