alter table public.commerce_products
  add column if not exists fiscal_document_type text not null default 'none',
  add column if not exists fiscal_config jsonb not null default '{}'::jsonb;

alter table public.commerce_products
  drop constraint if exists commerce_products_fiscal_document_type_check;

alter table public.commerce_products
  add constraint commerce_products_fiscal_document_type_check
  check (fiscal_document_type in ('none', 'nfe', 'nfce', 'nfse'));

comment on column public.commerce_products.fiscal_document_type is
  'Fiscal document model approved for this product. none prevents issuance until accounting setup is complete.';
comment on column public.commerce_products.fiscal_config is
  'Accountant-approved, non-secret fiscal classification/configuration for the product. Provider credentials must never be stored here.';

alter table public.orders
  add column if not exists customer_tax_id text;

alter table public.orders
  drop constraint if exists orders_customer_tax_id_check;

alter table public.orders
  add constraint orders_customer_tax_id_check
  check (customer_tax_id is null or customer_tax_id ~ '^([0-9]{11}|[0-9]{14})$');

comment on column public.orders.customer_tax_id is
  'CPF/CNPJ digits only, when legally required for the fiscal document. Do not collect unless needed for the applicable document flow.';

create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'focus_nfe',
  document_type text not null,
  status text not null default 'queued',
  reference text not null unique,
  recipient_email text,
  provider_status text,
  document_number text,
  series text,
  access_key text,
  pdf_url text,
  xml_url text,
  attempts integer not null default 0,
  last_error text,
  provider_response jsonb not null default '{}'::jsonb,
  authorized_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_documents_document_type_check
    check (document_type in ('nfe', 'nfce', 'nfse')),
  constraint fiscal_documents_status_check
    check (status in ('waiting_configuration', 'queued', 'processing', 'authorized', 'email_scheduled', 'failed', 'cancelled')),
  constraint fiscal_documents_provider_check
    check (provider = 'focus_nfe'),
  constraint fiscal_documents_attempts_check
    check (attempts >= 0)
);

comment on table public.fiscal_documents is
  'Auditable fiscal-document lifecycle. A row is never proof of a nota fiscal until status is authorized/email_scheduled and the fiscal authority/provider has authorized it.';

create index if not exists fiscal_documents_status_created_idx
  on public.fiscal_documents(status, created_at);
create index if not exists fiscal_documents_user_created_idx
  on public.fiscal_documents(user_id, created_at desc);

alter table public.fiscal_documents enable row level security;

drop policy if exists "Customers can view their own fiscal documents" on public.fiscal_documents;
create policy "Customers can view their own fiscal documents"
  on public.fiscal_documents
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.fiscal_documents from anon, authenticated;
grant select on public.fiscal_documents to authenticated;

create or replace function public.queue_fiscal_document_for_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_type text;
  v_config jsonb;
  v_reference text;
  v_status text;
  v_item_count integer;
begin
  if new.paid_at is null or new.status not in ('paid', 'processing', 'shipped', 'delivered') then
    return new;
  end if;

  if exists (select 1 from public.fiscal_documents fd where fd.order_id = new.id) then
    return new;
  end if;

  select count(*), min(p.fiscal_document_type), coalesce(jsonb_agg(p.fiscal_config)->0, '{}'::jsonb)
    into v_item_count, v_document_type, v_config
  from public.order_items oi
  join public.commerce_products p on p.id = oi.product_id
  where oi.order_id = new.id
    and p.fiscal_document_type <> 'none';

  if coalesce(v_item_count, 0) = 0 or v_document_type is null or v_document_type = 'none' then
    return new;
  end if;

  if exists (
    select 1
    from public.order_items oi
    join public.commerce_products p on p.id = oi.product_id
    where oi.order_id = new.id
      and p.fiscal_document_type <> 'none'
      and p.fiscal_document_type <> v_document_type
  ) then
    v_status := 'waiting_configuration';
  elsif v_config is null or v_config = '{}'::jsonb then
    v_status := 'waiting_configuration';
  else
    v_status := 'queued';
  end if;

  v_reference := 'KODA' || replace(new.id::text, '-', '');

  insert into public.fiscal_documents (
    order_id,
    user_id,
    provider,
    document_type,
    status,
    reference,
    recipient_email,
    last_error
  ) values (
    new.id,
    new.user_id,
    'focus_nfe',
    v_document_type,
    v_status,
    v_reference,
    new.customer_email,
    case
      when v_status = 'waiting_configuration' then 'fiscal_product_configuration_required'
      else null
    end
  )
  on conflict (order_id) do nothing;

  return new;
end;
$$;

revoke all on function public.queue_fiscal_document_for_paid_order() from public;

drop trigger if exists queue_fiscal_document_after_payment on public.orders;
create trigger queue_fiscal_document_after_payment
  after insert or update of status, paid_at
  on public.orders
  for each row
  execute function public.queue_fiscal_document_for_paid_order();
