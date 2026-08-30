-- Stage 4: private growth leads and an authenticated referral program.
-- No commercial reward is created here; referral benefits require separate,
-- published terms before they can be advertised.

begin;

create table public.growth_interest_entries (
  id uuid primary key default gen_random_uuid(),
  program text not null check (program in ('refurbished', 'education', 'business')),
  email text not null,
  full_name text,
  organization text,
  contact_role text,
  estimated_quantity integer check (estimated_quantity is null or estimated_quantity between 1 and 10000),
  message text,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'growth_page',
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_interest_email_format check (
    char_length(email) between 3 and 254 and email = lower(email) and email like '%@%'
  ),
  unique (program, email)
);

create index growth_interest_program_created_idx
  on public.growth_interest_entries (program, created_at desc);

alter table public.growth_interest_entries enable row level security;
revoke all on table public.growth_interest_entries from anon, authenticated;
grant all on table public.growth_interest_entries to service_role;

comment on table public.growth_interest_entries is
  'Private interest registry for refurbished availability and Koda Education/Business pilots. Submitted only through a validated Edge Function.';

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^KODA-[A-Z0-9]{8}$'),
  created_at timestamptz not null default now()
);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referral_not_self check (referrer_user_id <> referred_user_id)
);

create index referral_attributions_referrer_created_idx
  on public.referral_attributions (referrer_user_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
revoke all on table public.referral_codes, public.referral_attributions from anon, authenticated;
grant all on table public.referral_codes, public.referral_attributions to service_role;

create or replace function public.get_referral_summary()
returns table(code text, total_referrals bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select r.code into v_code
  from public.referral_codes r
  where r.user_id = v_uid;

  if v_code is null then
    loop
      v_code := 'KODA-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      begin
        insert into public.referral_codes (user_id, code) values (v_uid, v_code);
        exit;
      exception when unique_violation then
        select r.code into v_code from public.referral_codes r where r.user_id = v_uid;
        if v_code is not null then exit; end if;
      end;
    end loop;
  end if;

  return query
  select v_code, count(a.id)
  from public.referral_codes r
  left join public.referral_attributions a on a.referral_code_id = r.id
  where r.user_id = v_uid
  group by r.id, v_code;
end;
$$;

create or replace function public.register_referral_attribution(_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_referral public.referral_codes%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_referral
  from public.referral_codes
  where code = upper(trim(_code));

  if not found or v_referral.user_id = v_uid then return false; end if;

  insert into public.referral_attributions
    (referral_code_id, referrer_user_id, referred_user_id)
  values
    (v_referral.id, v_referral.user_id, v_uid)
  on conflict (referred_user_id) do nothing;

  return found;
end;
$$;

revoke all on function public.get_referral_summary() from public, anon;
revoke all on function public.register_referral_attribution(text) from public, anon;
grant execute on function public.get_referral_summary() to authenticated;
grant execute on function public.register_referral_attribution(text) to authenticated;

commit;
