# Decisions log

Format and rules: see "Question your reasoning" in `CLAUDE.md`. "UNVERIFIED" means I couldn't confirm a claim on an official source as of the date shown.

---

## D-001: One Astro app, public pages prerendered, `/admin` rendered on demand  (2026-10-18, phase 0)
- What and why: one codebase and one deploy. Public pages ship as static HTML with almost no JS. The dashboard needs server rendering for auth.
- Evidence: Astro docs on islands architecture and on-demand rendering (https://docs.astro.build/en/concepts/islands/, https://docs.astro.build/en/guides/on-demand-rendering/).
- Cost: one framework; admin and public share an origin.
- Simpler option considered: a separate admin SPA on a subdomain. That means two builds and deploys, plus CORS, with no benefit for one admin.
- Verdict: adopt. Islands keep admin JS off public pages.

## D-002: Host on Cloudflare Workers (static assets + Cron Triggers)  (2026-10-18, phase 0)
- What and why: the free tier allows commercial use, serves static assets free and includes cron, R2 and Web Analytics in one account.
- Evidence: https://developers.cloudflare.com/workers/platform/limits and https://developers.cloudflare.com/workers/platform/pricing (Free: 100k requests/day, 10 ms CPU per invocation, 5 cron triggers per account).
- Cost: 10 ms CPU on Free. I/O wait doesn't count. If it's exceeded, Workers Paid is USD 5/mo.
- Simpler option considered: Netlify (comparable). Vercel Hobby is for non-commercial use only.
- Verdict: adopt.

## D-003: Supabase for Postgres, Auth (TOTP MFA), Storage and RLS  (2026-10-18, phase 0)
- What and why: managed Postgres with built-in auth and row-level security, so permissions live in the database, not the UI.
- Evidence: https://supabase.com/pricing (Free: 500 MB DB, 1 GB storage, 2 active projects, pauses after 1 week idle, no automatic backups).
- Cost: on the free tier we must run our own backups and watch for pausing.
- Simpler option considered: Neon (Postgres only) would need separate auth and storage.
- Verdict: adopt. Staging and prod on Free, with prod moving to Pro (USD 25/mo) when revenue is steady.

## D-004: Nightly backups via GitHub Actions `pg_dump` to Cloudflare R2, with a monthly restore drill  (2026-10-18, phase 0)
- What and why: Supabase Free has no backups, and the brief requires daily backups with a tested restore.
- Evidence: Supabase pricing page (above).
- Cost: one workflow and an R2 bucket (free under 10 GB).
- Simpler option considered: Supabase Pro backups (USD 25/mo). Better, but not needed yet.
- Verdict: adopt now. Revisit when moving to Pro.

## D-005: UI is Astro forms + Actions, with Preact islands only where needed. Plain CSS from brand tokens  (2026-10-18, phase 0)
- What and why: forms work without JS and are accessible by default. Preact is about 4 KB. Tokens map 1:1 to CSS variables.
- Evidence: Astro Actions docs (https://docs.astro.build/en/guides/actions/).
- Cost: two rendering styles in the dashboard.
- Simpler option considered: a full React SPA is heavier. Tailwind would add a second token system.
- Verdict: adopt.

## D-006: Booking option A (request + WhatsApp + manual advance)  (2026-10-18, phase 0)
- What and why: the business isn't registered yet, so no Pakistani gateway can onboard it. Option A has zero fees and matches how guests book today.
- Evidence:
  - Stripe doesn't list Pakistan (https://stripe.com/global, checked 2026-10-17).
  - Safepay holds an SBP commercial licence (Profit, Apr 2025: https://profit.pakistantoday.com.pk/?p=193897) and accepts international Visa/Mastercard via Cybersource.
  - PayPal has no Pakistani merchant accounts. UNVERIFIED on PayPal's own site.
  - Safepay fees of ~3.2% + Rs 30 for international cards. UNVERIFIED.
- Cost: manual confirmation. Foreign guests pay by transfer or on arrival.
- Simpler option considered: this is the simplest option. B (a PMS) costs USD 30–100+/mo, its payments rely on Stripe or PayPal, and it duplicates the dashboard. C (custom engine + Safepay) needs registration first.
- Verdict: A now. Add a Safepay payment link after registration. Move to C only if volume demands it.

## D-007: iCal export, one feed per consumer platform, no guest data  (2026-10-18, phase 0)
- What and why: blocks platforms when a WhatsApp or offline booking is made. A feed never includes that platform's own bookings, which prevents loops.
- Evidence:
  - Airbnb imports calendars about every 3 hours (https://www.airbnb.com/help/article/99).
  - Booking.com's interval is UNVERIFIED.
- Cost: double-booking window of up to ~3 h on Airbnb, possibly longer on Booking.com.
- Simpler option considered: manual blocking only, which is error-prone.
- Verdict: adopt. The dashboard prompts a manual block for bookings starting within 7 days.

## D-008: iCal import matched by reservation code, then UID. Missing events flagged, never deleted  (2026-10-18, phase 0)
- What and why: the owner's real Airbnb feed (checked 2026-10-18) has `Reserved` events whose description includes the reservation code, plus `Airbnb (Not available)` blocks. The code is also in Airbnb's payout CSV, so it links both.
- Evidence: the feed contents. Airbnb transaction history CSV (https://www.airbnb.com/help/article/418).
- Cost: parser logic per platform.
- Simpler option considered: UID only. Weaker if UIDs change.
- Verdict: adopt. Don't store the last 4 phone digits from the feed (data minimization). Only future events missing from a feed get flagged.

## D-009: Payout data via CSV import with a review step  (2026-10-18, phase 0)
- What and why: the Airbnb API is closed to new partners, and the Booking.com Connectivity API is for connectivity providers. CSV export is the realistic route.
- Evidence:
  - Airbnb help article 418.
  - Airbnb API status from vendor sources only: UNVERIFIED on Airbnb's site.
  - Booking.com export format UNVERIFIED, hence a column-mapping step.
- Cost: manual upload monthly or per payout.
- Simpler option considered: typing payouts by hand. Slower and error-prone.
- Verdict: adopt.

## D-010: Reminders by email (Resend)  (2026-10-18, phase 0)
- What and why: one admin needs a daily digest and per-task reminders. Email is free and reliable.
- Evidence:
  - Meta charges per delivered template message. Utility templates outside the 24 h window are charged (https://developers.facebook.com/docs/whatsapp/pricing).
  - Resend free tier limits UNVERIFIED (to check at signup).
- Cost: one vendor. Until the domain exists, it only sends to the owner's own address.
- Simpler option considered: WhatsApp Business Platform needs a Meta business setup, template approval and per-message fees. Not justified. Web push is an optional Phase 6 item.
- Verdict: adopt email.

## D-011: Analytics with Cloudflare Web Analytics + first-party conversion events. No cookie banner  (2026-10-18, phase 0)
- What and why: cookieless pageviews and Core Web Vitals. Our 4 conversion events (booking started, request submitted, WhatsApp click, phone click) are stored in our own database without IP.
- Evidence: Cloudflare Web Analytics docs (https://developers.cloudflare.com/web-analytics/). Whether it supports custom events is UNVERIFIED, which is why we use our own endpoint.
- Cost: a tiny `/api/e` endpoint.
- Simpler option considered: GA4 is heavier, sets cookies and needs consent for EU/UK visitors.
- Verdict: adopt. No analytics on `/admin`.

## D-012: Structured data limited to WebSite, Organization, VacationRental and BreadcrumbList  (2026-10-18, phase 0)
- What and why: mark up only what fits and is visible. Claim no rich results we can't get.
- Evidence:
  - VacationRental rich results are limited to Hotel Center partners (https://developers.google.com/search/docs/appearance/structured-data/vacation-rental).
  - Self-serving reviews are ineligible for stars (https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
  - FAQ rich results limited since 2023, with deprecation reported for June 2026 (SEJ). The deprecation is UNVERIFIED on Google's docs.
  - Current breadcrumb display on mobile is UNVERIFIED.
- Cost: small JSON-LD per page.
- Simpler option considered: no markup at all. But WebSite feeds Google's site-name feature, and the rest is cheap.
- Verdict: adopt. No Review, AggregateRating or FAQPage markup. No geo, since the address is area-only.

## D-013: No Google Business Profile for the house  (2026-10-18, phase 0)
- What and why: Google lists rental and vacation homes as ineligible. A profile risks suspension.
- Evidence: Google Business Profile eligibility guidelines (https://support.google.com/business/answer/13763036). The exact wording was reviewed via search summaries; re-read it before any GBP decision.
- Cost: we lose a local-pack listing we weren't eligible for anyway.
- Simpler option considered: n/a.
- Verdict: keep NAP consistent for citations. Revisit only if a staffed office opens.

## D-014: No llms.txt  (2026-10-18, phase 0)
- What and why: there's no evidence it helps.
- Evidence: Google says Search doesn't use it and it "won't harm (nor help)" (reported by Search Engine Land: https://searchengineland.com/google-says-llms-txt-files-wont-harm-or-help-your-search-rankings-480264).
- Cost: n/a.
- Simpler option considered: clear factual statements on the page, which is what we do.
- Verdict: skip.

## D-015: Admin protected by auth + `X-Robots-Tag: noindex`, not by robots.txt  (2026-10-18, phase 0)
- What and why: robots.txt is public, advisory and doesn't stop indexing of linked URLs. Disallowing `/admin` would also hide the noindex header from crawlers.
- Evidence: Google Search Central, robots.txt introduction and "Block search indexing with noindex" (https://developers.google.com/search/docs/crawling-indexing/robots/intro, https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- Cost: none.
- Simpler option considered: n/a.
- Verdict: adopt. Also use TOTP MFA and a 15+ character passphrase in place of the password shared in chat.

## D-016: Data model choices  (2026-10-18, phase 0)
- What and why:
  - Money as `bigint` minor units plus currency, with the FX rate stored per row.
  - Stay dates as `date`.
  - Soft delete and an audit log for financial tables.
  - Overlaps **warn, not block**, because platform feeds can create real conflicts we must surface.
  - `properties` table from day one, so more listings are just new records.
- Evidence: PostgreSQL docs on numeric types and range types (https://www.postgresql.org/docs/current/datatype-numeric.html, https://www.postgresql.org/docs/current/rangetypes.html).
- Cost: derived views for payment status and reports.
- Simpler option considered: an exclusion constraint that blocks overlaps. That would make sync inserts fail exactly when we need to see the conflict.
- Verdict: adopt.

## D-017: Finance rules  (2026-10-18, phase 0)
- What and why:
  - Revenue accrues per night, so stays split across months. A separate cash report covers payments received.
  - Capex sits outside the P&L, with payback progress shown.
  - Partner ownership % is cumulative PKR capital at each month end. Monthly profit is allocated at that month's %.
  - Partner-paid expenses are reimbursable by default.
- Evidence: owner's brief. These are standard management-accounting conventions, not a legal or tax position.
- Cost: monthly allocation logic, fully unit-tested.
- Simpler option considered: allocating by period-end % only. That misstates shares when capital changes mid-period.
- Verdict: adopt, pending owner confirmation of the partner agreement (open question 7).

## D-018: Virtual tour via YouTube behind a click-to-load facade. Map via click-to-load embed  (2026-10-18, phase 0)
- What and why: keep third-party JS off first load while still offering video and a map.
- Evidence: web.dev on third-party embeds and facades (https://web.dev/articles/embed-best-practices).
- Cost: YouTube branding after the click.
- Simpler option considered: self-hosting the 82 MB video would need transcoding and adaptive streaming.
- Verdict: adopt.

## D-020: Dual-currency pricing with one manual display rate  (2026-10-18, phase 0)
- What and why: guests can see and pay in USD or PKR (owner's answer). The base rate is in USD and extra bedding is in PKR, so a quote mixes currencies.
- Evidence: owner's answers, 2026-10-18.
- Cost: the dashboard needs one rate setting, and each quote stores its currency and the rate it used.
- Simpler option considered: an automated FX feed. That adds a vendor and moving prices. A manual rate is predictable, matches the "manual by default" FX rule, and can be revisited later.
- Verdict: adopt. Each fee is stored in its own currency. PKR totals round to whole rupees and USD totals to whole cents.

## D-021: Security deposit modelled as a liability, not revenue  (2026-10-18, phase 0)
- What and why: the 20% deposit is a separate damage deposit, held and returned after checkout (owner's answer). Counting it as revenue would overstate the P&L and partner shares.
- Evidence: owner's answers, 2026-10-18.
- Cost: three extra payment kinds (`deposit_received`, `deposit_refunded`, `deposit_retained`), plus a "deposits held" line on the dashboard and in the cash report.
- Simpler option considered: treating the deposit as an advance on the stay price. That doesn't match how the owner runs it.
- Verdict: adopt. Only a recorded retention (damage deduction) becomes other income.

## D-022: MFA (aal2) enforced inside RLS, not only in middleware  (2026-10-18, phase 1)
- What and why: every policy goes through `private.has_role()`, which needs both the role and `aal = aal2` in the JWT. A stolen password alone reads nothing, even through a direct API call.
- Evidence: Supabase MFA docs, "Enforce rules for MFA logins" (https://supabase.com/docs/guides/auth/auth-mfa). Proven by pgTAP: admin at aal1 sees zero rows.
- Cost: one helper function per policy check.
- Simpler option considered: checking aal only in the Astro middleware. That leaves the database open to anyone holding an aal1 token.
- Verdict: adopt.

## D-023: Staff read bookings through a definer view without money columns  (2026-10-18, phase 1)
- What and why: every app user shares the Postgres `authenticated` role, so column grants can't differ between admin and staff. `public.bookings_ops` exposes operational columns only, and its WHERE clause checks the role.
- Evidence: PostgreSQL docs on views and RLS (https://www.postgresql.org/docs/current/sql-createview.html).
- Cost: Supabase's linter flags definer views. Documented here as intentional.
- Simpler option considered: a separate staff table. That duplicates data.
- Verdict: adopt. Proven by pgTAP (`hasnt_column gross_minor`, staff reads of payments, expenses and capital are empty).

## D-024: Website requests store the guest's quote, but the price isn't trusted  (2026-10-18, phase 1)
- What and why: under option A every request is confirmed by hand, and the admin sets the real amount at confirmation. Pricing logic lives in one tested TypeScript `quote()` (Phase 2), not duplicated in SQL.
- Evidence: D-006.
- Cost: a forged quote could only create an inquiry with a wrong informational price.
- Simpler option considered: duplicating pricing in SQL. That means two sources of truth.
- Verdict: adopt. The RPC still re-checks dates, guest limits and availability, and rate-limits requests (3 per phone per day, 30 per hour).

## D-025: Currencies limited to PKR and USD  (2026-10-18, phase 1)
- What and why: those are the only two currencies in the brief. Both have 2 decimals, so cents × rate = paisa exactly.
- Evidence: owner's brief.
- Cost: adding EUR or GBP later needs a one-line migration to the `currency_code` domain.
- Simpler option considered: free-form ISO codes. That allows typos and currencies with other decimal counts.
- Verdict: adopt.

## D-026: Backups cover `public` and `auth`. Storage files are backed up separately  (2026-10-18, phase 1)
- What and why: a full data dump includes Supabase-managed `storage` tables that the `postgres` role can't restore (found in the local drill). Business data plus logins is what we need to recover.
- Evidence: local restore drill, 2026-10-18. Every table restored with matching counts.
- Cost: receipt and photo files need their own sync to R2 (Phase 5).
- Simpler option considered: Supabase Pro managed backups (D-004).
- Verdict: adopt.

## D-027: Astro sessions off, build-time image optimization  (2026-10-18, phase 1)
- What and why: the Cloudflare adapter turns on KV-backed sessions by default, but auth lives in Supabase cookies. `imageService: 'compile'` optimizes images at build time with no runtime image binding or cost.
- Evidence: @astrojs/cloudflare docs (https://docs.astro.build/en/guides/integrations-guide/cloudflare/).
- Cost: images uploaded in the dashboard appear after "Publish site" (planned in D-001).
- Simpler option considered: n/a.
- Verdict: adopt.

## D-028: Playwright + axe brought forward to Phase 1  (2026-10-18, phase 1)
- What and why: the quality gates need WCAG 2.2 AA and 360/768/1440 checks for the dashboard too. The in-app browser was unavailable, so headless checks were the reliable path.
- Evidence: axe-core rule tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` (https://github.com/dequelabs/axe-core/blob/develop/doc/API.md).
- Cost: dev dependency plus a Chromium download.
- Simpler option considered: manual Lighthouse runs only. Not repeatable.
- Verdict: adopt.

## D-029: Public pages build without database secrets, and prerender in Node  (2026-10-18, phase 1)
- What and why:
  - The staging build failed because the admin middleware loaded the Supabase secrets on import. That would also have failed CI, which has no secrets.
  - The secrets are now optional at build time. `supabaseForRequest()` throws if a live request needs them and they're missing.
  - Prerendering in Node removes a Wrangler warning about the already-flattened staging environment. Static pages use no Cloudflare bindings.
- Evidence: @astrojs/cloudflare `prerenderEnvironment` option (https://docs.astro.build/en/guides/integrations-guide/cloudflare/), and the staging build log of 2026-10-18.
- Cost: prerendered pages don't run in workerd, so any page that needs a binding must render on demand.
- Simpler option considered: putting secrets in CI. That puts secrets where they aren't needed.
- Verdict: adopt.

## D-030: Phase 2 listing copy lives in the repo; live pricing and availability come from the database  (2026-10-18, phase 2)
- What and why:
  - Rooms, amenities, rules, nearby times and photos sit in `src/content/listings.ts`, so the site builds with no database secrets (D-029).
  - Quotes and availability on the Book page come from `public_pricing` and `public_availability` at request time, so prices and blocked dates are always current.
- Evidence: Astro content via plain modules (https://docs.astro.build/en/guides/imports/).
- Cost: until Phase 4, copy changes need a code edit, and the "From USD 60" display price is set in two places (content file and database).
- Simpler option considered: reading everything from the database at build. That needs build-time secrets and the dashboard editor, which are Phase 4 scope.
- Verdict: adopt for Phase 2. Phase 4 moves the editable fields (price, photos, listings) to the database, with a Publish rebuild.

## D-031: Brand fonts through Astro's Fonts API (Fontsource provider)  (2026-10-18, phase 2)
- What and why:
  - Bodoni Moda 400 and Jost 400/500 (latin subset) are downloaded at build and served from our own domain, with `font-display: swap`.
  - Astro generates metric-matched fallback faces, so swapping fonts doesn't shift layout. Measured CLS is 0 on every page.
  - Only the first-view files are preloaded: Bodoni 400 and Jost 400.
- Evidence: Astro fonts guide (https://docs.astro.build/en/guides/fonts/), web.dev on font best practices (https://web.dev/articles/font-best-practices).
- Cost: Astro renames families with a hash, so `site.css` points `--font-display` and `--font-sans` at the generated variables. The token values stay untouched.
- Simpler option considered: hand-written `@font-face` rules, which have no fallback metrics.
- Verdict: adopt.

## D-032: Homepage hero uses a split "framed" layout with the master bedroom  (2026-10-18, phase 2)
- What and why: the guide's hero crops a landscape photo to 16:7. The only landscape interior (`lounge`) breaks the guide's own photo rules (TV on), and every photo is 1600px or smaller. The portrait master bedroom, framed beside the headline, is rule-compliant and sharp.
- Evidence: brand guide sections 05 (photography) and 12 (system in use).
- Cost: differs from the guide's mock. Revisit when new landscape photos arrive.
- Simpler option considered: using the lounge as the guide does. Rejected because it breaks the photo rules.
- Verdict: adopt until the reshoot.

## D-033: Images and small interactions without extra libraries  (2026-10-18, phase 2)
- What and why:
  - The hero uses `<Picture>` (AVIF, WebP, JPEG fallback). Other photos use `<Image>` in WebP with srcset, width/height and lazy loading.
  - The gallery lightbox, video facade and map facade are small native scripts (`<dialog>`, click-to-load) rather than Preact islands.
  - Preact is used only for the Book page.
- Evidence: web.dev on image optimization and third-party facades. Lighthouse mobile on 2026-10-18 scored 95–100 for performance on every template.
- Cost: no JPEG fallback for non-hero photos. WebP is supported by every browser we target.
- Simpler option considered: n/a. This is the simplest option.
- Verdict: adopt.

## D-034: Map is an area-level Google Maps embed, loaded on click  (2026-10-18, phase 2)
- What and why: guests need a sense of place, but the exact pin is private until a booking is confirmed. The keyless embed URL (`maps?q=...&output=embed`) shows the area only, and only after a click.
- Evidence: the official alternative is the Maps Embed API, which needs a Google Cloud API key (https://developers.google.com/maps/documentation/embed/get-started). The keyless URL is UNVERIFIED as a supported interface and could change.
- Cost: possible breakage. "Open in Google Maps" is always shown as a fallback link.
- Simpler option considered: link only, with no map.
- Verdict: adopt. Switch to the Embed API with a restricted key if Google changes the keyless URL.

## D-035: Every build except production sends noindex  (2026-10-18, phase 2)
- What and why: a build hook appends `X-Robots-Tag: noindex, nofollow` to all static responses unless `INDEXABLE=true`. Staging and preview URLs can never be indexed by mistake. robots.txt stays open so crawlers can see the header.
- Evidence: Google Search Central, "Block search indexing with noindex" (https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- Cost: production deploys must set `INDEXABLE=true`.
- Simpler option considered: Cloudflare Access on staging. That's still optional, and noindex is needed either way.
- Verdict: adopt.

## D-036: Motion is native CSS first, with no animation library  (2026-10-18, redesign)
- What and why:
  - Reveals, line drawings and the sun arcs use CSS scroll-driven animations (`animation-timeline: view()`), SVG stroke-dashoffset and the cross-document View Transitions API.
  - Browsers without scroll timelines get the same reveals from a ~0.5 KB IntersectionObserver script that unobserves after one run.
  - Motion tokens in `src/styles/motion.css`:
    - durations: micro 200ms, state 400ms, reveal 800ms, draw 1600ms
    - easings: `--ease-settle` and `--ease-glide`
    - stagger 80ms, distance 24px
- Evidence: MDN scroll-driven animations (https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations), web.dev on cross-document view transitions (https://developer.chrome.com/docs/web-platform/view-transitions/cross-document). Measured on the prototypes: mobile Lighthouse 99, TBT 0 ms, CLS 0.
- Cost: Firefox scroll-timeline support is UNVERIFIED for October 2026, so it may get the fallback. Only transform, opacity, clip-path and stroke-dashoffset animate.
- Simpler option considered: GSAP or Motion (roughly 25 to 60 KB of JS). That's not needed for anything the concepts do.
- Verdict: adopt. Revisit only if the chosen concept needs something native can't do.

## D-019: Brand tokens copied verbatim into `design/brand-tokens.json`  (2026-10-18, phase 0)
- What and why: the owner asked to import tokens directly, not re-derive them. The guide exposes its own token object.
- Evidence: SAHA brand guide v1.0, section 11 (https://claude.ai/artifact/Gsy32cPwyDA38hCybEFtFG).
- Cost: re-copy when the guide changes.
- Simpler option considered: n/a.
- Verdict: adopt. The guide's demo prices (USD 70/90, USD 15 cleaning) and sample review, names and policies are placeholders, not facts.
