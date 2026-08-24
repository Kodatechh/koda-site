import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Cable,
  CalendarDays,
  ChevronRight,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { formatReleasePrice, getKodaBotOffer } from "@/lib/koda-release";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KodaBot — simples para o seu dia" },
      {
        name: "description",
        content: "KodaBot em pré-venda. Informação útil, KODA OS e acompanhamento pela Conta Koda.",
      },
      { property: "og:title", content: "KodaBot — simples para o seu dia" },
      {
        property: "og:description",
        content: "Pré-venda por R$ 99,90. Envios a partir de 17 de outubro de 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const offer = getKodaBotOffer();

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Nav />
      <main>
        <section className="border-b border-black/[.06] bg-[#f5f5f7] px-5 py-3 text-center text-xs sm:text-sm">
          KodaBot em pré-venda por {formatReleasePrice(offer.priceCents)}. Envios a partir de 17/10.{" "}
          <a href="/comprar" className="font-semibold text-[#0066cc]">
            Começar compra ›
          </a>
        </section>

        <section className="overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#f7f9fc_100%)]">
          <div className="mx-auto grid min-h-[760px] max-w-[1240px] items-center gap-8 px-5 pb-10 pt-14 lg:grid-cols-[.92fr_1.08fr] lg:pt-8">
            <div className="relative z-10 text-center lg:text-left">
              <p className="text-sm font-semibold text-[#0071e3]">{offer.label}</p>
              <h1 className="mt-3 text-6xl font-semibold leading-[.92] tracking-[-.075em] sm:text-8xl lg:text-[104px]">
                KodaBot.
              </h1>
              <p className="mt-5 text-3xl font-semibold leading-tight tracking-[-.045em] text-[#6e6e73] sm:text-4xl">
                Informação útil.
                <br />
                Sem complicação.
              </p>
              <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-[#6e6e73] lg:mx-0">
                Hora, clima e rotina em uma tela touch feita para ficar perto — sem transformar cada
                consulta em mais tempo no celular.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <a
                  href="/comprar"
                  className="rounded-full bg-[#0071e3] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed]"
                >
                  Comprar com ajuda
                </a>
                <a
                  href="/checkout/kodabot-i"
                  className="rounded-full border border-[#0071e3] px-7 py-3.5 text-sm font-semibold text-[#0066cc]"
                >
                  Comprar direto
                </a>
              </div>
              <p className="mt-5 text-xs text-[#86868b]">
                {formatReleasePrice(offer.priceCents)} · cabo Micro USB incluído · adaptador
                opcional
              </p>
            </div>

            <div className="relative mx-auto h-[520px] w-full max-w-[680px] sm:h-[680px]">
              <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle,#dcecff_0%,rgba(220,236,255,.4)_38%,transparent_70%)] blur-2xl" />
              <img
                src="/kodabot-checkout-transparent-v1.png"
                alt="KodaBot com corpo transparente e tela KODA OS"
                className="relative h-full w-full object-contain drop-shadow-[0_40px_45px_rgba(18,31,53,.16)]"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-black/[.06] bg-white">
          <div className="mx-auto grid max-w-[1100px] gap-0 px-5 sm:grid-cols-3">
            <Benefit
              icon={CalendarDays}
              title="Lançamento em 17/10"
              text="Sua unidade fica reservada na pré-venda."
            />
            <Benefit
              icon={Truck}
              title="Frete calculado"
              text="Consulte pelo CEP antes do pagamento."
            />
            <Benefit
              icon={ShieldCheck}
              title="Compra acompanhada"
              text="Confirmação e atualizações na Conta Koda."
            />
          </div>
        </section>

        <section className="bg-[#050607] px-5 py-24 text-white sm:py-36">
          <div className="mx-auto max-w-[1120px]">
            <p className="text-sm font-semibold text-[#6eb2ff]">KODA OS</p>
            <h2 className="mt-3 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-8xl">
              O que importa chega primeiro.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
              Uma interface direta para consultar o dia, ver lembretes e manter a rotina visível.
            </p>
            <div className="mt-14 overflow-hidden rounded-[36px] bg-[#0d0f12]">
              <img
                src="/kodabot-kodaos-dark-v1.png"
                alt="KodaBot exibindo a interface KODA OS"
                className="h-[460px] w-full object-cover object-center sm:h-[700px]"
                loading="lazy"
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold">
              <a href="/kodabot" className="text-[#2997ff]">
                Conhecer o KodaBot ›
              </a>
              <a href="/kodaos" className="text-[#2997ff]">
                Explorar o KODA OS ›
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1120px]">
            <p className="text-sm font-semibold text-[#0071e3]">Do seu jeito</p>
            <h2 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
              Uma compra simples, mesmo com escolhas.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <JourneyStep
                number="1"
                title="Monte seu Koda"
                text="Escolha modelo, adaptador e veja se já possui crédito do Trade In."
              />
              <JourneyStep
                number="2"
                title="Confira a entrega"
                text="Calcule opções reais de frete e preencha o endereço no checkout."
              />
              <JourneyStep
                number="3"
                title="Acompanhe tudo"
                text="Pagamento, reserva, lançamento e envio ficam reunidos na Conta Koda."
              />
            </div>
            <div className="mt-10 text-center">
              <a
                href="/comprar"
                className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-7 py-3.5 text-sm font-semibold text-white"
              >
                Iniciar compra guiada <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-24 sm:py-32">
          <div className="mx-auto grid max-w-[1120px] gap-5 lg:grid-cols-2">
            <article className="relative min-h-[570px] overflow-hidden rounded-[42px] bg-[#edf8f0] p-8 sm:p-12">
              <Recycle className="h-8 w-8 text-[#248a3d]" />
              <p className="mt-8 text-sm font-semibold text-[#248a3d]">Koda Trade In</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
                Seu KodaBot antigo ajuda no próximo.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-[#58715f]">
                Envie gratuitamente para análise, receba a oferta final e decida se quer usar o
                crédito. Aceitamos aparelhos com avarias.
              </p>
              <a
                href="/comprar"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#176b37]"
              >
                Integrar à compra <ChevronRight className="h-4 w-4" />
              </a>
              <div className="absolute bottom-10 left-8 right-8 grid grid-cols-2 gap-3 sm:left-12 sm:right-12">
                <CreditCard label="KodaBot" value="até R$ 59,90" />
                <CreditCard label="KodaBot Pro" value="até R$ 79,90" />
              </div>
            </article>

            <article className="relative min-h-[570px] overflow-hidden rounded-[42px] bg-[#101114] p-8 text-white sm:p-12">
              <Sparkles className="h-8 w-8 text-[#6eb2ff]" />
              <p className="mt-8 text-sm font-semibold text-[#6eb2ff]">KodaBot Pro</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
                A experiência Koda, feita para conversar.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55">
                O Pro ainda está em desenvolvimento. Entre na lista para receber as novidades e a
                abertura da futura pré-venda por R$ 129,90.
              </p>
              <a
                href="/kodabot-pro#lista-de-espera"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#2997ff]"
              >
                Entrar na lista <ChevronRight className="h-4 w-4" />
              </a>
              <div className="absolute inset-x-10 bottom-10 flex h-36 items-center justify-center gap-2 rounded-[34px] border border-white/10 bg-white/[.04]">
                {[34, 72, 104, 68, 120, 82, 48].map((height, index) => (
                  <span key={index} className="w-3 rounded-full bg-[#4d86ff]" style={{ height }} />
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-5 py-24 text-center sm:py-32">
          <Cable className="mx-auto h-9 w-9 text-[#0071e3]" />
          <h2 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
            Pronto para reservar o seu?
          </h2>
          <p className="mt-5 text-lg text-[#6e6e73]">Pré-venda por R$ 99,90 até 16/10/2026.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/comprar"
              className="rounded-full bg-[#0071e3] px-7 py-3.5 text-sm font-semibold text-white"
            >
              Comprar com ajuda
            </a>
            <a href="/loja" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold">
              Visitar a loja
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Benefit({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div className="flex gap-4 border-b border-black/[.06] py-7 sm:border-b-0 sm:border-r sm:px-7 sm:last:border-r-0">
      <Icon className="h-6 w-6 shrink-0 text-[#0071e3]" strokeWidth={1.6} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">{text}</p>
      </div>
    </div>
  );
}

function JourneyStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="min-h-[270px] rounded-[34px] bg-white p-7 sm:p-8">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0071e3] text-sm font-semibold text-white">
        {number}
      </span>
      <h3 className="mt-16 text-2xl font-semibold tracking-[-.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{text}</p>
    </article>
  );
}

function CreditCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-sm">
      <p className="text-[11px] text-[#6e6e73]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
