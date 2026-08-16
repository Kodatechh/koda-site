-- Factory Provisioning System
-- Lifecycle: registered -> provisioned -> factory_tested -> ready -> customer activation.
-- The existing factory_batches/devices.batch_id UUID relationship remains canonical.

do $$
declare _labels text[];
begin
  select array_agg(e.enumlabel order by e.enumsortorder) into _labels
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'public' and t.typname = 'koda_provisioning_status';

  if _labels is null then
    execute $enum$create type public.koda_provisioning_status as enum
      ('registered','provisioned','factory_tested','ready')$enum$;
  elsif _labels <> array['registered','provisioned','factory_tested','ready']::text[] then
    raise exception 'Existing public.koda_provisioning_status has incompatible labels: %', _labels;
  end if;
end
$$;

alter table public.devices
  add column if not exists provisioning_status public.koda_provisioning_status not null default 'registered',
  add column if not exists provisioned_at timestamptz,
  add column if not exists factory_tested_at timestamptz,
  add column if not exists ready_at timestamptz;

do $$
declare _column record;
begin
  for _column in select * from (values
    ('provisioning_status', 'public', 'koda_provisioning_status'),
    ('provisioned_at', 'pg_catalog', 'timestamptz'),
    ('factory_tested_at', 'pg_catalog', 'timestamptz'),
    ('ready_at', 'pg_catalog', 'timestamptz')
  ) as expected(column_name, type_schema, type_name)
  loop
    if not exists (
      select 1 from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_type t on t.oid = a.atttypid
      join pg_catalog.pg_namespace tn on tn.oid = t.typnamespace
      where n.nspname = 'public' and c.relname = 'devices'
        and a.attname = _column.column_name and not a.attisdropped
        and tn.nspname = _column.type_schema and t.typname = _column.type_name
    ) then
      raise exception 'public.devices.% has an incompatible type', _column.column_name;
    end if;
  end loop;
end
$$;

create index if not exists devices_provisioning_status_idx
on public.devices(provisioning_status);

create table if not exists public.device_factory_tests (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  component_name text not null,
  status text not null check (status in ('pending','passed','failed','not_applicable')),
  tested_at timestamptz,
  tested_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, component_name)
);

create index if not exists device_factory_tests_device_id_idx
on public.device_factory_tests(device_id);
create index if not exists device_factory_tests_status_idx
on public.device_factory_tests(status);

drop trigger if exists update_device_factory_tests_updated_at on public.device_factory_tests;
create trigger update_device_factory_tests_updated_at
before update on public.device_factory_tests
for each row execute function public.update_updated_at_column();

-- Preserve the established registration RPC. The caller creates the one-time
-- secret; only its SHA-256 digest is stored and the secret is never returned.
create or replace function public.factory_register_device(
  _serial_number text, _model text, _activation_secret text,
  _manufactured_at date default null, _purchase_date date default null,
  _warranty_start date default null, _warranty_end date default null,
  _kodaos_version text default null, _notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare _device_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Factory access required';
  end if;
  if trim(coalesce(_serial_number, '')) = '' then raise exception 'Serial number is required'; end if;
  if _model not in ('kodabot-i','kodabot-i-pro') then raise exception 'Invalid model'; end if;
  if length(coalesce(_activation_secret, '')) < 16 then
    raise exception 'Activation secret must contain at least 16 characters';
  end if;

  insert into public.devices(
    serial_number, model, manufactured_at, purchase_date, warranty_start,
    warranty_end, kodaos_version, notes, created_by
  ) values (
    upper(trim(_serial_number)), _model, _manufactured_at, _purchase_date,
    _warranty_start, _warranty_end, nullif(trim(coalesce(_kodaos_version,'')),''),
    nullif(trim(coalesce(_notes,'')),''), auth.uid()
  ) returning id into _device_id;

  insert into public.device_activation_secrets(device_id, secret_hash)
  values (_device_id, encode(extensions.digest(_activation_secret, 'sha256'::text), 'hex'));

  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values (_device_id,'factory_registered',jsonb_build_object('model',_model),auth.uid());
  return _device_id;
end
$$;

-- Remove every unsafe overload if one exists outside the applied history.
do $$
declare _function record;
begin
  for _function in
    select p.oid::regprocedure::text as signature
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='factory_register_device_with_secret'
  loop execute format('drop function if exists %s', _function.signature); end loop;
end
$$;

create or replace function public.koda_required_factory_tests(_model text)
returns text[] language sql immutable set search_path = '' as $$
  select case _model
    when 'kodabot-i' then array['display','touch','wifi','buzzer','bme280','kodaos','kodacloud']::text[]
    when 'kodabot-i-pro' then array['wifi','microphones','speaker','buttons','battery','charging','kodaos','kodacloud']::text[]
    else array[]::text[] end
$$;

-- Device-authenticated check-in. Its result contains no owner or secret data.
drop function if exists public.factory_device_checkin(text,text,text,text);
create function public.factory_device_checkin(
  _serial_number text, _activation_secret text,
  _kodaos_version text default null, _hardware_revision text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  _device public.devices%rowtype;
  _stored_hash text;
  _provided_hash text;
begin
  select * into _device from public.devices
  where upper(serial_number)=upper(trim(_serial_number)) for update;
  if not found then raise exception 'Device provisioning verification failed'; end if;

  select secret_hash into _stored_hash from public.device_activation_secrets
  where device_id=_device.id;
  _provided_hash := encode(extensions.digest(coalesce(_activation_secret,''), 'sha256'::text),'hex');
  if _stored_hash is null or _provided_hash <> _stored_hash then
    raise exception 'Device provisioning verification failed';
  end if;

  if _device.provisioning_status = 'registered' then
    update public.devices set
      provisioning_status='provisioned',
      provisioned_at=coalesce(provisioned_at,now()),
      kodaos_version=coalesce(nullif(trim(coalesce(_kodaos_version,'')),''),kodaos_version),
      hardware_revision=coalesce(hardware_revision,nullif(trim(coalesce(_hardware_revision,'')),''))
    where id=_device.id;
    insert into public.device_events(device_id,event_type,details,actor_user_id)
    values (_device.id,'factory_provisioned',jsonb_build_object(
      'kodaos_version',nullif(trim(coalesce(_kodaos_version,'')),''),
      'hardware_revision',coalesce(_device.hardware_revision,nullif(trim(coalesce(_hardware_revision,'')),''))
    ),null);
  elsif _device.provisioning_status not in ('provisioned','factory_tested','ready') then
    raise exception 'Device is not available for provisioning check-in';
  end if;

  select * into _device from public.devices where id=_device.id;
  return jsonb_build_object(
    'serial_number',_device.serial_number,
    'provisioning_status',_device.provisioning_status::text,
    'provisioned_at',_device.provisioned_at
  );
end
$$;

drop function if exists public.update_device_factory_test(uuid,text,text,text);
drop function if exists public.update_device_factory_test(uuid,text,text);
create function public.update_device_factory_test(_device_id uuid,_component_name text,_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype; _required text[];
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  select * into _device from public.devices where id=_device_id;
  if not found then raise exception 'Device not found'; end if;
  if _device.provisioning_status <> 'provisioned' then
    raise exception 'Factory tests can only be updated for a provisioned device';
  end if;
  _required := public.koda_required_factory_tests(_device.model);
  if not (_component_name = any(_required)) then raise exception 'Invalid factory test component for this model'; end if;
  if _status not in ('pending','passed','failed','not_applicable') then raise exception 'Invalid factory test status'; end if;
  if _status='not_applicable' then raise exception 'Required factory test cannot be not_applicable'; end if;

  insert into public.device_factory_tests(device_id,component_name,status,tested_at,tested_by)
  values (_device_id,_component_name,_status,
    case when _status='pending' then null else now() end,
    case when _status='pending' then null else auth.uid() end)
  on conflict (device_id,component_name) do update set
    status=excluded.status,tested_at=excluded.tested_at,tested_by=excluded.tested_by;
end
$$;

drop function if exists public.mark_device_factory_tested(uuid);
create function public.mark_device_factory_tested(_device_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype; _required text[]; _missing_or_failed text[];
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  select * into _device from public.devices where id=_device_id for update;
  if not found then raise exception 'Device not found'; end if;
  if _device.provisioning_status <> 'provisioned' then
    raise exception 'Device must be provisioned before factory testing can be completed';
  end if;
  _required := public.koda_required_factory_tests(_device.model);
  if coalesce(array_length(_required,1),0)=0 then raise exception 'No required factory tests configured for this model'; end if;
  select coalesce(array_agg(required_component),array[]::text[]) into _missing_or_failed
  from unnest(_required) as required_component
  where not exists (select 1 from public.device_factory_tests t
    where t.device_id=_device.id and t.component_name=required_component and t.status='passed');
  if coalesce(array_length(_missing_or_failed,1),0)>0 then
    raise exception 'Required factory tests are not passed: %',array_to_string(_missing_or_failed,', ');
  end if;
  update public.devices set provisioning_status='factory_tested',factory_tested_at=coalesce(factory_tested_at,now())
  where id=_device.id;
  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values (_device.id,'factory_tested',jsonb_build_object('required_tests',_required),auth.uid());
end
$$;

drop function if exists public.mark_device_ready_for_sale(uuid);
create function public.mark_device_ready_for_sale(_device_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  select * into _device from public.devices where id=_device_id for update;
  if not found then raise exception 'Device not found'; end if;
  if _device.provisioning_status <> 'factory_tested' then
    raise exception 'Device must pass factory testing before it can be marked ready';
  end if;
  update public.devices set provisioning_status='ready',ready_at=coalesce(ready_at,now()) where id=_device.id;
  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values (_device.id,'factory_ready','{}'::jsonb,auth.uid());
end
$$;

drop function if exists public.get_device_factory_tests(uuid);
create function public.get_device_factory_tests(_device_id uuid)
returns table(component_name text,status text,tested_at timestamptz,notes text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  return query select t.component_name,t.status,t.tested_at,t.notes
  from public.device_factory_tests t where t.device_id=_device_id order by t.component_name;
end
$$;

-- OUT columns changed, so PostgreSQL requires DROP + CREATE.
drop function if exists public.factory_list_devices();
create function public.factory_list_devices()
returns table(
  id uuid,serial_number text,model text,status public.koda_device_status,
  provisioning_status public.koda_provisioning_status,manufactured_at date,
  purchase_date date,warranty_start date,warranty_end date,kodaos_version text,
  hardware_revision text,activated_at timestamptz,owner_email_masked text,
  notes text,created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  return query select d.id,d.serial_number,d.model,d.status,d.provisioning_status,
    d.manufactured_at,d.purchase_date,d.warranty_start,d.warranty_end,d.kodaos_version,
    d.hardware_revision,d.activated_at,
    case when u.email is null then null else regexp_replace(u.email,'^(.{2}).*(@.*)$','\1***\2') end,
    d.notes,d.created_at
  from public.devices d left join auth.users u on u.id=d.owner_user_id order by d.created_at desc;
end
$$;

-- Customer activation is allowed only after factory readiness.
create or replace function public.begin_device_activation(_serial_number text,_activation_secret text)
returns table(session_id uuid,activation_code text,expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  _device public.devices%rowtype; _secret_hash text; _provided_hash text;
  _code text; _session_id uuid; _expires timestamptz:=now()+interval '15 minutes';
begin
  select * into _device from public.devices where upper(serial_number)=upper(trim(_serial_number)) for update;
  if not found then raise exception 'Device not found'; end if;
  select secret_hash into _secret_hash from public.device_activation_secrets where device_id=_device.id;
  _provided_hash:=encode(extensions.digest(coalesce(_activation_secret,''),'sha256'::text),'hex');
  if _secret_hash is null or _provided_hash<>_secret_hash then raise exception 'Device activation verification failed'; end if;
  if _device.provisioning_status<>'ready' then raise exception 'Device is not ready for customer activation'; end if;
  if _device.status='activated' then raise exception 'Device already activated'; end if;
  if _device.status<>'not_activated' then raise exception 'Device is not available for activation'; end if;
  update public.device_activation_sessions set status='expired' where device_id=_device.id and status='pending';
  loop
    _code:=upper(encode(extensions.gen_random_bytes(8),'hex'));
    begin
      insert into public.device_activation_sessions(device_id,activation_code,expires_at)
      values (_device.id,_code,_expires) returning id into _session_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.device_events(device_id,event_type,details)
  values (_device.id,'activation_started',jsonb_build_object('session_id',_session_id));
  return query select _session_id,_code,_expires;
end
$$;

alter table public.device_factory_tests enable row level security;
drop policy if exists "Factory can manage device factory tests" on public.device_factory_tests;
create policy "Factory can manage device factory tests" on public.device_factory_tests
for all to authenticated using (public.has_role((select auth.uid()),'admin'))
with check (public.has_role((select auth.uid()),'admin'));

-- Test rows are reachable only through the audited RPCs.
revoke all on table public.device_factory_tests from anon,authenticated;
revoke all on function public.factory_register_device(text,text,text,date,date,date,date,text,text) from public,anon,authenticated;
revoke all on function public.koda_required_factory_tests(text) from public,anon,authenticated;
revoke all on function public.factory_device_checkin(text,text,text,text) from public,anon,authenticated;
revoke all on function public.update_device_factory_test(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mark_device_factory_tested(uuid) from public,anon,authenticated;
revoke all on function public.mark_device_ready_for_sale(uuid) from public,anon,authenticated;
revoke all on function public.get_device_factory_tests(uuid) from public,anon,authenticated;
revoke all on function public.factory_list_devices() from public,anon,authenticated;
revoke all on function public.begin_device_activation(text,text) from public,anon,authenticated;

grant execute on function public.factory_register_device(text,text,text,date,date,date,date,text,text) to authenticated;
grant execute on function public.factory_device_checkin(text,text,text,text) to anon,authenticated;
grant execute on function public.update_device_factory_test(uuid,text,text) to authenticated;
grant execute on function public.mark_device_factory_tested(uuid) to authenticated;
grant execute on function public.mark_device_ready_for_sale(uuid) to authenticated;
grant execute on function public.get_device_factory_tests(uuid) to authenticated;
grant execute on function public.factory_list_devices() to authenticated;
grant execute on function public.begin_device_activation(text,text) to anon,authenticated;
