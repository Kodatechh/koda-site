revoke execute on function public.begin_device_activation(text,text) from public, anon, authenticated;
revoke execute on function public.check_device_activation(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.claim_device_activation(text) from public, anon, authenticated;
;
