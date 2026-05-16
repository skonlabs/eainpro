-- Phase 2: bookings, completion, reviews, chat attachments

alter table public.bookings
  add column if not exists scheduled_window text check (scheduled_window in ('morning','afternoon','evening','any')),
  add column if not exists customer_phone text,
  add column if not exists address_revealed boolean default true,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists provider_confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

alter table public.reviews
  add column if not exists rating_quality int check (rating_quality between 1 and 5),
  add column if not exists rating_speed int check (rating_speed between 1 and 5),
  add column if not exists rating_value int check (rating_value between 1 and 5),
  add column if not exists rating_communication int check (rating_communication between 1 and 5),
  add column if not exists photo_urls text[] default '{}';

drop policy if exists "customer writes own review" on public.reviews;
create policy "customer writes own review" on public.reviews
  for insert to authenticated with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
        and b.status = 'completed'
    )
  );

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists kind text default 'text' check (kind in ('text','image','system','quote'));

alter table public.messages alter column body drop not null;

create or replace function public.recompute_provider_stats(_provider_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.providers p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where provider_id = _provider_id), 0),
    rating_count = coalesce((select count(*) from public.reviews where provider_id = _provider_id), 0),
    jobs_completed = coalesce((select count(*) from public.bookings where provider_id = _provider_id and status = 'completed'), 0)
  where p.id = _provider_id;
end $$;

create or replace function public.on_review_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_provider_stats(coalesce(new.provider_id, old.provider_id));
  return coalesce(new, old);
end $$;
drop trigger if exists trg_review_recompute on public.reviews;
create trigger trg_review_recompute after insert or update or delete on public.reviews
  for each row execute function public.on_review_change();

create or replace function public.on_booking_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_provider_stats(coalesce(new.provider_id, old.provider_id));
  return coalesce(new, old);
end $$;
drop trigger if exists trg_booking_recompute on public.bookings;
create trigger trg_booking_recompute after insert or update or delete on public.bookings
  for each row execute function public.on_booking_change();
