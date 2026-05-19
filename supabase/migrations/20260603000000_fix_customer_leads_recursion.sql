-- Fix infinite recursion between customer_leads and provider_lead_unlocks RLS.
-- Cross-table EXISTS subqueries triggered each other's policies repeatedly.
-- Replace with SECURITY DEFINER helpers that bypass RLS on the inner lookup.

create or replace function public.lead_belongs_to_customer(_lead uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.customer_leads l where l.id = _lead and l.customer_id = _user);
$$;

create or replace function public.provider_has_unlocked_lead(_lead uuid, _provider uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.provider_lead_unlocks u where u.lead_id = _lead and u.provider_id = _provider);
$$;

drop policy if exists "providers read unlocked lead" on public.customer_leads;
create policy "providers read unlocked lead" on public.customer_leads
  for select to authenticated using (public.provider_has_unlocked_lead(id, auth.uid()));

drop policy if exists "unlocks customer read" on public.provider_lead_unlocks;
create policy "unlocks customer read" on public.provider_lead_unlocks
  for select to authenticated using (public.lead_belongs_to_customer(lead_id, auth.uid()));

drop policy if exists "lead_photos visible to lead readers" on public.lead_photos;
create policy "lead_photos visible to lead readers" on public.lead_photos
  for select to authenticated using (
    public.lead_belongs_to_customer(lead_id, auth.uid())
    or public.provider_has_unlocked_lead(lead_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "lead_photos customer write" on public.lead_photos;
create policy "lead_photos customer write" on public.lead_photos
  for all to authenticated using (public.lead_belongs_to_customer(lead_id, auth.uid()))
  with check (public.lead_belongs_to_customer(lead_id, auth.uid()));

grant execute on function public.lead_belongs_to_customer(uuid, uuid) to authenticated;
grant execute on function public.provider_has_unlocked_lead(uuid, uuid) to authenticated;
