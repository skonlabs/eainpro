
## Target model

```
customer posts          provider pays credits        provider quotes
  customer_leads  -->     unlock contact info  -->     quote on lead
                                                          |
                                                          v
                              customer picks  <--   sees quotes in /my-requests
                                    |
                                    v
                                booking (status: accepted -> on_the_way -> started -> completed)
                                    |
                                    v
                                review
```

Single source of truth: `customer_leads`. `job_requests` is retired.

## Phase 1 — Schema migration (one new file under supabase/migrations/)

You will need to apply this manually in Supabase.

1. `quotes`: add `lead_id uuid references customer_leads(id)`; backfill from `job_requests` mapping where possible; drop `job_id` after backfill. Add RLS: provider can only insert a quote if a row exists in `provider_lead_unlocks` for `(provider_id, lead_id)`.
2. `bookings`: same — add `lead_id`, backfill, drop `job_id`. Update RLS accordingly.
3. `messages`: add `lead_id`, backfill, drop `job_id`.
4. `request_invitations`, `job_photos`: drop (replaced by `lead_photos` + the unlock table).
5. Drop `job_requests` table last.
6. New view `customer_lead_full` (security_invoker) that returns the full lead row only to (a) the owning customer, (b) admins, (c) providers who have an unlock row. Used by all detail pages.

## Phase 2 — Customer write path

- `src/routes/request.new.tsx`: remove the `job_requests` insert; make `customer_leads` insert the only write. Require `service_type_id` resolution (today it silently skips when pricing is missing — we'll seed default pricing).
- Seed migration: ensure every `service_types` row has a `lead_pricing` row (default price, e.g. 500 credits, 5 unlocks).

## Phase 3 — Customer read/manage path

- `src/routes/my-requests.tsx`: read from `customer_leads`, count quotes from `quotes.lead_id`.
- Replace `src/routes/request.$jobId.tsx` with `src/routes/lead.$leadId.tsx` (much smaller). Tabs: Details / Quotes / Booking / Messages / Review. Customer accepts a quote here → creates `bookings` row.
- `src/routes/jobs.$jobId.tsx`: delete (10 lines, just a redirect stub).
- `src/routes/messages.tsx`: switch to `lead_id`.

## Phase 4 — Provider path

- `src/routes/provider.leads.tsx`: after unlock, expose "Send quote" button → opens `QuoteForm` bound to `lead_id`. "Unlocked" tab shows quote status, booking status if accepted.
- `src/routes/provider.dashboard.tsx`: "Jobs" tab now lists bookings + quoted-but-pending leads (read from `quotes` + `bookings` keyed by `lead_id`). Remove the open-`job_requests` query — providers should never see customer details for free.
- `src/components/jobs/QuoteForm.tsx`: take `leadId` prop, write `quote.lead_id`.
- `src/routes/provider.calendar.tsx`: read bookings by `lead_id`.

## Phase 5 — Navigation + cleanup

- `src/components/site/BottomNav.tsx`: relabel "Jobs" → "Active" (bookings + accepted quotes).
- Update `src/routes/index.tsx` (the homeowner home that queries `job_requests` in two places) to query `customer_leads`.
- Update `src/routes/admin.tsx` lead/job counters.
- Delete unused: `request_invitations` references in code, dead status-mapping branches.

## Phase 6 — Smoke test checklist (I'll run after each phase)

- [ ] Sign in as customer, post request, see it in `/my-requests`, see "0 quotes" badge.
- [ ] Sign in as provider, see lead in `/provider/leads` (locked), unlock with credits, see contact + "Send quote".
- [ ] Send quote, customer sees it in `/my-requests/<lead>`.
- [ ] Customer accepts, booking appears in provider `/provider/dashboard` "Active" tab.
- [ ] Provider advances status to completed, customer can leave a review.
- [ ] Insufficient-credit provider blocked at unlock.
- [ ] Logged-out user / non-provider blocked from `/provider/*` routes.

## Technical risk notes

- Dropping `job_requests` is destructive. Any existing demo bookings/quotes pointing only to `job_id` will be backfilled to NULL `lead_id` and effectively orphaned. If there's production data you care about, tell me now and I'll keep `job_id` as a nullable legacy column instead of dropping it.
- The new `lead.$leadId` route replaces 2944 lines with ~500. It re-implements the status flow, messaging, photos, and review.
- Migrations don't auto-apply on your Supabase — I'll create them and tell you exactly when to run each one. Code that depends on the new schema will be merged in the same commit, so you should apply the migration before testing.

## Execution order I'll follow

1. Phase 1 migration file → ping you to apply it.
2. Phase 2 + 3 in one batch (customer side).
3. Phase 4 in one batch (provider side).
4. Phase 5 + 6 cleanup + verify.

After each batch I'll stop and let you click through before the next.
