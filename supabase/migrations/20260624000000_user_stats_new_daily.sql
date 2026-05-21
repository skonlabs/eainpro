-- Extend get_admin_user_stats to also return a daily new-users series
create or replace function public.get_admin_user_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'utc')::date; result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin only';
  end if;
  with role_map as (
    select user_id,
      bool_or(role = 'customer') as is_customer,
      bool_or(role = 'provider') as is_provider
    from public.user_roles group by user_id
  ),
  days as (
    select generate_series(today - interval '29 days', today, interval '1 day')::date as day
  ),
  daily_active as (
    select a.day,
      count(*) filter (where rm.is_customer) as customers,
      count(*) filter (where rm.is_provider) as providers
    from public.user_activity a
    left join role_map rm on rm.user_id = a.user_id
    where a.day >= today - interval '60 days'
    group by a.day
  ),
  dau_buckets as (
    select
      coalesce(avg(customers) filter (where day >  today - interval '7 days'),0)::numeric as cust_w0,
      coalesce(avg(customers) filter (where day <= today - interval '7 days' and day > today - interval '14 days'),0)::numeric as cust_w1,
      coalesce(avg(providers) filter (where day >  today - interval '7 days'),0)::numeric as prov_w0,
      coalesce(avg(providers) filter (where day <= today - interval '7 days' and day > today - interval '14 days'),0)::numeric as prov_w1,
      coalesce(avg(customers) filter (where day >  today - interval '30 days'),0)::numeric as cust_m0,
      coalesce(avg(customers) filter (where day <= today - interval '30 days' and day > today - interval '60 days'),0)::numeric as cust_m1,
      coalesce(avg(providers) filter (where day >  today - interval '30 days'),0)::numeric as prov_m0,
      coalesce(avg(providers) filter (where day <= today - interval '30 days' and day > today - interval '60 days'),0)::numeric as prov_m1
    from daily_active
  ),
  new_users as (
    select p.id, p.created_at, rm.is_customer, rm.is_provider,
           (p.created_at at time zone 'utc')::date as day
    from public.profiles p
    left join role_map rm on rm.user_id = p.id
    where p.created_at >= (today - interval '60 days')::timestamptz
  ),
  new_daily as (
    select day,
      count(*) filter (where is_customer) as customers,
      count(*) filter (where is_provider) as providers
    from new_users
    group by day
  ),
  new_buckets as (
    select
      count(*) filter (where is_customer and created_at >  (today - interval '7 days')::timestamptz) as cust_w0,
      count(*) filter (where is_customer and created_at <= (today - interval '7 days')::timestamptz and created_at > (today - interval '14 days')::timestamptz) as cust_w1,
      count(*) filter (where is_provider and created_at >  (today - interval '7 days')::timestamptz) as prov_w0,
      count(*) filter (where is_provider and created_at <= (today - interval '7 days')::timestamptz and created_at > (today - interval '14 days')::timestamptz) as prov_w1,
      count(*) filter (where is_customer and created_at >  (today - interval '30 days')::timestamptz) as cust_m0,
      count(*) filter (where is_customer and created_at <= (today - interval '30 days')::timestamptz and created_at > (today - interval '60 days')::timestamptz) as cust_m1,
      count(*) filter (where is_provider and created_at >  (today - interval '30 days')::timestamptz) as prov_m0,
      count(*) filter (where is_provider and created_at <= (today - interval '30 days')::timestamptz and created_at > (today - interval '60 days')::timestamptz) as prov_m1
    from new_users
  ),
  totals as (
    select
      count(*) filter (where rm.is_customer) as total_customers,
      count(*) filter (where rm.is_provider) as total_providers
    from public.profiles p
    left join role_map rm on rm.user_id = p.id
  ),
  dau_series as (
    select jsonb_agg(jsonb_build_object(
      'day', to_char(d.day,'YYYY-MM-DD'),
      'customers', coalesce(da.customers, 0),
      'providers', coalesce(da.providers, 0)
    ) order by d.day) as rows
    from days d left join daily_active da on da.day = d.day
  ),
  new_series as (
    select jsonb_agg(jsonb_build_object(
      'day', to_char(d.day,'YYYY-MM-DD'),
      'customers', coalesce(nd.customers, 0),
      'providers', coalesce(nd.providers, 0)
    ) order by d.day) as rows
    from days d left join new_daily nd on nd.day = d.day
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'customers', (select total_customers from totals),
      'providers', (select total_providers from totals)
    ),
    'dau', jsonb_build_object(
      'customers', jsonb_build_object(
        'last_7',  round((select cust_w0 from dau_buckets),2),
        'prev_7',  round((select cust_w1 from dau_buckets),2),
        'last_30', round((select cust_m0 from dau_buckets),2),
        'prev_30', round((select cust_m1 from dau_buckets),2)
      ),
      'providers', jsonb_build_object(
        'last_7',  round((select prov_w0 from dau_buckets),2),
        'prev_7',  round((select prov_w1 from dau_buckets),2),
        'last_30', round((select prov_m0 from dau_buckets),2),
        'prev_30', round((select prov_m1 from dau_buckets),2)
      )
    ),
    'new_users', jsonb_build_object(
      'customers', jsonb_build_object(
        'last_7',  (select cust_w0 from new_buckets),
        'prev_7',  (select cust_w1 from new_buckets),
        'last_30', (select cust_m0 from new_buckets),
        'prev_30', (select cust_m1 from new_buckets)
      ),
      'providers', jsonb_build_object(
        'last_7',  (select prov_w0 from new_buckets),
        'prev_7',  (select prov_w1 from new_buckets),
        'last_30', (select prov_m0 from new_buckets),
        'prev_30', (select prov_m1 from new_buckets)
      )
    ),
    'daily', coalesce((select rows from dau_series),'[]'::jsonb),
    'new_daily', coalesce((select rows from new_series),'[]'::jsonb)
  ) into result;
  return result;
end $$;
