create or replace function public.koda_claim_device(
  p_claim_token_hash text,
  p_user_id uuid
)
returns table (
  device_id uuid,
  serial text,
  model text,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.koda_activation_sessions%rowtype;
  v_device public.koda_devices%rowtype;
  v_now timestamptz := now();
begin
  select * into v_session
  from public.koda_activation_sessions
  where claim_token_hash = p_claim_token_hash
  for update;

  if not found then
    raise exception 'invalid activation token';
  end if;

  if v_session.status <> 'pending' then
    raise exception 'activation session is not pending';
  end if;

  if v_session.expires_at <= v_now then
    update public.koda_activation_sessions
      set status = 'expired'
      where id = v_session.id;
    raise exception 'activation session expired';
  end if;

  select * into v_device
  from public.koda_devices
  where id = v_session.device_id
  for update;

  if not found then
    raise exception 'device not found';
  end if;

  if v_device.activation_status = 'disabled' then
    raise exception 'device disabled';
  end if;

  if v_device.owner_user_id is not null or v_device.activation_status = 'activated' then
    raise exception 'device already activated';
  end if;

  update public.koda_devices
  set owner_user_id = p_user_id,
      activation_status = 'activated',
      activated_at = v_now,
      warranty_start = coalesce(warranty_start, v_now)
  where id = v_device.id;

  update public.koda_activation_sessions
  set status = 'activated',
      claimed_by_user_id = p_user_id,
      claimed_at = v_now
  where id = v_session.id;

  return query
  select v_device.id, v_device.serial, v_device.model, v_now;
end;
$$;

revoke all on function public.koda_claim_device(text,uuid) from public, anon, authenticated;
grant execute on function public.koda_claim_device(text,uuid) to service_role;
;
