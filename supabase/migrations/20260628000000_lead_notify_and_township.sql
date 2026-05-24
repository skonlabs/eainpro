-- =====================================================================
-- Fixes:
--  1) Provider lead notifications: directed leads always notify the
--     directed provider (no service/area match required), and broadcast
--     leads no longer require is_verified so onboarding providers also
--     see them. Unlock still requires verification.
--  2) Persist a township slug on customer_leads so request details can
--     display city + township + address.
-- Safe to re-run.
-- =====================================================================

alter table public.customer_leads
  add column if not exists township_slug text;

create or replace function public.on_customer_lead_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cat text;
  v_name text;
  v_title text;
  v_body text;
begin
  select category_slug, name_en into v_cat, v_name
    from public.service_types where id = new.service_type_id;
  if v_cat is null then return new; end if;

  v_title := 'New ' || v_name || ' lead in ' || new.city_slug;
  v_body  := 'Unlock for ' || new.lead_price_credits || ' credits to see customer details.';

  if new.directed_provider_id is not null then
    insert into public.notifications(user_id, kind, title, body, link)
    values (new.directed_provider_id, 'new_matching_lead',
            'Direct request: ' || v_name,
            'A customer sent this request directly to you. Unlock to see details.',
            '/provider/leads');
    return new;
  end if;

  insert into public.notifications(user_id, kind, title, body, link)
  select distinct p.id, 'new_matching_lead', v_title, v_body, '/provider/leads'
    from public.providers p
    join public.provider_services ps
      on ps.provider_id = p.id and ps.category_slug = v_cat
    join public.provider_service_areas sa
      on sa.provider_id = p.id and sa.city_slug = new.city_slug
   where coalesce(p.is_suspended, false) = false;
  return new;
end $$;

drop trigger if exists trg_customer_lead_notify on public.customer_leads;
create trigger trg_customer_lead_notify
  after insert on public.customer_leads
  for each row execute function public.on_customer_lead_notify();
