-- Closes the remaining feature gaps: customer disputes, provider refund
-- requests for bad leads, provider blackout calendar, two-way reviews
-- (provider rates customer), and provider verification documents.
-- Apply manually in the Supabase SQL editor.

-- 1) reports: support lead-level and booking-level disputes ---------------
alter table public.reports
  add column if not exists lead_id uuid references public.customer_leads(id) on delete set null,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists kind text not null default 'other'
    check (kind in ('no_show','bad_quality','rude','fraud','spam_lead','wrong_info','other'));

create index if not exists reports_lead_id_idx on public.reports(lead_id);
create index if not exists reports_booking_id_idx on public.reports(booking_id);

-- 2) Provider refund requests for invalid / fake leads ------------------
create table if not exists public.unlock_refund_requests (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.provider_lead_unlocks(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.customer_leads(id) on delete cascade,
  reason text not null,
  status text not null default 'open'
    check (status in ('open','approved','rejected')),
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (unlock_id)
);
create index if not exists urr_provider_idx on public.unlock_refund_requests(provider_id);
create index if not exists urr_status_idx on public.unlock_refund_requests(status);
alter table public.unlock_refund_requests enable row level security;

drop policy if exists "provider reads own refund requests" on public.unlock_refund_requests;
create policy "provider reads own refund requests" on public.unlock_refund_requests
  for select to authenticated using (provider_id = auth.uid());

drop policy if exists "provider creates own refund request" on public.unlock_refund_requests;
create policy "provider creates own refund request" on public.unlock_refund_requests
  for insert to authenticated with check (provider_id = auth.uid());

drop policy if exists "admin manages refund requests" on public.unlock_refund_requests;
create policy "admin manages refund requests" on public.unlock_refund_requests
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- RPC: admin approves a refund -> credits back to provider wallet and
-- marks the unlock as refunded.
create or replace function public.approve_refund_request(_request_id uuid, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_credits int;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'not_admin';
  end if;

  select * into r from public.unlock_refund_requests where id = _request_id for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'open' then raise exception 'already_resolved'; end if;

  select credits_spent into v_credits from public.provider_lead_unlocks where id = r.unlock_id;
  if v_credits is null then v_credits := 0; end if;

  update public.unlock_refund_requests
     set status = 'approved', resolution_note = _note, resolved_at = now(), resolved_by = auth.uid()
   where id = _request_id;

  update public.provider_lead_unlocks
     set status = 'refunded'
   where id = r.unlock_id;

  if v_credits > 0 then
    update public.provider_wallets
       set balance = coalesce(balance,0) + v_credits, updated_at = now()
     where provider_id = r.provider_id;

    insert into public.wallet_transactions (provider_id, amount, type, reference, note)
    values (r.provider_id, v_credits, 'refund', r.unlock_id::text, coalesce(_note,'Lead refund'));
  end if;
end;
$$;

create or replace function public.reject_refund_request(_request_id uuid, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'not_admin';
  end if;
  update public.unlock_refund_requests
     set status = 'rejected', resolution_note = _note, resolved_at = now(), resolved_by = auth.uid()
   where id = _request_id and status = 'open';
end;
$$;

-- 3) Provider blackout calendar -----------------------------------------
create table if not exists public.provider_unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz default now(),
  unique (provider_id, date)
);
create index if not exists pud_provider_date_idx on public.provider_unavailable_dates(provider_id, date);
alter table public.provider_unavailable_dates enable row level security;

drop policy if exists "provider manages own blackouts" on public.provider_unavailable_dates;
create policy "provider manages own blackouts" on public.provider_unavailable_dates
  for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

drop policy if exists "public reads blackouts" on public.provider_unavailable_dates;
create policy "public reads blackouts" on public.provider_unavailable_dates
  for select to anon, authenticated using (true);

-- 4) Two-way reviews: provider rates the customer -----------------------
alter table public.reviews
  add column if not exists rated_by text not null default 'customer'
    check (rated_by in ('customer','provider'));

-- The original unique(booking_id) blocks a second review on the same
-- booking. Replace it with a composite unique so each side can review once.
alter table public.reviews drop constraint if exists reviews_booking_id_key;
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='reviews_booking_rated_by_uniq'
  ) then
    create unique index reviews_booking_rated_by_uniq
      on public.reviews(booking_id, rated_by);
  end if;
end $$;

drop policy if exists "provider writes own review" on public.reviews;
create policy "provider writes own review" on public.reviews
  for insert to authenticated
  with check (rated_by = 'provider' and provider_id = auth.uid());

-- 5) Provider verification documents ------------------------------------
create table if not exists public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('nrc_front','nrc_back','selfie','business_license','other')),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists pd_provider_idx on public.provider_documents(provider_id);
create index if not exists pd_status_idx on public.provider_documents(status);
alter table public.provider_documents enable row level security;

drop policy if exists "provider manages own docs" on public.provider_documents;
create policy "provider manages own docs" on public.provider_documents
  for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

drop policy if exists "admin manages all docs" on public.provider_documents;
create policy "admin manages all docs" on public.provider_documents
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Storage bucket for verification uploads (private).
insert into storage.buckets (id, name, public)
values ('provider-documents','provider-documents', false)
on conflict (id) do nothing;

drop policy if exists "provider uploads own docs" on storage.objects;
create policy "provider uploads own docs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'provider-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "provider reads own docs" on storage.objects;
create policy "provider reads own docs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'provider-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role(auth.uid(),'admin')
    )
  );

drop policy if exists "provider deletes own docs" on storage.objects;
create policy "provider deletes own docs" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'provider-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
