alter table public.job_requests
  add column if not exists budget_range text;
