-- Final order experience: idempotent checkout + auditable customer timeline.
-- Additive and backward-compatible with the existing Koda Pay flow.

alter table public.orders
  add column if not exists checkout_reference text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_checkout_reference_length'
  ) then
    alter table public.orders
      add constraint orders_checkout_reference_length
      check (checkout_reference is null or char_length(checkout_reference) between 16 and 100);
  end if;
end
$$;

create unique index if not exists orders_user_checkout_reference_key
  on public.orders(user_id, checkout_reference)
  where user_id is not null and checkout_reference is not null;

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  status text,
  title text not null,
  body text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_created_idx
  on public.order_events(order_id, created_at desc);

alter table public.order_events enable row level security;

drop policy if exists "Users can read own order events" on public.order_events;
create policy "Users can read own order events"
  on public.order_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_events.order_id
        and (
          o.user_id = (select auth.uid())
          or public.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );

comment on column public.orders.checkout_reference is
  'Client-generated opaque reference used only to make checkout order creation idempotent.';
comment on table public.order_events is
  'Customer-safe, auditable order lifecycle timeline. Sensitive payment payloads remain in payment_events.';
