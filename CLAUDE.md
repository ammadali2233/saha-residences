# SAHA Residences: project guide for Claude

Two products on one database:
1. **Public direct-booking website** for SAHA Residences. It is pre-rendered, fast, search-optimized and mobile-first.
2. **Private operations dashboard** at `/admin`. It holds every booking across every channel, plus notes, tasks, expenses, P&L and partner balances. Mobile-first, because the owner uses it on a phone.

Full plan: `docs/phase-0-plan.md`. Decisions log: `DECISIONS.md`. Read both before non-trivial work.

## Project facts (single source; never invent beyond these)
- Brand: **SAHA Residences**. First listing: **DHA Retreat**, DHA Phase 9, Lahore, Pakistan.
- Address shown publicly: **area only** ("DHA Phase 9, Lahore"). The exact address and pin go to guests only after confirmation. Never put the exact address in markup, JSON-LD or images.
- 3 bedrooms (king, queen, two singles), 4 bathrooms, sleeps 6. Living and dining, kitchen, games room with study table, dedicated workspace, covered car porch. Solar plus UPS backup, exterior cameras, on-site caretaker.
- Area: **DHA Phase 9 Town**, Lahore.
- **Pricing:**
  - **USD 60 per night** for up to **6 guests**. **Maximum 8 guests.** Guests 7–8 pay **PKR 1,000 per extra bedding per night**.
  - Guests can view and pay in **USD or PKR**, converted with one manual USD→PKR rate set in the dashboard. Each quote stores its currency and rate.
  - There's no cleaning fee. The brand guide's USD 70/90 and USD 15 cleaning values are demo values, not real prices.
- **Payment schedule:**
  - **20% security deposit** (20% of the stay total) up front to confirm.
  - It's a **separate damage deposit**: held, never revenue, and returned after checkout.
  - The **full stay price is paid at check-in**.
  - Cancellation terms are a placeholder until the owner confirms them.
- Public phone and WhatsApp: **+92 320 5361616** (`wa.me/923205361616`), the only public number. Use the same NAP everywhere.
- Admin account email: `ammadali33@gmail.com`.
- Booking.com iCal: not connected yet.
- Photos: use the files in the repo root, with marked placeholders for missing rooms.
- Channels: Airbnb, Booking.com, Direct website, WhatsApp, Walk-in, Other (editable list).
- Owners: 4 partners. Profit splits pro-rata to capital, as computed in `src/lib/finance`.
- **Reporting currency: PKR.** Revenue can arrive in USD or PKR. Most costs are PKR.
- Business timezone: `Asia/Karachi`. Stay dates are calendar dates, not timestamps.
- Roles: admin (the only account today), staff and partner. Staff and partner are defined and tested in RLS but have no accounts yet.
- Payments: **Option A**. Request form, WhatsApp handoff and a manual advance (bank transfer or Raast). No card gateway until the business is registered. Stripe and PayPal don't serve Pakistani merchants. Safepay is the candidate gateway later.

## Brand and design tokens
- Source of truth: the SAHA brand guide v1.0, https://claude.ai/artifact/Gsy32cPwyDA38hCybEFtFG
- Token values: `design/brand-tokens.json`, copied verbatim from the guide's section 11. **Never re-derive or hand-tune values.**
- CSS variables: `src/styles/tokens.css`, generated from that JSON (`--color-*`, `--font-*`, `--type-*`, `--space-*`, `--radius-*`, `--elevation-*`, `--container-*`, `--control-*`). The base values are for mobile. Desktop type sizes apply from 768px.
- Use only the 12 approved text/background pairings in the JSON. Walnut and olive are never text on charcoal.
- Fonts: Bodoni Moda (headings, 22px and up only) and Jost (everything else). Both are self-hosted and subset, with `font-display: swap`. Preload only the fonts the first view uses.
- Icons: Lucide, 2px stroke, no fills, **inlined SVG** (no CDN).
- Photo rules: real rooms only, TVs off, no branded packaging. Text over a photo only on a flat charcoal panel or an even 45% overlay, never a gradient.
- The Behance "Kings Hideaway" design is a layout reference only. On any conflict, the brand guide wins.

## Stack and layout
- **Astro** on **Cloudflare Workers** (`@astrojs/cloudflare`). Public pages `prerender = true`. `/admin/*`, `/api/*` and `/ical/*` render on demand.
- **Supabase**: Postgres, Auth (TOTP MFA), Storage and RLS. Projects: `saha-staging` and `saha-prod`.
- UI: Astro pages with HTML forms and Astro Actions. Use **Preact islands only** where interaction requires it (date picker, calendar, quick add, lightbox).
- Plain CSS with custom properties. No Tailwind and no UI kit.
- Tests: Vitest (finance, quote, iCal parsing), pgTAP via `supabase test db` (RLS matrix), Playwright + axe-core at 360/768/1440.
- Folders:
  - `src/pages`: public pages (prerendered)
  - `src/pages/admin`: dashboard
  - `src/pages/api`: endpoints
  - `src/components`: brand components
  - `src/lib/finance`: pure money logic, fully unit-tested
  - `src/lib/sync`: iCal and CSV
  - `supabase/migrations`
  - `supabase/tests`
  - `supabase/seed.sql`: staging sample data only
- Scheduled jobs: one Cron Trigger per environment, every 15 min, running a dispatcher. Every run writes `job_runs`. A failure sends an email, and a Healthchecks.io ping catches runs that stop.

## Non-negotiable rules
**Money**
- Store amounts as `bigint` minor units plus `currency char(3)`. Never use floating point.
- Every FX-bearing row stores its own `fx_rate_to_pkr`. Never overwrite the original amount or currency.
- Financial records are soft-deleted only (`deleted_at`). Bookings, payments, expenses, contributions and distributions write to `audit_log`.

**Security**
- Enforce permissions in **RLS**, never only in the UI. Anonymous users get only the `public_availability` and `submit_booking_request` RPCs.
- Every `/admin` response carries `X-Robots-Tag: noindex, nofollow` and requires auth. Never link to `/admin` from public pages. Don't list it in robots.txt.
- No secrets in the repo. Keep them in Worker secrets and GitHub Actions secrets. Commit `.env.example`, never `.env`.
- Never commit or reuse the password shared in chat. Admin accounts use a 15+ character passphrase plus TOTP.
- Minimize guest data: name, phone, email and country only. No ID documents unless the owner asks, and only after we agree encrypted storage and a retention policy.

**Performance and SEO (public pages, mobile)**
- Lighthouse 95+ on all four categories. LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- Images: AVIF/WebP with fallbacks, srcset, explicit width and height, lazy loading below the fold. The hero image is preloaded with `fetchpriority="high"`.
- JavaScript on public pages is limited to the Book island, gallery lightbox, map and video facades, and the conversion beacon. No analytics on `/admin`.
- Each page gets a unique title and meta description, one H1, logical headings and semantic landmarks. Use canonical tags, lowercase hyphenated URLs with a trailing slash, an XML sitemap of public pages only, and OG/Twitter tags.
- JSON-LD only for content visible on the page. Allowed: WebSite, Organization, VacationRental (understanding only), BreadcrumbList. **Never** add Review, AggregateRating or FAQPage markup (Google's self-serving and FAQ rules).

**Accessibility**
- WCAG 2.2 AA on site and dashboard: visible focus (`2px solid #262523`, 2px offset), 44px minimum targets, labels above fields, clear errors, keyboard navigation, `prefers-reduced-motion`.

## Copy rules (brand voice: warm, confident, understated)
- Say the useful thing first: beds, power, parking, distance.
- Speak like a host, with "we" and "you". Contractions are fine.
- **No em dashes, no exclamation marks, no hype words** ("stunning", "luxurious", "unforgettable"), and no filler.
- Be exact about money, dates, times and rules.
- Write original copy. Never reuse Airbnb or Booking.com listing text.
- Where a fact is unknown (distances, reviews, policies, times), leave a marked placeholder: `[PLACEHOLDER: what is needed]`. Never invent one.
- Reviews are real only: quoted word for word with first name, initial and source.

## Question your reasoning (every non-trivial decision)
Before adding a framework, dependency, component, schema type, SEO tactic, feature or data-model choice:
1. **State** what you're adding and why, in one or two lines.
2. **Evidence:** cite official documentation (Google Search Central, web.dev, schema.org, MDN, framework and vendor docs), not habit or blog folklore.
3. **Cost:** name the page weight, complexity, maintenance, running cost or risk.
4. **Simpler option:** if something simpler gets 90% of the benefit, use it.
5. If you can't justify it, **don't add it**.

Log each decision in `DECISIONS.md`:
```
## D-NNN: <title>  (YYYY-MM-DD, phase N)
- What and why:
- Evidence: <link>  (mark "UNVERIFIED" if you couldn't confirm it on an official source)
- Cost:
- Simpler option considered:
- Verdict:
```
If you're unsure a practice is still current, check the latest official docs first, and tell the owner when something couldn't be verified. If an instruction looks outdated or counterproductive, say so before implementing it.

## Quality gates (end of every phase)
- Build passes with zero errors and warnings.
- Public site: mobile Lighthouse with scores reported. Structured data, HTML, sitemap and robots.txt validated.
- Dashboard: pgTAP proves staff can't see financials or other users' tasks. Sync is tested against fixture iCal files, including cancellations and overlaps.
- Finance: unit tests with worked examples (P&L, partner shares, FX, partial payments, cancellations, refunds).
- Checked at 360px, 768px and 1440px, and against the brand guide.
- Commit with clear messages. Write a short report: what was built, what was left out and why, and open risks.
