-- Ensure booking time confirmation columns exist (idempotent re-apply of 20260528000000).
alter table public.bookings
  add column if not exists time_confirmed_by_customer boolean not null default false,
  add column if not exists time_confirmed_by_provider boolean not null default false,
  add column if not exists time_proposed_by text check (time_proposed_by in ('customer','provider'));

notify pgrst, 'reload schema';
