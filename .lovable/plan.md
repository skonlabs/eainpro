## What I missed last round

I changed paint, not the journey. You're right — search → book → schedule → done is still the same number of taps, the same dead-ends, the same "where am I now?" moments. This plan walks both journeys step by step, names the friction, and proposes the UX change for each step. No new tables, no new auth — pure flow + screen rewrites.

---

## Homeowner: end-to-end

```text
discover → describe → match → quote → schedule → track → complete → review → rebook
```

### 1. Discover (Home + Services)
- **Today**: Home shows greeting + 8 category icons + lists. To start a job you tap "Book a service", land on a wizard that asks for category again.
- **Change**: Home becomes one decision: a big search field ("What needs fixing?") + 6 most-likely categories under it as one-tap chips. Tapping a chip jumps straight to step 2 of the wizard with category pre-filled. Two taps to a brief, not five.
- **Add**: "Book again" row of last 3 services you used, one-tap rebook (pre-fills category, address, area).

### 2. Describe the job (Wizard)
- **Today**: Multi-step wizard with category, subcategory, urgency, budget, photos, address, contact — every field on its own screen, slow to commit.
- **Change**: Collapse to 3 steps with a visible progress bar:
  1. **What** — category + 2-3 smart questions specific to that category (already exist in `CATEGORY_QUESTIONS`) + optional description/photos.
  2. **Where & when** — saved addresses (one tap), urgency as 3 chips (Now / Today-Tomorrow / This week), optional date.
  3. **Review & invite** — show top 3 matched providers right inside the last step with rating + ETA + starting price; "Invite all 3" is the primary CTA. Skip the separate "Providers" tab entirely for first-time invites.
- **Add**: sticky action bar with Back / Continue and a clear "Step 2 of 3" indicator. Saved addresses (new client-side `localStorage` cache of past `address`+`area`+`city_slug` rows from the user's own jobs — no schema change).

### 3. Quote comparison
- **Today**: Quotes tab lists cards with price, included, warranty, etc. — heavy reading, hard to compare side-by-side.
- **Change**: A compact comparison table on mobile: provider name + rating, price, earliest, warranty in 4 columns; tap a row to expand details inline. Best-price and fastest-ETA get visible "Best price" / "Fastest" tags. Primary action stays "Accept" with confirm sheet.
- **Add**: "Message before accepting" CTA per quote that opens the thread pre-scoped to that provider.

### 4. Schedule (the part most broken today)
- **Today**: After Accept, the booking sits in limbo waiting on `time_proposed_by_*` / `time_confirmed_by_*` columns the user has to manually understand.
- **Change**: Brand new `ScheduleCard` on the Booking tab that always tells you exactly one thing:
  - *Provider hasn't proposed a time yet* → "Waiting for [Name] to propose a time" + "Suggest a time" secondary action.
  - *Provider proposed* → big date/time, "Confirm" primary + "Propose a different time" secondary.
  - *Both confirmed* → "Locked in [Date, Time]" with "Add to calendar" + "Reschedule" + "Cancel" buttons.
- **Add**: in-app date+time picker (shadcn Calendar + time chips: 9am / 12pm / 3pm / 6pm / custom) so proposing a time is 3 taps instead of typing ISO strings.

### 5. Track work (day-of)
- **Today**: Status changes (`accepted` → `on_the_way` → `started` → `completed`) happen but the customer sees only a small pill.
- **Change**: Booking tab gets a live progress strip — `Confirmed · On the way · Started · Done` — with the current step highlighted and a timestamp under it. Plus a fixed "Call / Message" action row so contacting the provider is one tap.
- **Add**: ETA hint when status flips to `on_the_way` ("[Name] is heading to you · ~20 min" — derived from provider's `response_minutes` if no real GPS, with copy that makes the estimate honest).

### 6. Complete + review
- **Today**: Completion + review live in different blocks, easy to miss.
- **Change**: When status flips to `completed`, the Booking tab swaps to a full-screen "How did it go?" panel with 4 quick stars (quality / speed / value / communication) + optional comment + "Tip provider" placeholder (UI only, no payments work). Customer can't dismiss to a blank screen; they finish the loop or explicitly "Skip review".
- **Add**: After review submit, surface a "Save [Name] as a favorite" toggle inline (uses existing `favorites` table).

### 7. Re-engage
- **Today**: My Requests is a flat list, hard to find a past provider.
- **Change**: My Requests gets two segments: **Active** (anything not completed/cancelled) and **Past**. Past items show "Book [Name] again" as the primary action when there's a favorite/completed provider, jumping straight back to step 2 with everything pre-filled.

---

## Provider: end-to-end

```text
onboard → get leads → quote → win → schedule → work → complete → get paid (placeholder) → grow
```

### 1. Onboard
- **Today**: Multi-step onboarding with services, areas, verification. Then dropped onto a dashboard.
- **Change**: After onboarding completes, route to a 3-card "You're ready" screen: *Set your availability* / *Add a profile photo* / *Browse open jobs in your area*. Each card is a 1-tap action. Removes the "now what?" cliff.

### 2. Get leads (Dashboard)
- **Today**: Dashboard has invites + active jobs mixed; provider has to scan.
- **Change**: Dashboard becomes 3 segmented tabs, each with a count badge:
  - **New leads** (invitations not yet quoted) — newest first, each card shows category · area · "X min ago" · *Send quote* primary button inline.
  - **Awaiting** (quoted, waiting on customer / time-proposed waiting on customer / scheduled but not started).
  - **Today** (anything scheduled within next 24h, ordered by time) — this is what they open in the morning.
- **Add**: A persistent stat strip at top: *N open leads · N scheduled today · ★ rating · $ this week (placeholder)*.

### 3. Quote
- **Today**: QuoteForm exists; usable but verbose.
- **Change**: Quote form becomes a single sheet with smart defaults: amount + earliest-date chips (Today / Tomorrow / This week / Custom) + optional notes. Advanced fields (warranty, cancellation policy, expiry) collapse under "More details". Submit returns to leads list with a toast + the lead instantly moves to **Awaiting**.

### 4. Win → Schedule
- **Today**: When a quote is accepted, the booking row is created but the provider has to dig to propose a time.
- **Change**: On accept, fire an in-app notification ("[Customer] accepted your quote — propose a time"). Their dashboard's **Awaiting** card for that job swaps to a single CTA: "Propose visit time" → opens the same in-app calendar+time picker from the customer flow. After propose, card moves to **Today** when the visit is within 24h.

### 5. Work (day-of)
- **Today**: Status buttons exist on the booking panel but are buried.
- **Change**: Each **Today** card on the dashboard has the next status action as the visible primary button: `On the way` → `Mark started` → `Mark complete`. Tap = one action, no navigation. Tapping the card body opens the full job for details/messages.
- **Add**: Tap-to-call and tap-to-navigate (`tel:` link + `https://www.google.com/maps?q=...` link from the address) directly on the card.

### 6. Complete → review
- **Today**: Mark complete and nothing happens until the customer reviews.
- **Change**: On mark-complete, show a sheet: "Send invoice & request review" — sends the customer a notification that includes the amount and a 1-tap "Leave review" CTA. Provider sees "Awaiting review" on their dashboard card with the customer's name and date. After review lands, dashboard auto-clears it.

### 7. Calendar + availability
- **Today**: Calendar route exists but has no block-off-time flow.
- **Change**: Month view + day view (already there). Tap empty slot → mini sheet: "Block this time" (creates a local "unavailable" booking row that customers' time-propose UI respects — uses existing `bookings` table with a `cancelled` status + reason marker, no schema change).

---

## Cross-cutting

- **Notification bell** (already exists): wire real triggers for *quote received*, *time proposed*, *time confirmed*, *status changed*, *review received*. Tapping a notification deep-links straight to the right tab.
- **Empty states**: every list (My Requests, dashboard tabs, Messages) gets a real `EmptyState` with one primary action ("Browse services" / "Set availability"), not a blank pane.
- **Skeletons everywhere**: every async view loads with skeletons matching the final shape — no more "Loading…" text.
- **Address book**: lightweight client-side cache (localStorage, last 5 unique addresses from the user's own jobs) so re-booking is instant.

---

## Out of scope (explicit)

- No payments, no chat realtime upgrades beyond what's already wired, no new auth providers, no schema changes. Everything above runs on existing tables (`job_requests`, `quotes`, `bookings`, `request_invitations`, `notifications`, `favorites`, `messages`, `reviews`).
- "Tip provider" and "Send invoice" are UI-only placeholders for now.

---

## Execution order (so you can see movement quickly)

1. **Customer hot path**: rebuilt Home (search + chips + "Book again"), wizard collapsed to 3 steps, comparison-style quotes tab, new `ScheduleCard` with in-app calendar picker.
2. **Provider hot path**: dashboard 3-segment rebuild with inline primary actions + tap-to-call/navigate, simplified quote sheet, propose-time picker.
3. **Day-of UX**: live status strip on customer booking tab + corresponding one-tap status buttons on provider dashboard cards.
4. **Close the loop**: forced review panel on completion + "Save favorite" toggle + active/past split on My Requests.
5. **Cross-cutting polish**: notifications wired to all the right triggers, real empty states, skeletons, address book.

I'll check in after step 1 with the customer hot path working end-to-end so you can see the difference before I touch the provider side. If any item above shouldn't be in scope, say so and I'll cut it.
