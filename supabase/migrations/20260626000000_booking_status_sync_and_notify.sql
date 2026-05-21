-- When a booking transitions to completed/cancelled, mirror that onto the
-- parent customer_lead (customers/providers cannot UPDATE customer_leads
-- directly because of RLS) and emit a status_changed notification to the
-- other participant. Also notify on any other booking status change so the
-- other side gets a bell ping.

create or replace function public.on_booking_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_title text;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if new.status is not distinct from old.status then return new; end if;

  -- Mirror terminal states onto the parent lead so list views stay accurate.
  if new.status in ('completed','cancelled') then
    update public.customer_leads
       set status = new.status,
           updated_at = now()
     where id = new.lead_id
       and status not in ('completed','cancelled','closed','expired');
  end if;

  if v_actor = new.customer_id then
    v_recipient := new.provider_id;
  elsif v_actor = new.provider_id then
    v_recipient := new.customer_id;
  else
    insert into public.notifications(user_id, kind, title, body, link)
      values
        (new.customer_id, 'status_changed',
         'Booking ' || new.status,
         'Your booking status is now ' || new.status || '.',
         '/request/' || new.lead_id),
        (new.provider_id, 'status_changed',
         'Booking ' || new.status,
         'A booking status is now ' || new.status || '.',
         '/request/' || new.lead_id);
    return new;
  end if;

  v_title := case new.status
    when 'completed' then 'Job marked completed'
    when 'cancelled' then 'Booking cancelled'
    when 'on_the_way' then 'Provider is on the way'
    when 'started' then 'Job started'
    when 'in_progress' then 'Job in progress'
    else 'Booking ' || new.status
  end;

  insert into public.notifications(user_id, kind, title, body, link)
    values (v_recipient, 'status_changed', v_title,
            'Open the request to see details.',
            '/request/' || new.lead_id);

  return new;
end $$;

drop trigger if exists trg_booking_status_notify on public.bookings;
create trigger trg_booking_status_notify
  after update on public.bookings
  for each row execute function public.on_booking_status_notify();
