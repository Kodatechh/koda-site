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
    <footer
      className={
        dark
          ? "border-t border-white/10 bg-black text-white"
          : "border-t border-black/[.08] bg-[#f5f5f7] text-[#1d1d1f]"
      }
    >
      <div className="mx-auto max-w-[1024px] px-5 pb-6 pt-10 lg:px-3">
        <p
          className={`border-b pb-5 text-[11px] leading-relaxed ${dark ? "border-white/10 text-white/45" : "border-black/10 text-[#6e6e73]"}`}
        >
          Os produtos KodaBot estão em desenvolvimento. Recursos, disponibilidade e especificações
          podem mudar até o lançamento. KodaCloud reúne dispositivos, cobertura, suporte e serviços
          vinculados à sua conta.
        </p>
        <div className="grid gap-7 py-7 sm:grid-cols-2 lg:grid-cols-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p
                className={`text-[11px] font-semibold ${dark ? "text-white/80" : "text-[#1d1d1f]"}`}
              >
                {group.title}
              </p>
              <ul className="mt-2.5 space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className={`text-[11px] leading-tight hover:underline ${dark ? "text-white/45" : "text-[#424245]"}`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={`flex flex-col gap-3 border-t pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${dark ? "border-white/10 text-white/40" : "border-black/10 text-[#6e6e73]"}`}
        >
          <p>
            Copyright © {new Date().getFullYear()} Koda Eletrônicos. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-5">
            <a href="/privacidade" className="hover:underline">
              Privacidade
            </a>
            <a href="/suporte/garantia" className="hover:underline">
              Garantia
            </a>
            <a href="/suporte/contato" className="hover:underline">
              Contato
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
