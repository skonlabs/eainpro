-- Extend get_admin_revenue() to also return a list of recent unlocks with
-- provider business name and customer full name so the Revenue tab can show
-- per-transaction context (who paid, which provider unlocked).

create or replace function public.get_admin_revenue()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_by_service     jsonb;
  v_daily          jsonb;
  v_totals         jsonb;
  v_recent_unlocks jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'unlock_id',       unlock_id,
      'unlocked_at',     unlocked_at,
      'service_name_en', service_name_en,
      'category_slug',   category_slug,
      'slug',            slug,
      'provider_id',     provider_id,
      'provider_name',   provider_name,
      'customer_id',     customer_id,
      'customer_name',   customer_name,
      'gross_credits',   gross_credits,
      'refunded_credits',refunded_credits,
      'net_credits',     net_credits
    ) order by unlocked_at desc
  ), '[]'::jsonb) into v_recent_unlocks
  from (
    select u.id as unlock_id,
           u.unlocked_at,
           st.name_en as service_name_en,
           st.category_slug,
           st.slug,
           u.provider_id,
           coalesce(pr.business_name, pp.full_name, '—') as provider_name,
           l.customer_id,
           coalesce(cp.full_name, '—') as customer_name,
           coalesce(u.unlock_price_credits, 0) as gross_credits,
           coalesce(u.refunded_amount_credits, 0) as refunded_credits,
           coalesce(u.unlock_price_credits - u.refunded_amount_credits, 0) as net_credits
    from public.provider_lead_unlocks u
    left join public.customer_leads l on l.id = u.lead_id
    left join public.service_types  st on st.id = l.service_type_id
    left join public.providers      pr on pr.id = u.provider_id
    left join public.profiles       pp on pp.id = u.provider_id
    left join public.profiles       cp on cp.id = l.customer_id
    order by u.unlocked_at desc nulls last
    limit 100
  ) r;

  return jsonb_build_object(
    'totals',         v_totals,
    'by_service',     v_by_service,
    'daily',          v_daily,
    'recent_unlocks', v_recent_unlocks
  );
end $$;

revoke all    on function public.get_admin_revenue() from public;
grant execute on function public.get_admin_revenue() to authenticated;
