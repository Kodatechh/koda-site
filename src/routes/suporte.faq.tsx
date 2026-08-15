import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";

export const Route = createFileRoute("/suporte/faq")({ head: () => ({ meta: [{ title: "Perguntas frequentes — Koda" }] }), component: FAQ });

const faqs = [
  ["Preciso saber o IP do KodaBot para configurar?", "Não. O fluxo de configuração usa KodaBot-Setup e captive portal. Depois de conectado à rede, o painel local pode ser acessado por kodabot.local."],
  ["O KodaBot I tem bateria?", "Não. A primeira geração do KodaBot I foi pensada para uso na mesa, conectada à alimentação. O KodaBot I Pro é o modelo planejado com bateria integrada."],
  ["O KodaBot I Pro tem tela?", "Não. O Pro é uma experiência baseada em voz, microfones e áudio. Por isso, por exemplo, reparo de tela nunca aparece para esse modelo."],
  ["Como meu KodaBot aparece na minha conta?", "No fluxo planejado, o aparelho sai da fábrica como não ativado. Durante o primeiro setup, você entra na Conta KodaCloud e o próprio KodaBot participa da ativação. Depois disso ele aparece automaticamente em Meu KodaBot."],
  ["Posso adicionar um KodaBot apenas digitando o número de série?", "Não. O serial serve para identificação, garantia e suporte, mas não deve ser suficiente para reivindicar a propriedade de um aparelho."],
  ["Como o KodaBot I recebe hora e data?", "Pela internet. O projeto atual não usa RTC DS3231."],
  ["O KODA OS recebe atualizações sem cabo?", "O sistema OTA está em desenvolvimento para permitir atualizações pela internet. A página de Atualizações do KODA OS mostra o estágio atual."],
  ["Onde fica o número de série?", "Na parte inferior do KodaBot. A Koda pretende incorporar o serial fisicamente à carcaça durante a fabricação/impressão 3D."],
];

function FAQ() {
  return <main><section className="bg-[#f5f5f7] px-5 py-20 text-center sm:py-28"><CircleHelp className="mx-auto h-10 w-10 text-[#0071e3]"/><h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Perguntas frequentes.</h1><p className="mx-auto mt-5 max-w-xl text-lg text-[#6e6e73]">Respostas rápidas sobre produtos, KODA OS, KodaCloud e suporte.</p></section><section className="mx-auto max-w-4xl px-5 py-16 sm:py-20"><div className="divide-y divide-black/10 border-y border-black/10">{faqs.map(([q,a]) => <details key={q} className="group py-2"><summary className="cursor-pointer list-none py-5 text-lg font-semibold tracking-[-0.02em] marker:hidden"><span className="flex items-center justify-between gap-5">{q}<span className="text-2xl font-light text-[#86868b] transition-transform group-open:rotate-45">+</span></span></summary><p className="max-w-3xl pb-6 pr-8 text-sm leading-relaxed text-[#6e6e73]">{a}</p></details>)}</div></section></main>;
}
