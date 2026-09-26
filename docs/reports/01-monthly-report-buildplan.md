# Everest Motoring — Monthly Report build plan

**Goal:** one downloadable, Everest-branded PDF, generated per calendar month, every figure
compared to the previous month. Three sections:

1. **Website traffic** (Google Analytics 4 Data API) — visitors, how they got here, etc.
2. **Website activity** (Supabase + Resend) — cars added / sold / deleted, leads, trade-ins,
   test drives, subscribers, emails sent per category.
3. **Social media** (ember-social app) — reach / engagement per platform.

Delivered two ways: a **Download button** in admin (any month) **and** a **cron** that emails
the PDF on the 1st of each month for the month just ended.

Footer on every page: **"Powered by Ember Automation"**. Header: Everest Motoring logo.

> **Who builds what:** Claude (architect) wrote this plan and the GA4 setup doc. **DeepSeek
> builds tasks R1–R6 below.** Each task has a self-contained prompt — give DeepSeek one task
> at a time, in order. R0 is a manual step for the client.

---

## Architecture (read once)

```
Admin "Reports" page  ──►  GET /api/admin/reports/monthly?month=YYYY-MM
Cron (1st @ 08:00)    ──►  same builder, then emails the PDF
                                   │
                                   ▼
                     src/lib/reports/build.ts  (assembler)
                       ├─ ga.ts        → GA4 Data API (2 date ranges)
                       ├─ website.ts   → Supabase (cars/leads/sales/...) this & prev month
                       ├─ emails.ts    → Resend list API, paginate+filter+categorise
                       └─ social.ts    → fetch ember-social /report endpoint (cross-project)
                                   │
                                   ▼
                     MonthlyReport.tsx  (@react-pdf/renderer document)
                                   │
                                   ▼
                          PDF stream / Buffer
```

**Date windows.** For a target month `YYYY-MM`, compute in the dealership's timezone
(`Africa/Johannesburg`):
- `curr = [first day 00:00, last day 23:59:59]`
- `prev = [first day of previous month, last day of previous month]`
Every section returns `{ current, previous }` and the PDF renders the delta (↑/↓ %, green/red).

**PDF library:** `@react-pdf/renderer` (pure JS, works on Vercel serverless — no headless
Chromium). Do **not** use Puppeteer.

**New env vars** (all already partly covered by the GA4 setup doc):
```bash
GA4_PROPERTY_ID=...
GOOGLE_APPLICATION_CREDENTIALS_JSON='{...}'
# cross-project social fetch:
EMBER_SOCIAL_REPORT_URL=https://<ember-social-domain>/api/workspaces/<EVEREST_WS>/report
EMBER_SOCIAL_REPORT_SECRET=<long-random-string>   # must match ember-social side
# monthly email recipient:
REPORT_RECIPIENT_EMAIL=alecsomers1980@gmail.com
```
(`EVEREST_WS` = the Everest Motoring workspace id in ember-social — find it in that project's
DB / dashboard URL and bake it into the URL above.)

---

## R0 — Manual (client): GA4 Data API access
See `00-ga4-data-api-setup.md`. Produces `GA4_PROPERTY_ID` +
`GOOGLE_APPLICATION_CREDENTIALS_JSON`. **Build R2 can proceed in parallel** using a stub, but
the GA section only returns real numbers once R0 is done.

---

## R1 — Capture the data we don't store yet (DeepSeek)

> **Context:** Everest Motoring Next.js app (App Router, JS, Supabase). Two metrics the
> monthly report needs aren't recorded anywhere yet: **car deletions** (the admin does a hard
> `DELETE`) and we want a clean **car lifecycle** signal. Cars *added* and *sold* are already
> derivable (`cars.created_at`, `sales.sold_at`) so do NOT build logging for those.
>
> **Task R1:**
>
> 1. **Migration** `supabase/migrations/<today>_car_events.sql`:
>    ```sql
>    create table if not exists public.car_events (
>      id uuid primary key default gen_random_uuid(),
>      event text not null check (event in ('deleted')),
>      car_id uuid,                       -- not a FK: the car row is about to be deleted
>      make text, model text, year int, price numeric,
>      created_at timestamptz not null default now(),
>      created_by uuid references auth.users(id) on delete set null
>    );
>    alter table public.car_events enable row level security;
>    create policy "admins manage car_events" on public.car_events
>      for all using (exists (select 1 from public.profiles
>        where id = auth.uid() and role = 'admin'));
>    create index if not exists car_events_created_at_idx on public.car_events(created_at);
>    ```
> 2. **Instrument the delete.** Find the admin action that hard-deletes a car
>    (`src/app/admin/inventory/page.js`, the `supabaseAdmin.from("cars").delete()` call —
>    there may be a sibling in a server action). **Before** the delete, read the car's
>    `make, model, year, price`, then insert a `car_events` row with `event='deleted'` and
>    those snapshot values. Wrap the insert in its own try/catch so a logging failure never
>    blocks the delete.
>
> **Constraints:** don't add soft-delete, don't change the cars schema, don't touch the
> add/sold paths. Minimal diff. Lint clean.

---

## R2 — GA4 data module (DeepSeek)

> **Context:** Same app. We have a GA4 service account. Env vars `GA4_PROPERTY_ID` and
> `GOOGLE_APPLICATION_CREDENTIALS_JSON` (a JSON string) are set. Timezone is
> `Africa/Johannesburg`.
>
> **Task R2:**
>
> 1. `npm i @google-analytics/data`.
> 2. Create `src/lib/reports/ga.js` exporting
>    `async function fetchGaReport({ curr, prev })` where `curr`/`prev` are
>    `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`. Build a `BetaAnalyticsDataClient` using
>    credentials parsed from `JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)`
>    (pass as `{ credentials: parsed }`). Property = `properties/${process.env.GA4_PROPERTY_ID}`.
> 3. Use `runReport` with **two `dateRanges`** (curr + prev) so each row carries both periods.
>    Pull, as separate runReport calls where dimensions differ:
>    - **Totals:** metrics `totalUsers, newUsers, sessions, screenPageViews,
>      averageSessionDuration, bounceRate, engagementRate` (no dimension).
>    - **Acquisition:** dimension `sessionDefaultChannelGroup`, metric `sessions, totalUsers`.
>      (This is the "how did they get to the site" breakdown: Organic Search, Direct,
>      Referral, Organic Social, Paid, Email, etc.)
>    - **Top pages:** dimension `pagePath`, metric `screenPageViews`, limit 10.
>    - **Devices:** dimension `deviceCategory`, metric `sessions`.
>    - **Geo:** dimension `city` (and/or `country`), metric `sessions`, limit 10.
> 4. Return a plain object:
>    ```js
>    { totals: { current:{...}, previous:{...} },
>      channels: [{ name, currentSessions, previousSessions }],
>      topPages: [{ path, views }],
>      devices: [{ name, sessions }],
>      geo: [{ name, sessions }] }
>    ```
>    For the two-date-range calls, GA returns a `dateRange` column (`date_range_0` = curr,
>    `date_range_1` = prev) — split rows accordingly.
> 5. Add a debug route `src/app/api/admin/reports/ga-test/route.js` (GET, admin-gated like the
>    other admin APIs) that calls `fetchGaReport` for the last 30 vs prior 30 days and returns
>    the JSON. This is the sanity-check from the setup doc.
>
> **Resilience:** if env vars are missing or the API errors, return
> `{ available:false, error }` rather than throwing — the report must still render the other
> sections with a "Google Analytics not connected" note.
>
> **Constraints:** no other deps. Don't log the credentials. Lint clean.

---

## R3 — Website activity + email modules (DeepSeek)

> **Context:** Same app. Supabase admin client available via the project's existing server
> helper (match how other admin API routes import it). Tables: `cars(created_at, status,
> price)`, `sales(sold_at, car_id)`, `car_events(event, created_at)` [from R1],
> `leads(created_at, status, type?)`, `value_my_car_requests(created_at)`,
> `book_test_drive`/bookings table (find the real name), `newsletter_subscribers` (find the
> real name). Emails go through Resend (`src/lib/resend.js`) and are NOT stored — pull them
> from the Resend API.
>
> **Task R3a — `src/lib/reports/website.js`** exporting
> `async function fetchWebsiteActivity({ curr, prev })`. For BOTH windows compute:
> - `carsAdded` = count `cars` where `created_at` in window.
> - `carsSold` = count `sales` where `sold_at` in window;
>   `salesListValue` = sum of `cars.price` joined via `sales.car_id` (label it "list value",
>   it's not final sale price — there's no price column on `sales`).
> - `carsDeleted` = count `car_events` where `event='deleted'` and `created_at` in window.
> - `leads` total + breakdown by `status` (and by `type` if the column exists).
> - `tradeInRequests` = count `value_my_car_requests` in window.
> - `testDrives` = count bookings in window.
> - `subscribersGained` = count newsletter subscribers created in window.
> Return `{ current:{...}, previous:{...} }`. Verify real table/column names against
> `supabase/migrations/*` before writing queries — don't guess.
>
> **Task R3b — `src/lib/reports/emails.js`** exporting
> `async function fetchEmailStats({ curr, prev })`:
> - Resend's list endpoint (`resend.emails.list({ limit: 100, before })`) has **no date
>   filter** — only cursor pagination. Walk backwards: start with no cursor, then pass the
>   last email's `id` as `before`, accumulating until a page's oldest `created_at` is before
>   `prev.start` (then stop). Cap at ~20 pages for safety.
> - Each email object has `created_at`, `to`, `subject`, `last_event`. Bucket every email into
>   the right window (curr / prev / ignore).
> - **Categorise by subject** using this map (extend by scanning the send sites — there are
>   ~8: contact, vehicle inquiry, trade-in offer, welcome, newsletter, 6-month, 1-year
>   anniversary, admin notifications):
>   | subject contains | category |
>   |---|---|
>   | `Anniversary` / `Six months with your` | Customer retention |
>   | `New Website Contact Message` | Contact form (internal) |
>   | `New Vehicle Inquiry` | Lead inquiry (internal) |
>   | `Latest Arrivals` | Newsletter |
>   | `Trade-In` / `Offer` | Trade-in offer |
>   | `Welcome` | Welcome |
>   | (anything else) | Other |
>   Find the exact subjects in: `src/app/contact/actions.js`,
>   `src/app/inventory/[id]/actions.js`, `src/app/admin/trade-ins/`, `src/lib/newsletter.js`,
>   `src/app/api/cron/anniversary-emails/route.js`, `src/emails/*`.
> - Return `{ current: { total, byCategory: {cat:count} }, previous: {...} }`.
> - If `RESEND_API_KEY` is missing, return `{ available:false }`.
>
> **Constraints:** no new deps (the `resend` SDK is already installed). All counts must be for
> the given windows only. Lint clean.

---

## R4 — Social section, cross-project (DeepSeek)

> This task touches **two projects**. The Everest app fetches from the **ember-social** app.
>
> **Part A — ember-social side.** Add `src/app/api/workspaces/[id]/report/route.ts` (GET):
> - Accepts `?month=YYYY-MM`. Computes curr + prev month windows.
> - Auth: require header `x-report-secret` to equal `process.env.REPORT_API_SECRET`; else 401.
> - Resolve workspace via the existing `resolveWorkspaceId` helper.
> - Reuse the aggregation logic in `src/app/api/workspaces/[id]/analytics/route.ts`, but scope
>   `post_results` to each window via the joined `posts.scheduled_at`, and run it twice
>   (curr, prev). Return:
>   ```json
>   { "current": { "totals": {...}, "perPlatform": {...}, "postsPublished": N },
>     "previous": { "totals": {...}, "perPlatform": {...}, "postsPublished": N } }
>   ```
>   `postsPublished` = count of distinct `posts` with `status='published'` and
>   `scheduled_at` in window for the workspace.
> - Add `REPORT_API_SECRET` to ember-social env (and Vercel).
>
> **Part B — Everest side.** `src/lib/reports/social.js` exporting
> `async function fetchSocialReport({ month })`:
> - `fetch(process.env.EMBER_SOCIAL_REPORT_URL + '?month=' + month, { headers: { 'x-report-secret': process.env.EMBER_SOCIAL_REPORT_SECRET } })`.
> - On non-200 / missing env, return `{ available:false }` so the PDF can show "Social not
>   connected".
> - Otherwise return the parsed `{ current, previous }`.
>
> **Constraints:** don't change the existing ember-social analytics route — add a new one.
> Lint + typecheck clean on both sides.

---

## R5 — The branded PDF document (DeepSeek)

> **Context:** Everest app. `@react-pdf/renderer` for server-side PDF. Brand: logo at
> `public/images/logo.png`; primary colour is the site's yellow (`--primary`, roughly
> `#FFFF01` — confirm in `tailwind.config.mjs`); dark `#0a0a0a`. Footer must read
> **"Powered by Ember Automation"** on every page.
>
> **Task R5:** `npm i @react-pdf/renderer`. Create `src/lib/reports/MonthlyReport.jsx`
> exporting a React component `<MonthlyReport data={...} monthLabel="May 2026" />` that returns
> a `<Document>`. Pages/sections:
>
> 1. **Cover band** (top of page 1): Everest logo, "Monthly Performance Report",
>    `monthLabel`, "compared to {prev month}".
> 2. **Website Traffic** (from `data.ga`): a row of stat tiles — Total Visitors, New Visitors,
>    Sessions, Page Views, Avg. Engagement — each showing the number and a **delta chip**
>    (`▲ 12%` green / `▼ 8%` red / `—` grey) vs previous month. Then an **acquisition table**
>    (channel | sessions | prev | Δ) and small Top Pages / Devices / Locations tables. If
>    `data.ga.available === false`, render a muted "Google Analytics not connected yet" panel.
> 3. **Website Activity** (from `data.website`): stat tiles for Cars Added, Cars Sold (+ list
>    value), Cars Deleted, New Leads, Trade-in Requests, Test Drives, New Subscribers — each
>    with a delta chip. Then an **Emails Sent** table (category | this month | last month | Δ)
>    from `data.emails`.
> 4. **Social Media** (from `data.social`): per-platform table (Platform | Reach | Engagement |
>    Posts) with deltas, plus headline tiles for total reach & engagement. Muted panel if
>    `available === false`.
> 5. **Footer (fixed, every page):** left = "Everest Motoring", centre = page number, right =
>    **"Powered by Ember Automation"**. Use react-pdf `fixed` + `render={({pageNumber}) => ...}`.
>
> Build small reusable subcomponents: `<StatTile label value delta />`, `<DeltaChip curr prev/>`
> (computes % and colour), `<Section title>`, `<DataTable columns rows />`. Keep styles in one
> `StyleSheet.create`. Use the brand colours. Money formatted as `R 123 456` (en-ZA).
>
> **Constraints:** no images fetched over network except the local logo. Component must be
> pure (data in → Document out), no data fetching inside. Lint clean.

---

## R6 — Routes, assembler, cron, admin UI (DeepSeek)

> **Context:** wire R2–R5 together and expose them.
>
> **Task R6:**
>
> 1. **Date helper** `src/lib/reports/period.js`: `getMonthWindows(month?)` → given
>    `'YYYY-MM'` (default = last completed month), return `{ monthLabel, prevLabel, curr, prev }`
>    with `curr`/`prev` as `{ start, end }` `YYYY-MM-DD` strings in `Africa/Johannesburg`.
> 2. **Assembler** `src/lib/reports/build.js`: `buildReportData(month)` calls `fetchGaReport`,
>    `fetchWebsiteActivity`, `fetchEmailStats`, `fetchSocialReport` (in parallel,
>    `Promise.allSettled` so one failure doesn't kill the report) and returns
>    `{ monthLabel, prevLabel, ga, website, emails, social }`. Also
>    `renderReportPdf(month)` → builds data, renders `<MonthlyReport>` via
>    `@react-pdf/renderer`'s `renderToBuffer`, returns a `Buffer`.
> 3. **Download route** `src/app/api/admin/reports/monthly/route.js` (GET, admin-gated): reads
>    `?month=YYYY-MM`, returns the PDF buffer with
>    `Content-Type: application/pdf` and
>    `Content-Disposition: attachment; filename="Everest-Report-${month}.pdf"`.
> 4. **Cron** `src/app/api/cron/monthly-report/route.js`: protect with the project's existing
>    cron-secret check (match the other cron routes — likely a `CRON_SECRET` bearer or Vercel's
>    `x-vercel-cron` header). Build last-completed-month PDF, email it to
>    `REPORT_RECIPIENT_EMAIL` via Resend with the PDF as an **attachment**
>    (`attachments: [{ filename, content: buffer }]`), subject
>    `"Everest Motoring — {monthLabel} Report"`. Register in `vercel.json`:
>    ```json
>    { "path": "/api/cron/monthly-report", "schedule": "0 7 1 * *" }
>    ```
>    (07:00 UTC = 09:00 SAST on the 1st. The project already has 6 crons → Pro plan → fine.)
> 5. **Admin UI** `src/app/admin/reports/page.js` + a small client component: a month
>    `<select>` (last 12 months) and a **"Download PDF"** button that hits the download route.
>    Add a nav link from the admin dashboard. Replace the existing dead `window.print()`
>    "Generate Performance Report" button (`GenerateReportButton.jsx`) so it links here
>    instead — that's the only existing report UI and it currently just prints the screen.
>
> **Constraints:** PDF generation can be slow — set the route `maxDuration` if needed
> (`export const maxDuration = 60`). Don't block the cron on a slow social fetch (the assembler
> already uses `allSettled`). Lint + typecheck clean.

---

## Build order & verification

| Task | Depends on | Done when |
|---|---|---|
| R0 (client) | — | `/api/admin/reports/ga-test` returns numbers |
| R1 | — | deleting a car inserts a `car_events` row |
| R2 | R0 | ga-test route returns curr+prev totals |
| R3 | R1 | website.js + emails.js return correct counts for a known month |
| R4 | — | ember-social `/report` returns 200 with secret; Everest social.js parses it |
| R5 | shape of R2–R4 | `<MonthlyReport>` renders with mock data |
| R6 | R2–R5 | Download button produces a branded PDF; cron emails it |

**Final acceptance:** Download "May 2026" → branded PDF with all four data blocks, every metric
showing a vs-April delta, Everest logo header, "Powered by Ember Automation" footer on each
page. Cron emails the same on the 1st.

## Out of scope (note, don't build)
- Per-day GA charts / funnels (tiles + tables only for v1).
- Historical email/deletion backfill before logging existed (deletions) — emails come from
  Resend's retained window only.
- Final sale prices (no column; using list value).
- Multi-recipient / client-portal hosting of the PDF (email + button only).
