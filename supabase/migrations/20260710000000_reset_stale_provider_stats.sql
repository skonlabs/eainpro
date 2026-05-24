-- Reset rating_avg/rating_count/jobs_completed for ALL providers from source of truth.
-- Previous backfill only iterated providers that had reviews, leaving stale seeded
-- values (e.g. 4.6 / 88) intact on providers with zero real reviews.
do $$
declare r record;
begin
  for r in select id from public.providers loop
    perform public.recompute_provider_stats(r.id);
  end loop;
end $$;
