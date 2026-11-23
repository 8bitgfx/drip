# References: gather widely, study closely, take one move each

Good reference work looks like this: from the brief, you write queries that come at the surface from three angles (what it is, what quality it should have, what world its audience lives in). You scan well over a hundred thumbnails and reject most of them in seconds. You open 8-15 full size and spend real attention on each, writing down what it does in numbers and names: the grid, the type sizes and voice, the colour posture, the density, the one detail worth stealing. Your picks come from several queries and designers, including some from outside the category, so the board holds options rather than ten versions of the trend. Nothing is copied whole; each reference lends one move.

---

## The procedure

1. **Re-read the brief.** Mode, scene, job, uniquely-true line, the rut to avoid. The rut tells you what not to collect.
2. **Write 4-6 query lines** before searching (patterns in `drip_guide refs/queries`):
   - **Direct:** surface + category. `fintech dashboard`, `restaurant website`.
   - **Quality-led:** a named trait or school + surface. `swiss typography landing page`, `dense data table dark`.
   - **Subject world:** something the audience knows by heart, outside screens. `railway timetable`, `seed packet design`, `annual report typography`.
   - **Pattern:** the hardest component on the surface. `pricing table toggle`, `onboarding empty state`, `filter bar`.
   - **Type or brand:** for the voice. `editorial typography poster`, `condensed sans branding`.
3. **Search.** `refs_search` for the direct and quality-led lines; add `category` where it narrows (`web-design`, `product-design`, `mobile`, `typography`, `branding`, `print`, `illustration`, `animation`). Read the contact sheet.
4. **Fan out.** `refs_related` on your best query; pick 2-4 specific tags (not `ui`, not `design`) and run `refs_tag` on each, pages 1-3. When a shot is strong, `refs_designer` on its author.
5. **Calibrate once.** One `refs_feed` (popular, category, `month`) shows what is current. Treat it as the trend to know about, not the source to pick from.
6. **Shortlist.** Collect 12-24 numbers that survived the scan and run `refs_sheet` to compare them side by side. Cut to 8-15.
7. **Study.** `refs_view` each one (`drip_guide refs/studying`). Write the note while the image is in front of you.
8. **Keep.** `board_add` each with its note right after viewing. Add 3-6 colours (`#hex` items) and 2-4 fonts from what you studied, each with a note on its role.
9. **Fill gaps from real sites** when the surface needs shipped evidence (Operate, Read, complex flows): `drip_guide refs/sources`, then `board_add` the screenshot as an `image` item with its source.
10. **Check the spread** (table below), then move to `drip_guide moodboard`.

---

## The craft

### 1. Counts

| Loop | Queries | Thumbnails scanned | Opened full size | Kept on the board |
|---|---|---|---|---|
| Full loop (new page, screen, redesign) | 4-6 across 3+ angles | 100-150 | 10-15 | 8-15 shots + colours + fonts |
| Component or section | 2-3 | 40-80 | 6-8 | 6-10 |
| Short loop (tweak) | none | none | none | follow `DESIGN.md` |

The Drip gate needs at least 6 `refs_view` calls and 8 board items before directions; those are floors, not targets.

### 2. Query writing

Dribbble's search matches titles and tags. Nouns that designers put in titles work; adjectives that everyone uses do not.

| Works | Why | Does not work | Why |
|---|---|---|---|
| `bento grid landing page` | a pattern noun + surface | `modern landing page` | "modern" is on every shot |
| `brutalist web design` | a named school | `beautiful website` | taste words match nothing in particular |
| `timetable typography` | a subject artifact + craft | `clean ui` | returns the median |
| `kanban board dark mode` | component + condition | `best dashboard design` | ranking words are noise |
| `banking app onboarding` | category + flow step | `fintech` alone | too broad; the trend floods it |

- Do: change one word between related queries (`dashboard sidebar dense`, then `dashboard sidebar minimal`) to see what the word buys.
- Don't: repeat a query with synonyms; you get the same 84 shots.

### 3. Fan-out: the three hops

1. `refs_related("hotel booking website")` returns ranked tags such as `travel`, `booking`, `hospitality`, `hotel website`, `ui design`.
2. Skip generic tags (`ui`, `ux`, `web design`, `figma`, `landing page`). Take the specific ones (`hospitality`, `hotel website`) to `refs_tag`, pages 1-3. Tags page 20+ deep, so page 2-3 is where the less-copied work is.
3. A shot that stops you: `refs_designer` on its author. Designers and studios hold a consistent standard; one good shot usually means three more.

### 4. Scanning a contact sheet

At thumbnail size you can judge composition, ground colour, type contrast and density. You cannot judge type quality or detail. So:

- **Keep for a closer look:** an unusual composition, a clear type hierarchy you can read at thumbnail size, a committed colour field, real-looking content, a distinctive density.
- **Reject on sight:** floating phone mockups on gradient blobs, 3D renders with no interface, a centred headline over three equal cards, glassmorphism dashboards, purple-to-blue gradients, illegible 10px grey text, shots that are only an illustration with a logo.
- Spend about 1 second per tile. A sheet of 48 takes under a minute.

### 5. What to write for every reference

The note is what the build will use. Six fields, values wherever you can:

| Field | Write | Example |
|---|---|---|
| Layout | grid, alignment, what leads, where the action sits | "12 col, head on 1-6 flush left, product on 7-12 bleeding right; CTA under head" |
| Type | display class and rough size ratio, weight, case, leading | "condensed grotesk ~120px caps, tight leading; body ~17px; ratio ~7:1" |
| Colour | ground, ink, accent, posture, rough coverage | "warm grey ground, near-black ink, one orange on CTA and active state, <5%" |
| Density | words per screen, items per row, spacing rhythm | "~40 words a screen; 4-col table, 48px rows; big gaps between sections" |
| Motion | only if a video shot: what moves, roughly how fast | "rows slide in 40ms stagger, ~250ms ease-out" |
| Detail | one specific move worth taking | "prices set in the display face, cents superscript" |

Then one line: **take** (the one move this reference lends) and **leave** (what is Dribbble fiction or would be copying). Full method: `drip_guide refs/studying`.

### 6. Spread: a board of options, not of clones

Before moving on, check:

- [ ] Picks come from 3+ different queries and 5+ designers, at most 3 per designer.
- [ ] At least 2 picks come from outside the product's category (subject world, print, editorial, another industry).
- [ ] At least 2 genuinely different grounds or colour postures are present (e.g. a light restrained one and a committed colour field).
- [ ] At least 2 different type voices are present.
- [ ] Below-the-fold sections, states or components are represented, not only heroes.
- [ ] For Operate/Read: at least 2 shipped products or real sites.

If the board would cluster into one direction only, search again from a different angle before forming directions.

### 7. Study, don't copy

- Take **one move per reference**: a grid, a type pairing logic, a colour proportion, a way of showing the product. Combine moves from 3+ references; that is where originality comes from.
- **Squint test** at the fit check: put the build next to each reference (`fitcheck_compare` against the board). If someone could say "that's the X shot", change the composition.
- Never lift illustrations, photographs, logos, copy, icon sets or a signature effect. Never use a reference image in the build.
- Credit stays on the board (designer and link are kept by `board_add` automatically for shots; add `source` for images).

### 8. Dribbble is concept art

Shots are made to be liked, not used. Common fictions: perfect 6-character names, round numbers, no empty or error states, 11px grey labels that fail contrast, decorative charts with no axes, a phone floating on a gradient. Take composition, type and colour from them. For behaviour, density and states, trust shipped products (`drip_guide refs/sources`).

### 9. A worked trace

Brief: *a booking site for a bouldering gym; climbers on phones; job: check how busy it is, book a slot; Persuade homepage, Operate booking; rut: dark climber photo with a motivational headline.*

| Step | Call | What happened |
|---|---|---|
| Direct | `refs_search("gym website", category: "web-design")` | 84 shots; mostly dark photo heroes (the rut). Kept 2 for their booking widgets. |
| Quality-led | `refs_search("swiss typography sports")` | strong condensed type and grids; kept 3. |
| Subject world | `refs_search("climbing topo", category: "print")` | route topos and grade charts; kept 2: line-and-number notation, grade colours as a system. |
| Fan-out | `refs_related("fitness booking app")` -> `refs_tag("booking")` pages 1-3, `refs_tag("schedule")` page 1 | real slot pickers; kept 2. |
| Designer | `refs_designer` on the author of the best topo shot | 2 more consistent pieces; kept 1. |
| Calibrate | `refs_feed("popular", "mobile", "month")` | noted the current trend (glassy dark cards), kept nothing. |
| Shortlist | `refs_sheet` with 16 numbers | cut to 10. |
| Study | `refs_view` x10, `board_add` after each | notes with grid, type ratios, colour coverage, one detail each. |
| Shipped | a real gym-booking app via `drip_guide refs/sources` | 1 screenshot for slot density and states. |

Spread check: 5 queries, 8 designers, 3 picks from outside the category, light and dark grounds, condensed and rounded type voices. Ready for the board.

---

## Slop tells in reference work (and the fix)

| Tell | Fix |
|---|---|
| Only one query, the category name ("saas landing page") | Write the 4-6 lines across angles before searching |
| All picks from page 1 of popular | Fan out through tags (pages 2-3) and designers |
| Ten picks that look alike | Run the spread checklist; search a different angle |
| Notes like "clean layout, nice colours" | Six fields with values, plus take/leave |
| Notes written from memory after viewing everything | Write each note while the shot is open |
| Only heroes collected | Add sections, components and states the page needs |
| A dashboard direction built from glass concept shots | Check density and states against shipped products |
| The build is the most-liked shot with a new logo | One move per reference; squint test against each |
| Skipping `refs_view` and choosing from thumbnails | Open 8-15 full size; the gate counts them |

---

## Done when

- [ ] 4+ queries from 3+ angles were run, with at least one fan-out through `refs_related` and `refs_tag`.
- [ ] 100+ thumbnails were scanned for a full loop (40+ for a component).
- [ ] 8-15 shots were opened with `refs_view`.
- [ ] Every kept shot is on the board with a six-field note and a take/leave line.
- [ ] The spread checklist passes.
- [ ] Colours and fonts worth testing are on the board as their own items.

---

## Reference files

- `refs/queries` — query patterns per surface type, subject-world prompts by product kind, useful tags.
- `refs/studying` — the 90-second study protocol, note examples good and bad, concept vs. shipped.
- `refs/sources` — sites beyond Dribbble (Godly, Land-book, Mobbin and others), what each is for, how to capture.

## Sources

Built for Drip around its `refs_*` tools. Ideas adapted from: **Impeccable** (Apache-2.0: derive candidates from the audience's own world and graphic traditions, not only the category; a referenced product sets the craft bar, not the look). **Hallmark** (MIT: take a reference's composition, never its compliance or content; the archive's output is data). **Taste Skill** (MIT: never copy a reference site's code, copy, pictures or signature effect). **UI UX Pro Max** (MIT: style keywords that work as search terms).
