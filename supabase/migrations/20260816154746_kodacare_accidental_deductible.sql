alter table public.device_coverages
add column accidental_damage_uses_per_year integer not null default 0,
add column accidental_damage_deductible_required boolean not null default false,
add constraint device_coverages_accidental_uses_range
check (accidental_damage_uses_per_year between 0 and 3);

update public.device_coverages
set
  repair_discount_percent = 0,
  accidental_damage_uses_per_year = case when accidental_damage_coverage then 3 else 0 end,
  accidental_damage_deductible_required = accidental_damage_coverage;

create or replace function public.set_kodacare_terms()
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
  new.repair_discount_percent := 0;

  if new.plan = 'kodacare' then
    new.coverage_end := coalesce(_device.warranty_end, _device.purchase_date) + interval '6 months';
    new.accidental_damage_coverage := false;
    new.accidental_damage_uses_per_year := 0;
    new.accidental_damage_deductible_required := false;
    new.cleaning_and_inspection_included := false;
  elsif new.plan = 'kodacare_plus_1y' then
    new.coverage_end := _device.purchase_date + interval '1 year';
    new.accidental_damage_coverage := true;
    new.accidental_damage_uses_per_year := 3;
    new.accidental_damage_deductible_required := true;
    new.cleaning_and_inspection_included := true;
  else
    new.coverage_end := _device.purchase_date + interval '2 years';
    new.accidental_damage_coverage := true;
    new.accidental_damage_uses_per_year := 3;
    new.accidental_damage_deductible_required := true;
    new.cleaning_and_inspection_included := true;
  end if;

  return new;
end
$$;

drop function public.get_device_kodacare_status(uuid);

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
  accidental_damage_uses_per_year integer,
  accidental_damage_deductible_required boolean,
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
    c.accidental_damage_uses_per_year,
    c.accidental_damage_deductible_required,
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

revoke all on function public.get_device_kodacare_status(uuid) from public, anon, authenticated;
grant execute on function public.get_device_kodacare_status(uuid) to authenticated;
