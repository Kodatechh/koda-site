create extension if not exists pgcrypto;

create table if not exists public.koda_devices (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique,
  model text not null,
  board_uid text not null unique,
  activation_status text not null default 'not_activated' check (activation_status in ('not_activated','activated','disabled')),
  owner_user_id uuid references auth.users(id) on delete set null,
  manufactured_at timestamptz not null default now(),
  activated_at timestamptz,
  warranty_start timestamptz,
  koda_os_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.koda_device_credentials (
  device_id uuid primary key references public.koda_devices(id) on delete cascade,
  device_secret_hex text not null check (device_secret_hex ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.koda_device_challenges (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.koda_devices(id) on delete cascade,
  nonce text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.koda_device_tokens (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.koda_devices(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.koda_activation_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.koda_devices(id) on delete cascade,
  claim_token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','activated','expired','cancelled')),
  expires_at timestamptz not null,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists koda_device_challenges_device_idx on public.koda_device_challenges(device_id, created_at desc);
create index if not exists koda_device_tokens_device_idx on public.koda_device_tokens(device_id, expires_at desc);
create index if not exists koda_activation_sessions_device_idx on public.koda_activation_sessions(device_id, created_at desc);
create index if not exists koda_devices_owner_idx on public.koda_devices(owner_user_id);

create or replace function public.koda_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists koda_devices_set_updated_at on public.koda_devices;
create trigger koda_devices_set_updated_at
before update on public.koda_devices
for each row execute function public.koda_set_updated_at();

alter table public.koda_devices enable row level security;
alter table public.koda_device_credentials enable row level security;
alter table public.koda_device_challenges enable row level security;
alter table public.koda_device_tokens enable row level security;
alter table public.koda_activation_sessions enable row level security;

drop policy if exists "Users can view their own Koda devices" on public.koda_devices;
create policy "Users can view their own Koda devices"
on public.koda_devices
for select
to authenticated
using (owner_user_id = auth.uid());

revoke all on table public.koda_device_credentials from anon, authenticated;
revoke all on table public.koda_device_challenges from anon, authenticated;
revoke all on table public.koda_device_tokens from anon, authenticated;
revoke all on table public.koda_activation_sessions from anon, authenticated;
revoke all on table public.koda_devices from anon;
grant select on table public.koda_devices to authenticated;

create or replace function public.koda_register_factory_device(
  p_serial text,
  p_model text,
  p_board_uid text,
  p_device_secret_hex text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_id uuid;
begin
  if p_serial is null or length(trim(p_serial)) < 4 then
    raise exception 'invalid serial';
  end if;
  if p_model is null or length(trim(p_model)) < 2 then
    raise exception 'invalid model';
  end if;
  if p_board_uid is null or length(trim(p_board_uid)) < 4 then
    raise exception 'invalid board uid';
  end if;
  if p_device_secret_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'device secret must be 32 bytes encoded as 64 hex chars';
  end if;

  insert into public.koda_devices(serial, model, board_uid)
  values (trim(p_serial), trim(p_model), lower(trim(p_board_uid)))
  returning id into v_device_id;

  insert into public.koda_device_credentials(device_id, device_secret_hex)
  values (v_device_id, lower(p_device_secret_hex));

  return v_device_id;
end;
$$;

revoke all on function public.koda_register_factory_device(text,text,text,text) from public, anon, authenticated;

grant usage on schema public to authenticated;
;
