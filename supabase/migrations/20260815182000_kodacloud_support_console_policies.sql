-- Support Console permissions. Customer data remains protected by role-based RLS.

create policy "Support staff can read devices"
on public.devices for select to authenticated
using (
  public.has_role(auth.uid(),'admin') or
  public.has_role(auth.uid(),'support_agent') or
  public.has_role(auth.uid(),'support_advanced')
);

create policy "Support staff can read cases"
on public.support_cases for select to authenticated
using (
  public.has_role(auth.uid(),'admin') or
  public.has_role(auth.uid(),'support_agent') or
  public.has_role(auth.uid(),'support_advanced')
);

create policy "Support staff can update cases"
on public.support_cases for update to authenticated
using (
  public.has_role(auth.uid(),'admin') or
  public.has_role(auth.uid(),'support_agent') or
  public.has_role(auth.uid(),'support_advanced')
)
with check (
  public.has_role(auth.uid(),'admin') or
  public.has_role(auth.uid(),'support_agent') or
  public.has_role(auth.uid(),'support_advanced')
);

create policy admin_audit_staff_insert
on public.admin_audit_log for insert to authenticated
with check (
  public.has_role(auth.uid(),'admin') or
  public.has_role(auth.uid(),'support_advanced')
);
