-- =====================================================================
-- Notifications v2: fix triggers that referenced the dropped
-- job_requests table / job_id column, add won/lost notifications when a
-- quote is accepted, and add a kind for losing providers. Safe to re-run.
-- =====================================================================

-- 1) Expand the kind check to include 'lead_lost'.
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
exception when undefined_object then null; end $$;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'quote_received','booking_confirmed','message_received','status_changed',
    'review_requested','quote_accepted','booking_cancelled',
    'new_matching_lead','lead_unlocked_by_provider','lead_lost',
    'topup_approved','topup_rejected','refund_issued','low_balance'
  ));

-- 2) Rewrite the quote-insert notification to use customer_leads.lead_id.
create or replace function public.on_quote_insert_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _customer uuid;
  _name     text;
begin
  select customer_id into _customer
    from public.customer_leads where id = new.lead_id;
  if _customer is null then return new; end if;

  select coalesce(business_name, 'A provider') into _name
    from public.providers where id = new.provider_id;

  insert into public.notifications(user_id, kind, title, body, link)
    values (_customer, 'quote_received',
            coalesce(_name, 'A provider') || ' sent a quote',
            'Tap to review the details and accept.',
            '/request/' || new.lead_id::text || '?tab=quotes');
  return new;
end $$;
drop trigger if exists trg_quote_notify on public.quotes;
create trigger trg_quote_notify after insert on public.quotes
  for each row execute function public.on_quote_insert_notify();

-- 3) Rewrite the booking notification to use lead_id (no job_id column
--    exists on bookings anymore).
create or replace function public.on_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _link  text;
  _title text;
  _body  text;
begin
  _link := '/request/' || new.lead_id::text || '?tab=booking';

  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, kind, title, body, booking_id, link)
    values (new.provider_id, 'quote_accepted',
            'Your quote was accepted',
            'You have a new booking. Propose a visit time to lock it in.',
            new.id, _link);
    insert into public.notifications(user_id, kind, title, body, booking_id, link)
    values (new.customer_id, 'booking_confirmed',
            'Booking confirmed',
            'The provider has been notified. Agree on a visit time to get started.',
            new.id, _link);
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'completed' then
      insert into public.notifications(user_id, kind, title, body, booking_id, link)
      values (new.customer_id, 'review_requested',
              'Service completed',
              'How did it go? Leave a quick review.', new.id, _link);
    elsif new.status = 'cancelled' then
      insert into public.notifications(user_id, kind, title, body, booking_id, link)
      values (new.customer_id, 'booking_cancelled',
              'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.id, _link);
      insert into public.notifications(user_id, kind, title, body, booking_id, link)
      values (new.provider_id, 'booking_cancelled',
              'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.id, _link);
    else
      if new.status = 'on_the_way' then
        _title := 'Provider is on the way';
        _body  := 'They are heading to your address now.';
      elsif new.status in ('started','in_progress') then
        _title := 'Work has started';
        _body  := 'Your provider has started the job.';
      else
        _title := 'Booking status updated';
        _body  := new.status;
      end if;
      insert into public.notifications(user_id, kind, title, body, booking_id, link)
      values (new.customer_id, 'status_changed', _title, _body, new.id, _link);
    end if;
  end if;

  return new;
end $$;
drop trigger if exists trg_booking_notify on public.bookings;
create trigger trg_booking_notify after insert or update on public.bookings
  for each row execute function public.on_booking_notify();

-- 4) accept_quote: decline other quotes, sync unlock statuses to won/lost,
--    and fan-out lead_lost notifications to other unlocking providers.
create or replace function public.accept_quote(p_quote_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.quotes%rowtype;
  v_lead public.customer_leads%rowtype;
  v_booking public.bookings%rowtype;
  v_service text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND'; end if;
  select * into v_lead from public.customer_leads where id = v_quote.lead_id for update;
  if not found then raise exception 'LEAD_NOT_FOUND'; end if;
  if v_lead.customer_id <> v_uid then raise exception 'NOT_CUSTOMER'; end if;

  select * into v_booking from public.bookings
    where lead_id = v_lead.id and provider_id = v_quote.provider_id;
  if not found then
    insert into public.bookings (lead_id, quote_id, customer_id, provider_id, amount, status)
    values (v_lead.id, v_quote.id, v_uid, v_quote.provider_id, v_quote.amount, 'accepted')
    returning * into v_booking;
  end if;

  update public.quotes set status = 'accepted'
    where id = v_quote.id and status <> 'accepted';
  update public.quotes set status = 'declined'
    where lead_id = v_lead.id and id <> v_quote.id and status = 'pending';
  update public.customer_leads set status = 'fully_booked'
    where id = v_lead.id and status <> 'fully_booked';

  update public.provider_lead_unlocks
    set status = 'won'
    where lead_id = v_lead.id
      and provider_id = v_quote.provider_id
      and status <> 'won';
  update public.provider_lead_unlocks
    set status = 'lost'
    where lead_id = v_lead.id
      and provider_id <> v_quote.provider_id
      and status not in ('lost','completed','invalid');

  select name_en into v_service from public.service_types where id = v_lead.service_type_id;

  insert into public.notifications(user_id, kind, title, body, link)
  select distinct u.provider_id, 'lead_lost',
         'Lead closed — customer chose another provider',
         'The ' || coalesce(v_service, 'job') || ' lead in ' || v_lead.city_slug || ' was booked with someone else.',
         '/provider/leads'
    from public.provider_lead_unlocks u
    where u.lead_id = v_lead.id
      and u.provider_id <> v_quote.provider_id;

  return v_booking;
end $$;
grant execute on function public.accept_quote(uuid) to authenticated;
