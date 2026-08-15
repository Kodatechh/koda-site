create type public.app_role as enum ('admin');

create table public.site_content (
    id text primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamp with time zone not null default now()
);

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role public.app_role not null,
    unique (user_id, role)
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger update_site_content_updated_at
before update on public.site_content
for each row execute function public.update_updated_at_column();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles
        where user_id = _user_id
          and role = _role
    );
$$;

grant select, insert, update, delete on public.site_content to authenticated;
grant select on public.site_content to anon;
grant all on public.site_content to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.update_updated_at_column() to authenticated;

alter table public.site_content enable row level security;
alter table public.user_roles enable row level security;

create policy "Public can read site content"
on public.site_content
for select
to anon, authenticated
using (true);

create policy "Admins can manage site content"
on public.site_content
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Users can read their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

insert into public.site_content (id, data) values
('meta', '{
    "title": "Kodabot — o robô companheiro da Koda",
    "description": "Kodabot: o primeiro robô companheiro da Koda. Chip K1, autonomia de dias e privacidade local. Conheça e reserve o seu."
}'::jsonb),
('hero', '{
    "badge": "Novo",
    "title": "Kodabot",
    "subtitle": "Companhia inteligente para a sua casa. Ele entende, responde e se move — sem enviar nada para a nuvem.",
    "ctaPrimary": "Comprar",
    "ctaSecondary": "Conhecer",
    "image": "/kodabot-hero.jpg"
}'::jsonb),
('intro', '{
    "title": "Um produto. Feito do jeito certo.",
    "subtitle": "Por enquanto a Koda faz uma coisa só — e faz muito bem.",
    "card1": {
        "title": "Design silencioso",
        "text": "Rodas macias, motores sem ruído e corpo em alumínio recuperado. Ele desaparece na decoração até você chamar.",
        "image": "/kodabot-white.jpg"
    },
    "card2": {
        "title": "Face expressiva",
        "text": "Um display circular com 120 Hz traduz intenção em expressão. Você entende o Kodabot antes dele falar.",
        "image": "/kodabot-detail.jpg"
    }
}'::jsonb),
('features', '{
    "title": "Engenharia obsessiva em cada milímetro.",
    "items": [
        {"icon": "Cpu", "title": "Chip K1", "text": "Processamento local, resposta instantânea e privacidade por padrão."},
        {"icon": "BatteryCharging", "title": "Bateria de dias", "text": "Autonomia real medida em dias, não em horas."},
        {"icon": "Recycle", "title": "Alumínio reciclado", "text": "Corpo em alumínio recuperado e embalagem sem plástico."},
        {"icon": "ShieldCheck", "title": "2 anos de garantia", "text": "Assistência Koda em todo o Brasil, sem burocracia."}
    ],
    "specs": [
        {"label": "Altura", "value": "38 cm"},
        {"label": "Peso", "value": "3,2 kg"},
        {"label": "Processador", "value": "Chip K1 neural"},
        {"label": "Autonomia", "value": "até 5 dias"},
        {"label": "Sensores", "value": "LiDAR + 4 microfones"},
        {"label": "Conectividade", "value": "Wi-Fi 7 · Bluetooth 6"}
    ]
}'::jsonb),
('roadmap', '{
    "title": "O que vem por aí.",
    "items": [
        {"name": "Kodabot", "status": "Disponível", "text": "O companheiro doméstico que aprende a rotina da sua casa."},
        {"name": "Kodabot Pro", "status": "Em breve", "text": "Mais autonomia, braço articulado e visão estéreo."},
        {"name": "Acessórios Koda", "status": "Em breve", "text": "Base de carga, skins em alumínio e módulos de expansão."}
    ]
}'::jsonb),
('buy', '{
    "title": "Kodabot",
    "price": "A partir de R$ 4.999",
    "subtitle": "Frete grátis para todo o Brasil, 30 dias para devolver e suporte por pessoas de verdade.",
    "ctaPrimary": "Comprar agora",
    "ctaSecondary": "Reservar",
    "note": "Checkout com provedor de pagamentos em breve."
}'::jsonb),
('footer', '{
    "copyright": "© {year} Koda Eletrônicos.",
    "note": "Preços em reais. Imagens ilustrativas."
}'::jsonb)
on conflict (id) do nothing;