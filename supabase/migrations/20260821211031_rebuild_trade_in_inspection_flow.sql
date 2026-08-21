alter table public.trade_in_requests
  add column if not exists estimated_credit_cents integer,
  add column if not exists final_credit_cents integer,
  add column if not exists speaker_works boolean,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists customer_decision_at timestamptz,
  add column if not exists coupon_code text,
  add column if not exists return_tracking_code text,
  add column if not exists return_shipping_payer text not null default 'customer';

alter table public.trade_in_requests
  drop constraint if exists trade_in_requests_credit_cents_check,
  drop constraint if exists trade_in_requests_status_check;

update public.trade_in_requests
set estimated_credit_cents = credit_cents,
    final_credit_cents = case
      when status in ('approved', 'completed') then credit_cents
      else final_credit_cents
    end,
    speaker_works = case when source_model = 'kodabot-i-pro' then true else null end,
    terms_accepted_at = coalesce(terms_accepted_at, created_at)
where estimated_credit_cents is null;

update public.trade_in_requests
set status = case status
  when 'estimated' then 'awaiting_shipment'
  when 'reserved' then 'awaiting_shipment'
  when 'approved' then 'offer_ready'
  when 'rejected' then 'return_requested'
  else status
end;

alter table public.trade_in_requests
  alter column estimated_credit_cents set not null,
  add constraint trade_in_requests_credit_matches_condition check (
    credit_cents = estimated_credit_cents
    and estimated_credit_cents = case source_model
      when 'kodabot-i' then greatest(
        500,
        5990
          - case when powers_on then 0 else 2990 end
          - case when enclosure_intact then 0 else 1500 end
          - case when screen_intact then 0 else 1500 end
      )
      when 'kodabot-i-pro' then greatest(
        500,
        7990
          - case when powers_on then 0 else 3990 end
          - case when enclosure_intact then 0 else 2000 end
          - case when speaker_works then 0 else 2000 end
      )
    end
  ),
  add constraint trade_in_requests_model_condition_check check (
    (source_model = 'kodabot-i' and speaker_works is null)
    or (source_model = 'kodabot-i-pro' and speaker_works is not null)
  ),
  add constraint trade_in_requests_final_credit_check check (
    final_credit_cents is null or final_credit_cents between 500 and 7990
  ),
  add constraint trade_in_requests_offer_requires_credit check (
    status not in ('offer_ready', 'accepted', 'completed') or final_credit_cents is not null
  ),
  add constraint trade_in_requests_status_check check (status in (
    'awaiting_shipment', 'in_transit', 'received', 'inspecting', 'offer_ready',
    'accepted', 'return_requested', 'returned', 'completed', 'cancelled'
  )),
  add constraint trade_in_requests_return_shipping_payer_check check (
    return_shipping_payer in ('customer', 'koda')
  );

create unique index if not exists trade_in_requests_coupon_code_key
  on public.trade_in_requests(coupon_code) where coupon_code is not null;

drop index if exists public.trade_in_one_active_request_per_device;
create unique index trade_in_one_active_request_per_device
  on public.trade_in_requests(device_id)
  where status not in ('cancelled', 'completed', 'returned');

drop policy if exists "Customers can request own device trade in" on public.trade_in_requests;
create policy "Customers can request own device trade in"
on public.trade_in_requests for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'awaiting_shipment'
  and terms_accepted_at is not null
  and final_credit_cents is null
  and coupon_code is null
  and exists (
    select 1 from public.devices d
    where d.id = device_id
      and d.owner_user_id = (select auth.uid())
      and d.serial_number = serial_number
      and d.model = source_model
      and d.status in ('activated', 'service')
  )
);

create or replace function public.respond_trade_in_offer(
  _request_id uuid,
  _accept boolean
)
returns table(status text, coupon_code text, credit_cents integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trade_in_requests%rowtype;
  v_coupon text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_request
  from public.trade_in_requests
  where id = _request_id and user_id = auth.uid()
  for update;

  if v_request.id is null then raise exception 'trade in request not found'; end if;
  if v_request.status <> 'offer_ready' or v_request.final_credit_cents is null then
    raise exception 'offer is not available';
  end if;

  if _accept then
    v_coupon := 'KODA-TI-' || upper(substr(replace(v_request.id::text, '-', ''), 1, 10));
    update public.trade_in_requests
    set status = 'accepted', coupon_code = v_coupon, customer_decision_at = now()
    where id = v_request.id;
    return query select 'accepted'::text, v_coupon, v_request.final_credit_cents;
  else
    update public.trade_in_requests
    set status = 'return_requested', coupon_code = null, customer_decision_at = now(),
        return_shipping_payer = 'customer'
    where id = v_request.id;
    return query select 'return_requested'::text, null::text, v_request.final_credit_cents;
  end if;
end;
$$;

revoke all on function public.respond_trade_in_offer(uuid, boolean) from public, anon;
grant execute on function public.respond_trade_in_offer(uuid, boolean) to authenticated;

comment on column public.trade_in_requests.estimated_credit_cents is
  'Condition-based estimate shown before free inbound shipment and physical inspection.';
comment on column public.trade_in_requests.final_credit_cents is
  'Final credit offered by Koda after inspection; customer must accept before coupon use.';
comment on column public.trade_in_requests.return_shipping_payer is
  'Inbound inspection shipment is free; customer pays return shipping when declining the offer.';
