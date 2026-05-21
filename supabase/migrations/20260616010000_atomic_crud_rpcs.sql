-- Atomic RPCs replacing multi-step client flows.

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
  update public.customer_leads set status = 'booked' where id = v_lead.id and status <> 'booked';
  return v_booking;
end $$;
grant execute on function public.accept_quote(uuid) to authenticated;

create or replace function public.approve_unlock_refund(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_req public.unlock_refund_requests%rowtype;
  v_unlock public.provider_lead_unlocks%rowtype;
  v_remaining int;
  v_result jsonb;
begin
  if not public.has_role(v_admin, 'admin') then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  select * into v_req from public.unlock_refund_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'REQUEST_NOT_FOUND'); end if;
  if v_req.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'ALREADY_RESOLVED'); end if;
  select * into v_unlock from public.provider_lead_unlocks where id = v_req.unlock_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'UNLOCK_NOT_FOUND'); end if;
  v_remaining := v_unlock.unlock_price_credits - v_unlock.refunded_amount_credits;
  if v_remaining <= 0 then
    update public.unlock_refund_requests
      set status = 'approved', resolved_at = now()
      where id = p_request_id;
    return jsonb_build_object('ok', true, 'already_refunded', true);
  end if;

  v_result := public.refund_unlock(v_req.unlock_id, v_remaining, v_req.reason);
  if not (v_result->>'ok')::boolean then return v_result; end if;

  update public.unlock_refund_requests
    set status = 'approved', resolved_at = now()
    where id = p_request_id;
  return v_result || jsonb_build_object('amount', v_remaining);
end $$;
grant execute on function public.approve_unlock_refund(uuid) to authenticated;

create or replace function public.set_default_address(p_address_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.saved_addresses where id = p_address_id and user_id = v_uid) then
    raise exception 'ADDRESS_NOT_FOUND';
  end if;
  update public.saved_addresses
    set is_default = (id = p_address_id)
    where user_id = v_uid;
end $$;
grant execute on function public.set_default_address(uuid) to authenticated;
