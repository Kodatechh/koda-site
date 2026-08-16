create type public.koda_care_plan as enum (
  'kodacare',
  'kodacare_plus_1y',
  'kodacare_plus_2y'
);

create type public.koda_coverage_status as enum (
  'active',
  'expired',
  'cancelled'
);

create table public.device_coverages (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  plan public.koda_care_plan not null,
  status public.koda_coverage_status not null default 'active',
  purchased_at timestamptz not null default now(),
  coverage_start date not null,
  coverage_end date not null,
  eligibility_deadline date not null,
  accidental_damage_coverage boolean not null,
  repair_discount_percent integer not null,
  cleaning_and_inspection_included boolean not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint device_coverages_date_order check (coverage_end >= coverage_start),
  constraint device_coverages_discount_range check (repair_discount_percent between 0 and 100),
  constraint device_coverages_cancelled_state check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  )
);

create unique index device_coverages_one_active_per_device_idx
on public.device_coverages(device_id)
where status = 'active';

create index device_coverages_device_history_idx
on public.device_coverages(device_id, purchased_at desc);

create function public.set_kodacare_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _device public.devices%rowtype;
begin
  select * into _device from public.devices where id = new.device_id for update;
  if not found then raise exception 'Device not found'; end if;
  if _device.purchase_date is null then raise exception 'Device purchase date is required for KodaCare'; end if;
  if new.purchased_at::date < _device.purchase_date
     or new.purchased_at::date > (_device.purchase_date + 30) then
    raise exception 'Device is outside the 30-day KodaCare eligibility period';
  end if;

  new.eligibility_deadline := _device.purchase_date + 30;
  new.coverage_start := _device.purchase_date;

  if new.plan = 'kodacare' then
    new.coverage_end := coalesce(_device.warranty_end, _device.purchase_date) + interval '6 months';
    new.accidental_damage_coverage := false;
    new.repair_discount_percent := 0;
    new.cleaning_and_inspection_included := false;
  elsif new.plan = 'kodacare_plus_1y' then
    new.coverage_end := _device.purchase_date + interval '1 year';
    new.accidental_damage_coverage := true;
    new.repair_discount_percent := 40;
    new.cleaning_and_inspection_included := true;
  else
    new.coverage_end := _device.purchase_date + interval '2 years';
    new.accidental_damage_coverage := true;
    new.repair_discount_percent := 40;
    new.cleaning_and_inspection_included := true;
  end if;

  return new;
end
$$;

create trigger set_kodacare_terms_before_insert
before insert on public.device_coverages
for each row execute function public.set_kodacare_terms();

alter table public.device_coverages enable row level security;

create policy "Owners and Koda staff can read device coverage"
on public.device_coverages
for select
to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = device_coverages.device_id
      and (
        d.owner_user_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin')
        or public.has_role((select auth.uid()), 'support_agent')
        or public.has_role((select auth.uid()), 'support_advanced')
      )
  )
);

revoke all on table public.device_coverages from anon, authenticated;
grant select on table public.device_coverages to authenticated;

create function public.get_device_kodacare_status(_device_id uuid)
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
  repair_discount_percent integer,
  cleaning_and_inspection_included boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.purchase_date is not null
      and current_date <= d.purchase_date + 30
      and c.id is null as eligible,
    case when d.purchase_date is null then null else d.purchase_date + 30 end,
    case
      when d.purchase_date is null or current_date > d.purchase_date + 30 or c.id is not null then 0
      else (d.purchase_date + 30 - current_date)::integer
    end,
    c.plan,
    case
      when c.status = 'active' and c.coverage_end < current_date then 'expired'::public.koda_coverage_status
      else c.status
    end,
    c.purchased_at,
    c.coverage_start,
    c.coverage_end,
    c.accidental_damage_coverage,
    c.repair_discount_percent,
    c.cleaning_and_inspection_included
  from public.devices d
  left join lateral (
    select dc.* from public.device_coverages dc
    where dc.device_id = d.id and dc.status = 'active'
    order by dc.purchased_at desc limit 1
  ) c on true
  where d.id = _device_id
$$;

revoke all on function public.set_kodacare_terms() from public, anon, authenticated;
revoke all on function public.get_device_kodacare_status(uuid) from public, anon, authenticated;
grant execute on function public.get_device_kodacare_status(uuid) to authenticated;
