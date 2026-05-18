-- Allow the job's customer to create a booking from a matching quote.
drop policy if exists "customer creates booking" on public.bookings;
create policy "customer creates booking" on public.bookings
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.job_requests j
      where j.id = job_id and j.customer_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1 from public.quotes q
        where q.id = quote_id
          and q.job_id = bookings.job_id
          and q.provider_id = bookings.provider_id
      )
    )
  );
