-- Payment methods configurable by admin. Provider sees QR derived from phone.
create table if not exists public.payment_methods (
  slug text primary key,
  label text not null,
  phone_number text,
  account_name text,
  qr_payload text,
  instructions text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.payment_methods (slug, label, is_active) values
  ('kbzpay', 'KBZPay', true),
  ('ayapay', 'AyaPay', true),
  ('cbpay',  'CBPay',  true),
  ('wavepay','Wave Pay', true)
on conflict (slug) do nothing;

alter table public.payment_methods enable row level security;

drop policy if exists "payment_methods read active" on public.payment_methods;
create policy "payment_methods read active" on public.payment_methods
  for select to authenticated using (is_active or public.has_role(auth.uid(),'admin'));

drop policy if exists "payment_methods admin write" on public.payment_methods;
create policy "payment_methods admin write" on public.payment_methods
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
