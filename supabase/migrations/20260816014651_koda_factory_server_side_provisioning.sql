create or replace function public.koda_factory_provision_device(
  p_serial text,
  p_model text,
  p_board_uid text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id uuid;
  v_secret_hex text;
  v_serial text := trim(p_serial);
  v_model text := trim(p_model);
  v_board_uid text := lower(trim(p_board_uid));
begin
  if v_serial is null or length(v_serial) < 4 then
    raise exception 'invalid serial';
  end if;
  if v_model is null or length(v_model) < 2 then
    raise exception 'invalid model';
  end if;
  if v_board_uid is null or v_board_uid !~ '^[0-9a-f]+$' or length(v_board_uid) < 8 then
    raise exception 'invalid board uid';
  end if;

  if exists (select 1 from public.koda_devices where serial = v_serial) then
    raise exception 'serial already provisioned';
  end if;
  if exists (select 1 from public.koda_devices where board_uid = v_board_uid) then
    raise exception 'board uid already provisioned';
  end if;

  v_secret_hex := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.koda_devices(serial, model, board_uid, activation_status)
  values (v_serial, v_model, v_board_uid, 'not_activated')
  returning id into v_device_id;

  insert into public.koda_device_credentials(device_id, device_secret_hex)
  values (v_device_id, v_secret_hex);

  return jsonb_build_object(
    'device_id', v_device_id,
    'serial', v_serial,
    'model', v_model,
    'board_uid', v_board_uid,
    'activation_status', 'not_activated',
    'device_secret_hex', v_secret_hex
  );
end;
$$;

revoke all on function public.koda_factory_provision_device(text, text, text) from public;
revoke all on function public.koda_factory_provision_device(text, text, text) from anon;
revoke all on function public.koda_factory_provision_device(text, text, text) from authenticated;
grant execute on function public.koda_factory_provision_device(text, text, text) to service_role;;
