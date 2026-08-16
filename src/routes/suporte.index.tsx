import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CircleHelp, Cloud, Search, Settings2, ShieldCheck, UserRound, Wrench } from "lucide-react";

import { supportTopics } from "@/lib/koda-data";

export const Route = createFileRoute("/suporte/")({
  head: () => ({ meta: [{ title: "Suporte Koda" }, { name: "description", content: "Configuração, reparos, garantia, manuais e atendimento Koda." }] }),
  component: Support,
});

const cards = [
  { title: "Configurar", text: "Primeiro setup, Wi‑Fi, KodaCloud e ativação.", href: "/suporte/configurar", icon: Settings2 },
  { title: "Reparo", text: "Veja opções de serviço específicas para cada modelo.", href: "/suporte/reparo", icon: Wrench },
  { title: "Garantia", text: "Consulte como cobertura e serial funcionam no KodaCloud.", href: "/suporte/garantia", icon: ShieldCheck },
  { title: "Manuais", text: "Guias rápidos, documentação e informações técnicas.", href: "/suporte/manuais", icon: BookOpen },
  { title: "Meu KodaBot", text: "Acesse seus dispositivos vinculados à Conta KodaCloud.", href: "/conta", icon: UserRound },
  { title: "Perguntas frequentes", text: "Respostas rápidas para as dúvidas mais comuns.", href: "/suporte/faq", icon: CircleHelp },
];

function Support() {
  const [query, setQuery] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return supportTopics.filter((topic) => `${topic.title} ${topic.keywords}`.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  // Fechar resultados ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setQuery("");
      }
    }

    if (query) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [query]);

  return (
    <main>
      <section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28">
        <Cloud className="mx-auto h-9 w-9 text-[#0071e3]" />
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Como podemos ajudar?</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[#6e6e73]">Encontre configuração, reparo, garantia, manuais e ajuda para sua Conta KodaCloud.</p>
        <div ref={searchContainerRef} className="mx-auto mt-8 max-w-2xl text-left">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#86868b]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no suporte" className="h-14 w-full rounded-2xl border border-black/10 bg-white pl-14 pr-5 text-base outline-none focus:border-[#0071e3]" />
          </div>
          {query && (
            <div className="mt-3 w-full overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-2xl">
              {results.length ? results.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setQuery("")} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-[#f5f5f7]">
                  <span className="text-sm font-medium">{item.title}</span><ArrowRight className="h-4 w-4 text-[#86868b]" />
                </a>
              )) : <p className="px-4 py-6 text-center text-sm text-[#6e6e73]">Nenhum resultado. Tente “Wi‑Fi”, “garantia” ou “reparo”.</p>}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <a key={card.href} href={card.href} className="group min-h-64 rounded-[28px] bg-[#f5f5f7] p-7 transition-transform hover:-translate-y-1">
                <Icon className="h-8 w-8 text-[#0071e3]" />
                <h2 className="mt-14 text-2xl font-semibold tracking-[-0.03em]">{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{card.text}</p>
                <ArrowRight className="mt-6 h-4 w-4 text-[#0066cc] transition-transform group-hover:translate-x-1" />
              </a>
            );
          })}
        </div>
      </section>

      <section className="border-t border-black/10 px-5 py-20 text-center">
        <h2 className="text-4xl font-semibold tracking-[-0.045em]">Ainda precisa de ajuda?</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[#6e6e73]">Entre na KodaCloud para receber suporte ligado ao seu dispositivo ou fale diretamente com a Koda.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a href="/conta" className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Minha conta</a>
          <a href="/suporte/contato" className="py-3 text-sm font-semibold text-[#0066cc] hover:underline">Fale conosco ›</a>
        </div>
      </section>
    </main>
  );
}
