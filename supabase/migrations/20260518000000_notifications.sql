-- Phase 4: in-app notifications

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null check (kind in (
    'quote_received','booking_confirmed','message_received','status_changed',
    'review_requested','quote_accepted','booking_cancelled'
  )),
  title text not null,
  body text,
  job_id uuid references public.job_requests(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notif self read" on public.notifications;
create policy "notif self read" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notif self update" on public.notifications;
create policy "notif self update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif self delete" on public.notifications;
create policy "notif self delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.on_quote_insert_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _customer uuid; _name text;
begin
  select customer_id into _customer from public.job_requests where id = new.job_id;
  select coalesce(business_name, 'A provider') into _name from public.providers where id = new.provider_id;
  if _customer is not null then
    insert into public.notifications(user_id, kind, title, body, job_id, link)
    values (_customer, 'quote_received', _name || ' sent a quote',
            'Tap to review the details and accept.', new.job_id,
            '/request/' || new.job_id::text || '?tab=quotes');
  end if;
  return new;
end $$;
drop trigger if exists trg_quote_notify on public.quotes;
create trigger trg_quote_notify after insert on public.quotes
  for each row execute function public.on_quote_insert_notify();

create or replace function public.on_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _link text;
begin
  _link := '/request/' || new.job_id::text || '?tab=details';
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
    values (new.provider_id, 'quote_accepted', 'Your quote was accepted',
            'You have a new booking. Contact details are now shared.', new.job_id, new.id, _link);
    insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
    values (new.customer_id, 'booking_confirmed', 'Booking confirmed',
            'The provider has been notified. They will contact you soon.', new.job_id, new.id, _link);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'completed' then
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'review_requested', 'Service completed',
              'How did it go? Leave a quick review.', new.job_id, new.id, _link);
    elsif new.status = 'cancelled' then
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'booking_cancelled', 'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.job_id, new.id, _link);
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.provider_id, 'booking_cancelled', 'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.job_id, new.id, _link);
    else
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'status_changed', 'Booking status updated',
              new.status, new.job_id, new.id, _link);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_booking_notify on public.bookings;
create trigger trg_booking_notify after insert or update on public.bookings
  for each row execute function public.on_booking_notify();

create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _customer uuid; _recipient uuid; _preview text;
begin
  if new.kind = 'system' then return new; end if;
  select customer_id into _customer from public.job_requests where id = new.job_id;
  if new.sender_id = _customer then
    select provider_id into _recipient from public.bookings where job_id = new.job_id order by created_at desc limit 1;
    if _recipient is null then
      select provider_id into _recipient from public.quotes where job_id = new.job_id order by created_at desc limit 1;
    end if;
  else
    _recipient := _customer;
  end if;
  if _recipient is null or _recipient = new.sender_id then return new; end if;
  _preview := case when new.kind = 'image' then '📷 Photo' else left(coalesce(new.body,''), 80) end;
  insert into public.notifications(user_id, kind, title, body, job_id, link)
  values (_recipient, 'message_received', 'New message', _preview, new.job_id,
          '/request/' || new.job_id::text || '?tab=chat');
  return new;
end $$;
drop trigger if exists trg_message_notify on public.messages;
create trigger trg_message_notify after insert on public.messages
  for each row execute function public.on_message_notify();

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;
