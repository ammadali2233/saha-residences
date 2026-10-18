# Three concepts for the DHA Retreat website

Live prototypes, each a hero plus one signature section. They share the same sticky booking bar, motion tokens and brand tokens. Staging is noindex.
- https://saha-staging.ammadali33.workers.dev/concepts/a/
- https://saha-staging.ammadali33.workers.dev/concepts/b/
- https://saha-staging.ammadali33.workers.dev/concepts/c/

The links at the top of each prototype switch between concepts. On browsers that support it, moving between them uses a view transition.

**Shared by all three:**
- One booking entry point, always one tap away: "USD 60 a night · No platform fees · WhatsApp · Check dates". It replaces the repeated CTA bands and the floating button.
- Square-edged photography. Oversized Bodoni display type. Asymmetric layouts that change from section to section.
- Motion tokens in `src/styles/motion.css`.

## A. The house, drawn
**Idea:** the house explained the way an architect would, with a light hand. The arch from the SAHA mark becomes the frame for the photography. Thin plan lines and dimension marks draw themselves in. The floor plan is the way you explore the house: tap a room and see it.
**Layout:** a headline-led hero with the photo inside the arch. Below it, a two-column plan with an upstairs/ground-floor switch and a typographic room index beside the drawing.
**Motion language:** lines draw (stroke), rooms fill on selection, and room details cross-fade. Everything is linked to scroll or interaction, and nothing loops.
**Signature graphic:** the interactive floor plan (graphic 1), which can double as navigation in the full build. The room index with image reveal (graphic 5) fits naturally.
**Booking:** sticky bar. The plan can end with "Book the whole house".
**Strengths and risks:** the most distinctive and the most "only this house". It depends on an accurate plan, so I need your layout confirmed. Bathrooms aren't drawn yet.

## B. A day at DHA Retreat
**Idea:** the homepage moves from morning to night. The hero knows the time in Lahore: a pale morning, a stone afternoon, a charcoal evening, plus a greeting and the sun's position. Chapters (wake up slowly, work upstairs, games night, the lights stay on) each change colour temperature. A small sun arc on each chapter carries the power story honestly: solar charges the backup by day, and the backup covers load shedding at night.
**Layout:** a big type hero with the photo dropping out of the hero into the first chapter, then alternating, deliberately uneven chapter compositions.
**Motion language:** chapter text rises, photos wipe up with a slight settle, and each sun arc draws to its hour. The time-of-day tint is set before first paint, so nothing flashes or shifts.
**Signature graphics:** the time-aware hero (graphic 4) and uninterrupted power (graphic 3).
**Booking:** sticky bar. The night chapter ends on "Check dates".
**Strengths and risks:** the strongest storytelling, and most directly "feel what a stay is like". It needs more photos (workspace, games room, kitchen, morning light) to reach its potential, and two chapters currently lean on placeholders or the TV-on lounge shot.

## C. Field journal
**Idea:** a travel journal kept by the hosts. Photos placed like prints with short captions, numbered entries, and sparing pen marks in walnut (a circled "eight", an arrow to the velvet bench). The location becomes a drive-time map whose routes draw out from the house, with each time appearing as the line arrives.
**Layout:** an editorial hero with overlapping prints, then a map beside a plain list of times (the accessible version of the same data).
**Motion language:** pen lines draw, routes draw in sequence on scroll, and prints lift slightly on hover.
**Signature graphic:** the illustrated location map (graphic 2). In this prototype it's a time map: rings are minutes, directions are a sketch. The full build would need real geography, from your distances plus OpenStreetMap data with attribution.
**Booking:** sticky bar. Entries can end with a quiet "Ask us on WhatsApp".
**Strengths and risks:** the warmest and most personal. Too many annotations would get twee, so they stay at two or three per page.

## Combining
These aren't exclusive. A strong combination is **B as the homepage spine**, **A's floor plan on the listing page**, and **C's drive-time map on the location page**, all on one motion language.

## Measured (mobile Lighthouse, simulated slow 4G and 4x CPU, 2026-10-18)
| Page | Perf | A11y | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Concept A | 99 | 100 | 100 | 2.0 s | 0 | 0 ms |
| Concept B | 99 | 100 | 100 | 1.8 s | 0 | 0 ms |
| Concept C | 99 | 100 | 100 | 1.9 s | 0 | 0 ms |
| Current home | 99 | 100 | 100 | 2.0 s | 0 | 0 ms |

SEO scores are not comparable here, because staging builds are deliberately noindex. The indexable build scored 100.
Axe WCAG 2.2 AA passes at 390 and 1440px, with motion on and with reduced motion. The floor plan works by keyboard, and every room is listed without JavaScript.

## What I need from you
1. **Pick** a concept or a combination.
2. **Floor plan:** is this right?
   - Upstairs: master and twin facing each other, with the games room and workstation between them.
   - Ground: queen bedroom, living and dining, kitchen, powder room. Car porch at the front.
   - Where are the four bathrooms (which bedrooms have en-suites)?
   - Where are the stairs?
3. **Distances:** the drive times currently come from your flyer. Send the ones you want, plus any landmarks to add (mosque, hospital, grocery).
4. **Photos:** concept B in particular needs the workspace, games room, kitchen and a morning shot.
