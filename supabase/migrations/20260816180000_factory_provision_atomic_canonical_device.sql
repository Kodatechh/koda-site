-- Complete the factory cutover with one atomic action on the canonical device table.
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

  -- Serialize competing factory requests for the same physical identifiers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('serial:' || v_serial, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('board:' || v_board_uid, 0));

  select * into v_device
  from public.devices
  where upper(trim(serial_number)) = v_serial
  for update;

  if not found then
    insert into public.devices(serial_number, model, created_by)
    values (v_serial, v_model, auth.uid())
    returning * into v_device;
  end if;

  if v_device.model <> v_model then raise exception 'device model mismatch'; end if;
  if v_device.provisioning_status <> 'registered' then raise exception 'serial already provisioned'; end if;
  if v_device.board_uid is not null and v_device.board_uid <> v_board_uid then
    raise exception 'device board uid mismatch';
  end if;
  if exists (
    select 1 from public.devices
    where board_uid = v_board_uid and id <> v_device.id
  ) then
    raise exception 'board uid already provisioned';
  end if;

  v_secret_hex := encode(extensions.gen_random_bytes(32), 'hex');

  update public.devices
  set board_uid = v_board_uid,
      provisioning_status = 'provisioned',
      provisioned_at = coalesce(provisioned_at, now())
  where id = v_device.id;

  insert into public.koda_device_credentials(device_id, device_secret_hex)
  values (v_device.id, v_secret_hex);

  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (
    v_device.id,
    'provisioned',
    jsonb_build_object('model', v_model, 'source', 'factory_edge_function'),
    auth.uid()
  );

  return jsonb_build_object(
    'device_id', v_device.id,
    'serial', v_serial,
    'model', v_model,
    'board_uid', v_board_uid,
    'activation_status', v_device.status::text,
    'device_secret_hex', v_secret_hex
  );
end
$$;

revoke all on function public.koda_factory_provision_device(text,text,text)
  from public, anon, authenticated;
grant execute on function public.koda_factory_provision_device(text,text,text) to service_role;
