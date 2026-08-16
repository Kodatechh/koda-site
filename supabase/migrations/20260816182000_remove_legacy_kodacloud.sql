-- Remove the superseded serial/activation-secret KodaCloud implementation.
-- The canonical device identity and authentication flow lives in public.devices
-- and the public.koda_device_* / public.koda_activation_sessions tables.

revoke execute on function public.begin_device_activation(text, text) from public, anon, authenticated;
revoke execute on function public.check_device_activation(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.claim_device_activation(text) from public, anon, authenticated;
revoke execute on function public.factory_device_checkin(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.factory_register_device(text, text, text, date, date, date, date, text, text) from public, anon, authenticated;
revoke execute on function public.koda_register_factory_device(text, text, text, text) from public, anon, authenticated;

drop function public.begin_device_activation(text, text);
drop function public.check_device_activation(uuid, text, text);
drop function public.claim_device_activation(text);
drop function public.factory_device_checkin(text, text, text, text);
drop function public.factory_register_device(text, text, text, date, date, date, date, text, text);
drop function public.koda_register_factory_device(text, text, text, text);

drop table public.device_activation_secrets;
drop table public.device_activation_sessions;
drop table public.koda_devices;
