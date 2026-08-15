import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CloudDownload, RefreshCw, ShieldCheck, Wifi } from "lucide-react";

export const Route = createFileRoute("/kodaos/updates")({
  head: () => ({ meta: [{ title: "Atualizações do KODA OS — Koda" }, { name: "description", content: "Acompanhe a versão atual e o desenvolvimento das atualizações OTA do KODA OS." }] }),
  component: Updates,
});

const current = [
  { icon: Wifi, title: "KodaBot-Setup", text: "Provisionamento Wi‑Fi com captive portal e seleção de redes próximas." },
  { icon: CheckCircle2, title: "Reconexão automática", text: "Credenciais salvas e conexão automática após reinicialização." },
  { icon: ShieldCheck, title: "Painel local", text: "Servidor HTTP local e acesso por kodabot.local na rede do usuário." },
];

function Updates() {
  return (
    <main>
      <section className="bg-black px-5 py-20 text-center text-white sm:py-28">
        <RefreshCw className="mx-auto h-10 w-10 text-[#2997ff]" />
        <p className="mt-6 text-sm font-semibold text-white/45">KODA OS</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Atualizações, sem complicação.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/55">A arquitetura OTA do KODA OS 0.4 está sendo desenvolvida para que novas versões possam chegar ao KodaBot pela internet, sem cabo ou computador.</p>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-sm font-semibold text-[#bf4800]">Em desenvolvimento</p>
            <h2 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">KODA OS 0.4</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">O foco desta versão é preparar a infraestrutura para o KodaBot baixar e aplicar atualizações sozinho, preservando tudo o que já funciona no fluxo de Wi‑Fi.</p>
          </div>
          <div className="rounded-[30px] bg-[#f5f5f7] p-7 sm:p-9">
            <CloudDownload className="h-9 w-9 text-[#0071e3]" />
            <h3 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">OTA pela internet.</h3>
            <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">Quando a implementação estiver concluída, o KodaBot poderá verificar versões publicadas pela Koda, baixar os arquivos necessários e atualizar o KODA OS sem depender do VS Code ou de um PC conectado por cabo.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7] px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold text-[#6e6e73]">Base atual</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">O que já está funcionando.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {current.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-[28px] bg-white p-7"><Icon className="h-7 w-7 text-[#0071e3]"/><h3 className="mt-10 text-xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{item.text}</p></article>; })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
        <div className="border-t border-black/10 pt-10">
          <p className="text-sm text-[#6e6e73]">Para o histórico técnico detalhado, consulte o changelog.</p>
          <a href="/kodaos/changelog" className="mt-3 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Abrir changelog ›</a>
        </div>
      </section>
    </main>
  );
}
