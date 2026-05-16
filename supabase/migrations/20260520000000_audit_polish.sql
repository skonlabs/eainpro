-- Phase 5 audit polish: dedupe review policy, enforce bookings.amount, reschedule column

drop policy if exists "customers can insert reviews" on public.reviews;
drop policy if exists "customer writes own review" on public.reviews;
create policy "customer writes own review" on public.reviews
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );

update public.bookings set amount = 0 where amount is null;
alter table public.bookings alter column amount set not null;

alter table public.bookings
  add column if not exists rescheduled_at timestamptz;

alter table public.favorites
  add column if not exists created_at timestamptz not null default now();
