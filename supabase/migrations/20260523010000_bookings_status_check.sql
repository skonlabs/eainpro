-- Defensive: ensure bookings.status accepts every value the app writes.
-- The original bookings table may have a legacy CHECK constraint that omits
-- 'on_the_way', 'started', or 'in_progress'. Drop any existing check on
-- status and re-create it with the full allowed set.
do $$
declare _con text;
begin
  for _con in
    select conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'bookings'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.bookings drop constraint %I', _con);
  end loop;
end $$;

alter table public.bookings
  add constraint bookings_status_check
  check (status in (
    'pending','accepted','on_the_way','started','in_progress','completed','cancelled'
  ));
