-- User activity tracking + admin user stats RPC
create table if not exists public.user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
create index if not exists user_activity_day_idx on public.user_activity (day);
alter table public.user_activity enable row level security;
drop policy if exists "user_activity self read" on public.user_activity;
create policy "user_activity self read" on public.user_activity
  for select to authenticated using (user_id = auth.uid());

create or replace function public.log_user_activity()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  insert into public.user_activity (user_id, day)
  values (uid, (now() at time zone 'utc')::date)
  on conflict do nothing;
end $$;
revoke all on function public.log_user_activity() from public;
grant execute on function public.log_user_activity() to authenticated;

insert into public.user_activity (user_id, day)
select u.id, (u.last_sign_in_at at time zone 'utc')::date
from auth.users u where u.last_sign_in_at is not null
on conflict do nothing;

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
  daily as (
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
    from daily
  ),
  new_users as (
    select p.id, p.created_at, rm.is_customer, rm.is_provider
    from public.profiles p
    left join role_map rm on rm.user_id = p.id
    where p.created_at >= (today - interval '60 days')::timestamptz
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
  series as (
    select jsonb_agg(jsonb_build_object(
      'day', to_char(day,'YYYY-MM-DD'),
      'customers', customers, 'providers', providers
    ) order by day) as rows
    from daily where day > today - interval '30 days'
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
    'daily', coalesce((select rows from series),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.get_admin_user_stats() from public;
grant execute on function public.get_admin_user_stats() to authenticated;
