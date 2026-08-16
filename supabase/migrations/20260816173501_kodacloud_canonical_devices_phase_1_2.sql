-- PHASE 1: prepare public.devices as the canonical KodaCloud device record.
alter table public.devices add column if not exists board_uid text;
alter table public.devices add column if not exists last_seen_at timestamptz;

update public.devices
set model = case lower(replace(trim(model), '_', '-'))
  when 'kodabot-i' then 'kodabot-i'
  when 'kodabot i' then 'kodabot-i'
  when 'kodabot-i-pro' then 'kodabot-i-pro'
  when 'kodabot i pro' then 'kodabot-i-pro'
  else lower(trim(model))
end;

update public.koda_devices
set model = case lower(replace(trim(model), '_', '-'))
  when 'kodabot-i' then 'kodabot-i'
  when 'kodabot i' then 'kodabot-i'
  when 'kodabot-i-pro' then 'kodabot-i-pro'
  when 'kodabot i pro' then 'kodabot-i-pro'
  else lower(trim(model))
end,
board_uid = lower(trim(board_uid));

do $$
begin
  if exists (
    select 1 from public.devices
    where model not in ('kodabot-i', 'kodabot-i-pro')
  ) then
    raise exception 'non-canonical models remain in public.devices';
  end if;

  if exists (
    select 1 from public.koda_devices k
    left join public.devices d
      on upper(trim(d.serial_number)) = upper(trim(k.serial))
    where d.id is null
  ) then
    raise exception 'unmapped public.koda_devices rows remain';
  end if;

  if exists (
    select 1
    from public.koda_devices k
    join public.devices d
      on upper(trim(d.serial_number)) = upper(trim(k.serial))
    where d.board_uid is not null
      and lower(trim(d.board_uid)) <> lower(trim(k.board_uid))
  ) then
    raise exception 'conflicting board_uid values found during reconciliation';
  end if;
end
$$;

update public.devices d
set board_uid = lower(trim(k.board_uid))
from public.koda_devices k
where upper(trim(d.serial_number)) = upper(trim(k.serial))
  and d.board_uid is null;

alter table public.devices
  drop constraint if exists devices_model_canonical_check;
alter table public.devices
  add constraint devices_model_canonical_check
  check (model in ('kodabot-i', 'kodabot-i-pro'));

alter table public.devices
  drop constraint if exists devices_board_uid_format_check;
alter table public.devices
  add constraint devices_board_uid_format_check
  check (board_uid is null or board_uid ~ '^[0-9a-f]+$');

create unique index if not exists devices_board_uid_unique_idx
  on public.devices(board_uid)
  where board_uid is not null;

-- PHASE 2: reconcile HMAC records by normalized serial and cut their FKs over.
create temporary table koda_device_id_map on commit drop as
select k.id as legacy_id, d.id as canonical_id
from public.koda_devices k
join public.devices d
  on upper(trim(d.serial_number)) = upper(trim(k.serial));

alter table public.koda_device_credentials
  drop constraint if exists koda_device_credentials_device_id_fkey;
alter table public.koda_device_challenges
  drop constraint if exists koda_device_challenges_device_id_fkey;
alter table public.koda_device_tokens
  drop constraint if exists koda_device_tokens_device_id_fkey;
alter table public.koda_activation_sessions
  drop constraint if exists koda_activation_sessions_device_id_fkey;

update public.koda_device_credentials c
set device_id = m.canonical_id
from koda_device_id_map m
where c.device_id = m.legacy_id;

update public.koda_device_challenges c
set device_id = m.canonical_id
from koda_device_id_map m
where c.device_id = m.legacy_id;

update public.koda_device_tokens t
set device_id = m.canonical_id
from koda_device_id_map m
where t.device_id = m.legacy_id;

update public.koda_activation_sessions s
set device_id = m.canonical_id
from koda_device_id_map m
where s.device_id = m.legacy_id;

alter table public.koda_device_credentials
  add constraint koda_device_credentials_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.koda_device_challenges
  add constraint koda_device_challenges_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.koda_device_tokens
  add constraint koda_device_tokens_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.koda_activation_sessions
  add constraint koda_activation_sessions_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from (
      select device_id from public.koda_device_credentials
      union all select device_id from public.koda_device_challenges
      union all select device_id from public.koda_device_tokens
      union all select device_id from public.koda_activation_sessions
    ) h
    left join public.devices d on d.id = h.device_id
    where d.id is null
  ) then
    raise exception 'HMAC records without canonical public.devices parent remain';
  end if;
end
$$;
