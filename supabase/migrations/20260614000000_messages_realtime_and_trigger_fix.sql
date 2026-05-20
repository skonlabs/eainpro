-- Fix chat/realtime after unify_to_customer_leads dropped & re-created
-- messages/quotes/bookings (which removed them from supabase_realtime and
-- dropped the trg_message_notify trigger), and after on_message_notify was
-- left referencing the now-gone messages.job_id column.

create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _customer uuid; _recipient uuid; _preview text;
begin
  select customer_id into _customer from public.customer_leads where id = new.lead_id;

  if new.recipient_id is not null then
    _recipient := new.recipient_id;
  elsif new.sender_id = _customer then
    select provider_id into _recipient from public.bookings
      where lead_id = new.lead_id order by created_at desc limit 1;
    if _recipient is null then
      select provider_id into _recipient from public.quotes
        where lead_id = new.lead_id order by created_at desc limit 1;
    end if;
  else
    _recipient := _customer;
  end if;

  if _recipient is null or _recipient = new.sender_id then return new; end if;

  _preview := coalesce(substring(coalesce(new.body, '[photo]') for 80), '');

  insert into public.notifications (user_id, kind, title, body, job_id, link)
  values (
    _recipient,
    'message_received',
    'New message',
    _preview,
    new.lead_id, -- column is named job_id but now stores the lead id
    '/request/' || new.lead_id::text || '?tab=messages'
  );
  return new;
end $$;

drop trigger if exists trg_message_notify on public.messages;
create trigger trg_message_notify after insert on public.messages
  for each row execute function public.on_message_notify();

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.quotes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;

alter table public.messages replica identity full;
alter table public.quotes replica identity full;
alter table public.bookings replica identity full;
