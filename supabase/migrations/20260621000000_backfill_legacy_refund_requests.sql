with legacy_refund_requests as (
  select
    lr.unlock_id,
    u.provider_id,
    u.lead_id,
    coalesce(
      string_agg(distinct nullif(trim(lr.reason), ''), ' | ' order by nullif(trim(lr.reason), '')),
      'Legacy refund'
    ) as reason,
    min(lr.created_at) as created_at,
    max(lr.created_at) as resolved_at,
    (array_agg(lr.approved_by order by lr.created_at desc) filter (where lr.approved_by is not null))[1] as resolved_by
  from public.lead_refunds lr
  join public.provider_lead_unlocks u on u.id = lr.unlock_id
  group by lr.unlock_id, u.provider_id, u.lead_id
)
insert into public.unlock_refund_requests (
  id,
  unlock_id,
  provider_id,
  lead_id,
  reason,
  status,
  resolution_note,
  resolved_at,
  resolved_by,
  created_at
)
select
  gen_random_uuid(),
  legacy.unlock_id,
  legacy.provider_id,
  legacy.lead_id,
  legacy.reason,
  'approved',
  'Backfilled from legacy lead_refunds',
  legacy.resolved_at,
  legacy.resolved_by,
  legacy.created_at
from legacy_refund_requests legacy
where not exists (
  select 1
  from public.unlock_refund_requests urr
  where urr.unlock_id = legacy.unlock_id
);
