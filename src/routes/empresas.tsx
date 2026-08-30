import { createFileRoute } from "@tanstack/react-router";
import { Building2, CalendarClock, MonitorCheck, UsersRound } from "lucide-react";
import { GrowthInterestForm } from "@/components/koda/GrowthInterestForm";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Koda para Empresas" }] }),
  component: BusinessPage,
});

function BusinessPage() {
  const items = [
    { icon: <CalendarClock />, title: "Agenda", text: "Avaliação de horários e rotinas visíveis." },
    {
      icon: <MonitorCheck />,
      title: "Informação",
      text: "Conteúdo essencial em um ponto dedicado.",
    },
    { icon: <UsersRound />, title: "Ambientes", text: "Ideias para recepção, salas e equipes." },
  ];
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-[#0b0c0e] px-5 py-24 text-white sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-sm font-semibold text-[#2997ff]">Koda para Empresas</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-semibold leading-[.94] tracking-[-.07em] sm:text-8xl">
              Informação no lugar certo.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/55">
              Estamos estudando aplicações do KodaBot em espaços de trabalho. Ainda não há versão
              empresarial, contrato ou disponibilidade comercial.
            </p>
          </div>
        </section>
        <section className="px-5 py-20">
          <div className="mx-auto max-w-[1080px]">
            <div className="grid gap-3 md:grid-cols-3">
              {items.map(({ icon, title, text }) => (
                <article key={title} className="rounded-[30px] bg-white p-8">
                  <span className="text-[#0071e3] [&>svg]:h-7 [&>svg]:w-7">{icon}</span>
                  <h2 className="mt-10 text-2xl font-semibold">{title}</h2>
                  <p className="mt-3 text-sm text-[#6e6e73]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="mb-7 text-center">
                <Building2 className="mx-auto h-7 w-7 text-[#0071e3]" />
                <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">
                  Conte seu cenário.
                </h2>
                <p className="mt-3 text-[#6e6e73]">
                  O cadastro serve para pesquisa e não representa proposta comercial.
                </p>
              </div>
              <GrowthInterestForm
                program="business"
                organizationLabel="Empresa ou organização"
                buttonLabel="Registrar interesse"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
