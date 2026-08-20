update public.commerce_products
set unit_amount_cents = 12990,
    currency = 'BRL',
    updated_at = now()
where slug = 'kodabot-i-pro';
