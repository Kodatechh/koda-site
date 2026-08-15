import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

export const Route = createFileRoute("/kodabot-pro/tech-specs")({
  head: () => ({ meta: [{ title: "KodaBot I Pro — Especificações técnicas — Koda" }] }),
  component: ProSpecs,
});

const sections = [
  { title: "Experiência", rows: [["Tipo", "Assistente de voz"], ["Tela", false], ["Interação principal", "Voz"], ["Controles físicos", true]] },
  { title: "Processamento", rows: [["Plataforma preferencial", "ESP32‑S3"], ["Software", "Software Koda / integração KodaCloud"], ["OTA", "Planejado"]] },
  { title: "Áudio", rows: [["Microfones", "Integrados · quantidade em definição"], ["Alto-falante", true], ["Assistente por voz", true], ["Buzzer dedicado", false]] },
  { title: "Conectividade", rows: [["Wi‑Fi", true], ["Configuração guiada", "Planejada"], ["Conta KodaCloud", true], ["Ativação no primeiro setup", true]] },
  { title: "Energia", rows: [["USB‑C", true], ["Bateria integrada", true], ["Uso sem tomada", true], ["Autonomia final", "Em definição"]] },
  { title: "Identificação e suporte", rows: [["Número de série", "Gravado na parte inferior da carcaça"], ["Garantia no KodaCloud", true], ["Reparo de tela", false], ["Reparo de microfones", true], ["Reparo de alto-falante", true], ["Reparo de bateria", true]] },
] as const;

function Value({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-5 w-5 text-[#2997ff]" />;
  if (value === false) return <Minus className="h-5 w-5 text-white/35" />;
  return <span>{value}</span>;
}

function ProSpecs() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="sticky top-11 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-5">
          <a href="/kodabot-pro" className="text-lg font-semibold tracking-[-0.03em]">KodaBot I Pro</a>
          <div className="flex items-center gap-5 text-xs"><a href="/kodabot-pro" className="text-white/60 hover:text-white">Visão geral</a><span className="font-semibold">Especificações</span></div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-20 sm:pt-28">
        <p className="text-sm font-semibold text-white/45">KodaBot I Pro</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Especificações técnicas.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/50">O primeiro protótipo Pro ainda está em definição. Esta página separa o que já foi decidido do que ainda será fechado durante o desenvolvimento.</p>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-28">
        {sections.map((section) => (
          <section key={section.title} className="grid gap-7 border-t border-white/15 py-10 md:grid-cols-[240px_1fr]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{section.title}</h2>
            <dl>
              {section.rows.map(([label, value]) => (
                <div key={label} className="grid gap-2 border-b border-white/10 py-4 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="text-sm text-white/45">{label}</dt>
                  <dd className="text-sm font-medium"><Value value={value} /></dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </main>
  );
}
