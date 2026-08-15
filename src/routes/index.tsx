import { createFileRoute } from "@tanstack/react-router";

import { Nav } from "@/components/koda/Nav";

type MergedContent = {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogType: string;
    twitterCard: string;
    ogImage?: string;
  };
  hero: {
    tagline: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    image: string;
    imageAlt: string;
  };
  intro: {
    title: string;
    subtitle: string;
    cards: { title: string; text: string; image: string; imageAlt: string; theme: "light" | "dark" }[];
  };
  roadmap: {
    title: string;
    items: { name: string; status: string; text: string }[];
  };
  buy: {
    title: string;
    price: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    note: string;
  };
  footer: {
    copyright: string;
    note: string;
  };
};

const defaultContent: MergedContent = {
  meta: {
    title: "KodaBot I — seu companheiro de mesa",
    description:
      "KodaBot I: o assistente de mesa da Koda. Tela touch, Raspberry Pi Pico 2 W, Wi‑Fi e KODA OS. Organize tarefas, alarmes e acompanhe informações do seu dia.",
    ogTitle: "KodaBot I — seu companheiro de mesa",
    ogDescription: "O assistente de mesa da Koda. Tela touch, Raspberry Pi Pico 2 W, Wi‑Fi e KODA OS.",
    ogType: "product",
    twitterCard: "summary_large_image",
  },
  hero: {
    tagline: "Novo",
    title: "KodaBot I",
    subtitle:
      "Seu companheiro de mesa. Um assistente compacto que ajuda a manter o foco no que importa: tarefas, alarmes, hora e temperatura — em um só olhar.",
    ctaPrimary: "Comprar",
    ctaSecondary: "Conhecer",
    image: "/kodabot-hero.jpg",
    imageAlt: "KodaBot I, assistente de mesa da Koda com tela touch acesa",
  },
  intro: {
    title: "Um produto. Feito do jeito certo.",
    subtitle: "Hardware aberto, componentes de qualidade e design pensado para quem cria.",
    cards: [
      {
        title: "Design de mesa",
        text: "Corpo compacto, carcaça robusta e acabamento preciso. Cabe em qualquer canto da sua mesa sem competir pela atenção.",
        image: "/kodabot-white.jpg",
        imageAlt: "KodaBot I em fundo claro, mostrando a forma compacta e a tela frontal",
        theme: "light",
      },
      {
        title: "Tela expressiva",
        text: "Display TFT touch de 2,8 polegadas com interface clara. Você vê tarefas, hora, temperatura e uma cara amigável que responde.",
        image: "/kodabot-detail.jpg",
        imageAlt: "Detalhe da tela do KodaBot I com interface do KODA OS",
        theme: "dark",
      },
    ],
  },
  roadmap: {
    title: "O que vem por aí.",
    items: [
      { name: "KodaBot I", status: "Em desenvolvimento", text: "O assistente de mesa compacto da Koda, com tela touch, Wi‑Fi e KODA OS." },
      { name: "KodaBot I Pro", status: "Em desenvolvimento", text: "Assistente de voz sem tela, com áudio integrado, Wi‑Fi e uma experiência Koda mais natural." },
      { name: "KodaBot II", status: "Futuro", text: "Uma nova geração reservada para o futuro da linha KodaBot." },
    ],
  },
  buy: {
    title: "KodaBot I",
    price: "Em desenvolvimento",
    subtitle: "A primeira geração do KodaBot está em desenvolvimento. Novidades sobre disponibilidade serão publicadas aqui.",
    ctaPrimary: "Acompanhar projeto",
    ctaSecondary: "Conhecer KODA OS",
    note: "Venda ainda não iniciada.",
  },
  footer: {
    copyright: "Koda Eletrônicos.",
    note: "Preços em reais. Imagens ilustrativas.",
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: defaultContent.meta.title },
      { name: "description", content: defaultContent.meta.description },
      { property: "og:title", content: defaultContent.meta.ogTitle },
      { property: "og:description", content: defaultContent.meta.ogDescription },
      { property: "og:type", content: defaultContent.meta.ogType },
      { name: "twitter:card", content: defaultContent.meta.twitterCard },
    ],
  }),
  component: Index,
});

function Index() {
  const c = defaultContent;

  return (
    <div id="top" className="min-h-screen">
      <Nav />

      <main>
        <section id="kodabot" className="hero-panel relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-[14%] h-[560px] w-[560px] -translate-x-1/2 accent-glow opacity-60 blur-2xl" />
          <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-24 text-center sm:pt-28">
            <p className="fade-up inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-ink-foreground/70 backdrop-blur">
              {c.hero.tagline}
            </p>
            <h1 className="fade-up mt-7 text-6xl font-semibold leading-[0.95] sm:text-8xl">{c.hero.title}</h1>
            <p className="fade-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-foreground/65">
              {c.hero.subtitle}
            </p>
            <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3 text-sm">
              <a
                href="#comprar"
                className="rounded-full bg-ink-foreground px-7 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                {c.hero.ctaPrimary}
              </a>
              <a
                href="#tecnologia"
                className="rounded-full border border-ink-foreground/25 px-7 py-3 font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
              >
                {c.hero.ctaSecondary} →
              </a>
            </div>
            <div className="fade-up relative mt-14">
              <img
                src={c.hero.image}
                alt={c.hero.imageAlt}
                width={1600}
                height={1104}
                className="mx-auto w-full max-w-4xl rounded-t-[2.5rem]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[oklch(0.09_0.004_260)] to-transparent" />
            </div>
          </div>

          <div className="relative border-t border-ink-foreground/10">
            <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-5 py-10 sm:grid-cols-4">
              {[
                { label: "Tela", value: "TFT Touch 2,8\" 240×320 ST7789V" },
                { label: "Processador", value: "Raspberry Pi Pico 2 W" },
                { label: "Conectividade", value: "Wi‑Fi 2,4 GHz" },
                { label: "Hora e data", value: "Sincronização pela internet" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-ink-foreground/45">{s.label}</dt>
                  <dd className="mt-2 text-sm font-medium text-ink-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-28">
          <h2 className="max-w-2xl text-4xl font-semibold sm:text-5xl">{c.intro.title}</h2>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{c.intro.subtitle}</p>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {c.intro.cards.map((card) => {
              const isDark = card.theme === "dark";
              return (
                <div
                  key={card.title}
                  className={`group relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] transition-transform duration-500 hover:-translate-y-1 ${isDark ? "bg-ink text-ink-foreground" : "bg-secondary"}`}
                >
                  <div className="overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      loading="lazy"
                      width={1200}
                      height={1200}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="p-9">
                    <h3 className="text-2xl font-semibold">{card.title}</h3>
                    <p
                      className={`mt-3 text-sm leading-relaxed ${isDark ? "text-ink-foreground/70" : "text-muted-foreground"}`}
                    >
                      {card.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>



        <section id="roadmap" className="mx-auto max-w-6xl px-5 py-28">
          <h2 className="text-4xl font-semibold sm:text-5xl">{c.roadmap.title}</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {c.roadmap.items.map((r) => (
              <article
                key={r.name}
                className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition-transform duration-300 hover:-translate-y-1"
              >
                <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {r.status}
                </p>
                <h3 className="mt-4 text-xl font-semibold">{r.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="comprar" className="mx-auto max-w-6xl px-5 pb-28">
          <div className="ink-panel relative overflow-hidden rounded-[2.5rem] px-6 py-20 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 accent-glow opacity-50 blur-2xl" />
            <div className="relative">
              <h2 className="text-4xl font-semibold sm:text-6xl">{c.buy.title}</h2>
              <p className="mt-4 text-2xl font-medium">{c.buy.price}</p>
              <p className="mx-auto mt-4 max-w-lg text-ink-foreground/65">{c.buy.subtitle}</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3 text-sm">
                <a href="#roadmap" className="rounded-full bg-ink-foreground px-8 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5">
                  {c.buy.ctaPrimary}
                </a>
                <a href="/kodaos" className="rounded-full border border-ink-foreground/25 px-8 py-3 font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10">
                  {c.buy.ctaSecondary}
                </a>
              </div>
              <p className="mt-5 text-xs text-ink-foreground/50">{c.buy.note}</p>
            </div>
          </div>
        </section>

      </main>

      <footer id="suporte" className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {c.footer.copyright}</p>
          <p>{c.footer.note}</p>
        </div>
      </footer>
    </div>
  );
}
