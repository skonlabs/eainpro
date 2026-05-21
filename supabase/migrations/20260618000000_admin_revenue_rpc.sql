-- Admin revenue RPC. Replaces the client-side aggregation in RevenueTab that
-- was capped at 1000 rows by supabase-js's default .select() limit, so the
-- "Net revenue" total there could disagree with the Overview RPC once unlocks
-- exceeded 1000. Reads straight from provider_lead_unlocks, joined out to
-- service_types for grouping. SECURITY DEFINER + admin role check.

create or replace function public.get_admin_revenue()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_by_service jsonb;
  v_daily      jsonb;
  v_totals     jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'service_type_id', service_type_id,
      'name_en',         name_en,
      'slug',            slug,
      'category_slug',   category_slug,
      'unlocks_count',   unlocks_count,
      'gross_credits',   gross_credits,
      'refunded_credits',refunded_credits,
      'net_credits',     net_credits
    ) order by net_credits desc nulls last
  ), '[]'::jsonb) into v_by_service
  from (
    select st.id as service_type_id, st.name_en, st.slug, st.category_slug,
           count(u.id) as unlocks_count,
           coalesce(sum(u.unlock_price_credits), 0) as gross_credits,
           coalesce(sum(u.refunded_amount_credits), 0) as refunded_credits,
           coalesce(sum(u.unlock_price_credits - u.refunded_amount_credits), 0) as net_credits
    from public.provider_lead_unlocks u
    left join public.customer_leads l on l.id = u.lead_id
    left join public.service_types st on st.id = l.service_type_id
    group by st.id, st.name_en, st.slug, st.category_slug
  ) s;

  select coalesce(jsonb_agg(
    jsonb_build_object('day', day, 'unlocks_count', unlocks_count, 'net_credits', net_credits)
    order by day desc
  ), '[]'::jsonb) into v_daily
  from (
    select date_trunc('day', unlocked_at)::date as day,
           count(*) as unlocks_count,
           coalesce(sum(unlock_price_credits - refunded_amount_credits), 0) as net_credits
    from public.provider_lead_unlocks
    where unlocked_at >= now() - interval '30 days'
    group by 1
  ) d;

  select jsonb_build_object(
    'unlocks',  count(*),
    'gross',    coalesce(sum(unlock_price_credits), 0),
    'refunded', coalesce(sum(refunded_amount_credits), 0),
    'net',      coalesce(sum(unlock_price_credits - refunded_amount_credits), 0)
  ) into v_totals
  from public.provider_lead_unlocks;

  return jsonb_build_object('totals', v_totals, 'by_service', v_by_service, 'daily', v_daily);
end $$;

revoke all    on function public.get_admin_revenue() from public;
grant execute on function public.get_admin_revenue() to authenticated;
