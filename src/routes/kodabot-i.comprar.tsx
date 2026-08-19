import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { ProductPhotoSlot } from "@/components/koda/ProductPhotoSlot";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { formatBRL } from "@/lib/kodacare";

export const Route = createFileRoute("/kodabot-i/comprar")({
  head: () => ({
    meta: [
      { title: "Comprar KodaBot — Pré-venda Koda" },
      {
        name: "description",
        content: "Compre o KodaBot na pré-venda por R$ 99,90 com checkout seguro pelo Koda Pay.",
      },
    ],
  }),
  component: BuyKodaBot,
});

const PRODUCT_PRICE = 99.9;

function BuyKodaBot() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <div className="sticky top-12 z-30 border-b border-black/[.06] bg-white/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-12 max-w-[1100px] items-center justify-between px-5">
          <span className="text-sm font-semibold tracking-[-.025em]">KodaBot</span>
          <span className="text-xs font-medium text-[#6e6e73]">Pré-venda · {formatBRL(PRODUCT_PRICE)}</span>
        </div>
      </div>

      <main>
        <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-12 lg:grid-cols-[1.12fr_.88fr] lg:items-start lg:py-20">
          <div className="lg:sticky lg:top-28">
            <ProductPhotoSlot label="KodaBot" className="h-[470px] rounded-[38px] sm:h-[650px] lg:h-[720px]" />
          </div>

          <div className="pb-8 lg:pt-3">
            <p className="text-sm font-semibold text-[#0071e3]">Pré-venda</p>
            <h1 className="mt-3 text-6xl font-semibold tracking-[-.065em] sm:text-7xl">KodaBot</h1>
            <p className="mt-5 text-3xl font-semibold tracking-[-.04em]">{formatBRL(PRODUCT_PRICE)}</p>
            <p className="mt-5 max-w-lg text-lg font-medium leading-relaxed text-[#6e6e73]">
              Um assistente de mesa com tela touch, KODA OS e os serviços Koda para organizar o essencial do seu dia.
            </p>

            <div className="mt-12 divide-y divide-black/[.08] border-y border-black/[.08]">
              <InfoRow
                icon={Package}
                title="KodaBot"
                body="Uma unidade na pré-venda. O valor do produto é confirmado pelo servidor antes do pagamento."
              />
              <InfoRow
                icon={Truck}
                title="Entrega"
                body="Você informa o endereço no checkout. O acompanhamento do pedido fica disponível na Conta Koda."
              />
              <InfoRow
                icon={ShieldCheck}
                title="KodaCare"
                body="Você pode contratar uma cobertura elegível separadamente durante o período de até 30 dias após a compra."
              />
            </div>

            <section className="mt-10 rounded-[32px] bg-[#f5f5f7] p-7 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.11em] text-[#86868b]">Resumo</p>
              <div className="mt-5 flex items-center justify-between gap-6">
                <div>
                  <p className="text-lg font-semibold">KodaBot</p>
                  <p className="mt-1 text-xs text-[#86868b]">1 unidade · pré-venda</p>
                </div>
                <strong className="text-xl">{formatBRL(PRODUCT_PRICE)}</strong>
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-black/10 pt-6">
                <span className="text-sm font-semibold">Total</span>
                <strong className="text-3xl tracking-[-.045em]">{formatBRL(PRODUCT_PRICE)}</strong>
              </div>
              <a
                href="/checkout/kodabot-i"
                className="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
              >
                Continuar para pagamento <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-[#86868b]">
                O pedido e o Pix são criados pelo Koda Pay. A compra só é confirmada após a confirmação do pagamento.
              </p>
            </section>

            <div className="mt-7 text-center">
              <a href="/kodacare" className="text-sm font-semibold text-[var(--kodacare-red)] hover:underline">
                Conhecer o KodaCare ›
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-24 text-center sm:py-32">
          <p className="text-sm font-semibold text-[#0071e3]">Na caixa</p>
          <h2 className="mt-3 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Seu KodaBot.</h2>
          <Package className="mx-auto mt-12 h-12 w-12 text-[#0071e3]" />
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
            O conteúdo final da embalagem será informado na página do produto e no pedido antes do envio.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Package;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 py-6 first:pt-0 last:pb-0">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#0071e3]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">{body}</p>
      </div>
    </div>
  );
}
