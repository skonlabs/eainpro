-- ThweSat-style wallet: admin-editable credit packages + manual wallet adjustment.

create table if not exists public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_my text,
  price_mmk int not null check (price_mmk > 0),
  credits int not null check (credits > 0),
  bonus_credits int not null default 0,
  badge_en text,
  badge_my text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.credit_packages (slug, name_en, name_my, price_mmk, credits, bonus_credits, badge_en, badge_my, sort_order) values
  ('starter', 'Starter', 'အစ',           10000, 10000,     0, null,        null,        10),
  ('growth',  'Growth',  'တိုးတက်',     25000, 25000,  2500, 'Popular',   'လူကြိုက်များ', 20),
  ('pro',     'Pro',     'Pro',          50000, 50000,  7500, 'Best value','အကောင်းဆုံး', 30),
  ('power',   'Power',   'အင်အား',     100000,100000, 20000, '+20%',     '+20%',     40)
on conflict (slug) do nothing;

alter table public.credit_packages enable row level security;

drop policy if exists "credit_packages read active" on public.credit_packages;
create policy "credit_packages read active" on public.credit_packages
  for select to authenticated using (is_active or public.has_role(auth.uid(),'admin'));

drop policy if exists "credit_packages admin write" on public.credit_packages;
create policy "credit_packages admin write" on public.credit_packages
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Manual wallet adjustment (admin only). Positive credits, negative debits.
create or replace function public.adjust_wallet(p_provider_id uuid, p_delta int, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_wallet public.provider_wallets%rowtype;
  v_before int;
  v_after int;
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

  return jsonb_build_object('ok', true, 'balance', v_after);
end $$;

grant execute on function public.adjust_wallet(uuid, int, text) to authenticated;
