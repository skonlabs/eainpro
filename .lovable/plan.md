## Goal

Rebuild Eain Pro as a polished, app-feeling marketplace (not a website). One coherent visual system, one predictable booking lifecycle, every screen rebuilt against it. Brand: **Ocean Deep** palette (`#0c2340 / #1a4a6e / #2d8a9e / #5cbdb9`) with **Sora** display + **Manrope** body.

## 1. Design system (foundation — done first, everything else consumes it)

`src/styles.css`
- Replace tokens with Ocean Deep in oklch: `--background`, `--foreground`, `--card`, `--primary` (teal `#2d8a9e`), `--primary-foreground`, `--secondary` (deep navy surface), `--accent` (mint `#5cbdb9`), `--muted`, `--border`, `--ring`. Dark mode = navy surfaces, light mode = off-white with navy ink.
- Add semantic status tokens: `--status-pending`, `--status-active`, `--status-confirmed`, `--status-done`, `--status-cancelled` (+ `-foreground` pairs) so banners/chips share one source of truth.
- Add elevation/shadow tokens (`--shadow-card`, `--shadow-sheet`), radius scale (`--radius` 14px), gradient `--gradient-hero` (navy→teal).
- Load Sora (600/700) + Manrope (400/500/600/700) in `__root.tsx` head links; set `font-family` via `--font-display` / `--font-body` and apply in `body`.

Shared primitives (`src/components/ui/*` already shadcn — extend, don't fork):
- `StatusBadge` (booking/job statuses → semantic tokens).
- `EmptyState` (icon + title + subtitle + CTA).
- `Section` (consistent `rounded-2xl bg-card border` card with optional title row).
- `ActionBar` (sticky bottom action bar used by request/booking flows; replaces ad-hoc divs).

## 2. App shell

- `AppBar`: keep, restyle. Add subtle bottom hairline, larger title, contextual right-side actions slot (so screens can inject e.g. "Filter", "+ New").
- `BottomNav`: keep role-based tabs; restyle pill nav with active indicator bar, remove the floating "primary" bubble (replaced by per-screen primary CTAs — less visual noise, less mis-tap).
- Delete unused `Header.tsx` & `Footer.tsx` mounts (already unmounted; just remove files).
- Root layout: tighten max width to `max-w-screen-sm` on phone, `max-w-screen-md` desktop; consistent `px-4 pt-4 pb-28` rhythm.

## 3. Booking lifecycle (single source of truth)

A new `src/lib/booking-status.ts` derives a single `BookingState` from a booking row:
`requested → quoted → scheduled_pending → scheduled_confirmed → in_progress → completed → cancelled`.
Every screen renders status via `StatusBadge` + a single "next action" hint, so customer and provider always see the same story.

Migrations needed (user runs in Supabase SQL editor):
- Already-pending: `20260528000000_booking_schedule_confirmation.sql` and `20260528010000_fix_jobs_policy_recursion.sql`.
- (No new schema in this plan — we work with what exists.)

## 4. Screens — rebuilt

Customer
- **/ (Home)**: greeting, big "Book a service" CTA, "Active jobs" list (real cards with service name, provider, status, next action, tap → details), horizontal category scroller, recent providers row. App-style — no hero, no marketing.
- **/services, /services/$category**: dense card grid with icon + name + starting price; tap → request flow prefilled.
- **/providers, /p/$providerId**: list with rating/jobs/city chips; profile = header card + services + reviews + "Request quote" sticky CTA.
- **/request/new**: keep wizard logic, restyle as full-screen steps with progress bar + sticky `ActionBar` (Back / Continue). One question per screen on mobile.
- **/my-requests**: segmented tabs (Active / Past), real job cards, status badge, next-action line, tap → request page.
- **/request/$jobId**: redesign as 3 tabs: **Overview** (service, address, schedule, price, provider card) · **Quotes** (only when relevant) · **Messages**. Single sticky `ActionBar` whose buttons change with status (Accept quote / Confirm time / Reschedule / Mark complete / Cancel). Removes the current banner soup.

Provider
- **/provider/dashboard**: 3 segments — **New leads** · **Active jobs** · **Scheduled**. Each card: service, customer first name, area, money, status, next action. Tap = open same `/request/$jobId` shared screen (one detail screen, role-aware actions).
- **/provider/calendar**: month + day view of scheduled jobs; tap empty slot → set unavailability; tap job → details.
- **/provider/onboarding**: stepper restyled like request wizard.
- **/messages**: thread list + thread view, app-style bubbles, attach photo.

Account / auth
- **/account**: profile card, role-switch (if multi-role), language, sign out. App-style list rows with chevrons.
- **/signin, /signup, /reset-password**: centered card, brand mark, single primary CTA, secondary link. No marketing chrome.

Admin
- **/admin**: overview tiles (users, jobs, GMV), recent users table, recent jobs table. Functional, not pretty-marketing.

## 5. Feature gaps closed (end-to-end completeness)

- **Unified detail screen**: `/request/$jobId` is the single job surface for both roles. `/jobs/$jobId` redirects to it (already partially the case — finalize).
- **Schedule / reschedule loop**: provider proposes time → customer confirms → status flips to `scheduled_confirmed`. Either side can propose a new time before `in_progress`. Driven by existing `time_proposed_by` / `time_confirmed_by_*` columns once the pending migration is applied.
- **Cancellation**: explicit cancel with reason on both sides; reflected in status badge + my-requests/dashboard lists.
- **Notifications**: keep `NotificationBell`; ensure it fires on quote received, time proposed, time confirmed, job completed.
- **Empty/loading/error states**: every list screen gets a real `EmptyState` and skeleton, not a blank pane.

## 6. Out of scope (explicit)

- No new tables, no new auth providers, no payments, no chat realtime upgrades, no i18n string additions beyond what already exists.
- No marketing pages (hero/testimonials/footer) — this is an app.
- Wizard step logic untouched; only its shell restyled.

## Technical notes

- All edits are tokens + JSX + Tailwind. Server functions, RLS, route tree unchanged.
- `StatusBadge` and `booking-status.ts` are the only new shared modules; everything else extends existing files.
- Pending migrations (`20260528000000_*.sql`, `20260528010000_*.sql`) must be applied manually in Supabase before the booking flow works end-to-end — flagged in chat after code lands.
- Sora/Manrope loaded via Google Fonts `<link>` in `__root.tsx`.

## Verification

Walk these in preview after each phase: `/`, `/services`, `/request/new`, `/my-requests`, `/request/<id>`, `/provider/dashboard`, `/provider/calendar`, `/messages`, `/account`, `/signin`, `/admin`. Every screen should: render under the slim AppBar, use Ocean Deep tokens, show a single primary action, and tell the user what happens next.

## Suggested execution order

1. Tokens + fonts + shared primitives (`StatusBadge`, `EmptyState`, `Section`, `ActionBar`, `booking-status.ts`).
2. Shell (AppBar/BottomNav restyle, layout rhythm).
3. Customer home + my-requests + request detail (the hot path).
4. Provider dashboard + calendar + shared detail actions.
5. Services / providers / profile / auth / account / admin.
6. Empty/loading/error pass across all list screens.

Once approved I'll start at step 1 and check in after step 3 before continuing — that's the natural place to course-correct before I touch the provider side.