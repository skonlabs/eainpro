-- Make sure notifications has all columns the app reads from.
alter table public.notifications
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists link text,
  add column if not exists kind text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

update public.notifications set title = coalesce(title, '') where title is null;
