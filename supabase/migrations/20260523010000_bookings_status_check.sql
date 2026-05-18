-- bookings.status is the enum public.job_status_t. Ensure every value the
-- app writes exists in the enum. ALTER TYPE ... ADD VALUE must run outside
-- a transaction block in older Postgres, but Supabase migrations wrap each
-- file in a transaction; 'IF NOT EXISTS' makes this safe and idempotent on
-- PG12+.
alter type public.job_status_t add value if not exists 'pending';
alter type public.job_status_t add value if not exists 'accepted';
alter type public.job_status_t add value if not exists 'on_the_way';
alter type public.job_status_t add value if not exists 'started';
alter type public.job_status_t add value if not exists 'in_progress';
alter type public.job_status_t add value if not exists 'completed';
alter type public.job_status_t add value if not exists 'cancelled';
