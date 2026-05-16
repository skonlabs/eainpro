-- Audit fixes: RLS gaps and policy tightening for Eain Pro.

-- 1) bookings: allow customer to create their own booking from an accepted quote
drop policy if exists "customer creates booking" on public.bookings;
create policy "customer creates booking" on public.bookings
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.job_requests j
      where j.id = job_id and j.customer_id = auth.uid()
    )
    and exists (
      select 1 from public.quotes q
      where q.id = quote_id and q.job_id = job_id and q.provider_id = bookings.provider_id
    )
  );

-- 2) user_roles: allow self-grant of provider role
drop policy if exists "self grant provider role" on public.user_roles;
create policy "self grant provider role" on public.user_roles
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'provider');

-- 3) messages: restrict insert to job participants
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.job_requests j
      where j.id = job_id and (
        j.customer_id = auth.uid()
        or exists (
          select 1 from public.quotes q where q.job_id = j.id and q.provider_id = auth.uid()
        )
      )
    )
  );

-- 4) reviews: only customer of a completed booking can insert
drop policy if exists "customer writes own review" on public.reviews;
create policy "customer writes own review" on public.reviews
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.provider_id = reviews.provider_id
        and b.status = 'completed'
    )
  );

-- 5) provider_* public reads: hide unverified or suspended providers' data
drop policy if exists "provider_services public read" on public.provider_services;
create policy "provider_services public read" on public.provider_services
  for select to anon, authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_verified and not p.is_suspended
    )
    or provider_id = auth.uid()
  );

drop policy if exists "provider_service_areas public read" on public.provider_service_areas;
create policy "provider_service_areas public read" on public.provider_service_areas
  for select to anon, authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_verified and not p.is_suspended
    )
    or provider_id = auth.uid()
  );

drop policy if exists "portfolio public read" on public.provider_portfolio;
create policy "portfolio public read" on public.provider_portfolio
  for select to anon, authenticated using (
    exists (
      select 1 from public.providers p
      where p.id = provider_id and p.is_verified and not p.is_suspended
    )
    or provider_id = auth.uid()
  );

-- 6) quotes: prevent customers from modifying amount/notes; only allow status change
create or replace function public.guard_quote_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.provider_id then
    return new;
  end if;
  if new.amount is distinct from old.amount
     or new.notes is distinct from old.notes
     or new.eta_text is distinct from old.eta_text
     or new.provider_id is distinct from old.provider_id
     or new.job_id is distinct from old.job_id then
    raise exception 'Only the provider may edit quote contents';
  end if;
  if new.status not in ('accepted','declined') then
    raise exception 'Invalid status transition';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_quote_update on public.quotes;
create trigger trg_guard_quote_update before update on public.quotes
  for each row execute function public.guard_quote_update();

-- 7) Minimal townships seed
insert into public.townships (city_slug, name_en, name_my) values
  ('yangon','Bahan','ဗဟန်း'),
  ('yangon','Kamayut','ကမာရွတ်'),
  ('yangon','Hlaing','လှိုင်'),
  ('yangon','Mayangone','မရမ်းကုန်း'),
  ('yangon','Thingangyun','သင်္ဃန်းကျွန်း'),
  ('yangon','South Okkalapa','တောင်ဥက္ကလာပ'),
  ('yangon','North Okkalapa','မြောက်ဥက္ကလာပ'),
  ('yangon','Insein','အင်းစိန်'),
  ('mandalay','Chanayethazan','ချမ်းအေးသာစံ'),
  ('mandalay','Mahaaungmyay','မဟာအောင်မြေ'),
  ('mandalay','Chanmyathazi','ချမ်းမြသာစည်'),
  ('mandalay','Aungmyethazan','အောင်မြေသာစံ'),
  ('naypyidaw','Zabuthiri','ဇမ္ဗူသီရိ'),
  ('naypyidaw','Pobbathiri','ပုဗ္ဗသီရိ'),
  ('naypyidaw','Ottarathiri','ဥတ္တရသီရိ')
on conflict do nothing;
