-- Publish the KodaBot presale in the canonical Koda Pay catalog.
-- KodaCare remains a separate purchase until coverage fulfillment is explicitly tied to a serialised device.

update public.commerce_products
set
  name = 'KodaBot',
  description = 'KodaBot de mesa com tela touch, KODA OS e serviços Koda.',
  active = true,
  currency = 'BRL',
  unit_amount_cents = 9990,
  track_stock = false,
  updated_at = now()
where slug = 'kodabot-i';

do $$
begin
  if not exists (
    select 1
    from public.commerce_products
    where slug = 'kodabot-i'
      and active
      and currency = 'BRL'
      and unit_amount_cents = 9990
  ) then
    raise exception 'KodaBot presale catalog row was not published as expected';
  end if;
end
$$;
