-- Factory Provisioning hardening
-- Applied after 20260816084000_factory_provisioning_system.sql.

-- Ensure no overload capable of returning a plaintext activation secret exists.
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

-- DROP is required because the applied draft returned TABLE(success,message).
drop function if exists public.factory_device_checkin(text,text,text,text);
create function public.factory_device_checkin(
  _serial_number text, _activation_secret text,
  _kodaos_version text default null, _hardware_revision text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype; _stored_hash text; _provided_hash text;
begin
  select * into _device from public.devices
  where upper(serial_number)=upper(trim(_serial_number)) for update;
  if not found then raise exception 'Device provisioning verification failed'; end if;
  select secret_hash into _stored_hash from public.device_activation_secrets where device_id=_device.id;
  _provided_hash:=encode(extensions.digest(coalesce(_activation_secret,''),'sha256'::text),'hex');
  if _stored_hash is null or _provided_hash<>_stored_hash then
    raise exception 'Device provisioning verification failed';
  end if;
  if _device.provisioning_status='registered' then
    update public.devices set
      provisioning_status='provisioned',provisioned_at=coalesce(provisioned_at,now()),
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
  return jsonb_build_object('serial_number',_device.serial_number,
    'provisioning_status',_device.provisioning_status::text,'provisioned_at',_device.provisioned_at);
end
$$;

-- Remove the four-argument draft and any three-argument version before creating
-- the single frontend signature.
drop function if exists public.update_device_factory_test(uuid,text,text,text);
drop function if exists public.update_device_factory_test(uuid,text,text);
create function public.update_device_factory_test(_device_id uuid,_component_name text,_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype; _required text[];
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  select * into _device from public.devices where id=_device_id;
  if not found then raise exception 'Device not found'; end if;
  if _device.provisioning_status<>'provisioned' then
    raise exception 'Factory tests can only be updated for a provisioned device';
  end if;
  _required:=public.koda_required_factory_tests(_device.model);
  if not (_component_name=any(_required)) then raise exception 'Invalid factory test component for this model'; end if;
  if _status not in ('pending','passed','failed','not_applicable') then raise exception 'Invalid factory test status'; end if;
  if _status='not_applicable' then raise exception 'Required factory test cannot be not_applicable'; end if;
  insert into public.device_factory_tests(device_id,component_name,status,tested_at,tested_by)
  values (_device_id,_component_name,_status,
    case when _status='pending' then null else now() end,
    case when _status='pending' then null else auth.uid() end)
  on conflict(device_id,component_name) do update set
    status=excluded.status,tested_at=excluded.tested_at,tested_by=excluded.tested_by;
end
$$;

-- Return types changed from TABLE(success,message) to void in the applied draft.
drop function if exists public.mark_device_factory_tested(uuid);
create function public.mark_device_factory_tested(_device_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare _device public.devices%rowtype; _required text[]; _missing_or_failed text[];
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Factory access required'; end if;
  select * into _device from public.devices where id=_device_id for update;
  if not found then raise exception 'Device not found'; end if;
  if _device.provisioning_status<>'provisioned' then
    raise exception 'Device must be provisioned before factory testing can be completed';
  end if;
  _required:=public.koda_required_factory_tests(_device.model);
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
  if _device.provisioning_status<>'factory_tested' then
    raise exception 'Device must pass factory testing before it can be marked ready';
  end if;
  update public.devices set provisioning_status='ready',ready_at=coalesce(ready_at,now()) where id=_device.id;
  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values (_device.id,'factory_ready','{}'::jsonb,auth.uid());
end
$$;

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

-- Enforce model-specific tests even for privileged direct table writes.
create or replace function public.validate_device_factory_test()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare _model text; _required text[];
begin
  select model into _model from public.devices where id=new.device_id;
  if _model is null then raise exception 'Device not found'; end if;
  _required:=public.koda_required_factory_tests(_model);
  if not (new.component_name=any(_required)) then
    raise exception 'Invalid factory test component for this model';
  end if;
  if new.status='not_applicable' then
    raise exception 'Required factory test cannot be not_applicable';
  end if;
  return new;
end
$$;

drop trigger if exists validate_device_factory_test_before_write on public.device_factory_tests;
create trigger validate_device_factory_test_before_write
before insert or update of device_id,component_name,status on public.device_factory_tests
for each row execute function public.validate_device_factory_test();

revoke all on function public.validate_device_factory_test() from public,anon,authenticated;

-- Reassert least privilege after every DROP/CREATE in the preceding migration.
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
