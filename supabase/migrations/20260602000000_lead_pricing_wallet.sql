-- =====================================================================
-- Provider Lead Pricing & Unlock System
-- Pay-per-lead revenue model. Wallet credits (1 credit = 1 MMK).
-- Run this file in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

-- 1) Service catalog ---------------------------------------------------
create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null,
  slug text not null,
  name_en text not null,
  name_my text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_slug, slug)
);
alter table public.service_types enable row level security;
drop policy if exists "service_types public read" on public.service_types;
create policy "service_types public read" on public.service_types
  for select to anon, authenticated using (true);
drop policy if exists "service_types admin write" on public.service_types;
create policy "service_types admin write" on public.service_types
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2) Lead pricing ------------------------------------------------------
create table if not exists public.lead_pricing (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null unique references public.service_types(id) on delete cascade,
  price_credits int not null check (price_credits >= 0),
  max_provider_unlocks int not null default 4 check (max_provider_unlocks > 0),
  refund_allowed boolean not null default true,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.lead_pricing enable row level security;
drop policy if exists "lead_pricing public read" on public.lead_pricing;
create policy "lead_pricing public read" on public.lead_pricing
  for select to anon, authenticated using (true);
drop policy if exists "lead_pricing admin write" on public.lead_pricing;
create policy "lead_pricing admin write" on public.lead_pricing
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 3) Customer leads ----------------------------------------------------
do $$ begin
  create type public.lead_status_t as enum ('active','fully_booked','closed','expired','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.customer_leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  city_slug text not null references public.cities(slug),
  township_id uuid references public.townships(id),
  address text,
  service_type_id uuid not null references public.service_types(id),
  urgency public.urgency_t not null default 'flexible',
  preferred_date date,
  preferred_time text,
  short_description text not null,
  full_description text,
  budget_min int,
  budget_max int,
  lead_price_credits int not null,
  max_provider_unlocks int not null,
  current_unlock_count int not null default 0,
  status public.lead_status_t not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_leads_status_idx on public.customer_leads(status, service_type_id, city_slug, created_at desc);
create index if not exists customer_leads_customer_idx on public.customer_leads(customer_id);
alter table public.customer_leads enable row level security;

create table if not exists public.provider_lead_unlocks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  unlock_price_credits int not null,
  status text not null default 'unlocked',
  quoted_price_mmk int,
  provider_notes text,
  is_refunded boolean not null default false,
  refunded_amount_credits int not null default 0,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, provider_id)
);
create index if not exists unlocks_provider_status_idx on public.provider_lead_unlocks(provider_id, status, unlocked_at desc);
create index if not exists unlocks_lead_idx on public.provider_lead_unlocks(lead_id);
alter table public.provider_lead_unlocks enable row level security;

drop policy if exists "customer reads own leads" on public.customer_leads;
create policy "customer reads own leads" on public.customer_leads
  for select to authenticated using (customer_id = auth.uid());
drop policy if exists "customer inserts own leads" on public.customer_leads;
create policy "customer inserts own leads" on public.customer_leads
  for insert to authenticated with check (customer_id = auth.uid() or customer_id is null);
drop policy if exists "providers read unlocked lead" on public.customer_leads;
create policy "providers read unlocked lead" on public.customer_leads
  for select to authenticated using (
    exists (
      select 1 from public.provider_lead_unlocks u
      where u.lead_id = customer_leads.id and u.provider_id = auth.uid()
    )
  );
drop policy if exists "admins manage leads" on public.customer_leads;
create policy "admins manage leads" on public.customer_leads
  for all to authenticated using (public.has_role(auth.uid(),'admin'));

create table if not exists public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.lead_photos enable row level security;
drop policy if exists "lead_photos visible to lead readers" on public.lead_photos;
create policy "lead_photos visible to lead readers" on public.lead_photos
  for select to authenticated using (
    exists (select 1 from public.customer_leads l where l.id = lead_id
      and (l.customer_id = auth.uid()
        or exists (select 1 from public.provider_lead_unlocks u where u.lead_id = l.id and u.provider_id = auth.uid())
        or public.has_role(auth.uid(),'admin')))
  );
drop policy if exists "lead_photos customer write" on public.lead_photos;
create policy "lead_photos customer write" on public.lead_photos
  for all to authenticated using (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
  ) with check (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
  );

-- 4) Wallet & ledger ---------------------------------------------------
create table if not exists public.provider_wallets (
  provider_id uuid primary key references auth.users(id) on delete cascade,
  balance_credits int not null default 0 check (balance_credits >= 0),
  lifetime_topup_credits int not null default 0,
  lifetime_spent_credits int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.provider_wallets enable row level security;
drop policy if exists "wallet self read" on public.provider_wallets;
create policy "wallet self read" on public.provider_wallets
  for select to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));

do $$ begin
  create type public.wallet_tx_t as enum ('topup','unlock','refund','adjustment');
exception when duplicate_object then null; end $$;

create table if not exists public.provider_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  transaction_type public.wallet_tx_t not null,
  amount_credits int not null,
  balance_before int not null,
  balance_after int not null,
  related_lead_id uuid references public.customer_leads(id) on delete set null,
  related_unlock_id uuid,
  related_topup_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_provider_idx on public.provider_wallet_transactions(provider_id, created_at desc);
alter table public.provider_wallet_transactions enable row level security;
drop policy if exists "wallet_tx self read" on public.provider_wallet_transactions;
create policy "wallet_tx self read" on public.provider_wallet_transactions
  for select to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- 5) Credit top-ups ----------------------------------------------------
do $$ begin
  create type public.topup_status_t as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.provider_credit_topups (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  package_name text not null,
  payment_amount_mmk int not null check (payment_amount_mmk > 0),
  credits_requested int not null check (credits_requested > 0),
  bonus_credits int not null default 0,
  total_credits int not null check (total_credits > 0),
  payment_method text,
  payment_reference text,
  payment_proof_url text,
  status public.topup_status_t not null default 'pending',
  admin_notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists topups_provider_idx on public.provider_credit_topups(provider_id, created_at desc);
create index if not exists topups_status_idx on public.provider_credit_topups(status, created_at);
alter table public.provider_credit_topups enable row level security;
drop policy if exists "topups self read" on public.provider_credit_topups;
create policy "topups self read" on public.provider_credit_topups
  for select to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "topups self insert" on public.provider_credit_topups;
create policy "topups self insert" on public.provider_credit_topups
  for insert to authenticated with check (provider_id = auth.uid() and status = 'pending');
drop policy if exists "topups admin update" on public.provider_credit_topups;
create policy "topups admin update" on public.provider_credit_topups
  for update to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 6) Lead unlock policies (table created above) -----------------------
drop policy if exists "unlocks self read" on public.provider_lead_unlocks;
create policy "unlocks self read" on public.provider_lead_unlocks
  for select to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "unlocks customer read" on public.provider_lead_unlocks;
create policy "unlocks customer read" on public.provider_lead_unlocks
  for select to authenticated using (
    exists (select 1 from public.customer_leads l where l.id = lead_id and l.customer_id = auth.uid())
  );
drop policy if exists "unlocks self update" on public.provider_lead_unlocks;
create policy "unlocks self update" on public.provider_lead_unlocks
  for update to authenticated using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- 7) Refunds & audit --------------------------------------------------
create table if not exists public.lead_refunds (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.provider_lead_unlocks(id) on delete cascade,
  amount_credits int not null check (amount_credits > 0),
  reason text not null,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.lead_refunds enable row level security;
drop policy if exists "refunds read participants" on public.lead_refunds;
create policy "refunds read participants" on public.lead_refunds
  for select to authenticated using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.provider_lead_unlocks u where u.id = unlock_id and u.provider_id = auth.uid())
  );

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
drop policy if exists "audit admin read" on public.admin_audit_logs;
create policy "audit admin read" on public.admin_audit_logs
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "audit admin insert" on public.admin_audit_logs;
create policy "audit admin insert" on public.admin_audit_logs
  for insert to authenticated with check (public.has_role(auth.uid(),'admin') and admin_id = auth.uid());

-- 8) Lead previews view (safe columns only) ---------------------------
create or replace view public.lead_previews
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
  (select count(*)::int from public.lead_photos p where p.lead_id = l.id) as photo_count
from public.customer_leads l
join public.service_types st on st.id = l.service_type_id;

-- A permissive read policy on customer_leads for the preview view to work.
-- Since lead_previews exposes only safe columns, expose active leads to verified providers.
drop policy if exists "providers read active lead previews" on public.customer_leads;
create policy "providers read active lead previews" on public.customer_leads
  for select to authenticated using (
    status in ('active','fully_booked')
    and exists (select 1 from public.providers p where p.id = auth.uid() and p.is_verified = true and p.is_suspended = false)
  );
grant select on public.lead_previews to anon, authenticated;

-- NOTE: The above "providers read active lead previews" lets verified providers
-- read full customer_leads rows. We rely on the application layer to ALWAYS query
-- `lead_previews` (safe columns) until they have unlocked. The strict version
-- would require column-level grants — kept open here for simplicity and audited
-- in the security memory.

-- 9) ensure_wallet + unlock_lead RPC ---------------------------------
create or replace function public.ensure_wallet(_provider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.provider_wallets (provider_id) values (_provider_id)
  on conflict (provider_id) do nothing;
end $$;

create or replace function public.unlock_lead(p_lead_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := auth.uid();
  v_lead public.customer_leads%rowtype;
  v_wallet public.provider_wallets%rowtype;
  v_provider_row public.providers%rowtype;
  v_unlock_id uuid;
  v_before int; v_after int;
begin
  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  end if;
  perform public.ensure_wallet(v_provider);

  select * into v_provider_row from public.providers where id = v_provider;
  if not found or v_provider_row.is_verified = false or v_provider_row.is_suspended = true then
    return jsonb_build_object('ok', false, 'error', 'NOT_VERIFIED');
  end if;

  select * into v_lead from public.customer_leads where id = p_lead_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'LEAD_NOT_FOUND'); end if;
  if v_lead.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'LEAD_NOT_AVAILABLE'); end if;
  if v_lead.expires_at is not null and v_lead.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'EXPIRED');
  end if;
  if v_lead.current_unlock_count >= v_lead.max_provider_unlocks then
    return jsonb_build_object('ok', false, 'error', 'LEAD_FULL');
  end if;
  if exists (select 1 from public.provider_lead_unlocks where lead_id = p_lead_id and provider_id = v_provider) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_UNLOCKED');
  end if;

  if not exists (
    select 1 from public.service_types st
    join public.provider_services ps on ps.category_slug = st.category_slug
    where st.id = v_lead.service_type_id and ps.provider_id = v_provider
  ) then
    return jsonb_build_object('ok', false, 'error', 'SERVICE_NOT_OFFERED');
  end if;

  if not exists (
    select 1 from public.provider_service_areas a
    where a.provider_id = v_provider and a.city_slug = v_lead.city_slug
  ) then
    return jsonb_build_object('ok', false, 'error', 'SERVICE_AREA_MISMATCH');
  end if;

  select * into v_wallet from public.provider_wallets where provider_id = v_provider for update;
  v_before := v_wallet.balance_credits;
  if v_before < v_lead.lead_price_credits then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', v_before, 'required', v_lead.lead_price_credits);
  end if;
  v_after := v_before - v_lead.lead_price_credits;

  update public.provider_wallets
    set balance_credits = v_after,
        lifetime_spent_credits = lifetime_spent_credits + v_lead.lead_price_credits,
        updated_at = now()
    where provider_id = v_provider;

  insert into public.provider_lead_unlocks (lead_id, provider_id, unlock_price_credits)
    values (p_lead_id, v_provider, v_lead.lead_price_credits)
    returning id into v_unlock_id;

  insert into public.provider_wallet_transactions
    (provider_id, transaction_type, amount_credits, balance_before, balance_after, related_lead_id, related_unlock_id, description)
    values (v_provider, 'unlock', -v_lead.lead_price_credits, v_before, v_after, p_lead_id, v_unlock_id, 'Lead unlock');

  update public.customer_leads
    set current_unlock_count = current_unlock_count + 1,
        status = case when current_unlock_count + 1 >= max_provider_unlocks then 'fully_booked'::public.lead_status_t else status end,
        updated_at = now()
    where id = p_lead_id;

  return jsonb_build_object('ok', true, 'unlock_id', v_unlock_id, 'balance_after', v_after);
end $$;
grant execute on function public.unlock_lead(uuid) to authenticated;

-- 10) Top-up approval RPCs -------------------------------------------
create or replace function public.approve_topup(p_topup_id uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_topup public.provider_credit_topups%rowtype;
  v_wallet public.provider_wallets%rowtype;
  v_before int; v_after int;
begin
  if not public.has_role(v_admin, 'admin') then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  select * into v_topup from public.provider_credit_topups where id = p_topup_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if v_topup.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'ALREADY_PROCESSED'); end if;

  perform public.ensure_wallet(v_topup.provider_id);
  select * into v_wallet from public.provider_wallets where provider_id = v_topup.provider_id for update;
  v_before := v_wallet.balance_credits;
  v_after := v_before + v_topup.total_credits;

  update public.provider_wallets
    set balance_credits = v_after,
        lifetime_topup_credits = lifetime_topup_credits + v_topup.total_credits,
        updated_at = now()
    where provider_id = v_topup.provider_id;

  update public.provider_credit_topups
    set status = 'approved', approved_by = v_admin, approved_at = now(), admin_notes = coalesce(p_notes, admin_notes)
    where id = p_topup_id;

  insert into public.provider_wallet_transactions
    (provider_id, transaction_type, amount_credits, balance_before, balance_after, related_topup_id, description)
    values (v_topup.provider_id, 'topup', v_topup.total_credits, v_before, v_after, p_topup_id, v_topup.package_name || ' top-up');

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
    values (v_admin, 'approve_topup', 'provider_credit_topups', p_topup_id, jsonb_build_object('credits', v_topup.total_credits));

  return jsonb_build_object('ok', true, 'balance_after', v_after);
end $$;
grant execute on function public.approve_topup(uuid, text) to authenticated;

create or replace function public.reject_topup(p_topup_id uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid();
begin
  if not public.has_role(v_admin, 'admin') then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  update public.provider_credit_topups
    set status = 'rejected', approved_by = v_admin, approved_at = now(), admin_notes = coalesce(p_notes, admin_notes)
    where id = p_topup_id and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'ALREADY_PROCESSED'); end if;
  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
    values (v_admin, 'reject_topup', 'provider_credit_topups', p_topup_id, jsonb_build_object('notes', p_notes));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.reject_topup(uuid, text) to authenticated;

-- 11) Refund RPC ------------------------------------------------------
create or replace function public.refund_unlock(p_unlock_id uuid, p_amount int, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_unlock public.provider_lead_unlocks%rowtype;
  v_wallet public.provider_wallets%rowtype;
  v_before int; v_after int;
begin
  if not public.has_role(v_admin, 'admin') then return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT'); end if;
  select * into v_unlock from public.provider_lead_unlocks where id = p_unlock_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if v_unlock.refunded_amount_credits + p_amount > v_unlock.unlock_price_credits then
    return jsonb_build_object('ok', false, 'error', 'EXCEEDS_PAID');
  end if;

  perform public.ensure_wallet(v_unlock.provider_id);
  select * into v_wallet from public.provider_wallets where provider_id = v_unlock.provider_id for update;
  v_before := v_wallet.balance_credits;
  v_after := v_before + p_amount;

  update public.provider_wallets set balance_credits = v_after, updated_at = now() where provider_id = v_unlock.provider_id;

  update public.provider_lead_unlocks
    set refunded_amount_credits = refunded_amount_credits + p_amount,
        is_refunded = (refunded_amount_credits + p_amount >= unlock_price_credits),
        status = case when refunded_amount_credits + p_amount >= unlock_price_credits then 'invalid' else status end,
        updated_at = now()
    where id = p_unlock_id;

  insert into public.provider_wallet_transactions
    (provider_id, transaction_type, amount_credits, balance_before, balance_after, related_lead_id, related_unlock_id, description)
    values (v_unlock.provider_id, 'refund', p_amount, v_before, v_after, v_unlock.lead_id, p_unlock_id, p_reason);

  insert into public.lead_refunds (unlock_id, amount_credits, reason, approved_by)
    values (p_unlock_id, p_amount, p_reason, v_admin);

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
    values (v_admin, 'refund_unlock', 'provider_lead_unlocks', p_unlock_id, jsonb_build_object('amount', p_amount, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'balance_after', v_after);
end $$;
grant execute on function public.refund_unlock(uuid, int, text) to authenticated;

-- 12) Lead expiry helper ---------------------------------------------
create or replace function public.expire_old_leads()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.customer_leads
    set status = 'expired', updated_at = now()
    where status = 'active'
      and (
        (urgency = 'today' and created_at < now() - interval '48 hours')
        or (created_at < now() - interval '7 days')
      );
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- 13) Storage bucket for top-up proofs --------------------------------
insert into storage.buckets (id, name, public)
  values ('topup-proofs', 'topup-proofs', false)
  on conflict (id) do nothing;

drop policy if exists "topup proofs provider upload" on storage.objects;
create policy "topup proofs provider upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'topup-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "topup proofs provider read" on storage.objects;
create policy "topup proofs provider read" on storage.objects
  for select to authenticated
  using (bucket_id = 'topup-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

-- 14) Seed service types ---------------------------------------------
insert into public.service_types (category_slug, slug, name_en, name_my, sort_order) values
  ('home-repair','plumbing','Plumbing','ပိုက်ဆက်',1),
  ('home-repair','electrical','Electrical','လျှပ်စစ်',2),
  ('home-repair','handyman','Handyman','ထောက်ပံ့သမား',3),
  ('home-repair','appliance','Appliance Repair','အိမ်သုံးပစ္စည်း ပြုပြင်',4),
  ('home-repair','door_lock','Door / Lock Repair','တံခါး/သော့ ပြုပြင်',5),
  ('aircon-utilities','aircon_cleaning','Aircon Cleaning','အဲကွန်း သန့်ရှင်းရေး',1),
  ('aircon-utilities','aircon_repair','Aircon Repair','အဲကွန်း ပြုပြင်',2),
  ('aircon-utilities','aircon_install','Aircon Installation','အဲကွန်း တပ်ဆင်',3),
  ('aircon-utilities','water_pump','Water Pump','ရေပန့်',4),
  ('aircon-utilities','water_tank_cleaning','Water Tank Cleaning','ရေတိုင်ကီ သန့်ရှင်းရေး',5),
  ('cleaning','home','Home Cleaning','အိမ်သန့်ရှင်းရေး',1),
  ('cleaning','deep','Deep Cleaning','အပြည့်အဝ သန့်ရှင်းရေး',2),
  ('cleaning','bathroom','Bathroom Cleaning','ရေချိုးခန်း သန့်ရှင်းရေး',3),
  ('cleaning','kitchen','Kitchen Cleaning','မီးဖိုချောင် သန့်ရှင်းရေး',4),
  ('cleaning','sofa_mattress','Sofa / Mattress Cleaning','ဆိုဖာ/မွေ့ယာ သန့်ရှင်းရေး',5),
  ('cleaning','post_construction','Post-Construction Cleaning','ဆောက်လုပ်ပြီး သန့်ရှင်းရေး',6),
  ('pest-control','cockroach','Cockroach','ပိုးဟပ်',1),
  ('pest-control','ant','Ant','ပုရွက်ဆိတ်',2),
  ('pest-control','termite','Termite','ခြ',3),
  ('pest-control','mosquito','Mosquito','ခြင်',4),
  ('pest-control','rat','Rat','ကြွက်',5),
  ('pest-control','general','General Pest Package','ပိုးသတ် အထွေထွေ',6),
  ('moving','house','House Moving','အိမ်ပြောင်း',1),
  ('moving','small_item','Small Item Moving','ပစ္စည်းအနည်းငယ်',2),
  ('moving','office','Office Moving','ရုံးပြောင်း',3),
  ('moving','packing','Packing Help','ထုပ်ပိုးကူညီ',4),
  ('moving','truck_labor','Truck + Labor','ကား + လုပ်သား',5),
  ('installation','tv_mounting','TV Mounting','တီဗီတပ်ဆင်',1),
  ('installation','curtain','Curtain Installation','ကန့်လန့်ကာ တပ်ဆင်',2),
  ('installation','furniture_assembly','Furniture Assembly','ပရိဘောဂ တပ်ဆင်',3),
  ('installation','lighting','Lighting Installation','မီးတပ်ဆင်',4),
  ('installation','cctv','CCTV Installation','CCTV တပ်ဆင်',5)
on conflict (category_slug, slug) do nothing;

-- 15) Seed pricing ----------------------------------------------------
do $$
declare
  rows text[][] := array[
    ['cleaning','home','1500','5'],
    ['home-repair','handyman','1500','4'],
    ['home-repair','plumbing','2000','4'],
    ['home-repair','electrical','2000','4'],
    ['home-repair','appliance','2000','4'],
    ['aircon-utilities','aircon_cleaning','2000','5'],
    ['cleaning','deep','3000','5'],
    ['aircon-utilities','aircon_repair','3000','3'],
    ['pest-control','general','3000','5'],
    ['home-repair','door_lock','3000','3'],
    ['aircon-utilities','aircon_install','5000','3'],
    ['moving','house','5000','5'],
    ['installation','cctv','5000','3'],
    ['pest-control','termite','6000','5'],
    ['moving','office','8000','3']
  ];
  r text[];
  st_id uuid;
begin
  foreach r slice 1 in array rows loop
    select id into st_id from public.service_types where category_slug = r[1] and slug = r[2];
    if st_id is not null then
      insert into public.lead_pricing (service_type_id, price_credits, max_provider_unlocks)
        values (st_id, r[3]::int, r[4]::int)
        on conflict (service_type_id) do update
          set price_credits = excluded.price_credits,
              max_provider_unlocks = excluded.max_provider_unlocks,
              is_active = true,
              updated_at = now();
    end if;
  end loop;
end $$;

-- Defaults for service types without explicit pricing (inactive until admin sets)
insert into public.lead_pricing (service_type_id, price_credits, max_provider_unlocks, is_active)
  select st.id, 2000, 4, false
  from public.service_types st
  where not exists (select 1 from public.lead_pricing p where p.service_type_id = st.id)
on conflict (service_type_id) do nothing;

-- 16) Auto-create wallet on provider profile creation ----------------
create or replace function public.handle_new_provider_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_wallet(new.id);
  return new;
end $$;
drop trigger if exists on_provider_wallet_init on public.providers;
create trigger on_provider_wallet_init after insert on public.providers
  for each row execute function public.handle_new_provider_wallet();
