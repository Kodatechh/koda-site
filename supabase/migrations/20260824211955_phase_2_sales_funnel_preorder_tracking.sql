-- Phase 2: snapshot the sales promise on each order. This keeps preorder
-- tracking accurate even after catalog prices and dates change.

alter table public.orders
  add column if not exists sales_mode text not null default 'standard',
  add column if not exists release_at timestamptz,
  add column if not exists estimated_ship_start_at date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_sales_mode_check'
  ) then
    alter table public.orders
      add constraint orders_sales_mode_check
      check (sales_mode in ('standard', 'preorder'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_preorder_dates_check'
  ) then
    alter table public.orders
      add constraint orders_preorder_dates_check
      check (
        sales_mode = 'standard'
        or (release_at is not null and estimated_ship_start_at is not null)
      );
  end if;
end $$;

update public.orders o
set
  sales_mode = 'preorder',
  release_at = '2026-10-17 00:00:00-03'::timestamptz,
  estimated_ship_start_at = date '2026-10-17'
where o.created_at < '2026-10-17 00:00:00-03'::timestamptz
  and exists (
    select 1
    from public.order_items oi
    where oi.order_id = o.id
      and oi.product_slug = 'kodabot-i'
  );

create index if not exists orders_preorder_user_created_idx
  on public.orders (user_id, created_at desc)
  where sales_mode = 'preorder';

comment on column public.orders.sales_mode is
  'Immutable sales mode captured when the order is created.';
comment on column public.orders.release_at is
  'Product release timestamp promised when a preorder is created.';
comment on column public.orders.estimated_ship_start_at is
  'First planned shipment date communicated for the preorder.';
