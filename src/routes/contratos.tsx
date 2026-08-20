import { createFileRoute } from "@tanstack/react-router";
import { FileText, ShieldCheck } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos e documentos — Koda" }] }),
  component: Contracts,
});

function Contracts() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <header className="bg-white px-5 py-20 text-center sm:py-28">
          <FileText className="mx-auto h-9 w-9 text-[#0071e3]" />
          <h1 className="mt-5 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">
            Contratos e documentos.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#6e6e73]">
            Informações importantes sobre compra, cobertura, garantia e relacionamento com a Koda.
          </p>
        </header>
        <section className="mx-auto grid max-w-[980px] gap-4 px-5 py-16 sm:grid-cols-2 sm:py-20">
          <a href="/privacidade" className="rounded-[30px] bg-white p-8">
            <ShieldCheck className="h-7 w-7 text-[#0071e3]" />
            <h2 className="mt-14 text-2xl font-semibold">Privacidade e segurança</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
              Como a arquitetura da Conta Koda protege dispositivos e informações.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
              Consultar ›
            </span>
          </a>
          <a href="/suporte/garantia" className="rounded-[30px] bg-white p-8">
            <FileText className="h-7 w-7 text-[#0071e3]" />
            <h2 className="mt-14 text-2xl font-semibold">Garantia e cobertura</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
              Consulte as condições de garantia e as coberturas vinculadas ao produto.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
              Consultar ›
            </span>
          </a>
          <div className="rounded-[30px] bg-[#1d1d1f] p-8 text-white sm:col-span-2">
            <p className="text-sm font-semibold text-white/55">Documentos de compra</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.045em]">
              Termos comerciais completos estão em preparação.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
              A Koda deve publicar os documentos jurídicos definitivos antes do início da operação
              comercial em produção. Esta página não apresenta cláusulas provisórias como se fossem
              contratos válidos.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
