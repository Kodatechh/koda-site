import { Cloud, ShieldCheck } from "lucide-react";

const groups = [
  {
    title: "Produtos",
    links: [
      ["KodaBot I", "/kodabot"],
      ["KodaBot I Pro", "/kodabot-pro"],
      ["Comparar", "/comparar"],
      ["Por dentro do KodaBot", "/kodabot/por-dentro"],
    ],
  },
  {
    title: "KODA OS",
    links: [
      ["Visão geral", "/kodaos"],
      ["Atualizações", "/kodaos/updates"],
      ["Changelog", "/kodaos/changelog"],
    ],
  },
  {
    title: "Suporte",
    links: [
      ["Central de suporte", "/suporte"],
      ["Configuração", "/suporte/configurar"],
      ["Reparo", "/suporte/reparo"],
      ["Garantia", "/suporte/garantia"],
      ["Manuais", "/suporte/manuais"],
      ["Contato", "/suporte/contato"],
    ],
  },
  {
    title: "Conta",
    links: [
      ["Conta KodaCloud", "/conta"],
      ["Entrar", "/conta/entrar"],
    ],
  },
  {
    title: "Koda",
    links: [
      ["Sobre a Koda", "/sobre"],
      ["Privacidade e segurança", "/privacidade"],
    ],
  },
] as const;

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={dark ? "border-t border-white/10 bg-black text-white" : "border-t border-black/10 bg-[#f5f5f7] text-[#1d1d1f]"}>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className={`mb-9 grid gap-4 rounded-3xl p-5 text-sm sm:grid-cols-2 ${dark ? "bg-white/[0.05] text-white/65" : "bg-white text-[#6e6e73]"}`}>
          <div className="flex gap-3">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong className={dark ? "text-white" : "text-[#1d1d1f]"}>KodaCloud.</strong> Uma conta para seus KodaBots, garantia, suporte e serviços Koda.</p>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong className={dark ? "text-white" : "text-[#1d1d1f]"}>Privacidade por projeto.</strong> Seus dispositivos só aparecem na conta à qual foram ativados.</p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className={`text-xs font-semibold ${dark ? "text-white/80" : "text-[#1d1d1f]"}`}>{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <a href={href} className={`text-[11px] hover:underline ${dark ? "text-white/45" : "text-[#6e6e73]"}`}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`mt-10 flex flex-col gap-3 border-t pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${dark ? "border-white/10 text-white/40" : "border-black/10 text-[#6e6e73]"}`}>
          <p>© {new Date().getFullYear()} Koda Eletrônicos.</p>
          <div className="flex flex-wrap gap-5">
            <a href="/privacidade" className="hover:underline">Privacidade</a>
            <a href="/suporte/garantia" className="hover:underline">Garantia</a>
            <a href="/suporte/contato" className="hover:underline">Contato</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
