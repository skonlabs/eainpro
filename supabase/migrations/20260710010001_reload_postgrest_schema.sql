-- Ensure column exists and force PostgREST to reload its schema cache
alter table public.bookings add column if not exists cancelled_at timestamptz;
notify pgrst, 'reload schema';
