-- PHASE 3: canonical factory, claim and support operations.
create or replace function public.koda_factory_register_device(
  p_serial_number text,
  p_model text,
  p_manufactured_at date default null,
  p_purchase_date date default null,
  p_warranty_start date default null,
  p_warranty_end date default null,
  p_kodaos_version text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device_id uuid;
  v_model text := lower(trim(p_model));
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Factory access required';
  end if;
  if trim(coalesce(p_serial_number, '')) = '' then
    raise exception 'Serial number is required';
  end if;
  if v_model not in ('kodabot-i', 'kodabot-i-pro') then
    raise exception 'Invalid model';
  end if;

  insert into public.devices(
    serial_number, model, manufactured_at, purchase_date, warranty_start,
    warranty_end, kodaos_version, notes, created_by
  ) values (
    upper(trim(p_serial_number)), v_model, p_manufactured_at, p_purchase_date,
    p_warranty_start, p_warranty_end,
    nullif(trim(coalesce(p_kodaos_version, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_device_id;

  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (v_device_id, 'factory_registered', jsonb_build_object('model', v_model), auth.uid());
  return v_device_id;
end
$$;

revoke all on function public.koda_factory_register_device(text,text,date,date,date,date,text,text)
  from public, anon;
grant execute on function public.koda_factory_register_device(text,text,date,date,date,date,text,text)
  to authenticated, service_role;

create or replace function public.koda_factory_provision_device(
  p_serial text,
  p_model text,
  p_board_uid text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.devices%rowtype;
  v_secret_hex text;
  v_serial text := upper(trim(p_serial));
  v_model text := lower(trim(p_model));
  v_board_uid text := lower(trim(p_board_uid));
begin
  if length(coalesce(v_serial, '')) < 4 then raise exception 'invalid serial'; end if;
  if v_model not in ('kodabot-i', 'kodabot-i-pro') then raise exception 'invalid model'; end if;
  if v_board_uid is null or v_board_uid !~ '^[0-9a-f]+$' or length(v_board_uid) < 8 then
    raise exception 'invalid board uid';
  end if;

  select * into v_device from public.devices
  where upper(trim(serial_number)) = v_serial for update;
  if not found then raise exception 'device must be registered first'; end if;
  if v_device.model <> v_model then raise exception 'device model mismatch'; end if;
  if v_device.provisioning_status <> 'registered' then raise exception 'serial already provisioned'; end if;
  if v_device.board_uid is not null and v_device.board_uid <> v_board_uid then
    raise exception 'device board uid mismatch';
  end if;
  if exists (select 1 from public.devices where board_uid = v_board_uid and id <> v_device.id) then
    raise exception 'board uid already provisioned';
  end if;

  v_secret_hex := encode(extensions.gen_random_bytes(32), 'hex');
  update public.devices set
    board_uid = v_board_uid,
    provisioning_status = 'provisioned',
    provisioned_at = coalesce(provisioned_at, now())
  where id = v_device.id;

  insert into public.koda_device_credentials(device_id, device_secret_hex)
  values (v_device.id, v_secret_hex)
  on conflict (device_id) do update set
    device_secret_hex = excluded.device_secret_hex,
    created_at = now();

  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (v_device.id, 'provisioned', jsonb_build_object('model', v_model), auth.uid());

  return jsonb_build_object(
    'device_id', v_device.id, 'serial', v_serial, 'model', v_model,
    'board_uid', v_board_uid, 'activation_status', v_device.status::text,
    'device_secret_hex', v_secret_hex
  );
end
$$;

revoke all on function public.koda_factory_provision_device(text,text,text)
  from public, anon, authenticated;
grant execute on function public.koda_factory_provision_device(text,text,text) to service_role;

create or replace function public.koda_claim_device(p_claim_token_hash text, p_user_id uuid)
returns table(device_id uuid, serial text, model text, activated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.koda_activation_sessions%rowtype;
  v_device public.devices%rowtype;
  v_now timestamptz := now();
begin
  if p_user_id is null then raise exception 'authentication required'; end if;
  select * into v_session from public.koda_activation_sessions
  where claim_token_hash = p_claim_token_hash for update;
  if not found then raise exception 'invalid activation token'; end if;
  if v_session.status <> 'pending' then raise exception 'activation session is not pending'; end if;
  if v_session.expires_at <= v_now then
    update public.koda_activation_sessions set status = 'expired' where id = v_session.id;
    raise exception 'activation session expired';
  end if;

  select * into v_device from public.devices where id = v_session.device_id for update;
  if not found then raise exception 'device not found'; end if;
  if v_device.provisioning_status <> 'ready' then raise exception 'device is not ready'; end if;
  if v_device.owner_user_id is not null or v_device.status = 'activated' then
    raise exception 'device already activated';
  end if;
  if v_device.status <> 'not_activated' then raise exception 'device is not available'; end if;

  update public.devices set owner_user_id = p_user_id, status = 'activated', activated_at = v_now
  where id = v_device.id;
  update public.koda_activation_sessions set
    status = 'activated', claimed_by_user_id = p_user_id, claimed_at = v_now
  where id = v_session.id;
  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (v_device.id, 'activated', jsonb_build_object('source', 'kodacloud_claim', 'session_id', v_session.id), p_user_id);

  return query select v_device.id, v_device.serial_number, v_device.model, v_now;
end
$$;

revoke all on function public.koda_claim_device(text,uuid) from public, anon, authenticated;
grant execute on function public.koda_claim_device(text,uuid) to service_role;

drop function if exists public.support_factory_reset_device(uuid,text);
create function public.support_factory_reset_device(_device_id uuid, _reason text)
returns table(serial text, model text, board_uid text, device_secret_hex text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_device public.devices%rowtype;
  v_secret_hex text;
  v_had_owner boolean;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not (
    public.has_role(v_actor, 'admin') or
    public.has_role(v_actor, 'support_agent') or
    public.has_role(v_actor, 'support_advanced')
  ) then raise exception 'Support access required'; end if;
  if length(trim(coalesce(_reason, ''))) < 10 then
    raise exception 'Factory reset reason must contain at least 10 characters';
  end if;

  select * into v_device from public.devices where id = _device_id for update;
  if not found then raise exception 'Device not found'; end if;
  if v_device.provisioning_status <> 'ready' or v_device.board_uid is null then
    raise exception 'Only a provisioned ready device can be restored';
  end if;

  v_had_owner := v_device.owner_user_id is not null;
  v_secret_hex := encode(extensions.gen_random_bytes(32), 'hex');

  update public.koda_device_tokens set revoked_at = coalesce(revoked_at, now())
  where device_id = v_device.id;
  update public.koda_device_challenges set used_at = coalesce(used_at, now())
  where device_id = v_device.id;
  update public.koda_activation_sessions set status = 'cancelled'
  where device_id = v_device.id and status = 'pending';
  update public.device_transfers set status = 'cancelled'
  where device_id = v_device.id and status in ('requested', 'confirmed');
  delete from public.device_preferences where device_id = v_device.id;

  insert into public.koda_device_credentials(device_id, device_secret_hex)
  values (v_device.id, v_secret_hex)
  on conflict (device_id) do update set
    device_secret_hex = excluded.device_secret_hex, created_at = now();

  update public.devices set owner_user_id = null, status = 'not_activated', activated_at = null
  where id = v_device.id;

  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (v_device.id, 'support_factory_reset', jsonb_build_object(
    'reason', trim(_reason), 'had_previous_owner', v_had_owner,
    'credential_rotated', true, 'source', 'support_console'
  ), v_actor);
  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (v_device.id, 'credential_rotated', jsonb_build_object('source', 'support_factory_reset'), v_actor);

  return query select v_device.serial_number, v_device.model, v_device.board_uid, v_secret_hex;
end
$$;

revoke all on function public.support_factory_reset_device(uuid,text) from public, anon;
grant execute on function public.support_factory_reset_device(uuid,text) to authenticated, service_role;
