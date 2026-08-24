-- Phase 1: scheduled KodaBot preorder, KodaBot Pro waitlist, the first
-- sellable accessory and the simplified KodaCare+ lineup.

alter table public.commerce_products
  add column if not exists purchase_enabled boolean not null default true,
  add column if not exists waitlist_enabled boolean not null default false,
  add column if not exists preorder_price_cents integer,
  add column if not exists regular_price_cents integer,
  add column if not exists bundle_unit_amount_cents integer,
  add column if not exists preorder_ends_at timestamptz,
  add column if not exists launch_at timestamptz;

alter table public.commerce_products
  drop constraint if exists commerce_products_preorder_price_nonnegative,
  add constraint commerce_products_preorder_price_nonnegative
    check (preorder_price_cents is null or preorder_price_cents >= 0),
  drop constraint if exists commerce_products_regular_price_nonnegative,
  add constraint commerce_products_regular_price_nonnegative
    check (regular_price_cents is null or regular_price_cents >= 0),
  drop constraint if exists commerce_products_bundle_price_nonnegative,
  add constraint commerce_products_bundle_price_nonnegative
    check (bundle_unit_amount_cents is null or bundle_unit_amount_cents >= 0);

update public.commerce_products
set
  name = 'KodaBot',
  short_description = 'Tecnologia tranquila para organizar seu dia sem depender o tempo inteiro do celular.',
  description = 'Assistente visual de mesa com KODA OS, tela touch, cabo Micro USB incluído e integração com a Conta Koda. Adaptador de tomada vendido separadamente.',
  unit_amount_cents = 9990,
  compare_at_cents = 12990,
  preorder_price_cents = 9990,
  regular_price_cents = 12990,
  preorder_ends_at = '2026-10-17 00:00:00-03'::timestamptz,
  launch_at = '2026-10-17 00:00:00-03'::timestamptz,
  purchase_enabled = true,
  waitlist_enabled = false,
  image_url = '/kodabot-checkout-transparent-v1.png',
  updated_at = now()
where slug = 'kodabot-i';

update public.commerce_products
set
  name = 'KodaBot Pro',
  short_description = 'Voz, áudio e inteligência Koda.',
  description = 'KodaBot Pro está em desenvolvimento e ainda não tem data de lançamento. Entre na lista para receber novidades e a abertura da pré-venda.',
  unit_amount_cents = 12990,
  compare_at_cents = 19990,
  preorder_price_cents = 12990,
  regular_price_cents = 19990,
  preorder_ends_at = null,
  launch_at = null,
  purchase_enabled = false,
  waitlist_enabled = true,
  published_at = coalesce(published_at, now()),
  updated_at = now()
where slug = 'kodabot-i-pro';

insert into public.commerce_products (
  slug, name, short_description, description, active, currency,
  unit_amount_cents, bundle_unit_amount_cents, cost_cents, track_stock,
  stock_quantity, product_type, category, sku, image_url, sort_order,
  featured, requires_shipping, requires_device, shipping_mode,
  weight_grams, length_mm, width_mm, height_mm, purchase_enabled,
  waitlist_enabled, published_at
)
values (
  'adaptador-energia-usb-2a',
  'Adaptador de energia USB para KodaBot',
  'Adaptador bivolt USB-A de 5 V / 2 A para usar seu KodaBot na tomada.',
  'Adaptador de energia USB-A bivolt, saída de 5 V / 2 A, modelo F001. Cabo Micro USB não incluído neste item. Homologação informada pelo fornecedor: 130222113363.',
  true, 'BRL', 1990, 1490, 529, false, null, 'physical', 'Acessórios',
  'KODA-ACC-USB2A-WH', '/koda-adaptador-usb-2a.webp', 20, true,
  true, false, 'carrier', 100, 100, 60, 40, true, false, now()
)
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  active = excluded.active,
  currency = excluded.currency,
  unit_amount_cents = excluded.unit_amount_cents,
  bundle_unit_amount_cents = excluded.bundle_unit_amount_cents,
  cost_cents = excluded.cost_cents,
  product_type = excluded.product_type,
  category = excluded.category,
  sku = excluded.sku,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  featured = excluded.featured,
  requires_shipping = excluded.requires_shipping,
  requires_device = excluded.requires_device,
  shipping_mode = excluded.shipping_mode,
  weight_grams = excluded.weight_grams,
  length_mm = excluded.length_mm,
  width_mm = excluded.width_mm,
  height_mm = excluded.height_mm,
  purchase_enabled = excluded.purchase_enabled,
  waitlist_enabled = excluded.waitlist_enabled,
  published_at = coalesce(public.commerce_products.published_at, excluded.published_at),
  updated_at = now();

-- Existing six-month coverages stay in history, but the plan is no longer sold.
update public.commerce_products
set active = false, purchase_enabled = false, published_at = null, updated_at = now()
where slug = 'kodacare';

update public.commerce_products
set
  unit_amount_cents = case slug
    when 'kodacare-plus-1y' then 2990
    when 'kodacare-plus-2y' then 4990
  end,
  regular_price_cents = case slug
    when 'kodacare-plus-1y' then 2990
    when 'kodacare-plus-2y' then 4990
  end,
  purchase_enabled = true,
  waitlist_enabled = false,
  updated_at = now()
where slug in ('kodacare-plus-1y', 'kodacare-plus-2y');

create table public.product_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references public.commerce_products(slug) on update cascade on delete restrict,
  email text not null,
  full_name text,
  user_id uuid references auth.users(id) on delete set null,
  consented_at timestamptz not null,
  source text not null default 'product_page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_waitlist_email_format check (
    char_length(email) between 3 and 254 and email = lower(email) and email like '%@%'
  ),
  constraint product_waitlist_supported_product check (product_slug = 'kodabot-i-pro'),
  constraint product_waitlist_unique_email unique (product_slug, email)
);

alter table public.product_waitlist_entries enable row level security;
revoke all on table public.product_waitlist_entries from anon, authenticated;
grant all on table public.product_waitlist_entries to service_role;

create index product_waitlist_created_idx
  on public.product_waitlist_entries(product_slug, created_at desc);

comment on table public.product_waitlist_entries is
  'Private product-interest list. Public clients submit through the validated Edge Function and cannot read the table.';

comment on column public.commerce_products.bundle_unit_amount_cents is
  'Server-side unit price when this accessory is a validated add-on to an eligible main product.';
