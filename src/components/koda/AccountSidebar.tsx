import {
  Bell,
  FlaskConical,
  Headphones,
  Package,
  Settings2,
  Smartphone,
  Wrench,
} from "lucide-react";

const items = [
  { label: "Meus KodaBots", href: "/conta#meus-kodabots", icon: Smartphone },
  { label: "Pedidos", href: "/conta/pedidos", icon: Package },
  { label: "Reparos", href: "/conta/reparos", icon: Wrench },
  { label: "Atendimentos", href: "/conta#atendimentos", icon: Headphones },
  { label: "Ajude a evoluir", href: "/conta/participar", icon: FlaskConical },
  { label: "Notificações", href: "/conta/notificacoes", icon: Bell },
  { label: "Configurações da conta", href: "/conta/configuracoes", icon: Settings2 },
];

export function AccountSidebar() {
  return (
    <aside className="lg:sticky lg:top-16 lg:self-start">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#86868b]">
        Minha Conta
      </p>
      <nav aria-label="Minha Conta" className="mt-3 flex gap-1 overflow-x-auto pb-2 lg:flex-col">
        {items.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[#424245] transition-colors hover:bg-white hover:text-[#0066cc]"
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
