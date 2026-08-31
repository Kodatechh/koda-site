begin;

create index if not exists commerce_funnel_events_user_idx on public.commerce_funnel_events (user_id) where user_id is not null;
create index if not exists accessory_stock_alerts_user_idx on public.accessory_stock_alerts (user_id) where user_id is not null;
create index if not exists preorder_capacity_updated_by_idx on public.preorder_capacity_plans (updated_by) where updated_by is not null;
create index if not exists order_operations_device_idx on public.order_operations (allocated_device_id) where allocated_device_id is not null;
create index if not exists order_operations_updated_by_idx on public.order_operations (updated_by) where updated_by is not null;
create index if not exists beta_enrollments_user_idx on public.koda_beta_enrollments (user_id);
create index if not exists beta_enrollments_device_idx on public.koda_beta_enrollments (device_id) where device_id is not null;
create index if not exists health_consents_user_idx on public.device_health_consents (user_id);
create index if not exists product_research_votes_user_idx on public.product_research_votes (user_id) where user_id is not null;

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
  if jsonb_typeof(coalesce(_metadata, '{}'::jsonb)) <> 'object' or pg_column_size(_metadata) > 4096 then
    raise exception 'Invalid metadata';
  end if;
  if (select count(*) from public.commerce_funnel_events where session_id = _session_id and created_at > now() - interval '1 hour') >= 100 then
    return;
  end if;
  insert into public.commerce_funnel_events (event_name, session_id, user_id, product_slug, source_path, metadata)
  values (_event_name, _session_id, auth.uid(), nullif(left(_product_slug, 80), ''), nullif(left(_source_path, 160), ''), coalesce(_metadata, '{}'::jsonb) - 'email' - 'name' - 'address' - 'phone');
end;
$$;
revoke all on function public.track_commerce_event(text,text,text,text,jsonb) from public;
grant execute on function public.track_commerce_event(text,text,text,text,jsonb) to anon, authenticated;

create or replace function public.enforce_preorder_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_capacity integer; v_committed bigint;
begin
  perform pg_advisory_xact_lock(hashtext(new.product_slug));
  select c.planned_capacity into v_capacity
  from public.preorder_capacity_plans c
  join public.commerce_products p on p.id = c.product_id
  where p.slug = new.product_slug;
  if v_capacity is null then return new; end if;
  select coalesce(sum(oi.quantity), 0) into v_committed
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.product_slug = new.product_slug
    and o.status not in ('cancelled','refunded');
  if v_committed + new.quantity > v_capacity then
    raise exception 'Preorder capacity reached';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_preorder_capacity() from public, anon, authenticated;
drop trigger if exists order_items_enforce_preorder_capacity on public.order_items;
create trigger order_items_enforce_preorder_capacity
before insert or update of quantity, product_slug on public.order_items
for each row execute function public.enforce_preorder_capacity();

comment on function public.get_public_preorder_status() is
  'Intentionally callable by anonymous visitors. Returns only published product timing and a staff-authored public note.';
comment on function public.track_commerce_event(text,text,text,text,jsonb) is
  'Intentionally callable by anonymous visitors. Stores a bounded, privacy-minimized event and rate-limits each session.';

commit;
