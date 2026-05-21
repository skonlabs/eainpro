-- Fix accept_quote: use 'fully_booked' (valid enum value) instead of 'booked'.
create or replace function public.accept_quote(p_quote_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.quotes%rowtype;
  v_lead public.customer_leads%rowtype;
  v_booking public.bookings%rowtype;
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

  update public.quotes set status = 'accepted' where id = v_quote.id and status <> 'accepted';
  update public.customer_leads set status = 'fully_booked'
    where id = v_lead.id and status <> 'fully_booked';
  return v_booking;
end $$;
grant execute on function public.accept_quote(uuid) to authenticated;
