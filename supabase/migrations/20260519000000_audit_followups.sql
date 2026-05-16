-- Phase 5: deep-audit follow-ups

-- 1) Persist free-text township and timing on job_requests
alter table public.job_requests
  add column if not exists township_text text,
  add column if not exists timing text;

-- 2) Fix notification deep-links: tab=chat -> tab=messages,
--    and notify every provider quoting on the job (not just the latest).
create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _customer uuid;
  _preview text;
  _link text;
  _recipient uuid;
begin
  if new.kind = 'system' then return new; end if;
  select customer_id into _customer from public.job_requests where id = new.job_id;
  _preview := case when new.kind = 'image' then '📷 Photo' else left(coalesce(new.body,''), 80) end;
  _link := '/request/' || new.job_id::text || '?tab=messages';

  if new.sender_id = _customer then
    for _recipient in
      select distinct provider_id from public.quotes
        where job_id = new.job_id and status in ('pending','accepted')
      union
      select distinct provider_id from public.bookings where job_id = new.job_id
    loop
      if _recipient is not null and _recipient <> new.sender_id then
        insert into public.notifications(user_id, kind, title, body, job_id, link)
        values (_recipient, 'message_received', 'New message', _preview, new.job_id, _link);
      end if;
    end loop;
  else
    if _customer is not null and _customer <> new.sender_id then
      insert into public.notifications(user_id, kind, title, body, job_id, link)
      values (_customer, 'message_received', 'New message', _preview, new.job_id, _link);
    end if;
  end if;
  return new;
end $$;

-- 3) Realtime: ensure key tables are published for postgres_changes
do $$ begin alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.quotes;
exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.bookings;
exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.job_requests;
exception when others then null; end $$;

-- 4) Favorites: useful index for recency ordering
create index if not exists favorites_customer_created_idx
  on public.favorites(customer_id, created_at desc);
