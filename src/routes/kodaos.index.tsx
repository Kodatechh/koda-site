import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  CheckCircle2,
  Cloud,
  Command,
  Cpu,
  LayoutGrid,
  ListTodo,
  Minus,
  Moon,
  Thermometer,
  Wifi,
} from "lucide-react";

import { ProductPhotoSlot } from "@/components/koda/ProductPhotoSlot";

const title = "KODA OS — o sistema do KodaBot";
const description =
  "KODA OS: o sistema do KodaBot I, com configuração Wi‑Fi simples, painel local e uma base pronta para receber novas funções.";

export const Route = createFileRoute("/kodaos/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KodaOS,
});

const features = [
  {
    icon: LayoutGrid,
    title: "Interface em blocos",
    text: "Uma interface pensada para a tela de 2,8 polegadas do KodaBot I, com informação clara e rápida de consultar.",
  },
  {
    icon: ListTodo,
    title: "Tarefas e rotinas",
    text: "A base do sistema foi pensada para tarefas, rotinas, alarmes e informações úteis do dia a dia.",
  },
  {
    icon: Calendar,
    title: "Alarmes e lembretes",
    text: "Hora e data são sincronizadas pela internet, sem depender de um módulo RTC dedicado.",
  },
  {
    icon: Thermometer,
    title: "Ambiente em tempo real",
    text: "O KodaBot I foi preparado para integrar o BME280 e exibir dados do ambiente diretamente na experiência Koda.",
  },
  {
    icon: Wifi,
    title: "Sempre conectado",
    text: "O Raspberry Pi Pico 2 W se conecta ao Wi‑Fi, salva a rede e volta a conectar automaticamente nas próximas inicializações.",
  },
  {
    icon: Cloud,
    title: "Atualizações via OTA",
    text: "O sistema OTA está em desenvolvimento para permitir que futuras versões sejam baixadas pela internet, sem computador.",
  },
];

const osSpecs = [
  { label: "Base", value: "MicroPython" },
  { label: "Placa suportada", value: "Raspberry Pi Pico 2 W" },
  { label: "Tela", value: 'TFT Touch 2,8" 240×320 ST7789V' },
  { label: "Touch", value: "Resistivo, 1 ponto" },
  { label: "Sensores nativos", value: "BME280 (temp/umidade/pressão)" },
  { label: "Hora e data", value: "Sincronização via internet" },
  { label: "Conectividade", value: "Wi‑Fi 2,4 GHz" },
  { label: "Armazenamento", value: "Flash do Raspberry Pi Pico 2 W" },
  { label: "Fonte visual", value: "Sora" },
  { label: "Temas", value: "Escuro (padrão) · Claro (em breve)" },
];

const requirements = [
  { label: "KodaBot I", value: true, note: "Plataforma principal" },
  { label: "KodaBot I Pro", value: false, note: "Software próprio em desenvolvimento" },
  { label: "KodaBot II", value: false, note: "Reservado para o futuro" },
];

export function KodaOS() {
  const [activeTab, setActiveTab] = useState<"escuro" | "claro">("escuro");

  return (
    <main>
      <section className="hero-panel relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-24 text-center sm:pt-32">
          <p className="fade-up inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-ink-foreground/70 backdrop-blur">
            Software
          </p>
          <h1 className="fade-up mt-7 text-6xl font-semibold leading-[0.95] sm:text-8xl">
            KODA OS
          </h1>
          <p className="fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-foreground/65">
            O sistema operacional feito sob medida para o KodaBot. Leve, rápido e pensado para quem
            quer foco no que importa — tarefas, alarmes, hora e ambiente.
          </p>
          <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3 text-sm">
            <a
              href="/#comprar"
              className="rounded-full bg-ink-foreground px-7 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Conhecer o KodaBot
            </a>
            <a
              href="/kodaos/updates"
              className="rounded-full border border-ink-foreground/25 px-7 py-3 font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
            >
              Ver atualizações →
            </a>
          </div>

          <div className="fade-up relative mx-auto mt-16 max-w-4xl">
            <ProductPhotoSlot
              label="Aguardando kodabot-i-kodaos-dark"
              className="h-[420px] rounded-[2.5rem] sm:h-[620px]"
              dark
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-28">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Recursos</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">
            Tudo o que você precisa, na tela certa.
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-3xl bg-card p-7 shadow-[var(--shadow-soft)] transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Experiência
            </p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Pensado para o dia a dia, não para complicar.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              O KODA OS não tenta ser um computador. Ele é um assistente: liga, mostra o que importa
              e desliga quando você não precisa. Sem mil apps, sem distração.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Liga em segundos",
                "Interface touch responsiva",
                "Atualizações automáticas",
                "Baixo consumo de energia",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink p-8 text-ink-foreground shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">KODA OS</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("escuro")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeTab === "escuro" ? "bg-ink-foreground text-ink" : "text-ink-foreground/60 hover:text-ink-foreground"}`}
                >
                  <Moon className="mr-1 inline h-3 w-3" />
                  Escuro
                </button>
                <button
                  onClick={() => setActiveTab("claro")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeTab === "claro" ? "bg-ink-foreground text-ink" : "text-ink-foreground/60 hover:text-ink-foreground"}`}
                >
                  <Command className="mr-1 inline h-3 w-3" />
                  Claro
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ink-foreground/10 p-4">
                <ListTodo className="h-5 w-5 text-accent" />
                <p className="mt-2 text-xs text-ink-foreground/60">Tarefas</p>
                <p className="text-lg font-semibold">3 pendentes</p>
              </div>
              <div className="rounded-2xl bg-ink-foreground/10 p-4">
                <Cpu className="h-5 w-5 text-accent" />
                <p className="mt-2 text-xs text-ink-foreground/60">CPU</p>
                <p className="text-lg font-semibold">12% uso</p>
              </div>
              <div className="rounded-2xl bg-ink-foreground/10 p-4">
                <Thermometer className="h-5 w-5 text-accent" />
                <p className="mt-2 text-xs text-ink-foreground/60">Temperatura</p>
                <p className="text-lg font-semibold">24.6°C</p>
              </div>
              <div className="rounded-2xl bg-ink-foreground/10 p-4">
                <Wifi className="h-5 w-5 text-accent" />
                <p className="mt-2 text-xs text-ink-foreground/60">Rede</p>
                <p className="text-lg font-semibold">Conectado</p>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-ink-foreground/50">
              {activeTab === "escuro" ? "Tema escuro ativo" : "Tema claro em breve"}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-black px-5 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-white/45">KodaCloud</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
            O setup também sabe quem é o seu KodaBot.
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/55">
            No fluxo de ativação em desenvolvimento, cada aparelho sai da fábrica previamente
            cadastrado como Não ativado. Durante o primeiro setup, o comprador entra na Conta
            KodaCloud e o próprio dispositivo participa da validação.
          </p>
          <div className="mt-12 grid gap-3 md:grid-cols-4">
            {[
              ["01", "Fábrica", "Serial e dados do produto são cadastrados."],
              ["02", "Primeiro setup", "O KodaBot conecta à internet."],
              ["03", "KodaCloud", "O comprador entra ou cria a conta."],
              ["04", "Ativado", "O aparelho aparece em Meu KodaBot."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-2xl bg-white/[0.06] p-5">
                <span className="text-xs text-[#5b9cff]">{step}</span>
                <h3 className="mt-7 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{text}</p>
              </div>
            ))}
          </div>
          <a
            href="/suporte/configurar"
            className="mt-8 inline-flex text-sm font-semibold text-[#2997ff] hover:underline"
          >
            Entender a ativação ›
          </a>
        </div>
      </section>

      <section id="especificacoes" className="mx-auto max-w-6xl px-5 py-28">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Especificações
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl">
            O que faz o KODA OS rodar.
          </h2>
        </div>
        <dl className="mt-14 grid gap-x-12 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {osSpecs.map((s) => (
            <div
              key={s.label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-4 text-sm"
            >
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="text-right font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-5 py-28">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Compatibilidade
            </p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Funciona em todos os KodaBots.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {requirements.map((r) => (
              <div
                key={r.label}
                className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]"
              >
                <h3 className="text-xl font-semibold">{r.label}</h3>
                <div className="mt-4 inline-flex items-center justify-center rounded-full bg-accent/10 p-2">
                  {r.value ? (
                    <Check className="h-5 w-5 text-accent" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{r.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="ink-panel relative overflow-hidden rounded-[2.5rem] px-6 py-20 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
          <div className="relative">
            <h2 className="text-4xl font-semibold sm:text-6xl">Experimente o KODA OS.</h2>
            <p className="mx-auto mt-4 max-w-lg text-ink-foreground/65">
              O KODA OS vem instalado em todo KodaBot. Escolha o seu modelo e comece a organizar o
              dia.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3 text-sm">
              <a
                href="/#comprar"
                className="rounded-full bg-ink-foreground px-8 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Comprar KodaBot
              </a>
              <a
                href="/comparar"
                className="rounded-full border border-ink-foreground/25 px-8 py-3 font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
              >
                Comparar modelos
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
