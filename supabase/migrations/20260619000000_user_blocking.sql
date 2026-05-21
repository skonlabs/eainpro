-- User blocking (soft + hard) for homeowners and providers.
-- Soft block: user can still sign in & read, but cannot create leads,
--             messages, bookings, reviews, or unlock leads.
-- Hard block: same as soft + active sessions revoked so the user is
--             signed out on next request.

-- 1) Columns on profiles ----------------------------------------------
alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists block_type text check (block_type in ('soft','hard')),
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists blocked_by uuid references auth.users(id);

-- Admins must be able to read every profile to manage blocks / show lists.
drop policy if exists "profiles readable by admin" on public.profiles;
create policy "profiles readable by admin" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- 2) Helper ------------------------------------------------------------
create or replace function public.is_user_blocked(_uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_blocked from public.profiles where id = _uid),
    false
  );
$$;
revoke all on function public.is_user_blocked(uuid) from public;
grant execute on function public.is_user_blocked(uuid) to anon, authenticated;

-- 3) Trigger that blocks writes from blocked users --------------------
create or replace function public.enforce_not_blocked()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_user_blocked(auth.uid()) then
    raise exception 'Account is blocked. Contact support.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'leads',
    'lead_messages',
    'bookings',
    'booking_reviews',
    'provider_lead_unlocks',
    'lead_quotes',
    'refund_requests'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_block_%I on public.%I;', t, t);
      execute format(
        'create trigger trg_block_%I before insert on public.%I
         for each row execute function public.enforce_not_blocked();',
        t, t
      );
    end if;
  end loop;
end $$;

-- 4) Admin RPC ---------------------------------------------------------
create or replace function public.admin_set_user_blocked(
  p_user_id uuid,
  p_blocked boolean,
  p_type    text default 'soft',
  p_reason  text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_type  text;
begin
  if not public.has_role(v_admin, 'admin') then
    return jsonb_build_object('ok', false, 'error', 'admin only');
  end if;
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user id required');
  end if;
  if p_blocked then
    v_type := coalesce(nullif(lower(p_type),''),'soft');
    if v_type not in ('soft','hard') then
      return jsonb_build_object('ok', false, 'error', 'invalid block type');
    end if;
    update public.profiles
       set is_blocked     = true,
           block_type     = v_type,
           blocked_at     = now(),
           blocked_reason = nullif(trim(coalesce(p_reason,'')),''),
           blocked_by     = v_admin
     where id = p_user_id;
    -- Hard block: revoke active sessions so user is signed out immediately.
    if v_type = 'hard' then
      begin
        delete from auth.sessions where user_id = p_user_id;
      exception when others then null;
      end;
      begin
        delete from auth.refresh_tokens where user_id = p_user_id::text;
      exception when others then null;
      end;
    end if;
  else
    update public.profiles
       set is_blocked     = false,
           block_type     = null,
           blocked_at     = null,
           blocked_reason = null,
           blocked_by     = null
     where id = p_user_id;
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
  values (
    v_admin,
    case when p_blocked then 'user.block' else 'user.unblock' end,
    'profiles',
    p_user_id,
    jsonb_build_object('block_type', case when p_blocked then v_type else null end,
                       'reason', p_reason)
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'is_blocked', p_blocked,
    'block_type', case when p_blocked then v_type else null end
  );
end;
$$;
revoke all on function public.admin_set_user_blocked(uuid, boolean, text, text) from public;
grant execute on function public.admin_set_user_blocked(uuid, boolean, text, text) to authenticated;

-- 5) Convenience view for admin lists (profile + role flags) ----------
create or replace view public.admin_user_block_status
with (security_invoker = on) as
select
  p.id,
  p.full_name,
  p.phone,
  p.is_blocked,
  p.block_type,
  p.blocked_at,
  p.blocked_reason,
  p.blocked_by
from public.profiles p;
