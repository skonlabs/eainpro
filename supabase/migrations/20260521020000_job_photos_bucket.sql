insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "job-photos public read" on storage.objects;
create policy "job-photos public read" on storage.objects
  for select using (bucket_id = 'job-photos');

drop policy if exists "job-photos owner write" on storage.objects;
create policy "job-photos owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "job-photos owner delete" on storage.objects;
create policy "job-photos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
