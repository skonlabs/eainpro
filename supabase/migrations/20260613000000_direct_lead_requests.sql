-- Direct lead requests: a customer can target a specific provider.
-- The lead is visible ONLY to the chosen provider (plus admins / the customer).
-- The doubled price is computed on the application side and stored in
-- lead_price_credits, so unlock_lead() requires no change.

alter table public.customer_leads
  add column if not exists directed_provider_id uuid references auth.users(id) on delete set null;

create index if not exists customer_leads_directed_idx
  on public.customer_leads(directed_provider_id)
  where directed_provider_id is not null;

-- Rebuild lead_previews to surface directed_provider_id + is_direct
drop view if exists public.lead_previews;
create view public.lead_previews
with (security_invoker = on) as
select
  l.id,
  l.service_type_id,
  st.category_slug,
  st.slug as service_slug,
  st.name_en as service_name_en,
  st.name_my as service_name_my,
  l.city_slug,
  l.township_id,
  l.urgency,
  l.preferred_date,
  l.preferred_time,
  l.short_description,
  l.budget_min,
  l.budget_max,
  l.lead_price_credits,
  l.max_provider_unlocks,
  l.current_unlock_count,
  l.status,
  l.expires_at,
  l.created_at,
  l.directed_provider_id,
  (l.directed_provider_id is not null) as is_direct,
  (select count(*)::int from public.lead_photos p where p.lead_id = l.id) as photo_count
from public.customer_leads l
join public.service_types st on st.id = l.service_type_id;
grant select on public.lead_previews to anon, authenticated;

-- Tighten the preview-read policy: directed leads are visible only to the
-- chosen provider; non-directed leads remain visible to all verified providers.
drop policy if exists "providers read active lead previews" on public.customer_leads;
create policy "providers read active lead previews" on public.customer_leads
  for select to authenticated using (
    status in ('active','fully_booked')
    and exists (
      select 1 from public.providers p
      where p.id = auth.uid() and p.is_verified = true and p.is_suspended = false
    )
    and (directed_provider_id is null or directed_provider_id = auth.uid())
  );

-- Allow the directed provider to unlock even when the lead's category or
-- city is outside their declared services/areas (the customer chose them
-- explicitly). Other restrictions still apply.
create or replace function public.unlock_lead(p_lead_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := auth.uid();
  v_lead public.customer_leads%rowtype;
  v_wallet public.provider_wallets%rowtype;
  v_provider_row public.providers%rowtype;
  v_unlock_id uuid;
  v_before int; v_after int;
  v_is_directed boolean;
begin
  if v_provider is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  end if;
  perform public.ensure_wallet(v_provider);

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

  v_is_directed := v_lead.directed_provider_id is not null;

  -- Directed leads: only the chosen provider may unlock; skip category/area gates.
  if v_is_directed and v_lead.directed_provider_id <> v_provider then
    return jsonb_build_object('ok', false, 'error', 'LEAD_NOT_AVAILABLE');
  end if;

  if not v_is_directed then
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
    values (v_provider, 'unlock', -v_lead.lead_price_credits, v_before, v_after, p_lead_id, v_unlock_id,
            case when v_is_directed then 'Direct lead unlock' else 'Lead unlock' end);

  update public.customer_leads
    set current_unlock_count = current_unlock_count + 1,
        status = case when current_unlock_count + 1 >= max_provider_unlocks then 'fully_booked'::public.lead_status_t else status end,
        updated_at = now()
    where id = p_lead_id;

  return jsonb_build_object('ok', true, 'unlock_id', v_unlock_id, 'balance_after', v_after, 'direct', v_is_directed);
end $$;
grant execute on function public.unlock_lead(uuid) to authenticated;
