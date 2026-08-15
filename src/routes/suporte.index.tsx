import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Wrench, FileText } from "lucide-react";

const title = "Suporte — Koda";
const description =
  "Central de suporte da Koda. Orçamentos de reparo, perguntas frequentes e atendimento para o seu KodaBot.";

export const Route = createFileRoute("/suporte/")({
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
  component: Suporte,
});

const links = [
  {
    label: "Orçamento de reparo",
    note: "Estime o valor do conserto",
    href: "/suporte/orcamentos",
    icon: Wrench,
  },
  {
    label: "Fale conosco",
    note: "suporte@koda.shop",
    href: "mailto:suporte@koda.shop",
    icon: MessageCircle,
  },
  {
    label: "Perguntas frequentes",
    note: "Em breve",
    href: "#",
    icon: FileText,
  },
];

function Suporte() {
  return (
    <main>
      <section className="hero-panel relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-24 text-center sm:pt-32">
          <p className="fade-up inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-ink-foreground/70 backdrop-blur">
            Ajuda
          </p>
          <h1 className="fade-up mt-7 text-5xl font-semibold leading-[0.95] sm:text-7xl">
            Suporte Koda
          </h1>
          <p className="fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-foreground/65">
            Tire dúvidas, solicite orçamentos de reparo e encontre tudo o que precisa para cuidar do seu KodaBot.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                className="group rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1"
              >
                <Icon className="h-8 w-8 text-ring" />
                <h3 className="mt-5 text-xl font-semibold">{link.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{link.note}</p>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
