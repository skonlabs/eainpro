-- =====================================================================
-- Fixido — Myanmar home services marketplace
-- Run this in the Supabase SQL editor for project pjgxzkjgxhfbcbbockyk.
-- Safe to re-run (uses IF NOT EXISTS / on conflict).
-- =====================================================================

-- 1) Roles -------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('customer','provider','admin');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- 2) Profiles ----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  preferred_language text default 'en' check (preferred_language in ('en','my')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles readable by self" on public.profiles;
create policy "profiles readable by self" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "profiles upsertable by self" on public.profiles;
create policy "profiles upsertable by self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles updatable by self" on public.profiles;
create policy "profiles updatable by self" on public.profiles
  for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Taxonomy ----------------------------------------------------------
create table if not exists public.categories (
  slug text primary key,
  name_en text not null,
  name_my text not null,
  parent_slug text references public.categories(slug),
  is_enabled boolean default true,
  sort_order int default 0
);
alter table public.categories enable row level security;
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);

create table if not exists public.cities (
  slug text primary key,
  name_en text not null,
  name_my text not null,
  is_enabled boolean default true
);
alter table public.cities enable row level security;
drop policy if exists "cities public read" on public.cities;
create policy "cities public read" on public.cities for select to anon, authenticated using (true);

create table if not exists public.townships (
  id uuid primary key default gen_random_uuid(),
  city_slug text references public.cities(slug) on delete cascade not null,
  name_en text not null,
  name_my text not null
);
alter table public.townships enable row level security;
drop policy if exists "townships public read" on public.townships;
create policy "townships public read" on public.townships for select to anon, authenticated using (true);

-- 4) Providers ---------------------------------------------------------
create table if not exists public.providers (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  business_type text check (business_type in ('individual','business')) default 'individual',
  bio text,
  years_experience int,
  languages text[] default array['en','my'],
  logo_url text,
  nrc_or_reg_doc_url text,
  is_verified boolean default false,
  is_suspended boolean default false,
  is_paused boolean default false,
  supports_urgent boolean default false,
  working_hours jsonb,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  jobs_completed int default 0,
  response_minutes int default 0,
  created_at timestamptz default now()
);
alter table public.providers enable row level security;
drop policy if exists "providers public read" on public.providers;
create policy "providers public read" on public.providers
  for select to anon, authenticated using (is_verified = true and is_suspended = false);
drop policy if exists "providers self read" on public.providers;
create policy "providers self read" on public.providers
  for select to authenticated using (id = auth.uid());
drop policy if exists "providers self upsert" on public.providers;
create policy "providers self upsert" on public.providers
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "providers self update" on public.providers;
create policy "providers self update" on public.providers
  for update to authenticated using (id = auth.uid());
drop policy if exists "admins manage providers" on public.providers;
create policy "admins manage providers" on public.providers
  for all to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.provider_services (
  provider_id uuid references public.providers(id) on delete cascade not null,
  category_slug text references public.categories(slug) on delete cascade not null,
  base_price numeric(12,2),
  primary key (provider_id, category_slug)
);
alter table public.provider_services enable row level security;
drop policy if exists "provider_services public read" on public.provider_services;
create policy "provider_services public read" on public.provider_services for select to anon, authenticated using (true);
drop policy if exists "provider_services self write" on public.provider_services;
create policy "provider_services self write" on public.provider_services
  for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create table if not exists public.provider_service_areas (
  provider_id uuid references public.providers(id) on delete cascade not null,
  city_slug text references public.cities(slug) on delete cascade not null,
  township_id uuid references public.townships(id) on delete cascade,
  primary key (provider_id, city_slug, township_id)
);
alter table public.provider_service_areas enable row level security;
drop policy if exists "provider_service_areas public read" on public.provider_service_areas;
create policy "provider_service_areas public read" on public.provider_service_areas for select to anon, authenticated using (true);
drop policy if exists "provider_service_areas self write" on public.provider_service_areas;
create policy "provider_service_areas self write" on public.provider_service_areas
  for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create table if not exists public.provider_portfolio (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete cascade not null,
  image_url text not null,
  caption text,
  created_at timestamptz default now()
);
alter table public.provider_portfolio enable row level security;
drop policy if exists "portfolio public read" on public.provider_portfolio;
create policy "portfolio public read" on public.provider_portfolio for select to anon, authenticated using (true);
drop policy if exists "portfolio self write" on public.provider_portfolio;
create policy "portfolio self write" on public.provider_portfolio
  for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- 5) Jobs, quotes, bookings, messages, reviews, reports ----------------
do $$ begin create type public.urgency_t as enum ('today','tomorrow','this_week','flexible'); exception when duplicate_object then null; end $$;
do $$ begin create type public.contact_method_t as enum ('in_app','phone','viber'); exception when duplicate_object then null; end $$;
do $$ begin create type public.job_status_t as enum ('open','quoted','accepted','on_the_way','started','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method_t as enum ('online','wallet','cash'); exception when duplicate_object then null; end $$;

create table if not exists public.job_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade not null,
  category_slug text references public.categories(slug) not null,
  description text,
  city_slug text references public.cities(slug) not null,
  township_id uuid references public.townships(id),
  address text,
  photo_urls text[] default '{}',
  urgency public.urgency_t default 'flexible',
  preferred_contact public.contact_method_t default 'in_app',
  status public.job_status_t default 'open',
  created_at timestamptz default now()
);
alter table public.job_requests enable row level security;
drop policy if exists "customer reads own jobs" on public.job_requests;
create policy "customer reads own jobs" on public.job_requests for select to authenticated using (customer_id = auth.uid());
drop policy if exists "customer writes own jobs" on public.job_requests;
create policy "customer writes own jobs" on public.job_requests for insert to authenticated with check (customer_id = auth.uid());
drop policy if exists "customer updates own jobs" on public.job_requests;
create policy "customer updates own jobs" on public.job_requests for update to authenticated using (customer_id = auth.uid());
drop policy if exists "providers read matching open jobs" on public.job_requests;
create policy "providers read matching open jobs" on public.job_requests
  for select to authenticated using (
    status in ('open','quoted')
    and exists (
      select 1 from public.provider_services ps
      where ps.provider_id = auth.uid() and ps.category_slug = job_requests.category_slug
    )
  );
drop policy if exists "admins manage jobs" on public.job_requests;
create policy "admins manage jobs" on public.job_requests for all to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_requests(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,
  amount numeric(12,2) not null,
  notes text,
  eta_text text,
  status text default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz default now(),
  unique (job_id, provider_id)
);
alter table public.quotes enable row level security;
drop policy if exists "quote participants read" on public.quotes;
create policy "quote participants read" on public.quotes
  for select to authenticated using (
    provider_id = auth.uid()
    or exists (select 1 from public.job_requests j where j.id = job_id and j.customer_id = auth.uid())
  );
drop policy if exists "provider writes own quote" on public.quotes;
create policy "provider writes own quote" on public.quotes for insert to authenticated with check (provider_id = auth.uid());
drop policy if exists "provider updates own quote" on public.quotes;
create policy "provider updates own quote" on public.quotes for update to authenticated using (provider_id = auth.uid());
drop policy if exists "customer updates quote status" on public.quotes;
create policy "customer updates quote status" on public.quotes
  for update to authenticated using (
    exists (select 1 from public.job_requests j where j.id = job_id and j.customer_id = auth.uid())
  );

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_requests(id) on delete cascade not null,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid not null,
  provider_id uuid not null,
  scheduled_at timestamptz,
  payment_method public.payment_method_t default 'cash',
  amount numeric(12,2),
  status public.job_status_t default 'accepted',
  created_at timestamptz default now()
);
alter table public.bookings enable row level security;
drop policy if exists "booking participants read" on public.bookings;
create policy "booking participants read" on public.bookings
  for select to authenticated using (customer_id = auth.uid() or provider_id = auth.uid());
drop policy if exists "booking participants update" on public.bookings;
create policy "booking participants update" on public.bookings
  for update to authenticated using (customer_id = auth.uid() or provider_id = auth.uid());
drop policy if exists "admins manage bookings" on public.bookings;
create policy "admins manage bookings" on public.bookings for all to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_requests(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists "job participants read messages" on public.messages;
create policy "job participants read messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.job_requests j
      where j.id = job_id and (
        j.customer_id = auth.uid()
        or exists (select 1 from public.quotes q where q.job_id = j.id and q.provider_id = auth.uid())
      )
    )
  );
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages for insert to authenticated with check (sender_id = auth.uid());

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null unique,
  customer_id uuid not null,
  provider_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
alter table public.reviews enable row level security;
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "customer writes own review" on public.reviews;
create policy "customer writes own review" on public.reviews for insert to authenticated with check (customer_id = auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  job_id uuid references public.job_requests(id) on delete set null,
  reason text not null,
  status text default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists "reporter reads own" on public.reports;
create policy "reporter reads own" on public.reports for select to authenticated using (reporter_id = auth.uid());
drop policy if exists "reporter writes" on public.reports;
create policy "reporter writes" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "admins manage reports" on public.reports;
create policy "admins manage reports" on public.reports for all to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.favorites (
  customer_id uuid references auth.users(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (customer_id, provider_id)
);
alter table public.favorites enable row level security;
drop policy if exists "favorites self read" on public.favorites;
create policy "favorites self read" on public.favorites for select to authenticated using (customer_id = auth.uid());
drop policy if exists "favorites self write" on public.favorites;
create policy "favorites self write" on public.favorites for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create table if not exists public.promo_codes (
  code text primary key,
  discount_pct int check (discount_pct between 1 and 100),
  valid_until timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.promo_codes enable row level security;
drop policy if exists "promo public read active" on public.promo_codes;
create policy "promo public read active" on public.promo_codes
  for select to anon, authenticated using (is_active = true);
drop policy if exists "admins manage promos" on public.promo_codes;
create policy "admins manage promos" on public.promo_codes for all to authenticated using (public.has_role(auth.uid(),'admin'));

-- 6) Seed taxonomy -----------------------------------------------------
insert into public.cities (slug, name_en, name_my) values
  ('yangon','Yangon','ရန်ကုန်'),
  ('mandalay','Mandalay','မန္တလေး'),
  ('naypyidaw','Naypyidaw','နေပြည်တော်'),
  ('bago','Bago','ပဲခူး'),
  ('mawlamyine','Mawlamyine','မော်လမြိုင်'),
  ('taunggyi','Taunggyi','တောင်ကြီး'),
  ('pathein','Pathein','ပုသိမ်'),
  ('monywa','Monywa','မုံရွာ')
on conflict (slug) do nothing;

insert into public.categories (slug, name_en, name_my, sort_order) values
  ('cleaning','Cleaning','သန့်ရှင်းရေး',1),
  ('plumbing','Plumbing','ပိုက်ဆက်',2),
  ('electrical','Electrical repair','လျှပ်စစ်ပြုပြင်',3),
  ('aircon','Aircon','အဲကွန်း',4),
  ('appliance','Appliance repair','အိမ်သုံးပစ္စည်း ပြုပြင်',5),
  ('painting','Painting','ဆေးသုတ်',6),
  ('pest','Pest control','ပိုးသတ်',7),
  ('handyman','Handyman','ထောက်ပံ့သမား',8),
  ('furniture','Furniture assembly','ပရိဘောဂ တပ်ဆင်',9),
  ('moving','Moving help','ပစ္စည်းသယ်',10),
  ('water-tank','Water tank cleaning','ရေတိုင်ကီ သန့်ရှင်းရေး',11),
  ('generator','Generator repair','ဂျင်နရေတာ ပြုပြင်',12),
  ('cctv','CCTV installation','CCTV တပ်ဆင်',13),
  ('internet','Internet / Router setup','အင်တာနက် တပ်ဆင်',14),
  ('lock','Lock repair','သော့ ပြုပြင်',15),
  ('carpentry','Carpentry','လက်သမားလုပ်ငန်း',16),
  ('masonry','Masonry / Renovation','ပန်းရံ',17),
  ('gardening','Gardening','ဥယျာဉ်စိုက်ပျိုးရေး',18),
  ('laundry','Laundry pickup','လျှော်ဖွပ်',19)
on conflict (slug) do nothing;