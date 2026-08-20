-- Keep the public offer and the server-side KodaPay catalog in sync.
-- Package dimensions remain provisional until the retail package is measured.
insert into public.commerce_products (
  slug,
  name,
  short_description,
  description,
  active,
  currency,
  unit_amount_cents,
  track_stock,
  stock_quantity,
  product_type,
  requires_shipping,
  requires_device,
  shipping_mode,
  weight_grams,
  length_mm,
  width_mm,
  height_mm,
  published_at
)
values (
  'kodabot-i',
  'KodaBot',
  'Tela touch e informação à primeira vista.',
  'Assistente visual de mesa com KODA OS, tela touch e integração com a Conta Koda.',
  true,
  'BRL',
  9990,
  false,
  null,
  'physical',
  true,
  false,
  'carrier',
  500,
  180,
  140,
  80,
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  currency = excluded.currency,
  unit_amount_cents = excluded.unit_amount_cents,
  track_stock = excluded.track_stock,
  stock_quantity = excluded.stock_quantity,
  product_type = excluded.product_type,
  requires_shipping = excluded.requires_shipping,
  requires_device = excluded.requires_device,
  shipping_mode = excluded.shipping_mode,
  weight_grams = coalesce(public.commerce_products.weight_grams, excluded.weight_grams),
  length_mm = coalesce(public.commerce_products.length_mm, excluded.length_mm),
  width_mm = coalesce(public.commerce_products.width_mm, excluded.width_mm),
  height_mm = coalesce(public.commerce_products.height_mm, excluded.height_mm),
  published_at = coalesce(public.commerce_products.published_at, excluded.published_at),
  updated_at = now();

comment on column public.commerce_products.unit_amount_cents is
  'Canonical server-side price in the smallest currency unit. The client must never override it.';

update public.commerce_products
set
  product_type = 'coverage',
  requires_shipping = false,
  requires_device = true,
  published_at = coalesce(published_at, now()),
  updated_at = now()
where slug in ('kodacare', 'kodacare-plus-1y', 'kodacare-plus-2y');
