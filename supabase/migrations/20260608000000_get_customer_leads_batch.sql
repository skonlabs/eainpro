-- Batch helper: get many customer_leads with the same authorization rules as
-- get_customer_lead. Avoids N+1 round trips when rendering provider unlocks.
create or replace function public.get_customer_leads(_lead_ids uuid[])
returns setof public.customer_leads
language sql security definer set search_path = public as $$
  select l.*
  from public.customer_leads l
  where l.id = any(_lead_ids)
    and (
      l.customer_id = auth.uid()
      or public.has_role(auth.uid(), 'admin')
      or exists (
        select 1 from public.provider_lead_unlocks u
        where u.lead_id = l.id and u.provider_id = auth.uid()
      )
    );
$$;

grant execute on function public.get_customer_leads(uuid[]) to authenticated;
