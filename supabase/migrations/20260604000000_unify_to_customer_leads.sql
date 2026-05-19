-- =====================================================================
-- Unify everything onto customer_leads.
-- Drops job_requests + related tables. Re-creates quotes/bookings/messages
-- keyed off lead_id. Test data on those tables is wiped (user accepted).
-- Apply manually in the Supabase SQL editor.
-- =====================================================================

-- 1) Drop policies and tables that depend on job_requests --------------
drop policy if exists "providers read matching open jobs" on public.job_requests;
drop policy if exists "customer reads own jobs" on public.job_requests;
drop policy if exists "customer writes own jobs" on public.job_requests;
drop policy if exists "customer updates own jobs" on public.job_requests;
drop policy if exists "admins manage jobs" on public.job_requests;

drop table if exists public.reviews cascade;
drop table if exists public.bookings cascade;
drop table if exists public.quotes cascade;
drop table if exists public.messages cascade;
drop table if exists public.request_invitations cascade;
drop table if exists public.job_photos cascade;
drop table if exists public.reports cascade;
drop table if exists public.job_requests cascade;

-- 2) Re-create quotes keyed off customer_leads -------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  notes text,
  eta_text text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique (lead_id, provider_id)
);
create index quotes_lead_idx on public.quotes(lead_id);
create index quotes_provider_idx on public.quotes(provider_id, created_at desc);
alter table public.quotes enable row level security;

create policy "provider inserts quote on unlocked lead" on public.quotes
  for insert to authenticated with check (
    provider_id = auth.uid()
    and exists (
      select 1 from public.provider_lead_unlocks u
      where u.lead_id = quotes.lead_id and u.provider_id = auth.uid()
    )
  );
create policy "provider updates own quote" on public.quotes
  for update to authenticated using (provider_id = auth.uid())
  with check (provider_id = auth.uid());
create policy "quote participants read" on public.quotes
  for select to authenticated using (
    provider_id = auth.uid()
    or exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
    or public.has_role(auth.uid(),'admin')
  );
create policy "customer updates quote status" on public.quotes
  for update to authenticated using (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
  );
create policy "admins manage quotes" on public.quotes
  for all to authenticated using (public.has_role(auth.uid(),'admin'));

-- 3) Re-create bookings keyed off lead_id ------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  scheduled_at timestamptz,
  customer_phone text,
  payment_method public.payment_method_t not null default 'cash',
  amount numeric(12,2),
  status text not null default 'accepted'
    check (status in ('accepted','on_the_way','started','in_progress','completed','cancelled')),
  provider_confirmed_at timestamptz,
  customer_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lead_id, provider_id)
);
create index bookings_lead_idx on public.bookings(lead_id);
create index bookings_provider_idx on public.bookings(provider_id, scheduled_at);
create index bookings_customer_idx on public.bookings(customer_id, created_at desc);
alter table public.bookings enable row level security;

create policy "booking participants read" on public.bookings
  for select to authenticated using (customer_id = auth.uid() or provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "customer inserts booking" on public.bookings
  for insert to authenticated with check (
    customer_id = auth.uid()
    and exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
  );
create policy "booking participants update" on public.bookings
  for update to authenticated using (customer_id = auth.uid() or provider_id = auth.uid());
create policy "admins manage bookings" on public.bookings
  for all to authenticated using (public.has_role(auth.uid(),'admin'));

-- 4) Re-create messages keyed off lead_id ------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_lead_idx on public.messages(lead_id, created_at);
create index messages_recipient_idx on public.messages(recipient_id, created_at desc);
alter table public.messages enable row level security;

create policy "lead participants read messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.customer_leads l
      where l.id = lead_id and (
        l.customer_id = auth.uid()
        or exists (select 1 from public.provider_lead_unlocks u where u.lead_id = l.id and u.provider_id = auth.uid())
      )
    )
    or public.has_role(auth.uid(),'admin')
  );
create policy "lead participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.customer_leads l
      where l.id = lead_id and (
        l.customer_id = auth.uid()
        or exists (select 1 from public.provider_lead_unlocks u where u.lead_id = l.id and u.provider_id = auth.uid())
      )
    )
  );

-- 5) Re-create reviews tied to bookings --------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (true);
create policy "customer writes own review" on public.reviews
  for insert to authenticated with check (
    customer_id = auth.uid()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed')
  );

-- 6) Re-create reports referencing customer_leads ----------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references public.customer_leads(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reporter reads own" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "reporter writes" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins manage reports" on public.reports
  for all to authenticated using (public.has_role(auth.uid(),'admin'));

-- 7) Seed default lead_pricing for every service_type lacking one -----
insert into public.lead_pricing (service_type_id, price_credits, max_provider_unlocks, is_active)
select st.id, 500, 5, true
  from public.service_types st
  left join public.lead_pricing lp on lp.service_type_id = st.id
  where lp.id is null;

-- 8) Helper: get_customer_lead returns the full row for authorized readers
create or replace function public.get_customer_lead(_lead_id uuid)
returns public.customer_leads
language plpgsql security definer set search_path = public as $$
declare
  v public.customer_leads%rowtype;
begin
  select * into v from public.customer_leads where id = _lead_id;
  if not found then return null; end if;
  if v.customer_id = auth.uid() then return v; end if;
  if public.has_role(auth.uid(),'admin') then return v; end if;
  if exists (select 1 from public.provider_lead_unlocks u where u.lead_id = _lead_id and u.provider_id = auth.uid()) then
    return v;
  end if;
  return null;
end $$;

grant execute on function public.get_customer_lead(uuid) to authenticated;
