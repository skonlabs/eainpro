-- =====================================================================
-- Lead-pricing follow-ups: notifications, revenue views, low-balance,
-- opportunistic auto-expiry. Safe to re-run.
-- =====================================================================

-- 1) Expand notifications.kind check
do $$
begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
exception when undefined_object then null;
end $$;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'quote_received','booking_confirmed','message_received','status_changed',
    'review_requested','quote_accepted','booking_cancelled',
    'new_matching_lead','lead_unlocked_by_provider',
    'topup_approved','topup_rejected','refund_issued','low_balance'
  ));

-- 2) Notify matching providers on new lead
create or replace function public.on_customer_lead_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cat text; v_name text;
begin
  select category_slug, name_en into v_cat, v_name from public.service_types where id = new.service_type_id;
  if v_cat is null then return new; end if;
  insert into public.notifications(user_id, kind, title, body, link)
  select distinct p.id, 'new_matching_lead',
         'New ' || v_name || ' lead in ' || new.city_slug,
         'Unlock for ' || new.lead_price_credits || ' credits to see customer details.',
         '/provider/leads'
    from public.providers p
    join public.provider_services ps on ps.provider_id = p.id and ps.category_slug = v_cat
    join public.provider_service_areas sa on sa.provider_id = p.id and sa.city_slug = new.city_slug
   where p.is_verified = true and p.is_suspended = false;
  return new;
end $$;
drop trigger if exists trg_customer_lead_notify on public.customer_leads;
create trigger trg_customer_lead_notify after insert on public.customer_leads
  for each row execute function public.on_customer_lead_notify();

-- 3) Notify customer on unlock
create or replace function public.on_lead_unlock_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_biz text;
begin
  select customer_id into v_customer from public.customer_leads where id = new.lead_id;
  if v_customer is null then return new; end if;
  select coalesce(business_name, 'A provider') into v_biz from public.providers where id = new.provider_id;
  insert into public.notifications(user_id, kind, title, body, link)
    values (v_customer, 'lead_unlocked_by_provider',
            v_biz || ' viewed your request',
            'They may contact you shortly.',
            '/my-requests');
  return new;
end $$;
drop trigger if exists trg_lead_unlock_notify on public.provider_lead_unlocks;
create trigger trg_lead_unlock_notify after insert on public.provider_lead_unlocks
  for each row execute function public.on_lead_unlock_notify();

-- 4) Top-up status change notification
create or replace function public.on_topup_status_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      insert into public.notifications(user_id, kind, title, body, link)
        values (new.provider_id, 'topup_approved',
                'Top-up approved · +' || new.total_credits || ' credits',
                new.package_name || ' package added to your wallet.',
                '/provider/wallet');
    elsif new.status = 'rejected' then
      insert into public.notifications(user_id, kind, title, body, link)
        values (new.provider_id, 'topup_rejected',
                'Top-up rejected',
                coalesce(new.admin_notes, 'Please contact support.'),
                '/provider/wallet');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_topup_status_notify on public.provider_credit_topups;
create trigger trg_topup_status_notify after update on public.provider_credit_topups
  for each row execute function public.on_topup_status_notify();

-- 5) Refund notification
create or replace function public.on_refund_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_provider uuid;
begin
  select provider_id into v_provider from public.provider_lead_unlocks where id = new.unlock_id;
  if v_provider is null then return new; end if;
  insert into public.notifications(user_id, kind, title, body, link)
    values (v_provider, 'refund_issued',
            'Refund issued · +' || new.amount_credits || ' credits',
            coalesce(new.reason, 'A refund was issued for a lead unlock.'),
            '/provider/wallet');
  return new;
end $$;
drop trigger if exists trg_refund_notify on public.lead_refunds;
create trigger trg_refund_notify after insert on public.lead_refunds
  for each row execute function public.on_refund_notify();

-- 6) Low-balance alert
create or replace function public.on_wallet_low_balance_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_threshold int := 1500;
begin
  if new.balance_credits < v_threshold
     and (old.balance_credits is null or old.balance_credits >= v_threshold) then
    insert into public.notifications(user_id, kind, title, body, link)
      values (new.provider_id, 'low_balance',
              'Low wallet balance',
              'You have ' || new.balance_credits || ' credits left. Top up to keep unlocking leads.',
              '/provider/wallet');
  end if;
  return new;
end $$;
drop trigger if exists trg_wallet_low_balance on public.provider_wallets;
create trigger trg_wallet_low_balance after update on public.provider_wallets
  for each row execute function public.on_wallet_low_balance_notify();

-- 7) Revenue views
create or replace view public.lead_revenue_by_service
with (security_invoker = on) as
select st.id as service_type_id, st.category_slug, st.slug, st.name_en,
  count(u.id)::int as unlocks_count,
  coalesce(sum(u.unlock_price_credits), 0)::bigint as gross_credits,
  coalesce(sum(u.refunded_amount_credits), 0)::bigint as refunded_credits,
  coalesce(sum(u.unlock_price_credits - u.refunded_amount_credits), 0)::bigint as net_credits
from public.service_types st
left join public.customer_leads l on l.service_type_id = st.id
left join public.provider_lead_unlocks u on u.lead_id = l.id
group by st.id, st.category_slug, st.slug, st.name_en;
grant select on public.lead_revenue_by_service to authenticated;

create or replace view public.lead_revenue_daily
with (security_invoker = on) as
select date_trunc('day', u.unlocked_at)::date as day,
  count(*)::int as unlocks_count,
  sum(u.unlock_price_credits)::bigint as gross_credits,
  sum(u.unlock_price_credits - u.refunded_amount_credits)::bigint as net_credits
from public.provider_lead_unlocks u
where u.unlocked_at > now() - interval '30 days'
group by 1 order by 1 desc;
grant select on public.lead_revenue_daily to authenticated;

-- 8) Opportunistic expiry inside unlock_lead
create or replace function public.unlock_lead(p_lead_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := auth.uid();
  v_lead public.customer_leads%rowtype;
  v_wallet public.provider_wallets%rowtype;
  v_provider_row public.providers%rowtype;
  v_unlock_id uuid;
  v_before int; v_after int;
begin
  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  end if;
  perform public.ensure_wallet(v_provider);

  update public.customer_leads
    set status = 'expired', updated_at = now()
    where status = 'active'
      and ((urgency = 'today' and created_at < now() - interval '48 hours')
           or (created_at < now() - interval '7 days'));

  select * into v_provider_row from public.providers where id = v_provider;
  if not found or v_provider_row.is_verified = false or v_provider_row.is_suspended = true then
    return jsonb_build_object('ok', false, 'error', 'NOT_VERIFIED');
  end if;

  select * into v_lead from public.customer_leads where id = p_lead_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'LEAD_NOT_FOUND'); end if;
  if v_lead.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'LEAD_NOT_AVAILABLE'); end if;
  if v_lead.expires_at is not null and v_lead.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'EXPIRED');
  end if;
  if v_lead.current_unlock_count >= v_lead.max_provider_unlocks then
    return jsonb_build_object('ok', false, 'error', 'LEAD_FULL');
  end if;
  if exists (select 1 from public.provider_lead_unlocks where lead_id = p_lead_id and provider_id = v_provider) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_UNLOCKED');
  end if;
  if not exists (
    select 1 from public.service_types st
    join public.provider_services ps on ps.category_slug = st.category_slug
    where st.id = v_lead.service_type_id and ps.provider_id = v_provider
  ) then
    return jsonb_build_object('ok', false, 'error', 'SERVICE_NOT_OFFERED');
  end if;
  if not exists (
    select 1 from public.provider_service_areas a
    where a.provider_id = v_provider and a.city_slug = v_lead.city_slug
  ) then
    return jsonb_build_object('ok', false, 'error', 'SERVICE_AREA_MISMATCH');
  end if;

  select * into v_wallet from public.provider_wallets where provider_id = v_provider for update;
  v_before := v_wallet.balance_credits;
  if v_before < v_lead.lead_price_credits then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', v_before, 'required', v_lead.lead_price_credits);
  end if;
  v_after := v_before - v_lead.lead_price_credits;

  update public.provider_wallets
    set balance_credits = v_after,
        lifetime_spent_credits = lifetime_spent_credits + v_lead.lead_price_credits,
        updated_at = now()
    where provider_id = v_provider;

  insert into public.provider_lead_unlocks (lead_id, provider_id, unlock_price_credits)
    values (p_lead_id, v_provider, v_lead.lead_price_credits)
    returning id into v_unlock_id;

  insert into public.provider_wallet_transactions
    (provider_id, transaction_type, amount_credits, balance_before, balance_after, related_lead_id, related_unlock_id, description)
    values (v_provider, 'unlock', -v_lead.lead_price_credits, v_before, v_after, p_lead_id, v_unlock_id, 'Lead unlock');

  update public.customer_leads
    set current_unlock_count = current_unlock_count + 1,
        status = case when current_unlock_count + 1 >= max_provider_unlocks then 'fully_booked'::public.lead_status_t else status end,
        updated_at = now()
    where id = p_lead_id;

  return jsonb_build_object('ok', true, 'unlock_id', v_unlock_id, 'balance_after', v_after);
end $$;
grant execute on function public.unlock_lead(uuid) to authenticated;

-- 9) Indexes
create index if not exists provider_services_cat_idx on public.provider_services(category_slug, provider_id);
create index if not exists provider_service_areas_city_idx on public.provider_service_areas(city_slug, provider_id);
