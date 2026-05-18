-- Allow users to read the profile (id, full_name) of anyone they've exchanged messages with.
drop policy if exists "profiles readable by message peers" on public.profiles;
create policy "profiles readable by message peers" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where (m.sender_id = auth.uid() and m.recipient_id = profiles.id)
         or (m.recipient_id = auth.uid() and m.sender_id = profiles.id)
    )
  );
