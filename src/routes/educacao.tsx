import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Clock3, Focus, Users } from "lucide-react";
import { GrowthInterestForm } from "@/components/koda/GrowthInterestForm";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/educacao")({
  head: () => ({ meta: [{ title: "Koda para Educação" }] }),
  component: EducationPage,
});

function EducationPage() {
  return (
    <ProgramPage
      eyebrow="Koda para Educação"
      title="Rotinas visíveis. Menos distrações."
      description="Estamos avaliando como o KodaBot pode apoiar estudo, tempo de atividade e rotinas em ambientes educacionais. Ainda não é um produto ou pacote disponível."
      items={[
        { icon: <Clock3 />, title: "Tempo", text: "Temporizadores e horários visíveis." },
        { icon: <Focus />, title: "Foco", text: "Informação essencial sem abrir um feed." },
        { icon: <Users />, title: "Rotina", text: "Uma referência simples para atividades." },
      ]}
      form={
        <GrowthInterestForm
          program="education"
          organizationLabel="Escola ou instituição"
          buttonLabel="Participar da avaliação"
        />
      }
    />
  );
}

function ProgramPage({
  eyebrow,
  title,
  description,
  items,
  form,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: { icon: React.ReactNode; title: string; text: string }[];
  form: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-white px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-sm font-semibold text-[#0071e3]">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-semibold leading-[.94] tracking-[-.07em] sm:text-8xl">
              {title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">{description}</p>
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
                <BookOpen className="mx-auto h-7 w-7 text-[#0071e3]" />
                <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">
                  Ajude a Koda a avaliar essa ideia.
                </h2>
              </div>
              {form}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
