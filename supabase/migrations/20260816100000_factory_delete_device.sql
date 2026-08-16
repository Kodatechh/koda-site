-- Safely delete an unowned, non-activated factory device and its related data.
-- Force all client-side deletion through this RPC instead of the table API.
revoke delete on table public.devices from authenticated;
drop policy if exists "Factory can delete devices" on public.devices;

create function public.factory_delete_device(_device_id uuid)
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

  if not found then
    raise exception 'Device not found';
  end if;

  if _device.status = 'activated' or _device.owner_user_id is not null then
    raise exception 'Activated devices cannot be deleted from Factory';
  end if;

  if _device.status <> 'not_activated' then
    raise exception 'Only non-activated devices can be deleted from Factory.';
  end if;

  insert into public.admin_audit_log(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
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

  -- These two relationships use ON DELETE SET NULL. Factory deletion requires
  -- removing their device-specific rows instead of leaving detached records.
  delete from public.support_cases where device_id = _device_id;
  delete from public.device_feedback where device_id = _device_id;

  -- All remaining device relationships use ON DELETE CASCADE:
  -- device_activation_secrets, device_activation_sessions, device_events,
  -- device_factory_tests, device_preferences, device_health, device_commands,
  -- device_transfers, device_components, device_quality_checks and
  -- service_campaign_devices.
  delete from public.devices where id = _device_id;
end
$$;

revoke all on function public.factory_delete_device(uuid) from public, anon, authenticated;
grant execute on function public.factory_delete_device(uuid) to authenticated;
