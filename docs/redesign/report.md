# Redesign report: DHA Retreat public website

Chosen direction (2026-10-18): **B as the homepage spine** ("A day at DHA Retreat"), **A's floor plan on the listing page**, **C's drive-time map on the location page**, all on one motion language. The dashboard is unchanged.

Screenshots at 390px and 1440px, per section:
- **Before:** `docs/redesign/before/`
- **After:** `docs/redesign/after/`, captured with reduced motion so every scroll-linked section shows its settled state. Live behaviour is on staging.

## Section by section
| Page | Before (generic pattern) | After |
|---|---|---|
| Header | Logo, centred links, WhatsApp icon button, filled "Book direct" | Same logo, Stays dropdown and links, and a quiet "Book direct" text link. The header stays put through page transitions. |
| Home: hero | Photo, headline, date search bar, spec chips | "A day at DHA Retreat." Oversized type, a sun arc showing the hour in Lahore, and tint and greeting by time of day (set before first paint). The photo drops out of the hero into the first chapter. |
| Home: highlights | Three equal cards | Folded into four day chapters: wake up slowly, work upstairs, games night, the lights stay on. Each has its own composition and colour temperature, and an honest power line (solar charging the backup by day, backup ready for load shedding at night). |
| Home: inside | 2x2 photo mosaic + captions below | The room index: a typographic list of six rooms by floor. Hovering (desktop) reveals the photo, and on phones photos wipe in under each room. Each row opens that room on the floor plan. |
| Home: amenities | Icon grid | "The particulars": a two-column spec sheet (sleeping, living, arriving, paying), after the story |
| Home: book direct band | Olive band + button | Removed. One booking bar, always one tap away. |
| Home: reviews | Card with stars | A large pull quote in Bodoni (placeholder until real reviews arrive) |
| Home: location | Text + drive list | "Twenty-five minutes from the airport." Large drive times in walnut, plus a link to the map. |
| Home: WhatsApp block | Dark box | One closing line |
| Listing: opening | Breadcrumb, H1, Airbnb-style 1+3 photo grid, sticky price card | Giant "DHA Retreat" set against an offset pair of photos (master large, twin small). The price is one line. |
| Listing: rooms + amenities | Thumbnail list + icon grid | **Interactive floor plan:** upstairs and ground floor, lines drawing in on scroll, tap or hover a room to see its photo and details. Then the particulars. |
| Listing: rules, nearby | Icon grid, list | Plain two-column rules, and one line to the map |
| Gallery | Uniform 4:3 grid | An editorial sequence: four sizes and crops, offset columns, square edges. Keyboard lightbox with a calm fade. |
| Location | Drive list + grey map placeholder | **Drive-time map:** rings are minutes, routes draw out from the house in turn, and each time appears as its line arrives. The same data sits in a plain list beside it. Three short notes. |
| Book | Four form cards | Same flow. Months slide in the direction you moved, changed amounts settle in rather than jump, selected days settle. No booking bar here (the page is the booking). |
| Thank you | Text | A check that draws itself once, above the same summary and WhatsApp handoff |
| FAQ, rules, contact, privacy, terms, stays | Standard heads, WhatsApp block | Oversized left-weighted display headings. The WhatsApp block is replaced by one line. |

## Brand guide changes (your approval needed to make them official)
| Guide component | Replaced by | Why |
|---|---|---|
| Booking bar in the hero | Sticky booking bar on every page except Book: "USD 60 a night · No platform fees", WhatsApp, "Check dates" | The hero tells the place, and booking is still one tap from any section |
| Amenity grid | Particulars spec sheet | Story first, then facts. Reads like a magazine, not a listing. |
| Review card with stars | Pull quote | No stars, no carousel |
| Trust band, WhatsApp CTA block, floating WhatsApp button | One closing line per page + the booking bar | Stops "Book now everywhere" |
| radius-md on photos | radius-none (the guide's full-bleed rule) on all photography | Photos read as photographs, not thumbnails. radius-sm/md stays for UI. |
| *(new)* Motion tokens | `design/motion-tokens.json`, `src/styles/motion.css` | The guide defines no motion |

Palette, typefaces, logo, spacing scale, buttons, inputs, date picker and voice are unchanged.

## Lighthouse, mobile (simulated slow 4G, 4x CPU), production-like build
| Page | Before: perf · LCP · CLS · TBT | After: perf · LCP · CLS · TBT |
|---|---|---|
| Home | 98 · 2.2 s · 0 · 0 ms | 99 · 1.9 to 2.0 s · 0 · 0 ms |
| Listing | 99 · 2.2 s · 0 · 0 ms | 99 · 1.9 s · 0 · 0 ms |
| Gallery | 98 · 2.3 s · 0 · 0 ms | 99 · 2.1 s · 0 · 0 ms |
| Book | 95 · 2.4 s · 0 · 170 ms | 99 to 100 · 1.5 s · 0 · 60 to 80 ms |
| Location | 100 · 1.5 s · 0 · 0 ms | 100 · 1.5 s · 0 · 0 ms |
| FAQ | 100 · 1.5 s · 0 · 0 ms | 100 · 1.3 to 1.5 s · 0 · 0 ms |
| House rules | 100 · 1.5 s · 0 · 0 ms | 100 · 1.5 s · 0 · 0 ms |
| Stays | 100 · 1.9 s · 0 · 0 ms | 100 · 1.8 to 1.9 s · 0 · 0 ms |

Accessibility, best practices and SEO are 100 on every page, before and after.

Two problems were caught and fixed during measurement:
- A scroll reveal had been put on the gallery's LCP photo, which pushed LCP to 2.8 s. It's now covered by a test.
- The lightbox's image was pre-loading a 108 KB full-size photo, which pushed LCP to 3.0 s.

Not tested on a real mid-range Android phone (none available here). Lighthouse's 4x CPU simulation is the stand-in.

## Every animation
"Cost" is runtime cost. Every animation is CSS-only unless noted; the JS fallback for scroll reveals is ~0.6 KB.

**Site-wide**

| Where | What | Purpose | Technique | Cost | Reduced motion |
|---|---|---|---|---|---|
| All pages | Page transitions | Continuity between pages. The header holds still. | Cross-document View Transitions, 400ms glide | Browser snapshot, no JS | Off |
| All links and buttons | Underline draws, press scales to 0.98, colours shift | Feedback | transform, background-size, colour, 200 to 400ms | Negligible | No movement, colour only |

**Home**

| Where | What | Purpose | Technique | Cost | Reduced motion |
|---|---|---|---|---|---|
| Hero | Tint, greeting and sun position by Lahore time | A sense of now, the house today | Inline script sets `data-daypart` before paint. No animation. | 0.3 KB inline, no layout shift | Same (static) |
| Day chapters | Text rises, photos wipe up with a slight settle | Sequence through the day | Scroll-driven transform, opacity, clip-path | Composited | Shown at once |
| Chapter sun arcs | Arc draws to the hour | Time of day and the power story | Scroll-driven stroke-dashoffset | Tiny SVG | Drawn, static |
| Room index | Desktop: photo reveals on hover or focus, row indents. Touch: photo wipes in on scroll. | Connects names to rooms | CSS `:has`, opacity + clip-path 400/800ms | Composited | Instant swap, no wipe |
| Particulars, rules | Rows rise in | Pacing, hierarchy | Scroll-driven | Composited | Shown at once |

**Listing, location and gallery**

| Where | What | Purpose | Technique | Cost | Reduced motion |
|---|---|---|---|---|---|
| Floor plan | Walls and rooms draw on scroll. The selected room fills. Details cross-fade. | Explains the two floors and lets you explore | Scroll-driven stroke. Fill transition 400ms. ~1.2 KB script for selection. | Small SVG repaint on select | Drawn, instant selection |
| Drive-time map | Routes draw out in turn, and time and pin appear at each line's end | Distance as an experience; the airport is close | Scroll-driven stroke + opacity, staggered by range | Composited and stroke | Complete, static |
| Gallery | Photos 3+ wipe in, hover zoom 1.03 (hover devices only), lightbox fades | Pace, photography first | Scroll-driven clip-path, transform, opacity | Composited | Shown at once, no zoom or fade |

**Booking**

| Where | What | Purpose | Technique | Cost | Reduced motion |
|---|---|---|---|---|---|
| Book: calendar | Month slides 16px in the direction moved. The selected day settles. | Orientation when paging months | transform + opacity, 400 / 200ms | Composited | Instant |
| Book: price | A changed amount settles in (6px, 400ms). It never counts up. | Shows what changed, without delay | transform + opacity on re-keyed values | Composited | Instant |
| Thank you | Check ring and tick draw once | A clear, calm confirmation | stroke-dashoffset 800 + 400ms | Tiny SVG | Shown complete |

Nothing loops, and nothing animates off-screen: scroll-linked animations only advance with scroll, and the fallback observer unobserves after one run. There's no scroll-jacking and no animation library (D-036).

## Tests added
`tests/e2e/motion.spec.ts`:
- **Reduced motion:** every revealed element is fully visible.
- **Hero:** headline and photo are never animated in.
- **LCP:** the priority image is never inside a reveal.
- **Floor plan:** room-index deep links open the right floor and room.
- **Time-aware hero:** the part of day is set.
- **No JavaScript:** the home page and floor plan are complete.

Existing axe tests (WCAG 2.2 AA at 360, 768 and 1440px) and booking-flow tests pass.

## Still open
- **Floor plan accuracy:** the layout follows your description. Bathrooms and stairs positions are unconfirmed and marked on the plan.
- **Drive times:** from your flyer, and directions on the map are a sketch. Send real distances, landmarks and bearings.
- **Photos:** the day story and room index need the workspace, games room, kitchen, bathrooms, a morning shot, and a lounge reshoot with the TV off.
- **Validator lag:** the W3C CSS checker doesn't know `animation-timeline` or `vector-effect` yet, so the location page's inline CSS shows warnings. The HTML itself is valid. The Book page keeps the one Astro island style warning.
