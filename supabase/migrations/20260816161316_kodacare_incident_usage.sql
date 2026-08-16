create table public.kodacare_deductible_rules (
  id uuid primary key default gen_random_uuid(),
  repair_service_id text,
  amount_cents integer,
  currency text not null default 'BRL',
  effective_from date not null default current_date,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint kodacare_deductible_amount_nonnegative check (amount_cents is null or amount_cents >= 0),
  constraint kodacare_deductible_dates_order check (
    effective_until is null or effective_until >= effective_from
  )
);

comment on column public.kodacare_deductible_rules.repair_service_id is
  'NULL applies generally; a service id creates a more specific rule.';
comment on column public.kodacare_deductible_rules.amount_cents is
  'NULL until Koda defines the official deductible amount.';

alter table public.kodacare_deductible_rules enable row level security;
revoke all on table public.kodacare_deductible_rules from public, anon, authenticated;

create table public.device_coverage_incidents (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  coverage_id uuid not null references public.device_coverages(id) on delete cascade,
  incident_type text not null,
  repair_service_id text,
  status text not null default 'opened',
  opened_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  coverage_year_start date,
  coverage_year_end date,
  consumes_accidental_occurrence boolean not null default false,
  deductible_rule_id uuid references public.kodacare_deductible_rules(id),
  deductible_amount_cents integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_coverage_incidents_status check (
    status in ('opened', 'approved', 'completed', 'denied', 'cancelled')
  ),
  constraint device_coverage_incidents_deductible_nonnegative check (
    deductible_amount_cents is null or deductible_amount_cents >= 0
  ),
  constraint device_coverage_incidents_consumption_period check (
    not consumes_accidental_occurrence
    or (coverage_year_start is not null and coverage_year_end is not null)
  )
);

create index device_coverage_incidents_coverage_period_idx
on public.device_coverage_incidents (
  coverage_id,
  coverage_year_start,
  consumes_accidental_occurrence
);

alter table public.device_coverage_incidents enable row level security;

create policy "Owners and Koda staff can read coverage incidents"
on public.device_coverage_incidents
for select
to authenticated
using (
  exists (
    select 1
    from public.devices d
    where d.id = device_coverage_incidents.device_id
      and (
        d.owner_user_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin')
        or public.has_role((select auth.uid()), 'support_agent')
        or public.has_role((select auth.uid()), 'support_advanced')
      )
  )
);

revoke all on table public.device_coverage_incidents from public, anon, authenticated;
grant select on table public.device_coverage_incidents to authenticated;

create function public.open_kodacare_accidental_incident(
  _coverage_id uuid,
  _incident_type text,
  _repair_service_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _coverage public.device_coverages%rowtype;
  _device public.devices%rowtype;
  _incident_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(_incident_type), '') is null then raise exception 'Incident type is required'; end if;

  select * into _coverage
  from public.device_coverages
  where id = _coverage_id;
  if not found then raise exception 'Coverage not found'; end if;

  select * into _device from public.devices where id = _coverage.device_id;
  if not found or _device.owner_user_id is distinct from auth.uid() then
    raise exception 'Device ownership required';
  end if;
  if _coverage.plan = 'kodacare' or not _coverage.accidental_damage_coverage then
    raise exception 'Coverage does not include accidental damage';
  end if;
  if _coverage.status <> 'active'
     or current_date < _coverage.coverage_start
     or current_date > _coverage.coverage_end then
    raise exception 'Coverage is not active';
  end if;

  insert into public.device_coverage_incidents (
    device_id,
    coverage_id,
    incident_type,
    repair_service_id,
    created_by
  ) values (
    _coverage.device_id,
    _coverage.id,
    btrim(_incident_type),
    nullif(btrim(_repair_service_id), ''),
    auth.uid()
  ) returning id into _incident_id;

  return _incident_id;
end
$$;

create function public.set_kodacare_accidental_incident_status(
  _incident_id uuid,
  _status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _incident public.device_coverage_incidents%rowtype;
  _coverage public.device_coverages%rowtype;
  _period_year integer;
  _period_start date;
  _period_end date;
  _used integer;
  _rule public.kodacare_deductible_rules%rowtype;
begin
  if auth.uid() is null
     or not (
       public.has_role(auth.uid(), 'admin')
       or public.has_role(auth.uid(), 'support_agent')
       or public.has_role(auth.uid(), 'support_advanced')
     ) then
    raise exception 'Koda support role required';
  end if;
  if _status not in ('approved', 'completed', 'denied', 'cancelled') then
    raise exception 'Unsupported incident status';
  end if;

  select * into _incident
  from public.device_coverage_incidents
  where id = _incident_id
  for update;
  if not found then raise exception 'Incident not found'; end if;

  select * into _coverage
  from public.device_coverages
  where id = _incident.coverage_id
  for update;
  if not found then raise exception 'Coverage not found'; end if;

  if _status in ('approved', 'completed') and not _incident.consumes_accidental_occurrence then
    if _coverage.status <> 'active'
       or current_date < _coverage.coverage_start
       or current_date > _coverage.coverage_end then
      raise exception 'Coverage is not active';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(_coverage.id::text, 0)
    );

    _period_year := extract(year from age(current_date, _coverage.coverage_start))::integer;
    _period_start := (_coverage.coverage_start + make_interval(years => _period_year))::date;
    if _period_start > current_date then
      _period_year := _period_year - 1;
      _period_start := (_coverage.coverage_start + make_interval(years => _period_year))::date;
    end if;
    _period_end := least(
      (_period_start + interval '1 year - 1 day')::date,
      _coverage.coverage_end
    );

    select count(*)::integer into _used
    from public.device_coverage_incidents i
    where i.coverage_id = _coverage.id
      and i.coverage_year_start = _period_start
      and i.consumes_accidental_occurrence;

    if _used >= _coverage.accidental_damage_uses_per_year then
      raise exception 'Annual accidental damage occurrence limit reached';
    end if;

    select * into _rule
    from public.kodacare_deductible_rules r
    where r.active
      and r.effective_from <= current_date
      and (r.effective_until is null or r.effective_until >= current_date)
      and (r.repair_service_id = _incident.repair_service_id or r.repair_service_id is null)
    order by (r.repair_service_id is not null) desc, r.effective_from desc
    limit 1;

    update public.device_coverage_incidents
    set
      status = _status,
      approved_at = coalesce(approved_at, now()),
      completed_at = case when _status = 'completed' then now() else completed_at end,
      coverage_year_start = _period_start,
      coverage_year_end = _period_end,
      consumes_accidental_occurrence = true,
      deductible_rule_id = _rule.id,
      deductible_amount_cents = _rule.amount_cents,
      updated_at = now()
    where id = _incident.id;
  else
    update public.device_coverage_incidents
    set
      status = _status,
      completed_at = case when _status = 'completed' then now() else completed_at end,
      updated_at = now()
    where id = _incident.id;
  end if;
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
  accidental_damage_uses_in_current_period integer,
  accidental_damage_period_start date,
  accidental_damage_period_end date,
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
    case when p.period_start is null then 0 else coalesce(i.used, 0)::integer end,
    p.period_start,
    p.period_end,
    c.accidental_damage_deductible_required,
    c.repair_discount_percent,
    c.cleaning_and_inspection_included
  from public.devices d
  left join lateral (
    select dc.* from public.device_coverages dc
    where dc.device_id = d.id and dc.status = 'active'
    order by dc.purchased_at desc limit 1
  ) c on true
  left join lateral (
    select
      (c.coverage_start + make_interval(
        years => extract(year from age(current_date, c.coverage_start))::integer
      ))::date as period_start,
      least(
        (c.coverage_start + make_interval(
          years => extract(year from age(current_date, c.coverage_start))::integer + 1
        ) - interval '1 day')::date,
        c.coverage_end
      ) as period_end
    where c.id is not null
      and current_date between c.coverage_start and c.coverage_end
  ) p on true
  left join lateral (
    select count(*)::integer as used
    from public.device_coverage_incidents dci
    where dci.coverage_id = c.id
      and dci.coverage_year_start = p.period_start
      and dci.consumes_accidental_occurrence
  ) i on true
  where d.id = _device_id
$$;

revoke all on function public.open_kodacare_accidental_incident(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.open_kodacare_accidental_incident(uuid, text, text)
to authenticated;

revoke all on function public.set_kodacare_accidental_incident_status(uuid, text)
from public, anon, authenticated;
grant execute on function public.set_kodacare_accidental_incident_status(uuid, text)
to authenticated;

revoke all on function public.get_device_kodacare_status(uuid)
from public, anon, authenticated;
grant execute on function public.get_device_kodacare_status(uuid)
to authenticated;
