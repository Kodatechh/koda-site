revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.update_updated_at_column() from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;
grant execute on function public.update_updated_at_column() to authenticated;
grant execute on function public.update_updated_at_column() to service_role;