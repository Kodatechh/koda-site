import { createFileRoute } from "@tanstack/react-router";
import { Bell, Cpu, Layers3, Monitor, Thermometer, Wifi, Zap } from "lucide-react";

export const Route = createFileRoute("/kodabot/por-dentro")({
  head: () => ({ meta: [{ title: "Por dentro do KodaBot — Koda" }] }),
  component: InsideKodaBot,
});

const parts = [
  { icon: Cpu, title: "Raspberry Pi Pico 2 W", text: "O núcleo do KodaBot. Executa o KODA OS em MicroPython e fornece a conectividade Wi‑Fi usada pelo produto." },
  { icon: Monitor, title: "Tela touch de 2,8″", text: "A principal forma de interação. Mostra hora, tarefas, alertas e outras informações do KODA OS." },
  { icon: Thermometer, title: "BME280", text: "Sensor ambiental previsto para medir temperatura, umidade e pressão dentro da experiência do KodaBot." },
  { icon: Bell, title: "Buzzer", text: "Responsável por alertas simples e sinais sonoros sem transformar o KodaBot em um alto-falante." },
  { icon: Wifi, title: "Conectividade", text: "O Wi‑Fi permite configuração inicial, sincronização de hora, acesso local e a base para serviços KodaCloud e OTA." },
  { icon: Zap, title: "Alimentação USB", text: "O KodaBot foi pensado para ficar na mesa e permanecer conectado à alimentação, sem bateria integrada nesta geração." },
];

function InsideKodaBot() {
  return (
    <main className="bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="bg-black px-5 py-24 text-center text-white sm:py-36">
        <Layers3 className="mx-auto h-9 w-9 text-[#2997ff]" />
        <p className="mt-6 text-sm font-semibold text-white/55">Tecnologia</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Por dentro do KodaBot.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/58 sm:text-xl">
          Poucos componentes, cada um com uma função clara. A arquitetura do KodaBot foi pensada para manter o produto simples, reparável e adequado ao tamanho da mesa.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {parts.map((part, index) => {
            const Icon = part.icon;
            return (
              <article key={part.title} className={`rounded-[30px] p-8 sm:p-10 ${index === 0 ? "bg-black text-white md:col-span-2" : "bg-white"}`}>
                <Icon className={`h-9 w-9 ${index === 0 ? "text-[#2997ff]" : "text-[#0071e3]"}`} />
                <h2 className="mt-12 text-3xl font-semibold tracking-[-0.04em]">{part.title}</h2>
                <p className={`mt-4 max-w-xl text-base leading-relaxed ${index === 0 ? "text-white/58" : "text-[#6e6e73]"}`}>{part.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold text-[#6e6e73]">Do hardware ao KODA OS</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">Uma arquitetura que você consegue entender.</h2>
          <div className="mt-14 grid gap-3 md:grid-cols-5">
            {["Energia", "Pico 2 W", "KODA OS", "Tela e sensores", "KodaCloud"].map((label, index) => (
              <div key={label} className="relative rounded-2xl bg-[#f5f5f7] px-4 py-6 text-center text-sm font-semibold">
                <span className="mb-3 block text-[11px] text-[#86868b]">0{index + 1}</span>{label}
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
            Esta página mostra a arquitetura funcional, não uma vista mecânica final. Quando as fotos e modelos 3D oficiais estiverem prontos, a Koda poderá adicionar uma visualização explodida fiel do produto aqui.
          </p>
        </div>
      </section>
    </main>
  );
}