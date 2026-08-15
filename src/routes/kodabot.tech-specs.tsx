import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

export const Route = createFileRoute("/kodabot/tech-specs")({
  head: () => ({ meta: [{ title: "KodaBot I — Especificações técnicas — Koda" }] }),
  component: TechSpecs,
});

const sections = [
  {
    title: "Tela e interface",
    rows: [
      ["Tela", "TFT 2,8″"],
      ["Resolução", "240 × 320"],
      ["Interface", "SPI"],
      ["Touch", "Resistivo, integrado ao módulo"],
      ["Sistema visual", "KODA OS"],
      ["Fonte da interface", "Sora"],
    ],
  },
  {
    title: "Processamento",
    rows: [
      ["Placa", "Raspberry Pi Pico 2 W"],
      ["Firmware", "MicroPython"],
      ["Inicialização", "Boot automático via main.py"],
      ["Armazenamento", "Flash do Pico 2 W"],
    ],
  },
  {
    title: "Conectividade",
    rows: [
      ["Wi‑Fi", "2,4 GHz"],
      ["Configuração inicial", "KodaBot-Setup + captive portal"],
      ["Rede salva", "Reconexão automática"],
      ["Acesso local", "kodabot.local"],
      ["Painel", "Servidor HTTP local"],
    ],
  },
  {
    title: "Sensores e áudio",
    rows: [
      ["Sensor ambiental", "BME280"],
      ["Medições previstas", "Temperatura, umidade e pressão"],
      ["Alertas sonoros", "Buzzer"],
      ["Microfones", false],
      ["Alto-falante", false],
    ],
  },
  {
    title: "Hora, nuvem e software",
    rows: [
      ["Hora e data", "Sincronização pela internet"],
      ["RTC dedicado", false],
      ["Conta KodaCloud", true],
      ["Ativação no primeiro setup", true],
      ["Meu KodaBot", "Vínculo automático após ativação"],
      ["OTA", "Em desenvolvimento"],
    ],
  },
  {
    title: "Energia",
    rows: [
      ["Alimentação", "USB / fonte externa"],
      ["Bateria integrada", false],
      ["Uso previsto", "Mesa, conectado à alimentação"],
    ],
  },
  {
    title: "Identificação e suporte",
    rows: [
      ["Número de série", "Gravado na parte inferior da carcaça"],
      ["Garantia", "Vinculada ao registro do dispositivo no KodaCloud"],
      ["Reparo de tela/touch", true],
      ["Reparo de sensor", true],
      ["Reparo de buzzer", true],
    ],
  },
] as const;

function Value({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-5 w-5 text-[#0071e3]" aria-label="Sim" />;
  if (value === false) return <Minus className="h-5 w-5 text-[#86868b]" aria-label="Não" />;
  return <span>{value}</span>;
}

function TechSpecs() {
  return (
    <main className="bg-white text-[#1d1d1f]">
      <div className="sticky top-11 z-40 border-b border-black/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-5">
          <a href="/kodabot" className="text-lg font-semibold tracking-[-0.03em]">KodaBot I</a>
          <div className="flex items-center gap-5 text-xs">
            <a href="/kodabot" className="text-[#424245] hover:text-black">Visão geral</a>
            <span className="font-semibold">Especificações</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-20 sm:pt-28">
        <p className="text-sm font-semibold text-[#6e6e73]">KodaBot I</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Especificações técnicas.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
          A ficha técnica atual do primeiro KodaBot. Como o produto ainda está em desenvolvimento, dimensões finais e alguns detalhes de hardware podem mudar antes do lançamento.
        </p>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-28">
        {sections.map((section) => (
          <section key={section.title} className="grid gap-7 border-t border-black/15 py-10 md:grid-cols-[240px_1fr]">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{section.title}</h2>
            <dl>
              {section.rows.map(([label, value]) => (
                <div key={label} className="grid gap-2 border-b border-black/10 py-4 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="text-sm text-[#6e6e73]">{label}</dt>
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
