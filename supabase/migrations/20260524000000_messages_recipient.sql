-- Per-conversation messaging: split the single per-job message stream into
-- one thread per (customer, provider) pair by adding a recipient_id column.
alter table public.messages
  add column if not exists recipient_id uuid references auth.users(id) on delete set null;

create index if not exists messages_job_recipient_idx
  on public.messages (job_id, recipient_id, created_at);

-- Best-effort backfill for legacy rows: if a job has a single provider that
-- has interacted (quote/invite/booking), every existing message can be
-- safely attributed to that thread. Skip jobs with multiple providers —
-- those legacy rows stay null and the UI treats them as job-level history.
update public.messages m
set recipient_id = case
  when m.sender_id = j.customer_id then peers.provider_id
  else j.customer_id
end
from public.job_requests j,
lateral (
  select array_agg(distinct provider_id) as ids,
         min(provider_id) as provider_id,
         count(distinct provider_id) as n
  from (
    select provider_id from public.quotes where job_id = j.id
    union
    select provider_id from public.request_invitations where job_id = j.id
    union
    select provider_id from public.bookings where job_id = j.id
  ) s
) peers
where m.job_id = j.id
  and m.recipient_id is null
  and peers.n = 1
  and (m.sender_id = j.customer_id or m.sender_id = peers.provider_id);

-- Update message notification trigger to prefer the explicit recipient_id
-- when present, falling back to the previous "latest booking/quote provider"
-- heuristic for legacy rows.
create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _customer uuid; _recipient uuid; _preview text;
begin
  select customer_id into _customer from public.job_requests where id = new.job_id;
  if new.recipient_id is not null then
    _recipient := new.recipient_id;
  elsif new.sender_id = _customer then
    select provider_id into _recipient from public.bookings where job_id = new.job_id order by created_at desc limit 1;
    if _recipient is null then
      select provider_id into _recipient from public.quotes where job_id = new.job_id order by created_at desc limit 1;
    end if;
  else
    _recipient := _customer;
  end if;
  if _recipient is null or _recipient = new.sender_id then return new; end if;
  _preview := coalesce(substring(coalesce(new.body, '[photo]') for 80), '');
  insert into public.notifications (user_id, type, title, body, job_id, link)
  values (_recipient, 'message_received', 'New message', _preview, new.job_id,
          '/request/' || new.job_id::text || '?tab=messages');
  return new;
end $$;
