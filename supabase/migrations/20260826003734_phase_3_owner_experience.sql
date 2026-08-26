-- Stage 3: owner lifecycle and automatic in-app communications.
-- Notifications are derived from canonical events so commercial and service
-- workflows keep a single source of truth.

begin;

alter table public.user_notifications
  add column if not exists source_event_id uuid;

create unique index if not exists user_notifications_source_event_idx
  on public.user_notifications (user_id, type, source_event_id)
  where source_event_id is not null;

create or replace function public.notify_owner_from_device_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_title text;
  v_body text;
  v_command text := new.details ->> 'command';
begin
  select owner_user_id into v_user_id
  from public.devices
  where id = new.device_id;

  if v_user_id is null then return new; end if;

  if new.event_type = 'activated' then
    v_title := 'KodaBot ativado';
    v_body := 'Seu KodaBot foi vinculado à Conta KodaCloud e já está disponível em Meus KodaBots.';
  elsif new.event_type = 'command_completed' and v_command = 'run_diagnostics' then
    v_title := 'Diagnóstico concluído';
    v_body := case when coalesce(new.details ->> 'status', 'completed') = 'completed'
      then 'A nova verificação do seu KodaBot está pronta para consulta.'
      else 'O KodaBot não conseguiu concluir a verificação. Você pode tentar novamente ou falar com o suporte.'
    end;
  else
    return new;
  end if;

  insert into public.user_notifications
    (user_id, type, title, body, href, source_event_id, metadata)
  values
    (v_user_id, 'device', v_title, v_body,
     '/conta/dispositivo/' || new.device_id::text, new.id,
     jsonb_build_object('device_id', new.device_id, 'event_type', new.event_type))
  on conflict (user_id, type, source_event_id) where source_event_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists notify_owner_after_device_event on public.device_events;
create trigger notify_owner_after_device_event
after insert on public.device_events
for each row execute function public.notify_owner_from_device_event();

create or replace function public.notify_owner_from_repair_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not new.customer_visible then return new; end if;

  select user_id into v_user_id
  from public.repair_requests
  where id = new.repair_request_id;

  if v_user_id is null then return new; end if;

  insert into public.user_notifications
    (user_id, type, title, body, href, source_event_id, metadata)
  values
    (v_user_id, 'repair', new.title,
     case
       when jsonb_typeof(new.details) = 'string' then trim(both '"' from new.details::text)
       else coalesce(new.details ->> 'message', 'Há uma nova atualização no seu reparo.')
     end,
     '/conta/reparos/' || new.repair_request_id::text, new.id,
     jsonb_build_object('repair_id', new.repair_request_id, 'event_type', new.event_type))
  on conflict (user_id, type, source_event_id) where source_event_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists notify_owner_after_repair_event on public.repair_events;
create trigger notify_owner_after_repair_event
after insert on public.repair_events
for each row execute function public.notify_owner_from_repair_event();

create or replace function public.notify_owner_from_support_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then return new; end if;

  insert into public.user_notifications
    (user_id, type, title, body, href, metadata)
  values
    (new.owner_user_id, 'support', 'Atendimento atualizado',
     case new.status::text
       when 'in_progress' then 'A equipe Koda começou a analisar sua solicitação.'
       when 'waiting_customer' then 'A equipe Koda precisa de uma resposta sua para continuar.'
       when 'resolved' then 'Sua solicitação foi marcada como resolvida.'
       when 'closed' then 'Seu atendimento foi encerrado.'
       else 'O status da sua solicitação mudou.'
     end,
     '/conta/atendimentos/' || new.id::text,
     jsonb_build_object('case_id', new.id, 'status', new.status::text));

  return new;
end;
$$;

drop trigger if exists notify_owner_after_support_status on public.support_cases;
create trigger notify_owner_after_support_status
after update of status on public.support_cases
for each row execute function public.notify_owner_from_support_status();

revoke all on function public.notify_owner_from_device_event() from public, anon, authenticated;
revoke all on function public.notify_owner_from_repair_event() from public, anon, authenticated;
revoke all on function public.notify_owner_from_support_status() from public, anon, authenticated;

-- The owner command RPC validates ownership internally, but default Postgres
-- function privileges would still expose it to anonymous callers.
revoke all on function public.request_device_command(uuid, text, jsonb) from public, anon;
grant execute on function public.request_device_command(uuid, text, jsonb) to authenticated;

commit;
