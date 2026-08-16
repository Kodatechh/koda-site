create table if not exists public.device_preferences (
  device_id uuid primary key references public.devices(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.device_health (
  device_id uuid primary key references public.devices(id) on delete cascade,
  online boolean not null default false,
  last_seen_at timestamptz,
  wifi_status text,
  wifi_signal integer,
  system_status text not null default 'unknown',
  display_status text,
  touch_status text,
  sensor_status text,
  audio_status text,
  storage_status text,
  last_boot_at timestamptz,
  last_restart_reason text,
  diagnostics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivered','completed','failed','cancelled')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  completed_at timestamptz
);
create index if not exists device_commands_device_created_idx on public.device_commands(device_id, created_at desc);
create table if not exists public.device_transfers (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled','expired')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);
create table if not exists public.device_feedback (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  message text not null,
  kodaos_version text,
  created_at timestamptz not null default now()
);
create table if not exists public.factory_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  model text not null check (model in ('kodabot-i','kodabot-i-pro')),
  manufactured_from date,
  manufactured_to date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.devices add column if not exists batch_id uuid references public.factory_batches(id) on delete set null;
alter table public.devices add column if not exists hardware_revision text;
alter table public.devices add column if not exists latest_available_kodaos text;
create table if not exists public.device_components (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  component_type text not null,
  manufacturer text,
  model_or_revision text,
  lot_code text,
  installed_at date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists device_components_device_idx on public.device_components(device_id);
create table if not exists public.device_quality_checks (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  check_key text not null,
  label text not null,
  passed boolean,
  notes text,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(device_id, check_key)
);
create table if not exists public.service_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  model text,
  batch_id uuid references public.factory_batches(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create table if not exists public.service_campaign_devices (
  campaign_id uuid not null references public.service_campaigns(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'eligible' check (status in ('eligible','contacted','scheduled','completed','not_required')),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, device_id)
);
create table if not exists public.support_case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  visibility text not null default 'internal' check (visibility in ('internal','customer')),
  created_at timestamptz not null default now()
);
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.device_preferences enable row level security;
alter table public.device_health enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_transfers enable row level security;
alter table public.device_feedback enable row level security;
alter table public.factory_batches enable row level security;
alter table public.device_components enable row level security;
alter table public.device_quality_checks enable row level security;
alter table public.service_campaigns enable row level security;
alter table public.service_campaign_devices enable row level security;
alter table public.support_case_notes enable row level security;
alter table public.admin_audit_log enable row level security;
create policy device_preferences_owner_select on public.device_preferences for select to authenticated using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy device_preferences_owner_write on public.device_preferences for all to authenticated using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy device_health_owner_select on public.device_health for select to authenticated using (exists(select 1 from public.devices d where d.id = device_id and (d.owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_commands_owner_select on public.device_commands for select to authenticated using (exists(select 1 from public.devices d where d.id = device_id and (d.owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_commands_owner_insert on public.device_commands for insert to authenticated with check (exists(select 1 from public.devices d where d.id = device_id and (d.owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_transfers_owner on public.device_transfers for all to authenticated using (from_user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (from_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy device_feedback_owner on public.device_feedback for select to authenticated using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy device_feedback_owner_insert on public.device_feedback for insert to authenticated with check (owner_user_id = auth.uid());
create policy factory_batches_admin on public.factory_batches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy device_components_staff on public.device_components for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced')) with check (public.has_role(auth.uid(),'admin'));
create policy device_quality_checks_staff on public.device_quality_checks for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced')) with check (public.has_role(auth.uid(),'admin'));
create policy service_campaigns_staff on public.service_campaigns for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced')) with check (public.has_role(auth.uid(),'admin'));
create policy service_campaign_devices_staff on public.service_campaign_devices for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced')) with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced'));
create policy support_case_notes_staff on public.support_case_notes for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced')) with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy admin_audit_staff_select on public.admin_audit_log for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced'));
create or replace function public.request_device_command(_device_id uuid, _command text, _payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare _uid uuid := auth.uid(); _id uuid;
begin
 if _uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.devices d where d.id=_device_id and (d.owner_user_id=_uid or public.has_role(_uid,'admin') or public.has_role(_uid,'support_advanced'))) then raise exception 'Device access required'; end if;
 if _command not in ('restart','run_diagnostics','check_update','install_update','sync_preferences','factory_reset_request') then raise exception 'Unsupported command'; end if;
 insert into public.device_commands(device_id,requested_by,command,payload) values(_device_id,_uid,_command,coalesce(_payload,'{}'::jsonb)) returning id into _id;
 insert into public.device_events(device_id,event_type,details,actor_user_id) values(_device_id,'command_requested',jsonb_build_object('command',_command,'command_id',_id),_uid);
 return _id;
end $$;
grant execute on function public.request_device_command(uuid,text,jsonb) to authenticated;
create or replace function public.request_device_transfer(_device_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare _uid uuid:=auth.uid(); _id uuid;
begin
 if _uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.devices where id=_device_id and owner_user_id=_uid and status='activated') then raise exception 'Device ownership required'; end if;
 if exists(select 1 from public.device_transfers where device_id=_device_id and status in ('requested','confirmed')) then raise exception 'Transfer already pending'; end if;
 insert into public.device_transfers(device_id,from_user_id) values(_device_id,_uid) returning id into _id;
 insert into public.device_events(device_id,event_type,details,actor_user_id) values(_device_id,'transfer_requested',jsonb_build_object('transfer_id',_id),_uid);
 return _id;
end $$;
grant execute on function public.request_device_transfer(uuid) to authenticated;
create or replace function public.complete_device_transfer_reset(_transfer_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare _uid uuid:=auth.uid(); _t public.device_transfers%rowtype;
begin
 if _uid is null then raise exception 'Authentication required'; end if;
 select * into _t from public.device_transfers where id=_transfer_id for update;
 if not found or _t.from_user_id<>_uid or _t.status<>'requested' then raise exception 'Transfer unavailable'; end if;
 update public.devices set owner_user_id=null,status='not_activated',activated_at=null where id=_t.device_id;
 update public.device_transfers set status='completed',confirmed_at=now(),completed_at=now() where id=_t.id;
 delete from public.device_preferences where device_id=_t.device_id;
 insert into public.device_events(device_id,event_type,details,actor_user_id) values(_t.device_id,'ownership_released',jsonb_build_object('transfer_id',_t.id),_uid);
end $$;
grant execute on function public.complete_device_transfer_reset(uuid) to authenticated;
create or replace function public.upsert_device_preferences(_device_id uuid, _preferences jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare _uid uuid:=auth.uid();
begin
 if _uid is null or not exists(select 1 from public.devices where id=_device_id and owner_user_id=_uid) then raise exception 'Device ownership required'; end if;
 insert into public.device_preferences(device_id,owner_user_id,preferences) values(_device_id,_uid,coalesce(_preferences,'{}'::jsonb)) on conflict(device_id) do update set preferences=excluded.preferences,owner_user_id=excluded.owner_user_id,updated_at=now();
 perform public.request_device_command(_device_id,'sync_preferences',coalesce(_preferences,'{}'::jsonb));
end $$;
grant execute on function public.upsert_device_preferences(uuid,jsonb) to authenticated;;
