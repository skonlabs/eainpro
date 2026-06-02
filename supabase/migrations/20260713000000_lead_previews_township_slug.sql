-- Expose township_slug on lead_previews so providers can see township + city
-- on locked lead cards.
drop view if exists public.lead_previews;
create view public.lead_previews
with (security_invoker = on) as
select
  l.id,
  l.service_type_id,
  st.category_slug,
  st.slug as service_slug,
  st.name_en as service_name_en,
  st.name_my as service_name_my,
  l.city_slug,
  l.township_id,
  l.township_slug,
  l.urgency,
  l.preferred_date,
  l.preferred_time,
  l.short_description,
  l.budget_min,
  l.budget_max,
  l.lead_price_credits,
  l.max_provider_unlocks,
  l.current_unlock_count,
  l.status,
  l.expires_at,
  l.created_at,
  l.directed_provider_id,
  (l.directed_provider_id is not null) as is_direct,
  (select count(*)::int from public.lead_photos p where p.lead_id = l.id) as photo_count
from public.customer_leads l
join public.service_types st on st.id = l.service_type_id;
grant select on public.lead_previews to anon, authenticated;
