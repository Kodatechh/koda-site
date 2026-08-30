import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, PackageCheck, ShieldCheck, Wrench } from "lucide-react";

import { GrowthInterestForm } from "@/components/koda/GrowthInterestForm";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/recondicionados")({
  head: () => ({
    meta: [
      { title: "KodaBot recondicionado — Koda" },
      {
        name: "description",
        content: "Cadastre-se para saber quando houver KodaBots recondicionados disponíveis.",
      },
    ],
  }),
  component: RefurbishedPage,
});

function RefurbishedPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 py-24 text-center sm:py-32">
          <p className="text-sm font-semibold text-[#0071e3]">Koda Recondicionado</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.065em] sm:text-7xl">
            Uma nova vida para um KodaBot.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
            Ainda não há unidades disponíveis. Quando houver estoque real, cada KodaBot terá
            condição, testes realizados, preço e cobertura informados antes da compra.
          </p>
        </section>
        <section className="px-5 py-20">
          <div className="mx-auto max-w-[1080px]">
            <div className="grid gap-3 md:grid-cols-3">
              <Promise
                icon={<Wrench />}
                title="Inspeção"
                text="Estrutura e funcionamento conferidos antes de voltar à loja."
              />
              <Promise
                icon={<PackageCheck />}
                title="Condição transparente"
                text="Sem fotos genéricas ou estado escondido: você saberá o que está comprando."
              />
              <Promise
                icon={<ShieldCheck />}
                title="Cobertura informada"
                text="Os termos aplicáveis serão exibidos em cada unidade, sem promessas genéricas."
              />
            </div>
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="mb-7 text-center">
                <h2 className="text-4xl font-semibold tracking-[-.05em]">Seja avisado primeiro.</h2>
                <p className="mt-3 text-[#6e6e73]">
                  O cadastro não reserva uma unidade e não gera cobrança.
                </p>
              </div>
              <GrowthInterestForm
                program="refurbished"
                buttonLabel="Avise-me quando houver estoque"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Promise({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[30px] bg-white p-8">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef6ff] text-[#0071e3] [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </span>
      <h2 className="mt-7 text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{text}</p>
      <Check className="mt-7 h-5 w-5 text-[#34c759]" />
    </article>
  );
}
