## Goal

Stop treating Eain Pro like a marketing website. Every screen becomes an **app screen** inside a fixed app shell: compact top app bar + bottom tab nav, no hero/testimonial/footer chrome.

## What changes

### 1. App shell (`src/routes/__root.tsx` + `components/site/*`)
- Remove `<Footer />` entirely from the root layout.
- Replace `<Header />` (marketing nav with logo + links + language switcher) with a slim **AppBar**: back button (when not on a tab root), screen title, right-side actions (notifications, profile avatar). No "Sign in / Sign up" buttons in the bar — auth is handled by routes.
- Keep `<BottomNav />`, rework tabs to the app's actual surfaces and switch them based on role:
  - **Customer**: Home · Requests · Inbox · Account
  - **Provider**: Jobs · Schedule · Earnings · Account
  - **Admin**: Overview · Users · Jobs · Settings
- Add safe-area padding (`pb-[env(safe-area-inset-bottom)]`) and constrain content to `max-w-screen-md mx-auto` so it reads as an app on desktop too.

### 2. Home screen (`src/routes/index.tsx`)
Throw out the landing page (hero search, popular categories grid, "why us", reviews). Replace with a customer **Home dashboard**:
- Greeting row ("Hi, {name}") + quick action: **Book a service** (primary button → `/request/new`).
- "Active requests" card list (pulled from existing requests data) with status chips and tap → `/request/:jobId`.
- "Browse services" horizontal scroller of category chips → `/services/$category`.
- Empty state when no requests: single illustration + CTA.

Unauthenticated visitors to `/` are redirected to `/signin` (no public marketing).

### 3. Role routing
- Add a tiny `useRole()` derived from existing `AuthProvider` (`customer | provider | admin`).
- `BottomNav` and the home redirect branch on role:
  - provider → `/provider/dashboard`
  - admin → `/admin`
  - customer → stays on `/` dashboard
- Guard `/provider/*` and `/admin` so other roles get bounced to their own home (in-component check, since routes aren't under `_authenticated/` folder yet — keep scope small).

### 4. Existing pages — reskin only, no logic changes
For each of these, strip outer marketing wrappers (hero banners, large headings centred with subtitle, decorative gradients) and present them as app screens with a single `<h1>` title under the app bar and content in cards/list rows:
- `services.tsx`, `services.$category.tsx`
- `providers.tsx`, `p.$providerId.tsx`
- `request.new.tsx`, `request.$jobId.tsx`, `my-requests.tsx`
- `jobs.$jobId.tsx`
- `account.tsx`, `signin.tsx`, `signup.tsx`, `reset-password.tsx`
- `provider.dashboard.tsx`, `provider.onboarding.tsx`, `admin.tsx`, `guided.tsx`

All business logic, forms, and data fetching stay as-is.

### 5. Visual tokens
Keep current palette/fonts. Tighten: smaller section spacing (`py-4` not `py-16`), card-based content (`rounded-2xl bg-card border`), no full-width hero gradients, no decorative SVG blobs.

## Out of scope (explicitly not doing)
- Deleting routes or changing data models.
- Touching the request wizard's step logic (separate fix already shipped).
- New features (chat, payments, push). Reskin only.
- Custom domain / publish settings.

## Technical notes
- `Footer` component file stays on disk but is no longer mounted; safe to delete later.
- `Header` is replaced with a new `AppBar` component (`src/components/site/AppBar.tsx`). `Header.tsx` stays unreferenced.
- Role detection reads `user.user_metadata.role` if present, falls back to `customer`. No DB schema change.
- All edits are presentation-layer (JSX + Tailwind). No server functions, no migrations.

## Verification
After edits: load `/`, `/services`, `/request/new`, `/account`, `/provider/dashboard`, `/admin` in the preview. Each should render as a single app screen with the app bar on top and bottom tab nav, no marketing footer, no full-width hero.
