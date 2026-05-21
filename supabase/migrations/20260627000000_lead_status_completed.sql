-- The booking->lead status mirror trigger (20260626) writes 'completed'
-- onto customer_leads.status, but the lead_status_t enum was originally
-- defined without that value. Add it so the trigger succeeds.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'lead_status_t' and e.enumlabel = 'completed'
  ) then
    alter type public.lead_status_t add value 'completed';
  end if;
end $$;
