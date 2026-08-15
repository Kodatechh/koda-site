import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { Nav } from "@/components/koda/Nav";

type Model = {
  name: string;
  status: string;
  image: string;
  imageAlt: string;
  availability: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
  specs: Record<string, string | boolean>;
};

const specRows: { key: string; label: string }[] = [
  { key: "tipo", label: "Tipo" },
  { key: "tela", label: "Tela" },
  { key: "processador", label: "Processador" },
  { key: "interface", label: "Interface principal" },
  { key: "audio", label: "Áudio" },
  { key: "sensores", label: "Sensores" },
  { key: "conectividade", label: "Conectividade" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "sistema", label: "Sistema" },
  { key: "tarefas", label: "Tarefas e lembretes" },
  { key: "voz", label: "Assistente por voz" },
];

const models: Model[] = [
  {
    name: "KodaBot I",
    status: "EM DESENVOLVIMENTO",
    image: "/kodabot-white.jpg",
    imageAlt: "KodaBot I em fundo claro",
    availability: "Primeira geração",
    cta: "Conhecer",
    ctaHref: "/#kodabot",
    featured: true,
    specs: {
      tipo: "Assistente de mesa",
      tela: "Touch 2,8″ · 240×320",
      processador: "Raspberry Pi Pico 2 W",
      interface: "Tela touch + painel local",
      audio: "Buzzer",
      sensores: "BME280",
      conectividade: "Wi‑Fi 2,4 GHz",
      alimentacao: "USB",
      sistema: "KODA OS",
      tarefas: true,
      voz: false,
    },
  },
  {
    name: "KodaBot I Pro",
    status: "EM DESENVOLVIMENTO",
    image: "/kodabot-hero.jpg",
    imageAlt: "Conceito visual do KodaBot I Pro",
    availability: "Linha Pro",
    cta: "Conhecer",
    ctaHref: "/#roadmap",
    featured: false,
    specs: {
      tipo: "Assistente de voz",
      tela: "Sem tela",
      processador: "ESP32‑S3",
      interface: "Voz",
      audio: "Microfone + alto-falante",
      sensores: "Arquitetura modular",
      conectividade: "Wi‑Fi",
      alimentacao: "USB‑C + bateria",
      sistema: "Software Koda",
      tarefas: true,
      voz: true,
    },
  },
];

const title = "Comparar KodaBot I e KodaBot I Pro — Koda";
const description =
  "Compare os dois produtos da linha atual da Koda: KodaBot I e KodaBot I Pro.";

export const Route = createFileRoute("/comparar")({
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
  component: Comparar,
});

function Value({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-accent" aria-label="Sim" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Não" />;
  return <span>{value}</span>;
}

function Comparar() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-20">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Comparar</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Qual KodaBot combina com você?
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Tela e informação à primeira vista ou uma experiência baseada em voz. Compare a linha atual da Koda.
        </p>

        <div className="mt-16 overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[minmax(160px,1fr)_repeat(2,minmax(210px,1fr))] gap-x-8">
              <div />
              {models.map((m) => (
                <div key={m.name} className="text-center">
                  <img
                    src={m.image}
                    alt={m.imageAlt}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="mx-auto aspect-square w-full max-w-[220px] rounded-3xl object-cover"
                  />
                  <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {m.status}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{m.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{m.availability}</p>
                  <a
                    href={m.ctaHref}
                    className={`mt-4 inline-flex rounded-full px-6 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                      m.featured
                        ? "bg-accent text-accent-foreground"
                        : "border border-border text-foreground"
                    }`}
                  >
                    {m.cta}
                  </a>
                </div>
              ))}
            </div>

            <dl className="mt-14 border-t border-border">
              {specRows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(160px,1fr)_repeat(2,minmax(210px,1fr))] items-center gap-x-8 border-b border-border py-5"
                >
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  {models.map((m) => (
                    <dd key={m.name} className="text-center text-sm font-medium">
                      <Value value={m.specs[row.key] ?? "—"} />
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-16 text-center">
          <a href="/" className="text-sm font-medium text-accent transition-opacity hover:opacity-70">
            ← Voltar para a Koda
          </a>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-10 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Koda. Produtos e especificações em desenvolvimento.</p>
        </div>
      </footer>
    </div>
  );
}
