alter table public.job_requests
  add column if not exists subcategory_slug text,
  add column if not exists category_answers jsonb default '{}'::jsonb,
  add column if not exists area text,
  add column if not exists preferred_date date,
  add column if not exists preferred_window text check (preferred_window in ('morning','afternoon','evening','any')),
  add column if not exists budget_range text,
  add column if not exists contact_phone text,
  add column if not exists video_urls text[] default '{}';

do $$ begin
  alter type public.job_status_t add value if not exists 'in_progress';
exception when others then null; end $$;
do $$ begin
  alter type public.job_status_t add value if not exists 'disputed';
exception when others then null; end $$;

alter table public.quotes
  add column if not exists price_type text default 'fixed' check (price_type in ('fixed','starting','hourly','inspection')),
  add column if not exists included text,
  add column if not exists not_included text,
  add column if not exists duration_min int,
  add column if not exists earliest_at timestamptz,
  add column if not exists warranty text,
  add column if not exists cancellation_policy text,
  add column if not exists expires_at timestamptz;

create table if not exists public.request_invitations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_requests(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending','quoted','declined','withdrawn')),
  created_at timestamptz default now(),
  unique (job_id, provider_id)
);
alter table public.request_invitations enable row level security;
drop policy if exists "invite participants read" on public.request_invitations;
create policy "invite participants read" on public.request_invitations
  for select to authenticated using (
    provider_id = auth.uid()
    or exists (select 1 from public.job_requests j where j.id = job_id and j.customer_id = auth.uid())
  );
drop policy if exists "customer creates invites" on public.request_invitations;
create policy "customer creates invites" on public.request_invitations
  for insert to authenticated with check (
    exists (select 1 from public.job_requests j where j.id = job_id and j.customer_id = auth.uid())
    and (select count(*) from public.request_invitations ri where ri.job_id = job_id) < 5
  );
drop policy if exists "provider updates own invite" on public.request_invitations;
create policy "provider updates own invite" on public.request_invitations
  for update to authenticated using (provider_id = auth.uid());

create index if not exists request_invitations_job_idx on public.request_invitations(job_id);
create index if not exists request_invitations_provider_idx on public.request_invitations(provider_id);

create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  city_slug text references public.cities(slug),
  township_id uuid references public.townships(id),
  area text,
  address text,
  landmark text,
  phone text,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table public.saved_addresses enable row level security;
drop policy if exists "saved_addr self read" on public.saved_addresses;
create policy "saved_addr self read" on public.saved_addresses
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "saved_addr self write" on public.saved_addresses;
create policy "saved_addr self write" on public.saved_addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
