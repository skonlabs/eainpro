-- Fix infinite recursion in request_invitations INSERT policy.
-- The previous policy ran a SELECT count(*) FROM request_invitations inside
-- request_invitations' own WITH CHECK, which re-evaluates RLS recursively.
-- Use a SECURITY DEFINER helper to count invites without triggering RLS.

create or replace function public.count_invites_for_job(_job_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.request_invitations where job_id = _job_id;
$$;

drop policy if exists "customer creates invites" on public.request_invitations;
create policy "customer creates invites" on public.request_invitations
  for insert to authenticated with check (
    exists (
      select 1 from public.job_requests j
      where j.id = request_invitations.job_id
        and j.customer_id = auth.uid()
    )
    and public.count_invites_for_job(request_invitations.job_id) < 5
  );
