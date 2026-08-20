import { createFileRoute } from "@tanstack/react-router";
import { Database, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade e segurança — Koda" }] }),
  component: Privacy,
});

const sections = [
  {
    icon: KeyRound,
    title: "Sua conta",
    text: "A Conta KodaCloud usa autenticação para identificar o usuário. Senhas são tratadas pelo serviço de autenticação do Supabase; o site não precisa armazenar senhas em uma tabela própria.",
  },
  {
    icon: Database,
    title: "Seus KodaBots",
    text: "O banco relaciona cada dispositivo ativado a um identificador de usuário. Políticas de acesso no banco (RLS) são usadas para que contas comuns consultem apenas os próprios aparelhos.",
  },
  {
    icon: ShieldCheck,
    title: "Número de série não é uma senha",
    text: "O serial continua visível para identificação e suporte, mas o projeto de ativação exige uma validação adicional do próprio dispositivo. Digitar um serial sozinho não concede propriedade.",
  },
  {
    icon: LockKeyhole,
    title: "Acesso administrativo",
    text: "Produção, comercial e suporte interno ficam concentrados no Admin Koda e são autorizados por função no backend. A interface não libera acesso apenas porque alguém alterou um e-mail ou uma variável no navegador.",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="bg-black px-5 py-20 text-center text-white sm:py-28">
          <LockKeyhole className="mx-auto h-10 w-10 text-[#2997ff]" />
          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
            Privacidade e segurança, desde a arquitetura.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/55">
            Conta, número de série, dispositivos e acesso administrativo não devem depender apenas
            do que acontece na interface do navegador.
          </p>
        </section>
        <section className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <article
                  key={section.title}
                  className="grid gap-5 rounded-[28px] bg-[#f5f5f7] p-7 sm:grid-cols-[52px_1fr]"
                >
                  <Icon className="h-8 w-8 text-[#0071e3]" />
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em]">{section.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{section.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-12 border-t border-black/10 pt-8">
            <h2 className="text-2xl font-semibold">Sobre esta página</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6e6e73]">
              Este é um resumo técnico da arquitetura atual do site, não uma Política de Privacidade
              jurídica definitiva. Antes de coletar dados de clientes em produção ou comercializar
              produtos, a Koda deverá publicar termos legais completos e adequados à operação.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
