alter table public.bookings add column if not exists cancel_reason text;
notify pgrst, 'reload schema';
