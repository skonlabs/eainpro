-- Admin overview stats RPC.
-- The previous client-side aggregation produced wrong totals because:
--   * supabase-js caps .select() at 1000 rows by default, so summing
--     unlock_price_credits client-side silently truncated.
--   * The lead_revenue_by_service view joins
--     service_types -> customer_leads -> provider_lead_unlocks, so any
--     unlock whose lead or service_type row is missing/hidden falls out
--     of the sum even though count(*) on the unlocks table itself is
--     larger.
-- This RPC reads each counter straight from its source table.

create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_leads          bigint;
  v_unlocks        bigint;
  v_net_revenue    bigint;
  v_pending_topups bigint;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  select count(*) into v_leads          from public.customer_leads;
  select count(*) into v_unlocks        from public.provider_lead_unlocks;
  select coalesce(sum(unlock_price_credits - refunded_amount_credits), 0)
    into v_net_revenue                  from public.provider_lead_unlocks;
  select count(*) into v_pending_topups from public.provider_credit_topups
    where status = 'pending';

  return jsonb_build_object(
    'leads',          v_leads,
    'unlocks',        v_unlocks,
    'net_revenue',    v_net_revenue,
    'pending_topups', v_pending_topups
  );
end $$;

revoke all    on function public.get_admin_overview() from public;
grant execute on function public.get_admin_overview() to authenticated;
