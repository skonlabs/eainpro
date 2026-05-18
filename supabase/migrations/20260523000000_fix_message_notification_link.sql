-- Fix: message notification link used ?tab=chat which is not a valid tab.
-- Valid tabs in /request/$jobId are: details | providers | quotes | messages | booking.
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
          '/request/' || new.job_id::text || '?tab=messages');
  return new;
end $$;
