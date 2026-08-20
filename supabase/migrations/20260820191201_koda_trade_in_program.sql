create table public.trade_in_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete restrict,
  source_model text not null check (source_model in ('kodabot-i', 'kodabot-i-pro')),
  serial_number text not null,
  credit_cents integer not null check (
    (source_model = 'kodabot-i' and credit_cents = 5990)
    or (source_model = 'kodabot-i-pro' and credit_cents = 7990)
  ),
  powers_on boolean not null,
  enclosure_intact boolean not null,
  screen_intact boolean not null,
  account_unlinked boolean not null default false,
  status text not null default 'estimated' check (status in (
    'estimated', 'reserved', 'awaiting_shipment', 'in_transit', 'received',
    'inspecting', 'approved', 'rejected', 'cancelled', 'completed'
  )),
  purchase_order_id uuid references public.orders(id) on delete set null,
  outbound_tracking_code text,
  posted_at timestamptz,
  received_at timestamptz,
  inspected_at timestamptz,
  inspection_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index trade_in_one_active_request_per_device
  on public.trade_in_requests(device_id)
  where status not in ('rejected', 'cancelled', 'completed');
create index trade_in_requests_user_idx on public.trade_in_requests(user_id, created_at desc);
create index trade_in_requests_queue_idx on public.trade_in_requests(status, created_at);

alter table public.orders
  add column if not exists trade_in_request_id uuid references public.trade_in_requests(id) on delete set null;
create unique index if not exists orders_trade_in_request_key
  on public.orders(trade_in_request_id) where trade_in_request_id is not null;

create trigger update_trade_in_requests_updated_at
before update on public.trade_in_requests
for each row execute function public.update_updated_at_column();

alter table public.trade_in_requests enable row level security;

create policy "Customers can read own trade in"
on public.trade_in_requests for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Customers can request own device trade in"
on public.trade_in_requests for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and powers_on and enclosure_intact and screen_intact
  and exists (
    select 1 from public.devices d
    where d.id = device_id
      and d.owner_user_id = (select auth.uid())
      and d.serial_number = serial_number
      and d.model = source_model
      and d.status in ('activated', 'service')
  )
);

create policy "Staff can manage trade in"
on public.trade_in_requests for all to authenticated
using (
  public.has_role((select auth.uid()), 'admin')
  or public.has_role((select auth.uid()), 'support_advanced')
)
with check (
  public.has_role((select auth.uid()), 'admin')
  or public.has_role((select auth.uid()), 'support_advanced')
);

grant select, insert on public.trade_in_requests to authenticated;

comment on table public.trade_in_requests is
  'Koda Trade In estimates and the postal inspection lifecycle linked to a replacement order.';

create or replace function public.sync_trade_in_with_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trade_in_request_id is null then return new; end if;
  if new.status in ('paid', 'processing', 'shipped', 'delivered')
     and old.status is distinct from new.status then
    update public.trade_in_requests
    set status = case when status = 'reserved' then 'awaiting_shipment' else status end
    where id = new.trade_in_request_id;
  elsif new.status in ('cancelled', 'refunded')
     and old.status is distinct from new.status then
    update public.trade_in_requests
    set status = case when status in ('reserved', 'awaiting_shipment') then 'cancelled' else status end
    where id = new.trade_in_request_id;
  end if;
  return new;
end;
$$;

create trigger sync_trade_in_after_order_update
after update of status on public.orders
for each row execute function public.sync_trade_in_with_order();

revoke all on function public.sync_trade_in_with_order() from public;
