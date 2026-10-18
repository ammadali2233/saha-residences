# Redesign audit: why the first draft looks generic

Screenshots: `docs/redesign/before/<page>-<section>-<width>.jpg` at 390px and 1440px, taken 2026-10-18 from the Phase 2 build.

**Source** says where each pattern came from:
- **Guide:** a component or composition in the SAHA brand guide v1.0 (sections 08 and 12).
- **Mine:** my implementation choice.
- **Both:** the guide suggested it and I applied it literally.

The brand tokens (palette, Bodoni Moda + Jost, logo, voice) are not the problem and stay.

## Site-wide patterns
| Pattern | Why it reads as generic | Source |
|---|---|---|
| Every section sits in the same 1200px centred container, with the same 96/64px gap above it | One rhythm from top to bottom, like a template. Nothing is ever wide, narrow, offset or overlapping. | Mine (the guide gives containers, not a single rhythm) |
| Every image is a 4px-radius rectangle at a fixed aspect ratio | Photos read as thumbnails in a listing, not as photography | Both (guide: radius-md for images) |
| No motion at all | Feels static. Nothing marks sequence, space or state. | Mine |
| "Book direct" (header), "Check dates" (hero, olive band, listing, sticky bar), "Chat on WhatsApp" (CTA block, FAB, header icon) | The same ask repeated in every section, the "Book Now everywhere" pattern | Both (guide: header button, olive band, CTA block, FAB) |
| Copy opens with specs ("3 bedrooms, 4 bathrooms, Sleeps 6...") | Reads like a listing form. The stay itself (arriving, mornings, working, evenings) never appears. | Mine (the guide's voice says "say the useful thing first", which I applied to every section) |
| Nothing that only this house has | No floor plan, no sense of two storeys, no Lahore, no load-shedding story beyond one sentence | Mine |

## Home page
| # | Section | Generic pattern | Source | Proposed direction |
|---|---|---|---|---|
| 00 | Header | Logo, centred links, icon button, filled "Book direct" button: the standard booking-site header | Guide (Navigation) | Lighter header. One booking entry point moves to a persistent sticky bar. |
| 01 | Hero | Photo, eyebrow, headline, subline, then a date/guest search bar as the centrepiece, then a strip of spec chips | Guide (homepage hero: booking bar under the headline, facts row) | Hero tells the place and the feeling. Dates move to the sticky bar, which is always one tap away. |
| 02 | Highlights | Three equal cards, same size, same border, title + two lines | Mine | Fold into the story chapters, so each claim sits next to the photo that proves it |
| 03 | Inside DHA Retreat | 2x2 mosaic + three tiles, captions detached below, "View all photos" button | Guide (Gallery section) | Varied sizes and crops. Captions sit with their photo. A room index replaces the grid. |
| 04 | Amenities | Icon + bold label + one grey line, repeated in a grid (named in your brief) | Guide (Amenity grid) | Facts become a typographic "particulars" sheet after the story. Power gets its own graphic. |
| 05 | Book direct band | Full-width olive box with headline + CTA button | Guide (Trust signals) | Drop the band. Make the direct-booking reason one line inside the sticky bar and the Book page. |
| 06 | Reviews | Card with stars (placeholder now) | Guide (Review card) | Pull quotes set large in Bodoni. No stars, no carousel. Real reviews only. |
| 07 | Location | Heading + paragraph + a list of drive times | Mine | Illustrated route map with drive times at the line ends |
| 08 | WhatsApp CTA | Dark box, heading, button, phone | Guide (WhatsApp CTA) | One quiet line at the end of the page, plus the sticky bar and the FAB. Not a block in every page. |
| 09 | Footer | Four link columns on charcoal | Guide (Footer) | Keep. Fine as an ending. |

## Listing page (`/stays/dha-retreat/`)
| Section | Generic pattern | Source |
|---|---|---|
| Header block | Breadcrumb, H1, spec line | Guide (listing page) |
| Photo strip | One big plus three small tiles with a "View all photos" overlay button: the Airbnb photo grid | Mine |
| Booking widget | Price, check dates, sticky card on the right: the Airbnb pattern | Guide (Booking widget) |
| Room by room | Thumbnail + title + bed icon, repeated | Mine |
| Amenities | The same icon grid as home | Guide |
| House rules | Icon + title grid | Guide (House rules) |

## Book, gallery and location pages
- **Book:** four numbered form cards. These work, but they look like any checkout. Keep the structure and refine the motion and feel (signature graphic 6). (Mine)
- **Gallery:** a uniform 4:3 grid. Better as an editorial sequence of sizes, with the lightbox kept. (Mine)
- **Location:** drive-time list and a grey map placeholder. This is where the illustrated map belongs. (Mine)

## What I'd change in the brand guide (your call)
These guide components cause most of the generic feel. I propose alternatives rather than deleting them:
1. **Booking bar in the hero** → replace with a refined sticky booking bar on every page: price from, dates, book and WhatsApp, one tap.
2. **Amenity grid** → a typographic particulars sheet (two columns of facts, set like a spec in a magazine), with power, work and family told as stories.
3. **Review card with stars** → large pull quotes with name, month and source.
4. **Trust band and WhatsApp CTA block** → keep their content and drop the boxes. One direct-booking line in the sticky bar.
5. **Image radius-md on every photo** → photos go square-edged (radius-none, which the guide already allows for "full-bleed photos"). The 4px radius stays for UI only.

The palette, type, logo, spacing scale, buttons, inputs, date picker and voice all stay as they are.
