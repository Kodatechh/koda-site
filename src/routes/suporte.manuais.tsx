import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Cpu, Download, FileText, Settings2 } from "lucide-react";

export const Route = createFileRoute("/suporte/manuais")({
  head: () => ({ meta: [{ title: "Manuais e downloads — Koda" }] }),
  component: Manuals,
});

const manuals = [
  { title: "Guia de configuração do KodaBot I", text: "Primeiro boot, KodaBot-Setup, Wi‑Fi e ativação KodaCloud.", href: "/suporte/configurar", icon: Settings2, action: "Abrir guia" },
  { title: "Especificações do KodaBot I", text: "Hardware, conectividade, sensores, energia e software.", href: "/kodabot/tech-specs", icon: Cpu, action: "Ver especificações" },
  { title: "Especificações do KodaBot I Pro", text: "Informações já definidas e itens ainda em desenvolvimento.", href: "/kodabot-pro/tech-specs", icon: Cpu, action: "Ver especificações" },
  { title: "Informações de segurança", text: "Documento de segurança e uso adequado do produto.", href: "#documentos", icon: FileText, action: "Em preparação" },
  { title: "Manual completo do KodaBot I", text: "Manual em PDF para download e impressão.", href: "#documentos", icon: BookOpen, action: "Em preparação" },
  { title: "Arquivos de recuperação do KODA OS", text: "Recursos destinados a suporte e recuperação do sistema quando estiverem disponíveis.", href: "/kodaos/updates", icon: Download, action: "Ver atualizações" },
];

function Manuals() {
  return (
    <main>
      <section className="px-5 py-20 text-center sm:py-28"><BookOpen className="mx-auto h-10 w-10 text-[#0071e3]" /><h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">Manuais e downloads.</h1><p className="mx-auto mt-5 max-w-xl text-lg text-[#6e6e73]">Tudo o que você precisa para configurar, entender e cuidar do seu KodaBot.</p></section>
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="divide-y divide-black/10 border-y border-black/10">
          {manuals.map((manual) => {
            const Icon = manual.icon;
            const disabled = manual.action === "Em preparação";
            return <div key={manual.title} className="grid gap-5 py-7 sm:grid-cols-[48px_1fr_auto] sm:items-center"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5f5f7] text-[#0071e3]"><Icon className="h-5 w-5" /></div><div><h2 className="font-semibold">{manual.title}</h2><p className="mt-1 text-sm text-[#6e6e73]">{manual.text}</p></div>{disabled ? <span className="text-xs font-medium text-[#86868b]">{manual.action}</span> : <a href={manual.href} className="text-sm font-semibold text-[#0066cc] hover:underline">{manual.action} ›</a>}</div>;
          })}
        </div>
        <div id="documentos" className="mt-10 rounded-[28px] bg-[#f5f5f7] p-7"><h2 className="text-2xl font-semibold">Downloads oficiais virão daqui.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">Quando os PDFs e arquivos de recuperação forem finalizados, eles podem ser hospedados aqui ou em um bucket do Supabase Storage, com versões específicas para cada modelo.</p></div>
      </section>
    </main>
  );
}
