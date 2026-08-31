begin;

create table public.support_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 3 and 160),
  category text not null check (category in ('produto','reparo','garantia','conta','kodaos','pedido','seguranca','outro')),
  body text not null check (char_length(trim(body)) between 20 and 12000),
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  applies_to text[] not null default '{}'::text[],
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_knowledge_approval_state check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  )
);
create index support_knowledge_status_category_idx on public.support_knowledge_articles (status, category, updated_at desc);
create index support_knowledge_approved_by_idx on public.support_knowledge_articles (approved_by) where approved_by is not null;
create index support_knowledge_created_by_idx on public.support_knowledge_articles (created_by) where created_by is not null;

alter table public.support_knowledge_articles enable row level security;
revoke all on table public.support_knowledge_articles from anon, authenticated;
grant select, insert, update, delete on public.support_knowledge_articles to authenticated;

create policy support_knowledge_public_approved on public.support_knowledge_articles
  for select to authenticated using (status = 'approved' or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'support_agent') or public.has_role((select auth.uid()), 'support_advanced'));
create policy support_knowledge_staff_insert on public.support_knowledge_articles
  for insert to authenticated with check (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'support_advanced'));
create policy support_knowledge_staff_update on public.support_knowledge_articles
  for update to authenticated using (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'support_advanced'))
  with check (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'support_advanced'));
create policy support_knowledge_admin_delete on public.support_knowledge_articles
  for delete to authenticated using (public.has_role((select auth.uid()), 'admin'));

comment on table public.support_knowledge_articles is
  'Controlled source set for Koda support. The AI assistant may use only rows with status approved.';

commit;
