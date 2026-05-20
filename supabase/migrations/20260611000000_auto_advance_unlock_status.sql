-- Auto-advance provider_lead_unlocks.status based on real activity.
-- Flow (only forward, never regress):
--   unlocked  → contacted  (provider sends a message on the lead)
--   contacted → quoted     (provider submits a quote on the lead)
--   quoted    → won        (a booking exists with this provider on the lead)
-- Manual-only statuses: completed, lost, customer_no_response, invalid.

create or replace function public._rank_unlock_status(s text)
returns int language sql immutable as $$
  select case s
    when 'unlocked'  then 1
    when 'contacted' then 2
    when 'quoted'    then 3
    when 'won'       then 4
    else 0  -- terminal/manual statuses (lost, invalid, no_response, completed)
  end
$$;

-- Bump status forward if the new rank is higher than the current rank
-- AND the current status is not a manual/terminal one (rank = 0 but not unlocked).
create or replace function public._bump_unlock_status(_lead uuid, _provider uuid, _new text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.provider_lead_unlocks
     set status = _new
   where lead_id = _lead
     and provider_id = _provider
     and status in ('unlocked','contacted','quoted')           -- never overwrite won/lost/etc.
     and public._rank_unlock_status(_new) > public._rank_unlock_status(status);
end $$;

-- Message → contacted
create or replace function public._unlock_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only when a provider (not the customer) sends.
  if exists (
    select 1 from public.provider_lead_unlocks u
     where u.lead_id = new.lead_id and u.provider_id = new.sender_id
  ) then
    perform public._bump_unlock_status(new.lead_id, new.sender_id, 'contacted');
  end if;
  return new;
end $$;

drop trigger if exists trg_unlock_on_message on public.messages;
create trigger trg_unlock_on_message
after insert on public.messages
for each row execute function public._unlock_on_message();

-- Quote → quoted
create or replace function public._unlock_on_quote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._bump_unlock_status(new.lead_id, new.provider_id, 'quoted');
  return new;
end $$;

drop trigger if exists trg_unlock_on_quote on public.quotes;
create trigger trg_unlock_on_quote
after insert on public.quotes
for each row execute function public._unlock_on_quote();

-- Booking → won
create or replace function public._unlock_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._bump_unlock_status(new.lead_id, new.provider_id, 'won');
  return new;
end $$;

drop trigger if exists trg_unlock_on_booking on public.bookings;
create trigger trg_unlock_on_booking
after insert on public.bookings
for each row execute function public._unlock_on_booking();

-- Backfill existing rows so current state reflects history.
update public.provider_lead_unlocks u
   set status = 'won'
  from public.bookings b
 where b.lead_id = u.lead_id
   and b.provider_id = u.provider_id
   and u.status in ('unlocked','contacted','quoted');

update public.provider_lead_unlocks u
   set status = 'quoted'
  from public.quotes q
 where q.lead_id = u.lead_id
   and q.provider_id = u.provider_id
   and u.status in ('unlocked','contacted');

update public.provider_lead_unlocks u
   set status = 'contacted'
  from public.messages m
 where m.lead_id = u.lead_id
   and m.sender_id = u.provider_id
   and u.status = 'unlocked';
