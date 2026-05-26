-- Fix: admin_audit_logs uses `metadata` column, not `details`.
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

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
    values (v_admin, 'adjust_wallet', 'provider_wallets', p_provider_id,
            jsonb_build_object('delta', p_delta, 'note', p_note, 'new_balance', v_after));

  if p_delta > 0 then
    v_title := 'Wallet credited';
    v_body  := 'Admin added ' || p_delta || ' credits. ' || p_note || ' (New balance: ' || v_after || ')';
  else
    v_title := 'Wallet debited';
    v_body  := 'Admin deducted ' || abs(p_delta) || ' credits. ' || p_note || ' (New balance: ' || v_after || ')';
  end if;

  insert into public.notifications (user_id, kind, title, body, link)
    values (p_provider_id, 'wallet_adjustment', v_title, v_body, '/provider/wallet');

  return jsonb_build_object('ok', true, 'balance', v_after);
end $func$;

grant execute on function public.adjust_wallet(uuid, int, text) to authenticated;

-- Allow 'wallet_adjustment' kind on notifications (used by adjust_wallet).
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
exception when undefined_object then null; end $$;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'quote_received','booking_confirmed','message_received','status_changed',
    'review_requested','quote_accepted','booking_cancelled',
    'new_matching_lead','lead_unlocked_by_provider','lead_lost',
    'topup_approved','topup_rejected','refund_issued','low_balance',
    'wallet_adjustment'
  ));
