import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Cloud, Power, Router, UserRound, Wifi } from "lucide-react";

export const Route = createFileRoute("/suporte/configurar")({
  head: () => ({ meta: [{ title: "Configurar um KodaBot — Suporte Koda" }] }),
  component: SetupGuide,
});

const steps = [
  { icon: Power, title: "Ligue o KodaBot", text: "Conecte o KodaBot I à alimentação. Na primeira inicialização, ele verifica se já existe uma rede Wi‑Fi salva." },
  { icon: Wifi, title: "Conecte-se à KodaBot-Setup", text: "Sem Wi‑Fi salvo, o KodaBot cria a rede de configuração KodaBot-Setup para iniciar o processo pelo celular ou computador." },
  { icon: Router, title: "Escolha sua rede Wi‑Fi", text: "O captive portal abre a configuração, mostra as redes próximas e permite informar a senha da sua rede." },
  { icon: Cloud, title: "Conecte ao KodaCloud", text: "Depois que o KodaBot chega à internet, a etapa de ativação usa a mesma Conta KodaCloud do site." },
  { icon: UserRound, title: "Entre ou crie sua conta", text: "O comprador entra ou cria uma Conta KodaCloud. O próprio KodaBot participa da validação para que o produto não possa ser reivindicado apenas pelo número de série." },
  { icon: CheckCircle2, title: "Ativação concluída", text: "O status muda de Não ativado para Ativado, a data de ativação é registrada e o aparelho aparece automaticamente em Meu KodaBot." },
];

function SetupGuide() {
  return (
    <main>
      <section className="bg-black px-5 py-20 text-center text-white sm:py-28">
        <p className="text-sm font-semibold text-[#2997ff]">Configuração inicial</p>
        <h1 className="mx-auto mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Do primeiro boot ao KodaCloud.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/55">Um fluxo pensado para não exigir IP, cabo ou computador. A etapa KodaCloud está sendo integrada ao KODA OS.</p>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:py-28">
        <ol className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="grid gap-5 rounded-[28px] bg-[#f5f5f7] p-6 sm:grid-cols-[72px_1fr] sm:p-8">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0071e3] shadow-sm"><Icon className="h-6 w-6" /></div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">Etapa {index + 1}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{step.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 rounded-[28px] border border-[#0071e3]/20 bg-[#f2f8ff] p-7">
          <h2 className="text-xl font-semibold">Por que a ativação acontece no próprio setup?</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">O número de série fica visível na parte inferior do produto para identificação e suporte, mas não funciona como uma senha. O vínculo com a conta exige uma validação que envolve o KodaBot cadastrado pela fábrica.</p>
          <a href="/conta" className="mt-5 inline-flex text-sm font-semibold text-[#0066cc] hover:underline">Conhecer a Conta KodaCloud ›</a>
        </div>
      </section>
    </main>
  );
}
