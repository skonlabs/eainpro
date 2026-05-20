-- Many lead_pricing rows were seeded with is_active=false by the
-- 20260602 migration. Flip them on for every currently-active service_type
-- so the admin pricing table doesn't show most services as disabled.
update public.lead_pricing lp
set is_active = true, updated_at = now()
from public.service_types st
where lp.service_type_id = st.id
  and st.is_active = true
  and lp.is_active = false;
