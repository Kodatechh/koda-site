const groups = [
  {
    title: "Produtos",
    links: [
      ["Loja Koda", "/loja"],
      ["KodaBot", "/kodabot"],
      ["KodaBot Pro", "/kodabot-pro"],
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
      ["Conta Koda", "/conta"],
      ["Pedidos", "/conta/pedidos"],
      ["Entrar", "/conta/entrar"],
    ],
  },
  {
    title: "Koda",
    links: [
      ["Sobre a Koda", "/sobre"],
      ["KodaCare", "/kodacare"],
      ["Privacidade e segurança", "/privacidade"],
    ],
  },
] as const;

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={dark ? "border-t border-white/10 bg-black text-white" : "border-t border-black/[.08] bg-[#f5f5f7] text-[#1d1d1f]"}>
      <div className="mx-auto max-w-[1040px] px-5 py-10 sm:py-14">
        <p className={`mb-9 max-w-2xl text-[11px] leading-relaxed ${dark ? "text-white/40" : "text-[#86868b]"}`}>
          Produtos, serviços, cobertura, pedidos e suporte Koda são vinculados à Conta Koda quando aplicável. Disponibilidade e condições podem variar conforme o produto.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className={`text-[11px] font-semibold ${dark ? "text-white/80" : "text-[#1d1d1f]"}`}>{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <a href={href} className={`text-[11px] transition-colors hover:underline ${dark ? "text-white/45 hover:text-white/70" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`mt-10 flex flex-col gap-3 border-t pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between ${dark ? "border-white/10 text-white/40" : "border-black/[.08] text-[#6e6e73]"}`}>
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
