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
        <p className="text-sm font-semibold text-[#0071e3]">Serviço e Reparos Koda</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
          Preços de reparo.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[#6e6e73]">
          Escolha o modelo e o serviço para consultar o preço e a cobertura KodaCare+ aplicável.
        </p>
      </section>
      <RepairFlow />
    </main>
  );
}
