alter table public.support_cases
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists ai_summary text,
  add column if not exists ai_category text,
  add column if not exists ai_suggested_priority text
    check (ai_suggested_priority is null or ai_suggested_priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists last_message_at timestamptz not null default now();

create index if not exists support_cases_queue_idx
  on public.support_cases(status, priority, last_message_at desc);

grant select, insert on public.support_case_notes to authenticated;

drop policy if exists "Customers can read visible case messages" on public.support_case_notes;
create policy "Customers can read visible case messages"
on public.support_case_notes for select to authenticated
using (
  visibility = 'customer'
  and exists (
    select 1 from public.support_cases c
    where c.id = case_id and c.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Customers can reply to own cases" on public.support_case_notes;
create policy "Customers can reply to own cases"
on public.support_case_notes for insert to authenticated
with check (
  author_user_id = (select auth.uid())
  and visibility = 'customer'
  and exists (
    select 1 from public.support_cases c
    where c.id = case_id
      and c.owner_user_id = (select auth.uid())
      and c.status <> 'closed'
  )
);

create or replace function public.touch_support_case_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_cases
  set
    last_message_at = new.created_at,
    status = case
      when owner_user_id = new.author_user_id and status in ('resolved', 'waiting_customer')
        then 'open'::public.koda_support_status
      when owner_user_id <> new.author_user_id and new.visibility = 'customer'
        then 'waiting_customer'::public.koda_support_status
      else status
    end
  where id = new.case_id;
  return new;
end;
$$;

drop trigger if exists touch_support_case_from_message on public.support_case_notes;
create trigger touch_support_case_from_message
after insert on public.support_case_notes
for each row execute function public.touch_support_case_from_message();

revoke all on function public.touch_support_case_from_message() from public;
