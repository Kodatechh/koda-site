-- Koda Shipping checkout integration.
-- The KodaBot package profiles below are provisional checkout values for sandbox
-- quoting and MUST be replaced with final measured retail-package dimensions
-- before enabling production shipping rates.

alter table public.orders
  add column if not exists shipping_deadline_days integer,
  add column if not exists shipping_quote_id text,
  add column if not exists shipping_quoted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_shipping_deadline_days_check'
  ) then
    alter table public.orders
      add constraint orders_shipping_deadline_days_check
      check (shipping_deadline_days is null or shipping_deadline_days between 0 and 120);
  end if;
end $$;

create index if not exists orders_shipping_quote_id_idx
  on public.orders (shipping_quote_id)
  where shipping_quote_id is not null;

comment on column public.orders.shipping_deadline_days is
  'Delivery estimate captured from the signed shipping quote at checkout.';
comment on column public.orders.shipping_quote_id is
  'Opaque Koda Shipping quote identifier used for audit/correlation.';
comment on column public.orders.shipping_quoted_at is
  'Timestamp when the accepted shipping quote was issued.';

update public.commerce_products
set
  weight_grams = coalesce(weight_grams, 500),
  length_mm = coalesce(length_mm, 180),
  width_mm = coalesce(width_mm, 140),
  height_mm = coalesce(height_mm, 80),
  updated_at = now()
where slug = 'kodabot-i'
  and requires_shipping = true;

update public.commerce_products
set
  weight_grams = coalesce(weight_grams, 800),
  length_mm = coalesce(length_mm, 180),
  width_mm = coalesce(width_mm, 180),
  height_mm = coalesce(height_mm, 160),
  updated_at = now()
where slug = 'kodabot-i-pro'
  and requires_shipping = true;
