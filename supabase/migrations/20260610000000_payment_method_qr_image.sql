alter table public.payment_methods
  add column if not exists qr_image_url text;

insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

drop policy if exists "payment-qr public read" on storage.objects;
create policy "payment-qr public read" on storage.objects
  for select using (bucket_id = 'payment-qr');

drop policy if exists "payment-qr admin write" on storage.objects;
create policy "payment-qr admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'payment-qr' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'payment-qr' and public.has_role(auth.uid(),'admin'));
