-- Canonical commercial and after-sales expansion. Reuses devices, orders,
-- KodaPay, KodaCare, support_cases, device_transfers and admin_audit_log.

alter table public.profiles add column if not exists phone text;
alter table public.devices add column if not exists display_name text;
alter table public.devices add column if not exists update_channel text not null default 'stable'
  check (update_channel in ('stable', 'beta'));
alter table public.device_feedback add column if not exists rating smallint
  check (rating between 1 and 5);
alter table public.device_transfers add column if not exists to_user_id uuid references auth.users(id) on delete set null;
alter table public.device_transfers add column if not exists recipient_email text;
alter table public.device_transfers add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table public.device_transfers add column if not exists rejected_at timestamptz;
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists tracking_code text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);

create table public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Endereço',
  recipient_name text not null,
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  country text not null default 'BR',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index user_addresses_one_default_idx on public.user_addresses(user_id) where is_default;

create table public.shopping_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.shopping_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.shopping_carts(id) on delete cascade,
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 20),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(cart_id, product_id)
);

create table public.product_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, product_id)
);

create table public.commerce_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  valid_from timestamptz,
  valid_until timestamptz,
  total_limit integer check (total_limit is null or total_limit > 0),
  per_user_limit integer check (per_user_limit is null or per_user_limit > 0),
  minimum_cents integer not null default 0 check (minimum_cents >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.commerce_coupon_products (
  coupon_id uuid not null references public.commerce_coupons(id) on delete cascade,
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  primary key(coupon_id, product_id)
);
create table public.commerce_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.commerce_coupons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  discount_cents integer not null check (discount_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.repair_services (
  id text primary key,
  model text not null,
  name text not null,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  accidental_eligible boolean not null default false,
  cleaning boolean not null default false,
  active boolean not null default true,
  unique(model, name)
);

insert into public.repair_services(id,model,name,category,price_cents,accidental_eligible,cleaning) values
('kodabot-i:diagnostic','kodabot-i','Diagnóstico','diagnostic',0,false,false),
('kodabot-i:display','kodabot-i','Tela LCD','display',4000,true,false),
('kodabot-i:pico','kodabot-i','Raspberry Pi Pico','controller',4000,true,false),
('kodabot-i:main-board','kodabot-i','Placa/conexões','controller',2500,true,false),
('kodabot-i:bme280','kodabot-i','BME280','sensor',2000,true,false),
('kodabot-i:buzzer','kodabot-i','Buzzer','audio',1000,true,false),
('kodabot-i:front-shell','kodabot-i','Carcaça frontal','shell',1000,true,false),
('kodabot-i:rear-shell','kodabot-i','Carcaça traseira','shell',1500,true,false),
('kodabot-i:full-shell','kodabot-i','Carcaça completa','shell',3000,true,false),
('kodabot-i:os-restore','kodabot-i','Restaurar KODA OS','software',0,false,false),
('kodabot-i:os-reinstall','kodabot-i','Reinstalação completa','software',1000,false,false),
('kodabot-i:no-boot','kodabot-i','Recuperação sem boot','software',0,false,false),
('kodabot-i:cleaning','kodabot-i','Limpeza/revisão','maintenance',3000,false,true)
on conflict (id) do update set price_cents=excluded.price_cents, name=excluded.name, active=true;

create sequence public.repair_protocol_seq;
create table public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique default ('KRP-' || extract(year from now())::integer || '-' || lpad(nextval('public.repair_protocol_seq')::text, 6, '0')),
  user_id uuid not null references auth.users(id) on delete restrict,
  device_id uuid references public.devices(id) on delete restrict,
  model text not null,
  category text not null check (category in ('display','touch','controller','sensor','audio','shell','power','software','other')),
  description text not null check (length(trim(description)) >= 10),
  requested_service_id text references public.repair_services(id) on delete restrict,
  coverage_id uuid references public.device_coverages(id) on delete set null,
  estimated_price_cents integer check (estimated_price_cents is null or estimated_price_cents >= 0),
  final_price_cents integer check (final_price_cents is null or final_price_cents >= 0),
  status text not null default 'requested' check (status in ('requested','awaiting_shipment','received','diagnosing','awaiting_approval','approved','repairing','ready','return_shipping','completed','cancelled')),
  shipping_method text not null check (shipping_method in ('shipping','local')),
  shipping_address jsonb,
  tracking_code text,
  diagnosis text,
  quote_approved_at timestamptz,
  quote_rejected_at timestamptz,
  payment_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz
);
create index repair_requests_user_created_idx on public.repair_requests(user_id,created_at desc);
create index repair_requests_status_idx on public.repair_requests(status,created_at);
create table public.repair_attachments (
  id uuid primary key default gen_random_uuid(),
  repair_request_id uuid not null references public.repair_requests(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);
create table public.repair_events (
  id uuid primary key default gen_random_uuid(),
  repair_request_id uuid not null references public.repair_requests(id) on delete cascade,
  event_type text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.repair_quote_items (
  id uuid primary key default gen_random_uuid(),
  repair_request_id uuid not null references public.repair_requests(id) on delete cascade,
  service_id text references public.repair_services(id) on delete restrict,
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  covered_by_kodacare boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  unique(product_id,user_id)
);
create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);

create table public.koda_os_update_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.koda_os_releases(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  event_type text not null check (event_type in ('checked','downloaded','installed','failed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index koda_os_update_events_release_idx on public.koda_os_update_events(release_id,event_type);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('repair-attachments','repair-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Official KodaCare prices live in the server-side commerce catalog.
insert into public.commerce_products(slug,name,description,active,currency,unit_amount_cents,track_stock,stock_quantity)
values
('kodacare','KodaCare','Mais 6 meses de garantia de fábrica.',true,'BRL',1990,false,null),
('kodacare-plus-1y','KodaCare+ — 1 ano','Cobertura por 1 ano com benefícios KodaCare+.',true,'BRL',2990,false,null),
('kodacare-plus-2y','KodaCare+ — 2 anos','Cobertura por 2 anos com benefícios KodaCare+.',true,'BRL',3990,false,null)
on conflict (slug) do update set name=excluded.name,description=excluded.description,unit_amount_cents=excluded.unit_amount_cents,active=true;

alter table public.user_notifications enable row level security;
alter table public.user_addresses enable row level security;
alter table public.shopping_carts enable row level security;
alter table public.shopping_cart_items enable row level security;
alter table public.product_favorites enable row level security;
alter table public.commerce_coupons enable row level security;
alter table public.commerce_coupon_products enable row level security;
alter table public.commerce_coupon_redemptions enable row level security;
alter table public.repair_services enable row level security;
alter table public.repair_requests enable row level security;
alter table public.repair_attachments enable row level security;
alter table public.repair_events enable row level security;
alter table public.repair_quote_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.product_questions enable row level security;
alter table public.koda_os_update_events enable row level security;

create policy user_notifications_owner on public.user_notifications for select to authenticated using ((select auth.uid())=user_id);
create policy user_notifications_owner_update on public.user_notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy user_addresses_owner on public.user_addresses for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy shopping_carts_owner on public.shopping_carts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy shopping_cart_items_owner on public.shopping_cart_items for all to authenticated
using (exists(select 1 from public.shopping_carts c where c.id=cart_id and c.user_id=(select auth.uid())))
with check (exists(select 1 from public.shopping_carts c where c.id=cart_id and c.user_id=(select auth.uid())));
create policy product_favorites_owner on public.product_favorites for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy repair_services_public_read on public.repair_services for select to anon,authenticated using (active);
create policy repair_requests_owner_read on public.repair_requests for select to authenticated using ((select auth.uid())=user_id);
create policy repair_attachments_owner on public.repair_attachments for select to authenticated using (exists(select 1 from public.repair_requests r where r.id=repair_request_id and r.user_id=(select auth.uid())));
create policy repair_attachments_owner_insert on public.repair_attachments for insert to authenticated with check (exists(select 1 from public.repair_requests r where r.id=repair_request_id and r.user_id=(select auth.uid())));
create policy repair_events_owner_read on public.repair_events for select to authenticated using (customer_visible and exists(select 1 from public.repair_requests r where r.id=repair_request_id and r.user_id=(select auth.uid())));
create policy repair_quote_items_owner_read on public.repair_quote_items for select to authenticated using (exists(select 1 from public.repair_requests r where r.id=repair_request_id and r.user_id=(select auth.uid())));
create policy device_components_owner_read on public.device_components for select to authenticated using (
  exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid()))
);
create policy reviews_public_read on public.product_reviews for select to anon,authenticated using (status='published' or user_id=(select auth.uid()));
create policy reviews_owner_insert on public.product_reviews for insert to authenticated with check (user_id=(select auth.uid()));
create policy questions_public_read on public.product_questions for select to anon,authenticated using (status='published' or user_id=(select auth.uid()));
create policy questions_owner_insert on public.product_questions for insert to authenticated with check (user_id=(select auth.uid()));

create policy notifications_staff_insert on public.user_notifications for insert to authenticated with check (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced'));
create policy repairs_staff_all on public.repair_requests for all to authenticated using (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced')) with check (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced'));
create policy repair_attachments_staff on public.repair_attachments for all to authenticated using (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced')) with check (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced'));
create policy repair_events_staff on public.repair_events for all to authenticated using (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced')) with check (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced'));
create policy repair_quotes_staff on public.repair_quote_items for all to authenticated using (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced')) with check (public.has_role((select auth.uid()),'admin') or public.has_role((select auth.uid()),'support_agent') or public.has_role((select auth.uid()),'support_advanced'));
create policy coupons_admin on public.commerce_coupons for all to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));
create policy coupon_products_admin on public.commerce_coupon_products for all to authenticated using (public.has_role((select auth.uid()),'admin')) with check (public.has_role((select auth.uid()),'admin'));

create policy repair_storage_owner_read on storage.objects for select to authenticated using (
  bucket_id='repair-attachments' and exists(select 1 from public.repair_requests r where r.id=(storage.foldername(name))[1]::uuid and r.user_id=(select auth.uid()))
);
create policy repair_storage_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id='repair-attachments' and exists(select 1 from public.repair_requests r where r.id=(storage.foldername(name))[1]::uuid and r.user_id=(select auth.uid()))
);

grant select,update on public.user_notifications to authenticated;
grant select,insert,update,delete on public.user_addresses,public.shopping_carts,public.shopping_cart_items,public.product_favorites to authenticated;
grant select on public.repair_services to anon,authenticated;
grant select on public.repair_requests to authenticated;
grant insert on public.product_reviews,public.product_questions to authenticated;
grant select,insert on public.repair_attachments to authenticated;
grant select on public.repair_events,public.repair_quote_items to authenticated;
grant select,insert on public.user_notifications to authenticated;
grant select,insert,update,delete on public.commerce_coupons,public.commerce_coupon_products to authenticated;

create or replace function public.approve_repair_quote(_repair_id uuid, _approved boolean)
returns public.repair_requests language plpgsql security definer set search_path='' as $$
declare v public.repair_requests%rowtype;
begin
  select * into v from public.repair_requests where id=_repair_id and user_id=auth.uid() for update;
  if not found then raise exception 'Repair request not found'; end if;
  if v.status <> 'awaiting_approval' then raise exception 'Repair quote is not awaiting approval'; end if;
  update public.repair_requests set status=case when _approved then 'approved' else 'cancelled' end,
    quote_approved_at=case when _approved then now() else null end,
    quote_rejected_at=case when _approved then null else now() end, updated_at=now()
  where id=_repair_id returning * into v;
  insert into public.repair_events(repair_request_id,event_type,title,actor_user_id)
  values(_repair_id,case when _approved then 'quote_approved' else 'quote_rejected' end,
    case when _approved then 'Orçamento aprovado' else 'Orçamento recusado' end,auth.uid());
  return v;
end $$;
revoke all on function public.approve_repair_quote(uuid,boolean) from public,anon;
grant execute on function public.approve_repair_quote(uuid,boolean) to authenticated;

create or replace function public.create_repair_request(
  _device_id uuid,
  _model text,
  _category text,
  _description text,
  _requested_service_id text,
  _shipping_method text,
  _shipping_address jsonb default null
)
returns public.repair_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_device public.devices%rowtype;
  v_service public.repair_services%rowtype;
  v_coverage_id uuid;
  v_request public.repair_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if _category not in ('display','touch','controller','sensor','audio','shell','power','software','other') then
    raise exception 'Invalid repair category';
  end if;
  if length(trim(coalesce(_description, ''))) < 10 then
    raise exception 'Repair description is too short';
  end if;
  if _shipping_method not in ('shipping','local') then
    raise exception 'Invalid shipping method';
  end if;
  if _shipping_method = 'shipping' and _shipping_address is null then
    raise exception 'Shipping address is required';
  end if;

  if _device_id is not null then
    select * into v_device
    from public.devices
    where id = _device_id and owner_user_id = v_user_id and status <> 'retired';
    if not found then
      raise exception 'Device is not eligible for repair';
    end if;
    _model := v_device.model;
  elsif trim(coalesce(_model, '')) = '' then
    raise exception 'Model is required';
  end if;

  if _requested_service_id is not null then
    select * into v_service
    from public.repair_services
    where id = _requested_service_id and model = _model and active;
    if not found then
      raise exception 'Repair service is unavailable for this model';
    end if;
  end if;

  if _device_id is not null then
    select id into v_coverage_id
    from public.device_coverages
    where device_id = _device_id
      and status = 'active'
      and coverage_start <= current_date
      and coverage_end >= current_date
    order by coverage_end desc
    limit 1;
  end if;

  insert into public.repair_requests(
    user_id, device_id, model, category, description, requested_service_id,
    coverage_id, estimated_price_cents, shipping_method, shipping_address
  ) values (
    v_user_id, _device_id, _model, _category, trim(_description), _requested_service_id,
    v_coverage_id, case when _requested_service_id is null then null else v_service.price_cents end,
    _shipping_method, _shipping_address
  ) returning * into v_request;

  insert into public.repair_events(
    repair_request_id, event_type, title, actor_user_id, customer_visible
  ) values (
    v_request.id, 'requested', 'Solicitação recebida', v_user_id, true
  );

  return v_request;
end
$$;
revoke all on function public.create_repair_request(uuid,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_repair_request(uuid,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.set_device_update_channel(_device_id uuid, _channel text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if _channel not in ('stable','beta') then raise exception 'Invalid update channel'; end if;
  update public.devices
  set update_channel=_channel, updated_at=now()
  where id=_device_id and owner_user_id=auth.uid() and status <> 'retired';
  if not found then raise exception 'Device not found'; end if;
  insert into public.device_events(device_id,event_type,details,actor_user_id)
  values(_device_id,'update_channel_changed',jsonb_build_object('channel',_channel),auth.uid());
  return _channel;
end
$$;
revoke all on function public.set_device_update_channel(uuid,text) from public,anon;
grant execute on function public.set_device_update_channel(uuid,text) to authenticated;
