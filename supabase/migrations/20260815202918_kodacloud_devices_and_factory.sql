create type public.koda_device_status as enum ('not_activated', 'activated', 'service', 'retired');
create type public.koda_support_status as enum ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
create type public.koda_activation_session_status as enum ('pending', 'claimed', 'expired');

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null,
  model text not null check (model in ('kodabot-i', 'kodabot-i-pro')),
  status public.koda_device_status not null default 'not_activated',
  manufactured_at date,
  purchase_date date,
  warranty_start date,
  warranty_end date,
  kodaos_version text,
  owner_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warranty_date_order check (warranty_start is null or warranty_end is null or warranty_end >= warranty_start)
);

create table public.device_activation_secrets (
  device_id uuid primary key references public.devices(id) on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now()
);

create table public.device_activation_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  activation_code text not null unique,
  status public.koda_activation_session_status not null default 'pending',
  claimed_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table public.device_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  category text not null,
  subject text not null,
  message text not null,
  status public.koda_support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index devices_serial_number_upper_key on public.devices (upper(serial_number));
create index devices_owner_user_id_idx on public.devices(owner_user_id);
create index devices_status_idx on public.devices(status);
create index device_activation_sessions_device_idx on public.device_activation_sessions(device_id, created_at desc);
create index device_activation_sessions_expires_idx on public.device_activation_sessions(expires_at);
create index device_events_device_id_created_at_idx on public.device_events(device_id, created_at desc);
create index support_cases_owner_idx on public.support_cases(owner_user_id, created_at desc);
create index support_cases_device_idx on public.support_cases(device_id);

create or replace function public.normalize_koda_device_serial()
returns trigger language plpgsql set search_path = public as $$
begin new.serial_number = upper(trim(new.serial_number)); return new; end; $$;

create trigger normalize_koda_device_serial_before_write
before insert or update of serial_number on public.devices
for each row execute function public.normalize_koda_device_serial();

create trigger update_devices_updated_at
before update on public.devices
for each row execute function public.update_updated_at_column();

create trigger update_support_cases_updated_at
before update on public.support_cases
for each row execute function public.update_updated_at_column();

create or replace function public.factory_register_device(
  _serial_number text,
  _model text,
  _activation_secret text,
  _manufactured_at date default null,
  _purchase_date date default null,
  _warranty_start date default null,
  _warranty_end date default null,
  _kodaos_version text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare _device_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Factory access required'; end if;
  if trim(coalesce(_serial_number, '')) = '' then raise exception 'Serial number is required'; end if;
  if _model not in ('kodabot-i', 'kodabot-i-pro') then raise exception 'Invalid model'; end if;
  if length(coalesce(_activation_secret, '')) < 16 then raise exception 'Activation secret must contain at least 16 characters'; end if;
  insert into public.devices(serial_number,model,manufactured_at,purchase_date,warranty_start,warranty_end,kodaos_version,notes,created_by)
  values(upper(trim(_serial_number)),_model,_manufactured_at,_purchase_date,_warranty_start,_warranty_end,nullif(trim(coalesce(_kodaos_version,'')),''),nullif(trim(coalesce(_notes,'')),''),auth.uid())
  returning id into _device_id;
  insert into public.device_activation_secrets(device_id,secret_hash)
  values(_device_id, encode(digest(_activation_secret,'sha256'),'hex'));
  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values(_device_id,'factory_registered',jsonb_build_object('model',_model),auth.uid());
  return _device_id;
end; $$;

create or replace function public.begin_device_activation(_serial_number text,_activation_secret text)
returns table(session_id uuid,activation_code text,expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare _device public.devices%rowtype; _secret_hash text; _code text; _session_id uuid; _expires timestamptz := now()+interval '15 minutes';
begin
  select * into _device from public.devices where upper(serial_number)=upper(trim(_serial_number)) for update;
  if not found then raise exception 'Device not found'; end if;
  select secret_hash into _secret_hash from public.device_activation_secrets where device_id=_device.id;
  if _secret_hash is null or encode(digest(coalesce(_activation_secret,''),'sha256'),'hex')<>_secret_hash then raise exception 'Device activation verification failed'; end if;
  if _device.status='activated' then raise exception 'Device already activated'; end if;
  if _device.status<>'not_activated' then raise exception 'Device is not available for activation'; end if;
  update public.device_activation_sessions set status='expired' where device_id=_device.id and status='pending';
  loop
    _code := upper(encode(gen_random_bytes(8),'hex'));
    begin
      insert into public.device_activation_sessions(device_id,activation_code,expires_at) values(_device.id,_code,_expires) returning id into _session_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.device_events(device_id,event_type,details) values(_device.id,'activation_started',jsonb_build_object('session_id',_session_id));
  return query select _session_id,_code,_expires;
end; $$;

create or replace function public.claim_device_activation(_activation_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid:=auth.uid(); _session public.device_activation_sessions%rowtype; _device public.devices%rowtype;
begin
  if _uid is null then raise exception 'Authentication required'; end if;
  select * into _session from public.device_activation_sessions where activation_code=upper(trim(_activation_code)) for update;
  if not found or _session.status<>'pending' then raise exception 'Activation session is not available'; end if;
  if _session.expires_at<=now() then update public.device_activation_sessions set status='expired' where id=_session.id; raise exception 'Activation session expired'; end if;
  select * into _device from public.devices where id=_session.device_id for update;
  if _device.status='activated' then
    if _device.owner_user_id=_uid then
      update public.device_activation_sessions set status='claimed',claimed_by=_uid,claimed_at=coalesce(claimed_at,now()) where id=_session.id;
      return _device.id;
    end if;
    raise exception 'Device already activated';
  end if;
  if _device.status<>'not_activated' then raise exception 'Device is not available for activation'; end if;
  update public.devices set owner_user_id=_uid,status='activated',activated_at=now() where id=_device.id;
  update public.device_activation_sessions set status='claimed',claimed_by=_uid,claimed_at=now() where id=_session.id;
  insert into public.device_events(device_id,event_type,details,actor_user_id) values(_device.id,'activated',jsonb_build_object('source','kodacloud_setup','session_id',_session.id),_uid);
  return _device.id;
end; $$;

create or replace function public.check_device_activation(_session_id uuid,_serial_number text,_activation_secret text)
returns table(activation_status public.koda_activation_session_status,device_activated boolean)
language plpgsql security definer set search_path = public as $$
declare _device public.devices%rowtype; _session public.device_activation_sessions%rowtype; _secret_hash text;
begin
  select * into _device from public.devices where upper(serial_number)=upper(trim(_serial_number));
  if not found then raise exception 'Device not found'; end if;
  select secret_hash into _secret_hash from public.device_activation_secrets where device_id=_device.id;
  if _secret_hash is null or encode(digest(coalesce(_activation_secret,''),'sha256'),'hex')<>_secret_hash then raise exception 'Device activation verification failed'; end if;
  select * into _session from public.device_activation_sessions where id=_session_id and device_id=_device.id;
  if not found then raise exception 'Activation session not found'; end if;
  if _session.status='pending' and _session.expires_at<=now() then update public.device_activation_sessions set status='expired' where id=_session.id; _session.status:='expired'; end if;
  return query select _session.status,(_device.status='activated');
end; $$;

create or replace function public.factory_list_devices()
returns table(id uuid,serial_number text,model text,status public.koda_device_status,manufactured_at date,purchase_date date,warranty_start date,warranty_end date,kodaos_version text,activated_at timestamptz,owner_email_masked text,notes text,created_at timestamptz)
language plpgsql security definer set search_path = public,auth as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  return query select d.id,d.serial_number,d.model,d.status,d.manufactured_at,d.purchase_date,d.warranty_start,d.warranty_end,d.kodaos_version,d.activated_at,
    case when u.email is null then null else regexp_replace(u.email,'^(.{2}).*(@.*)$','\1***\2') end,d.notes,d.created_at
  from public.devices d left join auth.users u on u.id=d.owner_user_id order by d.created_at desc;
end; $$;

alter table public.devices enable row level security;
alter table public.device_activation_secrets enable row level security;
alter table public.device_activation_sessions enable row level security;
alter table public.device_events enable row level security;
alter table public.support_cases enable row level security;

grant select, insert, update, delete on public.devices to authenticated;
revoke all on public.device_activation_secrets from anon, authenticated;
revoke all on public.device_activation_sessions from anon, authenticated;
grant select, insert on public.device_events to authenticated;
grant select, insert, update on public.support_cases to authenticated;

revoke all on function public.factory_register_device(text,text,text,date,date,date,date,text,text) from public,anon,authenticated;
revoke all on function public.begin_device_activation(text,text) from public,anon,authenticated;
revoke all on function public.claim_device_activation(text) from public,anon,authenticated;
revoke all on function public.check_device_activation(uuid,text,text) from public,anon,authenticated;
revoke all on function public.factory_list_devices() from public,anon,authenticated;

grant execute on function public.factory_register_device(text,text,text,date,date,date,date,text,text) to authenticated;
grant execute on function public.begin_device_activation(text,text) to anon,authenticated;
grant execute on function public.claim_device_activation(text) to authenticated;
grant execute on function public.check_device_activation(uuid,text,text) to anon,authenticated;
grant execute on function public.factory_list_devices() to authenticated;

create policy "Users can read own devices" on public.devices for select to authenticated using (owner_user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'));
create policy "Factory can insert devices" on public.devices for insert to authenticated with check (public.has_role((select auth.uid()),'admin'));
create policy "Factory can update devices" on public.devices for update to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));
create policy "Factory can delete devices" on public.devices for delete to authenticated using (public.has_role((select auth.uid()),'admin'));
create policy "Users can read events for own devices" on public.device_events for select to authenticated using (exists(select 1 from public.devices d where d.id=device_events.device_id and (d.owner_user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'))));
create policy "Factory can add device events" on public.device_events for insert to authenticated with check (public.has_role((select auth.uid()),'admin'));
create policy "Users can read own support cases" on public.support_cases for select to authenticated using (owner_user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'));
create policy "Users can create own support cases" on public.support_cases for insert to authenticated with check (owner_user_id=(select auth.uid()) and (device_id is null or exists(select 1 from public.devices d where d.id=support_cases.device_id and d.owner_user_id=(select auth.uid()))));
create policy "Factory can update support cases" on public.support_cases for update to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));

revoke all on function public.normalize_koda_device_serial() from public,anon,authenticated;
;
