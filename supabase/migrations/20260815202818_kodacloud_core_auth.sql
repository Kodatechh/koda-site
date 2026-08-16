create extension if not exists pgcrypto;

create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.handle_new_kodacloud_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.grant_koda_factory_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'kodatechproducts@gmail.com'
     and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role)
    values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create trigger on_auth_user_created_kodacloud
after insert on auth.users
for each row execute function public.handle_new_kodacloud_user();

create trigger on_auth_user_factory_admin
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.grant_koda_factory_admin();

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

grant select on public.user_roles to authenticated;
grant select, update on public.profiles to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create policy "Users can read their own roles"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on function public.update_updated_at_column() from public, anon, authenticated;
revoke all on function public.handle_new_kodacloud_user() from public, anon, authenticated;
revoke all on function public.grant_koda_factory_admin() from public, anon, authenticated;
;
