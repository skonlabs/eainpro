-- Scope provider rating stats and customer insert policy to customer-rated reviews only.
-- Without this, provider->customer ratings inflate the provider's public rating_avg,
-- and a customer could insert a row with rated_by='provider'.

create or replace function public.recompute_provider_stats(_provider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.providers p set
    rating_avg = coalesce(
      (select round(avg(rating)::numeric, 2)
         from public.reviews
        where provider_id = _provider_id
          and rated_by = 'customer'), 0),
    rating_count = coalesce(
      (select count(*)
         from public.reviews
        where provider_id = _provider_id
          and rated_by = 'customer'), 0),
    jobs_completed = coalesce(
      (select count(*)
         from public.bookings
        where provider_id = _provider_id
          and status = 'completed'), 0)
  where p.id = _provider_id;
end $$;

-- Backfill stats for any providers whose averages were polluted.
do $$
declare r record;
begin
  for r in select distinct provider_id from public.reviews where provider_id is not null loop
    perform public.recompute_provider_stats(r.provider_id);
  end loop;
end $$;

drop policy if exists "customer writes own review" on public.reviews;
create policy "customer writes own review" on public.reviews
  for insert to authenticated with check (
    rated_by = 'customer'
    and customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );
