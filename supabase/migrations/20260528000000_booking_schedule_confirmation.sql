-- 1) Providers must be able to read job_requests they have a quote or booking on,
--    not only open/quoted jobs. Without this, the request detail page hangs
--    after a booking is created because the job row becomes invisible.
drop policy if exists "providers read jobs with quote or booking" on public.job_requests;
create policy "providers read jobs with quote or booking" on public.job_requests
  for select to authenticated using (
    exists (select 1 from public.quotes q where q.job_id = job_requests.id and q.provider_id = auth.uid())
    or exists (select 1 from public.bookings b where b.job_id = job_requests.id and b.provider_id = auth.uid())
  );

-- 2) Booking time confirmation flow: track who proposed and whether each side
--    has agreed. The booking is only fully scheduled when both flags are true.
alter table public.bookings
  add column if not exists time_confirmed_by_customer boolean not null default false,
  add column if not exists time_confirmed_by_provider boolean not null default false,
  add column if not exists time_proposed_by text check (time_proposed_by in ('customer','provider'));
