-- Stages 5–7: conversion, launch operations and product evolution.
-- Provider-dependent actions remain explicit operational states; this migration
-- does not claim that an email, carrier or device telemetry provider is active.

begin;

create table public.commerce_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'page_view','guided_purchase_started','guided_purchase_completed','checkout_started',
    'shipping_calculated','payment_started','order_created','waitlist_joined'
  )),
  session_id text not null check (char_length(session_id) between 8 and 80),
  user_id uuid references auth.users(id) on delete set null,
  product_slug text,
  source_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index commerce_funnel_events_name_created_idx
  on public.commerce_funnel_events (event_name, created_at desc);
comment on table public.commerce_funnel_events is
  'Privacy-minimized commercial events. No IP address, raw user agent, name, email or address is stored.';

create table public.accessory_stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'waiting' check (status in ('waiting','notified','cancelled')),
  consented_at timestamptz not null default now(),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, email)
);
create index accessory_stock_alerts_status_created_idx
  on public.accessory_stock_alerts (status, created_at);

create table public.preorder_capacity_plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.commerce_products(id) on delete cascade,
  planned_capacity integer check (planned_capacity is null or planned_capacity >= 0),
  reserved_units integer not null default 0 check (reserved_units >= 0),
  production_started boolean not null default false,
  estimated_ship_start_at date,
  public_note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.order_operations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  allocated_device_id uuid references public.devices(id) on delete set null,
  operation_status text not null default 'awaiting_payment' check (operation_status in (
    'awaiting_payment','queued','component_reserved','in_production','quality_check',
    'packaging','ready_to_ship','shipped','delivered','cancelled','attention'
  )),
  component_reservation jsonb not null default '{}'::jsonb,
  packaging_checklist jsonb not null default '{"product":false,"cable":false,"documentation":false,"seal":false}'::jsonb,
  shipping_label_status text not null default 'not_requested' check (shipping_label_status in (
    'not_requested','provider_not_configured','ready','printed','cancelled'
  )),
  shipping_label_reference text,
  attention_reason text,
  customer_delay_note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index order_operations_status_updated_idx
  on public.order_operations (operation_status, updated_at);

create table public.koda_beta_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested','invited','active','paused','left')),
  accepted_risk_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table public.device_health_consents (
  device_id uuid primary key references public.devices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  consented boolean not null default false,
  consented_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.product_research_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  topic text not null check (topic in ('accessory','feature','kodaos','kodabot_pro')),
  choice text not null check (char_length(trim(choice)) between 2 and 120),
  details text,
  created_at timestamptz not null default now()
);
create index product_research_votes_topic_created_idx
  on public.product_research_votes (topic, created_at desc);

alter table public.commerce_funnel_events enable row level security;
alter table public.accessory_stock_alerts enable row level security;
alter table public.preorder_capacity_plans enable row level security;
alter table public.order_operations enable row level security;
alter table public.koda_beta_enrollments enable row level security;
alter table public.device_health_consents enable row level security;
alter table public.product_research_votes enable row level security;

revoke all on table public.commerce_funnel_events, public.accessory_stock_alerts,
  public.preorder_capacity_plans, public.order_operations, public.koda_beta_enrollments,
  public.device_health_consents, public.product_research_votes from anon, authenticated;

grant select, insert, update on public.accessory_stock_alerts to authenticated;
grant select, insert, update, delete on public.koda_beta_enrollments, public.device_health_consents to authenticated;
grant insert on public.product_research_votes to authenticated;
grant select, insert, update, delete on public.preorder_capacity_plans, public.order_operations to authenticated;
grant select on public.commerce_funnel_events, public.product_research_votes to authenticated;

create policy accessory_alert_owner_select on public.accessory_stock_alerts
  for select to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
create policy accessory_alert_owner_insert on public.accessory_stock_alerts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy accessory_alert_owner_update on public.accessory_stock_alerts
  for update to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'))
  with check ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));

create policy capacity_admin on public.preorder_capacity_plans
  for all to authenticated using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy order_operations_admin on public.order_operations
  for all to authenticated using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy funnel_admin_read on public.commerce_funnel_events
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

create policy beta_owner_select on public.koda_beta_enrollments
  for select to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
create policy beta_owner_insert on public.koda_beta_enrollments
  for insert to authenticated with check ((select auth.uid()) = user_id and (
    device_id is null or exists (select 1 from public.devices d where d.id = device_id and d.owner_user_id = (select auth.uid()))
  ));
create policy beta_owner_update on public.koda_beta_enrollments
  for update to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'))
  with check ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
create policy beta_owner_delete on public.koda_beta_enrollments
  for delete to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));

create policy health_consent_owner on public.device_health_consents
  for all to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'))
  with check (((select auth.uid()) = user_id and exists (
    select 1 from public.devices d where d.id = device_id and d.owner_user_id = (select auth.uid())
  )) or public.has_role((select auth.uid()), 'admin'));

create policy research_insert on public.product_research_votes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy research_admin_read on public.product_research_votes
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

create policy reviews_admin_moderation on public.product_reviews
  for all to authenticated using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
create policy questions_admin_moderation on public.product_questions
  for all to authenticated using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));
grant select, update on public.product_reviews, public.product_questions to authenticated;

create or replace function public.submit_verified_product_review(
  _product_id uuid, _rating smallint, _title text, _body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_order_id uuid; v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if _rating not between 1 and 5 or char_length(trim(_title)) not between 2 and 100
    or char_length(trim(_body)) not between 10 and 2000 then raise exception 'Invalid review'; end if;
  select o.id into v_order_id
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.commerce_products p on p.slug = oi.product_slug
  where o.user_id = v_uid and p.id = _product_id and o.status in ('paid','processing','shipped','delivered')
  order by o.created_at desc limit 1;
  insert into public.product_reviews (product_id,user_id,order_id,rating,title,body,verified_purchase,status)
  values (_product_id,v_uid,v_order_id,_rating,trim(_title),trim(_body),v_order_id is not null,'pending')
  on conflict (product_id,user_id) do update set
    order_id=excluded.order_id,rating=excluded.rating,title=excluded.title,body=excluded.body,
    verified_purchase=excluded.verified_purchase,status='pending',created_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_verified_product_review(uuid,smallint,text,text) from public, anon;
grant execute on function public.submit_verified_product_review(uuid,smallint,text,text) to authenticated;

create or replace function public.track_commerce_event(
  _event_name text,
  _session_id text,
  _product_slug text default null,
  _source_path text default null,
  _metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _event_name not in ('page_view','guided_purchase_started','guided_purchase_completed','checkout_started','shipping_calculated','payment_started','order_created','waitlist_joined') then
    raise exception 'Unsupported event';
  end if;
  if char_length(_session_id) not between 8 and 80 then raise exception 'Invalid session'; end if;
  insert into public.commerce_funnel_events (event_name, session_id, user_id, product_slug, source_path, metadata)
  values (_event_name, _session_id, auth.uid(), nullif(left(_product_slug, 80), ''), nullif(left(_source_path, 160), ''), coalesce(_metadata, '{}'::jsonb) - 'email' - 'name' - 'address' - 'phone');
end;
$$;
revoke all on function public.track_commerce_event(text,text,text,text,jsonb) from public;
grant execute on function public.track_commerce_event(text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.get_public_preorder_status()
returns table(
  product_slug text,
  product_name text,
  release_at timestamptz,
  estimated_ship_start_at date,
  production_started boolean,
  status_label text,
  public_note text
)
language sql
security definer
set search_path = ''
as $$
  select p.slug, p.name, p.launch_at, c.estimated_ship_start_at,
    coalesce(c.production_started, false),
    case
      when p.launch_at is null then 'Sem data anunciada'
      when now() < p.launch_at and coalesce(c.production_started, false) then 'Pré-venda e produção em andamento'
      when now() < p.launch_at then 'Pré-venda disponível'
      else 'Lançado'
    end,
    c.public_note
  from public.commerce_products p
  left join public.preorder_capacity_plans c on c.product_id = p.id
  where p.slug in ('kodabot-i','kodabot-i-pro') and p.active = true
  order by p.slug;
$$;
revoke all on function public.get_public_preorder_status() from public;
grant execute on function public.get_public_preorder_status() to anon, authenticated;

create or replace function public.get_operations_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null or not public.has_role(v_uid, 'admin') then raise exception 'Admin required'; end if;
  select jsonb_build_object(
    'orders', jsonb_build_object(
      'preorders', count(*) filter (where o.sales_mode = 'preorder'),
      'paid', count(*) filter (where o.status in ('paid','processing','shipped','delivered')),
      'awaiting_payment', count(*) filter (where o.status = 'pending_payment'),
      'attention', count(*) filter (where op.operation_status = 'attention')
    ),
    'operations', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (
      select op.order_id, o.order_number, o.status as order_status, op.operation_status,
        op.shipping_label_status, op.attention_reason, op.updated_at
      from public.order_operations op join public.orders o on o.id = op.order_id limit 50
    ) x), '[]'::jsonb),
    'funnel', coalesce((select jsonb_object_agg(event_name, total) from (
      select event_name, count(*) total from public.commerce_funnel_events
      where created_at >= now() - interval '30 days' group by event_name
    ) f), '{}'::jsonb),
    'growth', coalesce((select jsonb_object_agg(program, total) from (
      select program, count(*) total from public.growth_interest_entries group by program
    ) g), '{}'::jsonb),
    'growth_entries', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select id, program, email, full_name, organization, estimated_quantity, created_at
      from public.growth_interest_entries order by created_at desc limit 50
    ) x), '[]'::jsonb),
    'capacity', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (
      select p.id as product_id, p.slug, p.name, c.planned_capacity, c.reserved_units,
        c.production_started, c.estimated_ship_start_at, c.public_note, c.updated_at
      from public.commerce_products p left join public.preorder_capacity_plans c on c.product_id = p.id
      where p.slug in ('kodabot-i','kodabot-i-pro')
    ) x), '[]'::jsonb),
    'evolution', jsonb_build_object(
      'feedback', (select count(*) from public.device_feedback),
      'beta', (select count(*) from public.koda_beta_enrollments where status in ('interested','invited','active')),
      'research', (select count(*) from public.product_research_votes),
      'pro_waitlist', (select count(*) from public.product_waitlist_entries where product_slug = 'kodabot-i-pro')
    )
  ) into v_result
  from public.orders o left join public.order_operations op on op.order_id = o.id;
  return v_result;
end;
$$;
revoke all on function public.get_operations_summary() from public, anon;
grant execute on function public.get_operations_summary() to authenticated;

create or replace function public.initialize_order_operations()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.order_operations (order_id, operation_status)
  values (new.id, case when new.status = 'pending_payment' then 'awaiting_payment' else 'queued' end)
  on conflict (order_id) do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_order_operations() from public, anon, authenticated;
drop trigger if exists orders_initialize_operations on public.orders;
create trigger orders_initialize_operations after insert on public.orders
for each row execute function public.initialize_order_operations();

insert into public.order_operations (order_id, operation_status)
select o.id, case
  when o.status = 'pending_payment' then 'awaiting_payment'
  when o.status = 'processing' then 'in_production'
  when o.status = 'shipped' then 'shipped'
  when o.status = 'delivered' then 'delivered'
  when o.status in ('cancelled','refunded') then 'cancelled'
  else 'queued' end
from public.orders o
on conflict (order_id) do nothing;

commit;
