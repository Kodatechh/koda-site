import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Cloud, Fingerprint, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/suporte/garantia")({
  head: () => ({ meta: [{ title: "Garantia e cobertura — Koda" }] }),
  component: Warranty,
});

const cards = [
  { icon: Fingerprint, title: "Identificada pelo aparelho", text: "Cada KodaBot tem um número de série único gravado fisicamente na parte inferior da carcaça." },
  { icon: Cloud, title: "Vinculada ao KodaCloud", text: "Quando o aparelho é ativado no primeiro setup, ele fica associado à conta do comprador e passa a aparecer em Meu KodaBot." },
  { icon: CalendarCheck, title: "Datas registradas pela Koda", text: "Data de compra, início e expiração da garantia ficam no registro de fábrica do dispositivo e não precisam ser digitadas pelo cliente." },
];

function Warranty() {
  return (
    <main>
      <section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28">
        <ShieldCheck className="mx-auto h-10 w-10 text-[#0071e3]" />
        <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Garantia ligada ao seu KodaBot.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">O KodaCloud conecta o registro criado pela fábrica ao aparelho ativado pelo comprador.</p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return <article key={card.title} className="rounded-[28px] bg-[#f5f5f7] p-7"><Icon className="h-8 w-8 text-[#0071e3]" /><h2 className="mt-12 text-2xl font-semibold tracking-[-0.03em]">{card.title}</h2><p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{card.text}</p></article>;
          })}
        </div>

        <div className="mt-16 grid gap-8 border-t border-black/10 pt-12 md:grid-cols-[1fr_1.2fr]">
          <div><p className="text-sm font-semibold text-[#6e6e73]">Consultar cobertura</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">Veja a garantia em Meu KodaBot.</h2></div>
          <div>
            <p className="text-base leading-relaxed text-[#6e6e73]">Depois da ativação, a conta mostra o modelo, número de série, status do produto e as datas de garantia registradas pela Koda.</p>
            <a href="/conta" className="mt-6 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Abrir Meu KodaBot</a>
          </div>
        </div>

        <p className="mt-14 rounded-2xl bg-[#fff8e8] p-5 text-xs leading-relaxed text-[#6e6e73]"><strong className="text-[#1d1d1f]">Importante:</strong> os termos jurídicos definitivos de cobertura, prazos e exclusões ainda precisam ser definidos pela Koda antes da comercialização. Esta página já prepara a experiência digital sem inventar regras que ainda não foram aprovadas.</p>
      </section>
    </main>
  );
}
