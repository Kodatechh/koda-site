create or replace function public.factory_delete_device(_device_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _device public.devices%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Factory access required';
  end if;

  select * into _device
  from public.devices
  where id = _device_id
  for update;

  if not found then raise exception 'Device not found'; end if;
  if _device.status = 'activated' or _device.owner_user_id is not null then
    raise exception 'Activated devices cannot be deleted from Factory';
  end if;
  if _device.status <> 'not_activated' then
    raise exception 'Only non-activated devices can be deleted from Factory.';
  end if;

  insert into public.admin_audit_log(actor_user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'factory_delete_device',
    'device',
    _device.id,
    jsonb_build_object(
      'device_id', _device.id,
      'serial_number', _device.serial_number,
      'model', _device.model
    )
  );

  -- These relationships use ON DELETE SET NULL and must not leave detached rows.
  delete from public.support_cases where device_id = _device_id;
  delete from public.device_feedback where device_id = _device_id;

  -- Canonical device relationships, including HMAC credentials, challenges,
  -- device tokens and activation sessions, use ON DELETE CASCADE.
  delete from public.devices where id = _device_id;
end
$$;

revoke all on function public.factory_delete_device(uuid) from public, anon;
grant execute on function public.factory_delete_device(uuid) to authenticated, service_role;
