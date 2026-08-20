import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Factory, Headphones, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin Koda" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminHome,
});

const areas = [
  {
    title: "Produção",
    text: "Provisionamento, testes, inventário e liberação de KodaBots.",
    href: "/admin/fabrica",
    icon: Factory,
  },
  {
    title: "Comercial",
    text: "Catálogo, pedidos, pagamentos, estoque e atividade financeira.",
    href: "/admin/financeiro",
    icon: Banknote,
  },
  {
    title: "Suporte",
    text: "Dispositivos, diagnósticos, casos e recuperação assistida.",
    href: "/admin/suporte",
    icon: Headphones,
  },
] as const;

function AdminHome() {
  const { user, loading, isFactoryAdmin, isSupportAgent } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f7] text-sm text-[#6e6e73]">
        Validando acesso…
      </div>
    );
  const allowed = Boolean(user && (isFactoryAdmin || isSupportAgent));
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 py-14 sm:py-20">
        {!allowed ? (
          <section className="grid min-h-[560px] place-items-center text-center">
            <div>
              <ShieldCheck className="mx-auto h-10 w-10 text-[#86868b]" />
              <h1 className="mt-5 text-4xl font-semibold tracking-[-.045em]">
                Painel interno da Koda.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6e6e73]">
                Entre com uma conta autorizada da equipe para acessar produção, comercial e suporte.
              </p>
              <a
                href="/conta/entrar?next=%2Fadmin"
                className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
              >
                Entrar
              </a>
            </div>
          </section>
        ) : (
          <>
            <header>
              <p className="text-sm font-semibold text-[#0071e3]">Koda · equipe interna</p>
              <h1 className="mt-2 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Admin.</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#6e6e73]">
                Uma única entrada para operar o ciclo completo, da produção ao pós-venda.
              </p>
            </header>
            <section className="mt-12 grid gap-4 md:grid-cols-3">
              {areas
                .filter((area) => isFactoryAdmin || area.href === "/admin/suporte")
                .map((area) => {
                  const Icon = area.icon;
                  return (
                    <a
                      key={area.href}
                      href={area.href}
                      className="group min-h-[280px] rounded-[32px] bg-white p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,.08)]"
                    >
                      <Icon className="h-8 w-8 text-[#0071e3]" />
                      <h2 className="mt-20 text-3xl font-semibold tracking-[-.045em]">
                        {area.title}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{area.text}</p>
                      <span className="mt-6 inline-flex text-sm font-semibold text-[#0066cc]">
                        Abrir ›
                      </span>
                    </a>
                  );
                })}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
