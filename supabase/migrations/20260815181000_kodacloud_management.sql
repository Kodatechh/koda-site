-- KodaCloud management layer: device health, preferences, remote commands,
-- support roles, quality control, production batches and audit.

alter type public.app_role add value if not exists 'support_agent';
alter type public.app_role add value if not exists 'support_advanced';

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
  uptime_seconds bigint,
  last_boot_reason text,
  checks jsonb not null default '{}'::jsonb,
  last_diagnostic_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  result jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index if not exists device_commands_device_created_idx on public.device_commands(device_id, created_at desc);

create table if not exists public.device_feedback (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  kodaos_version text,
  status text not null default 'new' check (status in ('new','reviewing','planned','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  model text not null check (model in ('kodabot-i','kodabot-i-pro')),
  manufactured_from date,
  manufactured_to date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_components (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  component_type text not null,
  manufacturer text,
  part_number text,
  hardware_revision text,
  lot_code text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists device_components_device_idx on public.device_components(device_id);

create table if not exists public.device_quality_checks (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  performed_by uuid references auth.users(id) on delete set null,
  checks jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.service_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  affected_model text,
  affected_batch_id uuid references public.production_batches(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_campaign_devices (
  campaign_id uuid references public.service_campaigns(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  status text not null default 'eligible' check (status in ('eligible','contacted','scheduled','completed','not_required')),
  primary key (campaign_id, device_id)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.devices add column if not exists production_batch_id uuid references public.production_batches(id) on delete set null;
alter table public.devices add column if not exists hardware_revision text;

alter table public.device_preferences enable row level security;
alter table public.device_health enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_feedback enable row level security;
alter table public.production_batches enable row level security;
alter table public.device_components enable row level security;
alter table public.device_quality_checks enable row level security;
alter table public.service_campaigns enable row level security;
alter table public.service_campaign_devices enable row level security;
alter table public.admin_audit_log enable row level security;

create policy device_preferences_owner_select on public.device_preferences for select to authenticated using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy device_preferences_owner_write on public.device_preferences for all to authenticated using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy device_health_owner_select on public.device_health for select to authenticated using (exists(select 1 from public.devices d where d.id=device_health.device_id and (d.owner_user_id=auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_commands_owner_select on public.device_commands for select to authenticated using (exists(select 1 from public.devices d where d.id=device_commands.device_id and (d.owner_user_id=auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_commands_owner_insert on public.device_commands for insert to authenticated with check (exists(select 1 from public.devices d where d.id=device_commands.device_id and (d.owner_user_id=auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_advanced'))));
create policy device_feedback_owner on public.device_feedback for select to authenticated using (owner_user_id=auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy device_feedback_owner_insert on public.device_feedback for insert to authenticated with check (owner_user_id=auth.uid());
create policy factory_batches on public.production_batches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy support_components on public.device_components for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy factory_components_write on public.device_components for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy support_quality_read on public.device_quality_checks for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy factory_quality_write on public.device_quality_checks for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy support_campaigns_read on public.service_campaigns for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy factory_campaigns_write on public.service_campaigns for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy support_campaign_devices_read on public.service_campaign_devices for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'support_agent') or public.has_role(auth.uid(),'support_advanced'));
create policy factory_campaign_devices_write on public.service_campaign_devices for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy admin_audit_read on public.admin_audit_log for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- Keep pgcrypto functions resolvable even when RPC functions use a restricted search_path.
create or replace function public.koda_sha256(_value text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(coalesce(_value,''), 'sha256'), 'hex');
$$;
revoke all on function public.koda_sha256(text) from public, anon;
grant execute on function public.koda_sha256(text) to authenticated;
