const groups = [
  {
    title: "Comprar e conhecer",
    links: [
      ["Loja Koda", "/loja"],
      ["KodaBot", "/kodabot"],
      ["KodaBot Pro", "/kodabot-pro"],
      ["Comparar modelos", "/comparar"],
      ["KodaCare", "/kodacare"],
      ["Recondicionados", "/recondicionados"],
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
    title: "Conta Koda",
    links: [
      ["Minha conta", "/conta"],
      ["Meus pedidos", "/conta/pedidos"],
      ["Meus KodaBots", "/conta"],
      ["Notificações", "/conta/notificacoes"],
      ["Indique a Koda", "/indicacao"],
    ],
  },
  {
    title: "Suporte",
    links: [
      ["Central de suporte", "/suporte"],
      ["Configurar KodaBot", "/suporte/configurar"],
      ["Reparo e assistência", "/suporte/reparo"],
      ["Garantia", "/suporte/garantia"],
      ["Manuais", "/suporte/manuais"],
    ],
  },
  {
    title: "Sobre a Koda",
    links: [
      ["Koda", "/sobre"],
      ["Conteúdo Koda", "/conteudo"],
      ["Koda para Educação", "/educacao"],
      ["Koda para Empresas", "/empresas"],
      ["Privacidade", "/privacidade"],
      ["Fale com a Koda", "/suporte/contato"],
    ],
  },
] as const;

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const border = dark ? "border-white/10" : "border-black/10";
  const muted = dark ? "text-white/45" : "text-[#6e6e73]";
  const strong = dark ? "text-white/82" : "text-[#1d1d1f]";

  return (
    <footer
      className={`${dark ? "bg-black text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"} border-t ${border}`}
    >
      <div className="mx-auto max-w-[1024px] px-5 pb-7 pt-7 sm:pt-9">
        <div className={`border-b ${border} pb-5 text-[10px] leading-[1.55] ${muted}`}>
          <p>
            Os recursos, disponibilidade e especificações podem variar conforme o modelo e a versão
            do KODA OS. Compras, garantia, KodaCare e assistência ficam vinculados à sua Conta Koda
            quando aplicável.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-7 py-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className={`text-[10px] font-semibold ${strong}`}>{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={`${group.title}-${href}`}>
                    <a
                      href={href}
                      className={`text-[10px] leading-none ${muted} transition-colors hover:text-current hover:underline`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`border-b ${border} pb-4 text-[10px] ${muted}`}>
          <p>
            Mais formas de comprar: visite a{" "}
            <a href="/loja" className="text-[#0066cc] hover:underline">
              Loja Koda
            </a>{" "}
            ou fale com a{" "}
            <a href="/suporte/contato" className="text-[#0066cc] hover:underline">
              equipe Koda
            </a>
            .
          </p>
        </div>

        <div
          className={`flex flex-col gap-3 pt-4 text-[10px] sm:flex-row sm:items-center sm:justify-between ${muted}`}
        >
          <p>
            Copyright © {new Date().getFullYear()} Koda Eletrônicos. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="/privacidade" className="hover:underline">
              Política de Privacidade
            </a>
            <a href="/suporte/garantia" className="hover:underline">
              Garantia
            </a>
            <a href="/suporte/contato" className="hover:underline">
              Contato
            </a>
            <span>Brasil</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
