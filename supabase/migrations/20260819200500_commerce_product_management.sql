alter table public.commerce_products
  add column if not exists cost_cents integer,
  add column if not exists category text,
  add column if not exists sku text,
  add column if not exists product_type text not null default 'physical',
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0;

alter table public.commerce_products
  drop constraint if exists commerce_products_cost_cents_check,
  add constraint commerce_products_cost_cents_check check (cost_cents is null or cost_cents >= 0),
  drop constraint if exists commerce_products_product_type_check,
  add constraint commerce_products_product_type_check check (product_type in ('physical','digital','service','coverage')),
  drop constraint if exists commerce_products_stock_quantity_check,
  add constraint commerce_products_stock_quantity_check check (stock_quantity is null or stock_quantity >= 0),
  drop constraint if exists commerce_products_sort_order_check,
  add constraint commerce_products_sort_order_check check (sort_order >= 0);

create unique index if not exists commerce_products_sku_unique_idx
  on public.commerce_products (lower(sku))
  where sku is not null and length(trim(sku)) > 0;

create index if not exists commerce_products_category_idx
  on public.commerce_products (category)
  where category is not null;

create index if not exists commerce_products_public_sort_idx
  on public.commerce_products (active desc, sort_order asc, name asc);
