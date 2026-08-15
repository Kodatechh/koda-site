import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Wrench } from "lucide-react";

const title = "Orçamento de reparo — Koda";
const description =
  "Estime o custo do reparo do seu KodaBot. Selecione o modelo e o defeito para receber uma estimativa imediata.";

export const Route = createFileRoute("/suporte/orcamentos")({
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
  component: Orcamentos,
});

type Model = "i" | "pro";

const models: { id: Model; name: string; note: string }[] = [
  { id: "i", name: "KodaBot I", note: "Reparos disponíveis" },
  { id: "pro", name: "KodaBot I Pro", note: "Reparos selecionados" },
];

type Defect = {
  id: string;
  label: string;
  price: Record<Model, number | null | "indisponivel">;
};

const defects: Defect[] = [
  {
    id: "nao-liga",
    label: "Meu KodaBot não liga.",
    price: { i: null, pro: null },
  },
  {
    id: "nao-funciona",
    label: "Meu KodaBot não funciona corretamente.",
    price: { i: null, pro: null },
  },
  {
    id: "carcaça",
    label: "Meu KodaBot está com a carcaça quebrada.",
    price: { i: 15, pro: 20 },
  },
  {
    id: "tela",
    label: "Meu KodaBot está com a tela quebrada.",
    price: { i: 40, pro: "indisponivel" },
  },
  {
    id: "autofalante",
    label: "Meu KodaBot auto-falante quebrado.",
    price: { i: 6, pro: 34 },
  },
  {
    id: "temperatura",
    label: "Meu KodaBot não consegue medir a temperatura do ambiente.",
    price: { i: 25, pro: "indisponivel" },
  },
];

function formatPrice(value: number | null | "indisponivel") {
  if (value === "indisponivel") return "Indisponível";
  if (value === null) return "Inspeção necessária";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function Orcamentos() {
  const [model, setModel] = useState<Model | null>(null);
  const [defectId, setDefectId] = useState<string | null>(null);

  const selectedDefect = defects.find((d) => d.id === defectId);
  const modelName = models.find((m) => m.id === model)?.name;

  return (
    <main>
      <section className="hero-panel relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-24 text-center sm:pt-32">
          <p className="fade-up inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-ink-foreground/70 backdrop-blur">
            Suporte
          </p>
          <h1 className="fade-up mt-7 text-5xl font-semibold leading-[0.95] sm:text-7xl">
            Orçamento de reparo
          </h1>
          <p className="fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-foreground/65">
            Estime o custo do reparo do seu KodaBot em segundos. Selecione o modelo e o defeito para ver a estimativa.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">1. Qual é o seu KodaBot?</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`rounded-3xl border p-6 text-left transition-all ${
                    model === m.id
                      ? "border-ring bg-accent/10"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{m.name}</span>
                    {model === m.id && <CheckCircle2 className="h-5 w-5 text-ring" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Qual é o defeito?</h2>
            <div className="mt-6 space-y-3">
              {defects.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDefectId(d.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm transition-all ${
                    defectId === d.id
                      ? "border-ring bg-accent/10"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <span className="font-medium">{d.label}</span>
                  {defectId === d.id && <CheckCircle2 className="h-4 w-4 text-ring" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="ink-panel relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
            <div className="relative">
              <Wrench className="mx-auto h-8 w-8 text-ink-foreground/70" />
              <h3 className="mt-4 text-3xl font-semibold">Estimativa de reparo</h3>

              {model && selectedDefect ? (
                (() => {
                  const currentPrice = selectedDefect.price[model];
                  return (
                    <div className="mt-6">
                      <p className="text-sm text-ink-foreground/60">
                        {modelName} · {selectedDefect.label}
                      </p>
                      <p className="mt-3 text-5xl font-semibold tracking-tight">
                        {formatPrice(currentPrice)}
                      </p>

                      {currentPrice === null && (
                        <p className="mx-auto mt-4 max-w-md text-sm text-ink-foreground/70">
                          Envie seu KodaBot para análise. O valor será definido após o diagnóstico técnico.
                        </p>
                      )}

                      {currentPrice === "indisponivel" && (
                        <p className="mx-auto mt-4 max-w-md text-sm text-ink-foreground/70">
                          Não oferecemos reparo para esse defeito no KodaBot I Pro. Entre em contato para avaliar outras opções.
                        </p>
                      )}

                      {typeof currentPrice === "number" && (
                        <p className="mx-auto mt-4 max-w-md text-sm text-ink-foreground/70">
                          Valor estimado para o reparo. O preço final pode ser confirmado após inspeção.
                        </p>
                      )}

                      <a
                        href="mailto:suporte@koda.shop?subject=Orçamento de reparo"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink-foreground px-8 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
                      >
                        Solicitar reparo <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                  );
                })()
              ) : (
                <p className="mx-auto mt-6 max-w-md text-ink-foreground/65">
                  Selecione o modelo e o defeito acima para receber a estimativa.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
