create function public.support_factory_reset_device(_device_id uuid, _reason text)
returns table(
  serial_number text,
  model text,
  activation_secret text,
  kodaos_version text,
  cloud_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_user_id uuid := auth.uid();
  _device public.devices%rowtype;
  _new_activation_secret text;
  _had_owner boolean;
  _request_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
begin
  if _actor_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(_actor_user_id, 'admin')
    or public.has_role(_actor_user_id, 'support_agent')
    or public.has_role(_actor_user_id, 'support_advanced')
  ) then
    raise exception 'Support access required';
  end if;

  if length(trim(coalesce(_reason, ''))) < 10 then
    raise exception 'Factory reset reason must contain at least 10 characters';
  end if;

  select * into _device
  from public.devices
  where id = _device_id
  for update;

  if not found then
    raise exception 'Device not found';
  end if;

  if _device.provisioning_status <> 'ready' then
    raise exception 'Only a device ready for customer activation can be restored';
  end if;

  _had_owner := _device.owner_user_id is not null;
  _new_activation_secret := encode(extensions.gen_random_bytes(32), 'hex');

  update public.device_activation_sessions
  set status = 'expired'
  where device_id = _device.id
    and status = 'pending';

  update public.device_transfers
  set status = 'cancelled'
  where device_id = _device.id
    and status in ('requested', 'confirmed');

  delete from public.device_preferences
  where device_id = _device.id;

  insert into public.device_activation_secrets(device_id, secret_hash)
  values (
    _device.id,
    encode(extensions.digest(_new_activation_secret, 'sha256'::text), 'hex')
  )
  on conflict (device_id) do update
  set secret_hash = excluded.secret_hash,
      created_at = now();

  update public.devices
  set owner_user_id = null,
      status = 'not_activated',
      activated_at = null
  where id = _device.id;

  insert into public.device_events(device_id, event_type, details, actor_user_id)
  values (
    _device.id,
    'support_factory_reset',
    jsonb_build_object(
      'reason', trim(_reason),
      'had_previous_owner', _had_owner,
      'credential_rotated', true,
      'source', 'support_console'
    ),
    _actor_user_id
  );

  return query select
    _device.serial_number,
    _device.model,
    _new_activation_secret,
    _device.kodaos_version,
    coalesce(
      current_setting('app.settings.api_external_url', true),
      case
        when nullif(_request_headers ->> 'host', '') is not null
          then 'https://' || (_request_headers ->> 'host')
        else null
      end
    );
end
$$;

revoke all on function public.support_factory_reset_device(uuid, text)
from public, anon, authenticated;

grant execute on function public.support_factory_reset_device(uuid, text)
to authenticated;
