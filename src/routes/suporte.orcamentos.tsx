import { createFileRoute } from "@tanstack/react-router";
import { RepairFlow } from "@/components/koda/RepairFlow";

export const Route = createFileRoute("/suporte/orcamentos")({
  head: () => ({ meta: [{ title: "Estimativa de reparo — Koda" }] }),
  component: Estimates,
});

function Estimates() {
  return (
    <main>
      <section className="bg-[#f5f5f7] px-5 py-16 text-center sm:py-20">
        <p className="text-sm font-semibold text-[#0071e3]">Estimativa</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">Comece identificando o aparelho.</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[#6e6e73]">Os valores definitivos serão informados após avaliação técnica; esta etapa identifica a categoria de serviço disponível.</p>
      </section>
      <RepairFlow />
    </main>
  );
}
