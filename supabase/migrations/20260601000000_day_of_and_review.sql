-- Day-of UX + close-the-loop review enhancements
-- 1) Add report fields to reviews
-- 2) Improve notification copy for booking status transitions
alter table public.reviews
  add column if not exists reported boolean default false,
  add column if not exists report_reason text;

create or replace function public.on_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare _link text; _status_title text; _status_body text;
begin
  _link := '/request/' || new.job_id::text || '?tab=booking';
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
    values (new.provider_id, 'quote_accepted', 'Your quote was accepted',
            'You have a new booking. Propose a visit time to lock it in.', new.job_id, new.id, _link);
    insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
    values (new.customer_id, 'booking_confirmed', 'Booking confirmed',
            'The provider has been notified. They will propose a visit time shortly.', new.job_id, new.id, _link);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'completed' then
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'review_requested', 'Service completed',
              'How did it go? Leave a quick review and add photos if you like.', new.job_id, new.id, _link);
    elsif new.status = 'cancelled' then
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'booking_cancelled', 'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.job_id, new.id, _link);
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.provider_id, 'booking_cancelled', 'Booking cancelled',
              coalesce(new.cancel_reason, 'Booking was cancelled.'), new.job_id, new.id, _link);
    else
      if new.status = 'on_the_way' then
        _status_title := 'Provider is on the way';
        _status_body  := 'They are heading to your address now.';
      elsif new.status = 'started' or new.status = 'in_progress' then
        _status_title := 'Work has started';
        _status_body  := 'Your provider has started the job.';
      else
        _status_title := 'Booking status updated';
        _status_body  := new.status;
      end if;
      insert into public.notifications(user_id, kind, title, body, job_id, booking_id, link)
      values (new.customer_id, 'status_changed', _status_title, _status_body, new.job_id, new.id, _link);
    end if;
  end if;
  return new;
end $$;
