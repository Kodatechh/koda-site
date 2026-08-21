-- KodaCare (6 months) follows the device. KodaCare+ follows the purchasing
-- account and only applies while that account owns the linked device.
alter table public.device_coverages
  add column subscriber_user_id uuid references auth.users(id) on delete set null,
  add column binding_scope text not null default 'device'
    check (binding_scope in ('device', 'account_device')),
  add column binding_active boolean not null default true,
  add column binding_suspended_at timestamptz,
  add column binding_suspension_reason text;

update public.device_coverages dc
set subscriber_user_id = d.owner_user_id,
    binding_scope = case when dc.plan = 'kodacare' then 'device' else 'account_device' end,
    binding_active = case when dc.plan = 'kodacare' then true else d.owner_user_id is not null end
from public.devices d
where d.id = dc.device_id;

create index device_coverages_subscriber_idx
  on public.device_coverages(subscriber_user_id, purchased_at desc);

create function public.set_kodacare_account_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_owner uuid;
begin
  select owner_user_id into device_owner
  from public.devices
  where id = new.device_id;

  new.binding_scope := case
    when new.plan = 'kodacare' then 'device'
    else 'account_device'
  end;
  new.subscriber_user_id := coalesce(new.subscriber_user_id, device_owner);
  if new.subscriber_user_id is null then
    raise exception 'KodaCare requires an account owner';
  end if;
  new.binding_active := new.binding_scope = 'device' or device_owner = new.subscriber_user_id;
  return new;
end
$$;

create trigger set_kodacare_account_binding_before_write
before insert or update of device_id, plan, subscriber_user_id
on public.device_coverages
for each row execute function public.set_kodacare_account_binding();

create function public.sync_kodacare_binding_after_owner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.owner_user_id is not distinct from new.owner_user_id then return new; end if;

  update public.device_coverages
  set binding_active = (new.owner_user_id = subscriber_user_id),
      binding_suspended_at = case
        when new.owner_user_id = subscriber_user_id then null
        else coalesce(binding_suspended_at, now())
      end,
      binding_suspension_reason = case
        when new.owner_user_id = subscriber_user_id then null
        when new.owner_user_id is null then 'device_unlinked_or_reset'
        else 'device_activated_by_another_account'
      end
  where device_id = new.id
    and binding_scope = 'account_device'
    and status = 'active';
  return new;
end
$$;

create trigger sync_kodacare_binding_after_owner_change
after update of owner_user_id on public.devices
for each row execute function public.sync_kodacare_binding_after_owner_change();

-- Account-owned coverage remains visible to its subscriber for support and
-- reactivation history, even while the device is temporarily unlinked.
create policy "Subscribers can read their KodaCare history"
on public.device_coverages for select to authenticated
using (subscriber_user_id = (select auth.uid()));

revoke all on function public.set_kodacare_account_binding() from public, anon, authenticated;
revoke all on function public.sync_kodacare_binding_after_owner_change() from public, anon, authenticated;

-- Never attach a suspended personal plan to a repair request.
create function public.enforce_effective_repair_coverage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.coverage_id is not null and not exists (
    select 1 from public.device_coverages dc
    where dc.id = new.coverage_id
      and dc.status = 'active'
      and dc.coverage_start <= current_date
      and dc.coverage_end >= current_date
      and (dc.binding_scope = 'device' or dc.binding_active)
  ) then
    new.coverage_id := null;
  end if;
  return new;
end
$$;

create trigger enforce_effective_repair_coverage_before_write
before insert or update of coverage_id on public.repair_requests
for each row execute function public.enforce_effective_repair_coverage();

-- The customer-facing status only returns coverage that is effective for the
-- device's current owner. A suspended personal plan stays in history.
create or replace function public.get_device_kodacare_status(_device_id uuid)
returns table (
  eligible boolean,
  eligibility_deadline date,
  eligibility_days_remaining integer,
  plan public.koda_care_plan,
  coverage_status public.koda_coverage_status,
  purchased_at timestamptz,
  coverage_start date,
  coverage_end date,
  accidental_damage_coverage boolean,
  accidental_damage_uses_per_year integer,
  accidental_damage_uses_in_current_period integer,
  accidental_damage_period_start date,
  accidental_damage_period_end date,
  accidental_damage_deductible_required boolean,
  repair_discount_percent integer,
  cleaning_and_inspection_included boolean
)
language sql stable security invoker set search_path = ''
as $$
  select
    d.purchase_date is not null and current_date <= d.purchase_date + 30 and c.id is null,
    case when d.purchase_date is null then null else d.purchase_date + 30 end,
    case when d.purchase_date is null or current_date > d.purchase_date + 30 or c.id is not null
      then 0 else (d.purchase_date + 30 - current_date)::integer end,
    c.plan,
    case when c.status = 'active' and c.coverage_end < current_date
      then 'expired'::public.koda_coverage_status else c.status end,
    c.purchased_at, c.coverage_start, c.coverage_end,
    c.accidental_damage_coverage, c.accidental_damage_uses_per_year,
    case when p.period_start is null then 0 else coalesce(i.used, 0)::integer end,
    p.period_start, p.period_end, c.accidental_damage_deductible_required,
    c.repair_discount_percent, c.cleaning_and_inspection_included
  from public.devices d
  left join lateral (
    select dc.* from public.device_coverages dc
    where dc.device_id = d.id and dc.status = 'active'
      and (dc.binding_scope = 'device' or dc.binding_active)
    order by dc.purchased_at desc limit 1
  ) c on true
  left join lateral (
    select
      (c.coverage_start + make_interval(years => extract(year from age(current_date, c.coverage_start))::integer))::date,
      least(
        (c.coverage_start + make_interval(years => extract(year from age(current_date, c.coverage_start))::integer + 1) - interval '1 day')::date,
        c.coverage_end
      )
    where c.id is not null and current_date between c.coverage_start and c.coverage_end
  ) p(period_start, period_end) on true
  left join lateral (
    select count(*)::integer as used from public.device_coverage_incidents dci
    where dci.coverage_id = c.id and dci.coverage_year_start = p.period_start
      and dci.consumes_accidental_occurrence
  ) i on true
  where d.id = _device_id
$$;

revoke all on function public.enforce_effective_repair_coverage() from public, anon, authenticated;
