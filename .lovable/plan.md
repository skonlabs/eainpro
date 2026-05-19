# Provider Lead Pricing & Unlock System

This is the marketplace's core revenue model, so it must be built in stages with the database first, then provider UX, then admin. Below is the production-ready plan.

Note on backend: this project uses the user's own Supabase (not Lovable Cloud). I will produce a new migration SQL file. **You will need to run it manually in your Supabase SQL editor** — migrations do not auto-apply.

---

## 1. Database (new migration)

New tables (RLS enabled on all):

- `service_categories` — already exists as `categories`; reuse.
- `service_types` — `id, category_slug, slug, name_en, name_my, is_active, sort_order`. Seed from the 6-group catalog already in `src/lib/catalog.ts`.
- `lead_pricing` — `id, service_type_id (unique), price_credits, max_provider_unlocks, refund_allowed, is_active, updated_at`. Seeded with the 16-row pricing table you supplied. Service types not in the table default to 2,000 credits / 4 slots and `is_active=false` until admin sets them.
- `customer_leads` — full field list from the spec, FK to `service_types`, denormalized `lead_price_credits` and `max_provider_unlocks` (snapshot at creation so later admin price edits don't change historical leads). `status` enum: `active | fully_booked | closed | expired | cancelled`.
- `lead_photos` — `id, lead_id, url, sort_order`.
- `provider_wallets` — `provider_id pk, balance_credits, lifetime_topup_credits, lifetime_spent_credits, updated_at`.
- `provider_wallet_transactions` — append-only ledger. Enum: `topup | unlock | refund | adjustment`. Includes `balance_before/after`.
- `provider_credit_topups` — package, MMK amount, credits, bonus, payment ref, proof url (Supabase Storage `topup-proofs` bucket), status enum `pending | approved | rejected`, admin approver.
- `provider_lead_unlocks` — unique `(lead_id, provider_id)`. Snapshot `unlock_price_credits`. Status enum: `unlocked | contacted | quoted | won | lost | customer_no_response | invalid | completed`. `quoted_price_mmk`, `provider_notes`, `is_refunded`, `refunded_amount_credits`.
- `lead_status_history` — audit of provider lead status changes.
- `lead_refunds` — `id, unlock_id, amount_credits, reason, approved_by, created_at`.
- `admin_audit_logs` — generic admin action log.

Helpers:

- `has_role(uuid, app_role)` already exists; reuse for admin checks.
- Trigger `on_topup_approved`: when `provider_credit_topups.status` flips to `approved`, atomically credit the wallet + write a `topup` transaction.
- RPC `unlock_lead(p_lead_id uuid)` (SECURITY DEFINER) does the whole unlock atomically:
  1. lock the wallet row + lead row,
  2. validate (verified, balance, slots, not already unlocked, service match, area match, status=active, not expired),
  3. decrement wallet, insert transaction + unlock,
  4. increment `current_unlock_count`, flip lead to `fully_booked` when count reaches max,
  5. return rich error codes (`INSUFFICIENT_CREDITS`, `ALREADY_UNLOCKED`, `LEAD_FULL`, `EXPIRED`, `SERVICE_AREA_MISMATCH`, `NOT_VERIFIED`, etc.).
- RPC `refund_unlock(p_unlock_id uuid, p_amount integer, p_reason text)` admin-only, atomic refund + ledger + `lead_refunds` row.
- Scheduled job (pg_cron, optional) `expire_leads()` — closes leads older than 7 days, or 48h for `urgency='today'`.

RLS highlights:

- `customer_leads`: customers read their own; providers read **only the locked preview columns** via a `lead_previews` view filtered by service + area match; full row only via the unlock RPC return or for providers in `provider_lead_unlocks`.
- `provider_wallets` / `provider_wallet_transactions` / `provider_credit_topups`: provider reads own; admin reads all.
- `provider_lead_unlocks`: provider reads own + admin.
- `lead_pricing`, `service_types`: public read; admin write.
- All write ops on `provider_wallets`, `provider_wallet_transactions`, `lead_pricing`, `customer_leads.status` are restricted to the SECURITY DEFINER RPCs or admins.

Indexes on: `customer_leads(status, service_type_id, city_slug, created_at)`, `provider_lead_unlocks(provider_id, status)`, `provider_wallet_transactions(provider_id, created_at)`.

Storage bucket: `topup-proofs` (private, providers upload/read own, admin reads all).

---

## 2. Customer flow updates (`/request/new`)

- Extend submission to write into `customer_leads` with `lead_price_credits` + `max_provider_unlocks` resolved from `lead_pricing` at insert time.
- Add a confirmation note above submit: *"Your request will be shared with verified providers. Up to N providers may contact you."* — N pulled from pricing.
- Existing photo upload, multi-select sub-category logic stays intact (no regression to that work).

---

## 3. Provider routes

Tabs added under a new `/provider/leads` route:

- **Available** — `lead_previews` filtered by provider's services + areas, locked card per spec (service, township, urgency, short desc, price, slots remaining `X of Y unlocked`, photo count, created time, "Unlock Lead" button).
- **Unlocked** — full details, status dropdown, quoted price input, notes textarea, "Request Refund" button, call/chat/quote actions.
- **Won** — `status='won'`.
- **Lost / Closed** — `lost | invalid | customer_no_response | refunded | expired`.

Unlock modal: shows price, slots remaining, non-refundable warning, Cancel / "Unlock for X credits" calling `unlock_lead` RPC. Toast on every error code with a friendly message.

New route `/provider/wallet`:

- Big balance card + low-balance warning (< cheapest active lead price).
- 4 credit packages (10k/25k/50k/100k MMK with the bonus structure) → "Buy" opens a modal: enter payment reference, upload proof (to `topup-proofs`), submit `provider_credit_topups` row.
- Transaction history table (paginated) with type badges (top-up / unlock / refund / adjustment), lead link, before/after.

Provider onboarding already handles services + areas; reused for unlock validation.

Mobile-first: cards stack, sticky action bar on lead detail, large tap targets, MMK and credits shown with thousands separators.

---

## 4. Admin routes (`/admin`)

Add sub-tabs (gated by `has_role('admin')`):

- **Lead pricing** — table of every `service_type`: price, max slots, refund allowed, active toggle, inline edit.
- **Top-ups** — pending queue with proof image, approve/reject buttons (writes admin id + notes). Approval triggers the wallet credit trigger.
- **Refunds** — search by lead/provider, view unlock detail, "Issue refund" (full or partial credits) with required reason.
- **Lead unlocks** — table with filters by service, status, date.
- **Revenue dashboard** — KPIs from SQL views: total revenue (sum of `unlock` transactions), revenue by category, leads created/unlocked, unlock conversion %, avg providers per lead, refund count/amount, top spenders, top win-rate providers, invalid-lead rate.
- **Service categories** — activate/deactivate service types.
- **Audit log viewer** — `admin_audit_logs` table.

---

## 5. Notifications

Lightweight in-app `notifications` table + `NotificationBell` (already exists) gets new event types: `lead_matched`, `topup_approved`, `topup_rejected`, `refund_approved`, `lead_closed`, `lead_updated`, `provider_unlocked`, `provider_quoted`, `job_completed`. Triggers on the relevant table mutations insert rows; bell polls.

(SMS/Viber push out of scope for v1 — schema is ready when you add a provider.)

---

## 6. Technical details (for reference)

- All money-affecting writes go through SECURITY DEFINER RPCs; client never updates `provider_wallets` directly.
- Snapshotting `unlock_price_credits` on the unlock row keeps history immutable when admins change pricing.
- `lead_previews` is a Postgres view with only the safe columns — keeps RLS simple and prevents accidental column leaks.
- Ledger invariant: `balance_after = balance_before ± amount_credits`. Enforced in RPC, not client.
- Soft uniqueness on `(provider_id, lead_id)` prevents double unlocks at the DB level.
- Frontend: TanStack Query for all lead/wallet reads, optimistic UI only on status changes (never on unlock — that needs the server response).
- File structure: new routes `src/routes/provider.leads.tsx`, `src/routes/provider.wallet.tsx`, `src/routes/admin.pricing.tsx`, `src/routes/admin.topups.tsx`, `src/routes/admin.refunds.tsx`. Shared queries in `src/lib/leads.ts`, `src/lib/wallet.ts`.
- Migration delivered as `supabase/migrations/20260519_lead_pricing_wallet.sql` — single file you paste into the SQL editor.

---

## 7. Build order

1. Migration SQL + seed pricing.
2. `src/lib/leads.ts` + `src/lib/wallet.ts` query helpers.
3. Customer request submission → writes the new fields.
4. Provider `/provider/leads` (Available + Unlocked tabs first).
5. Provider `/provider/wallet` + top-up flow + storage bucket.
6. Admin pricing + top-up approval + refund pages.
7. Won / Lost tabs, status updates, notifications, revenue dashboard.

Each step is independently shippable; you can review after step 3 before I continue.

---

## Open questions before I start

1. Do you want admin role assignment to happen via SQL (you grant yourself `admin` in `user_roles`) or do you want a small "make me admin" bootstrap UI?
2. Top-up payment proof — upload image only, or also accept "transaction reference text only" (no proof)?
3. Should I include the optional pg_cron auto-expiry job, or leave expiry as an admin manual action for v1?
