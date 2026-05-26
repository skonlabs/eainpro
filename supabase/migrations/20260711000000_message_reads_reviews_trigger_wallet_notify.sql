-- Apply manually in Supabase SQL editor.
-- Adds:
--   1) messages.read_at + recipient can mark own messages read
--   2) Trigger: keep providers.rating_avg / rating_count fresh
--   3) Trigger: keep providers.jobs_completed fresh from bookings
--   4) adjust_wallet now creates a notification for the provider

-- 1) messages.read_at ---------------------------------------------------
alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists messages_unread_idx
  on public.messages(recipient_id) where read_at is null;

drop policy if exists "recipient marks messages read" on public.messages;
create policy "recipient marks messages read" on public.messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- 2) Recompute provider stats whenever reviews change -------------------
create or replace function public._reviews_recompute_provider_stats()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_provider_stats(old.provider_id);
    return old;
  else
    perform public.recompute_provider_stats(new.provider_id);
    if (tg_op = 'UPDATE' and new.provider_id is distinct from old.provider_id) then
      perform public.recompute_provider_stats(old.provider_id);
    end if;
    return new;
  end if;
end $func$;

drop trigger if exists reviews_recompute_provider_stats on public.reviews;
create trigger reviews_recompute_provider_stats
  after insert or update or delete on public.reviews
  for each row execute function public._reviews_recompute_provider_stats();

-- 3) Keep jobs_completed fresh when bookings change ---------------------
create or replace function public._bookings_recompute_provider_stats()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  if (tg_op = 'DELETE') then
    if old.provider_id is not null then
      perform public.recompute_provider_stats(old.provider_id);
    end if;
    return old;
  end if;
  if new.provider_id is not null then
    perform public.recompute_provider_stats(new.provider_id);
  end if;
  if (tg_op = 'UPDATE' and old.provider_id is not null
      and new.provider_id is distinct from old.provider_id) then
    perform public.recompute_provider_stats(old.provider_id);
  end if;
  return new;
end $func$;

drop trigger if exists bookings_recompute_provider_stats on public.bookings;
create trigger bookings_recompute_provider_stats
  after insert or update of status, provider_id or delete on public.bookings
  for each row execute function public._bookings_recompute_provider_stats();

-- One-shot resync after triggers go live.
do $$
declare r record;
begin
  for r in select id from public.providers loop
    perform public.recompute_provider_stats(r.id);
  end loop;
end $$;

-- 4) adjust_wallet now notifies the provider ----------------------------
create or replace function public.adjust_wallet(p_provider_id uuid, p_delta int, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_admin uuid := auth.uid();
  v_wallet public.provider_wallets%rowtype;
  v_before int;
  v_after int;
  v_title text;
  v_body text;
begin
  if not public.has_role(v_admin, 'admin') then
    return jsonb_build_object('ok', false, 'error', 'NOT_ADMIN');
  end if;
  if p_delta = 0 then
    return jsonb_build_object('ok', false, 'error', 'ZERO_DELTA');
  end if;
  if coalesce(trim(p_note),'') = '' then
    return jsonb_build_object('ok', false, 'error', 'NOTE_REQUIRED');
  end if;

  perform public.ensure_wallet(p_provider_id);
  select * into v_wallet from public.provider_wallets where provider_id = p_provider_id for update;
  v_before := v_wallet.balance_credits;
  v_after  := v_before + p_delta;
  if v_after < 0 then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_BALANCE', 'balance', v_before);
  end if;

  update public.provider_wallets
    set balance_credits = v_after,
        lifetime_topup_credits = lifetime_topup_credits + greatest(p_delta, 0),
        lifetime_spent_credits = lifetime_spent_credits + greatest(-p_delta, 0),
        updated_at = now()
    where provider_id = p_provider_id;

  insert into public.provider_wallet_transactions
    (provider_id, transaction_type, amount_credits, balance_before, balance_after, description)
    values (p_provider_id, 'adjustment', p_delta, v_before, v_after, p_note);

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, details)
    values (v_admin, 'adjust_wallet', 'provider_wallets', p_provider_id,
            jsonb_build_object('delta', p_delta, 'note', p_note, 'new_balance', v_after));

  if p_delta > 0 then
    v_title := 'Wallet credited';
    v_body  := 'Admin added ' || p_delta || ' credits. ' || p_note ||
               ' (New balance: ' || v_after || ')';
  else
    v_title := 'Wallet debited';
    v_body  := 'Admin deducted ' || abs(p_delta) || ' credits. ' || p_note ||
               ' (New balance: ' || v_after || ')';
  end if;

  insert into public.notifications (user_id, kind, title, body, link)
    values (p_provider_id, 'wallet_adjustment', v_title, v_body, '/provider/wallet');

  return jsonb_build_object('ok', true, 'balance', v_after);
end $func$;

grant execute on function public.adjust_wallet(uuid, int, text) to authenticated;
