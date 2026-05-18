-- Fix infinite recursion: the previous "providers read jobs with quote or booking"
-- policy queried public.quotes and public.bookings, whose own RLS policies
-- reference public.job_requests, causing a cycle. Wrap the lookups in
-- SECURITY DEFINER functions that bypass RLS on the inner reads.

create or replace function public.provider_has_quote_on_job(_job uuid, _provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.quotes
    where job_id = _job and provider_id = _provider
  )
$$;

create or replace function public.provider_has_booking_on_job(_job uuid, _provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings
    where job_id = _job and provider_id = _provider
  )
$$;

drop policy if exists "providers read jobs with quote or booking" on public.job_requests;
create policy "providers read jobs with quote or booking" on public.job_requests
  for select to authenticated using (
    public.provider_has_quote_on_job(id, auth.uid())
    or public.provider_has_booking_on_job(id, auth.uid())
  );
