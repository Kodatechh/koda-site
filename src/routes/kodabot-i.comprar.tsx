import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Package, ShieldCheck } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { ProductPhotoSlot } from "@/components/koda/ProductPhotoSlot";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { formatBRL, kodaCarePlans, type KodaCarePlanId } from "@/lib/kodacare";

export const Route = createFileRoute("/kodabot-i/comprar")({
  head: () => ({ meta: [{ title: "Comprar KodaBot I — Pré-venda Koda" }] }),
  component: BuyKodaBot,
});

const PRODUCT_PRICE = 99.9;

function BuyKodaBot() {
  const [care, setCare] = useState<KodaCarePlanId | "none">("none");
  const selectedCare = kodaCarePlans.find((plan) => plan.id === care);
  const total = useMemo(() => PRODUCT_PRICE + (selectedCare?.price ?? 0), [selectedCare]);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <div className="sticky top-11 z-30 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5">
          <span className="text-sm font-semibold">KodaBot I</span>
          <span className="text-xs text-[#6e6e73]">Pré-venda · {formatBRL(PRODUCT_PRICE)}</span>
        </div>
      </div>

      <main>
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:items-start lg:py-20">
          <div className="lg:sticky lg:top-28">
            <ProductPhotoSlot
              label="Aguardando kodabot-i-product-cutout"
              className="h-[440px] sm:h-[620px] lg:h-[720px]"
            />
          </div>

          <div className="pb-8">
            <p className="text-sm font-semibold text-[#0066cc]">Pré-venda</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">
              KodaBot I
            </h1>
            <p className="mt-5 text-2xl font-semibold">{formatBRL(PRODUCT_PRICE)}</p>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-[#6e6e73]">
              Um assistente de mesa simples, útil e bonito para o dia a dia.
            </p>

            <Step number="1" title="Seu KodaBot">
              <div className="flex items-center justify-between gap-5 rounded-[26px] bg-[#f5f5f7] p-6">
                <div>
                  <strong className="text-lg">KodaBot I</strong>
                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Modelo único disponível na pré-venda
                  </p>
                </div>
                <strong>{formatBRL(PRODUCT_PRICE)}</strong>
              </div>
            </Step>

            <Step number="2" title="Adicione KodaCare?">
              <div className="space-y-3">
                <PlanOption
                  selected={care === "none"}
                  onClick={() => setCare("none")}
                  title="Sem KodaCare"
                  subtitle="Garantia de fábrica incluída"
                  price="R$ 0,00"
                />
                {kodaCarePlans.map((plan) => (
                  <PlanOption
                    key={plan.id}
                    selected={care === plan.id}
                    onClick={() => setCare(plan.id)}
                    title={plan.name}
                    subtitle={plan.duration}
                    price={formatBRL(plan.price)}
                    benefits={plan.benefits}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#86868b]">
                Também é possível contratar um plano elegível em até 30 dias após a compra.
              </p>
            </Step>

            <Step number="3" title="Entrega">
              <div className="rounded-[26px] bg-[#f5f5f7] p-6">
                <p className="font-semibold">Informações confirmadas no atendimento.</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
                  Prazo, disponibilidade e endereço serão confirmados antes de qualquer cobrança.
                </p>
              </div>
            </Step>

            <section className="mt-14 border-t border-black/10 pt-10" aria-live="polite">
              <p className="text-sm font-semibold text-[#0066cc]">Resumo</p>
              <div className="mt-7 space-y-5 text-sm">
                <div className="flex justify-between gap-5">
                  <span>KodaBot I</span>
                  <strong>{formatBRL(PRODUCT_PRICE)}</strong>
                </div>
                <div className="flex justify-between gap-5">
                  <span>{selectedCare?.name ?? "Sem KodaCare"}</span>
                  <strong>{formatBRL(selectedCare?.price ?? 0)}</strong>
                </div>
              </div>
              <div className="mt-7 flex items-end justify-between border-t border-black/10 pt-7">
                <span className="font-semibold">Total</span>
                <strong className="text-3xl tracking-[-0.04em]">{formatBRL(total)}</strong>
              </div>
              <a
                href={`/suporte/contato?assunto=pre-venda&produto=kodabot-i&kodacare=${care}`}
                className="mt-8 flex h-12 items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
              >
                Continuar pré-venda <ChevronRight className="ml-1 h-4 w-4" />
              </a>
              <p className="mt-4 text-center text-xs leading-relaxed text-[#86868b]">
                Nenhum pagamento ou pedido aprovado é criado nesta página. A integração será feita
                com o KodaPay quando sua interface estiver disponível.
              </p>
            </section>
          </div>
        </div>

        <section className="bg-[#f5f5f7] px-5 py-24 text-center sm:py-32">
          <p className="text-sm font-semibold text-[#0066cc]">O que vem na caixa</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">KodaBot I.</h2>
          <Package className="mx-auto mt-14 h-12 w-12 text-[#0071e3]" />
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
            Somente o item confirmado é exibido. Os demais conteúdos da embalagem ainda precisam de
            definição oficial.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 border-t border-black/10 pt-10">
      <p className="text-xs font-semibold text-[#86868b]">{number}</p>
      <h2 className="mb-7 mt-2 text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

function PlanOption({
  selected,
  onClick,
  title,
  subtitle,
  price,
  benefits = [],
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  price: string;
  benefits?: readonly string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-[26px] bg-[#f5f5f7] p-6 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] ${selected ? "ring-2 ring-[#0071e3]" : "hover:bg-[#ececef]"}`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex gap-4">
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-black/20"}`}
          >
            {selected && <Check className="h-3 w-3" aria-hidden="true" />}
          </span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-[#6e6e73]">{subtitle}</p>
          </div>
        </div>
        <strong className="shrink-0 text-sm">{price}</strong>
      </div>
      {benefits.length > 0 && (
        <ul className="ml-9 mt-5 space-y-2 text-xs leading-relaxed text-[#6e6e73]">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#0071e3]" />
              {benefit}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
