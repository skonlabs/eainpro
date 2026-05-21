-- Allow customers to cancel their own lead and notify any provider that
-- already unlocked it. Plain UPDATE from the client fails silently under
-- RLS (no update policy for customers), so this RPC owns the transition.

create or replace function public.cancel_customer_lead(p_lead_id uuid)
returns public.customer_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.customer_leads;
  v_uid uuid := auth.uid();
  v_short text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_lead from public.customer_leads where id = p_lead_id for update;
  if not found then
    raise exception 'LEAD_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_lead.customer_id <> v_uid then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  if v_lead.status in ('cancelled','closed','expired') then
    return v_lead;
  end if;

  if exists (select 1 from public.bookings b where b.lead_id = p_lead_id and b.status not in ('cancelled')) then
    raise exception 'HAS_ACTIVE_BOOKING' using errcode = '22023';
  end if;

  update public.customer_leads
     set status = 'cancelled'::public.lead_status_t,
         updated_at = now()
   where id = p_lead_id
   returning * into v_lead;

  v_short := coalesce(nullif(left(v_lead.short_description, 60), ''), 'their request');

  insert into public.notifications(user_id, kind, title, body, link)
  select distinct u.provider_id,
         'status_changed',
         'Customer cancelled a lead',
         'The customer cancelled "' || v_short || '". No further action needed.',
         '/provider/leads'
    from public.provider_lead_unlocks u
   where u.lead_id = p_lead_id;

  return v_lead;
end;
$$;

revoke all on function public.cancel_customer_lead(uuid) from public;
grant execute on function public.cancel_customer_lead(uuid) to authenticated;
