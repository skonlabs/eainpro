-- Re-apply the security-definer recursion fix in case prior migration was skipped.

create or replace function public.lead_belongs_to_customer(_lead uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.customer_leads l where l.id = _lead and l.customer_id = _user);
$$;

create or replace function public.provider_has_unlocked_lead(_lead uuid, _provider uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.provider_lead_unlocks u where u.lead_id = _lead and u.provider_id = _provider);
$$;

grant execute on function public.lead_belongs_to_customer(uuid, uuid) to authenticated;
grant execute on function public.provider_has_unlocked_lead(uuid, uuid) to authenticated;

-- customer_leads: replace recursive SELECT policy
drop policy if exists "providers read unlocked lead" on public.customer_leads;
create policy "providers read unlocked lead" on public.customer_leads
  for select to authenticated using (public.provider_has_unlocked_lead(id, auth.uid()));

-- provider_lead_unlocks: replace recursive SELECT policy
drop policy if exists "unlocks customer read" on public.provider_lead_unlocks;
create policy "unlocks customer read" on public.provider_lead_unlocks
  for select to authenticated using (public.lead_belongs_to_customer(lead_id, auth.uid()));

-- quotes: avoid inline EXISTS on customer_leads
drop policy if exists "quote participants read" on public.quotes;
create policy "quote participants read" on public.quotes
  for select to authenticated using (
    provider_id = auth.uid()
    or public.lead_belongs_to_customer(lead_id, auth.uid())
    or public.has_role(auth.uid(),'admin')
  );

drop policy if exists "customer updates quote status" on public.quotes;
create policy "customer updates quote status" on public.quotes
  for update to authenticated using (public.lead_belongs_to_customer(lead_id, auth.uid()));

drop policy if exists "provider inserts quote on unlocked lead" on public.quotes;
create policy "provider inserts quote on unlocked lead" on public.quotes
  for insert to authenticated with check (
    provider_id = auth.uid() and public.provider_has_unlocked_lead(lead_id, auth.uid())
  );

-- messages: avoid inline EXISTS on customer_leads
drop policy if exists "lead participants read messages" on public.messages;
create policy "lead participants read messages" on public.messages
  for select to authenticated using (
    public.lead_belongs_to_customer(lead_id, auth.uid())
    or public.provider_has_unlocked_lead(lead_id, auth.uid())
    or public.has_role(auth.uid(),'admin')
  );

drop policy if exists "lead participants send messages" on public.messages;
create policy "lead participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and (
      public.lead_belongs_to_customer(lead_id, auth.uid())
      or public.provider_has_unlocked_lead(lead_id, auth.uid())
    )
  );

-- bookings insert: avoid inline EXISTS on customer_leads
drop policy if exists "customer inserts booking" on public.bookings;
create policy "customer inserts booking" on public.bookings
  for insert to authenticated with check (
    customer_id = auth.uid() and public.lead_belongs_to_customer(lead_id, auth.uid())
  );
