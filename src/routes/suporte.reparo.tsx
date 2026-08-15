import { createFileRoute } from "@tanstack/react-router";
import { RepairFlow } from "@/components/koda/RepairFlow";

export const Route = createFileRoute("/suporte/reparo")({
  head: () => ({ meta: [{ title: "Reparo e assistência — Koda" }] }),
  component: Repair,
});

function Repair() {
  return (
    <main>
      <section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28">
        <p className="text-sm font-semibold text-[#0071e3]">Reparo e assistência</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Encontre o serviço certo para o seu KodaBot.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">Comece pelo modelo. O site mostra apenas os reparos que realmente existem para aquele produto.</p>
      </section>
      <RepairFlow />
    </main>
  );
}
