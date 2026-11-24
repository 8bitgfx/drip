# Direction: committing to a visual world

A strong direction is specific enough that you could recognise the product with its logo and words removed, and honest enough that it serves the surface's job. It has one idea, stated as a thesis, and refuses the default the category always ships. It names a ground, an ink and an accent with jobs, a type voice chosen like an object from the subject's world, a shape and depth stance, a motion stance, and one signature move a visitor would remember. It is committed at the scale the mode allows: a launch page can be a world; an admin screen is a precise working tool with one move of character. It is written down before tokens, so the build and the fit check can hold it to its word.

---

## The procedure

1. **Load the choice.** `board_read` shows the chosen direction's card: name, summary, adjectives, palette, type, items. Reopen its 2-3 anchor shots with `refs_view`.
2. **Name the genre** (`drip_guide direction/genres`). Note its signature moves, its slop risk and its **`breaks_if` list**. One genre leads; a second may lend one named move only, never its tokens. Check it isn't the anti-genre ("Tasteful AI" or its siblings) unless the brief pinned it.
3. **Write the thesis.** One sentence: the idea this surface owns, and the category default it refuses. "The schedule is the hero, set like an airport departure board; no marketing hero, no product screenshot in a browser frame."
4. **Write the scene** (from the brief) and let it decide light or dark.
5. **Set the colour posture** (section 3), then refine the card's palette: `palette_from_image` on the anchor if the card's hexes are rough, `palette_check` every text pair.
6. **Set the type voice** (section 4): roles, faces, weights. `fonts_pair` with the adjectives as mood, `fonts_preview` with the brief's real headline.
7. **Name the signature** (section 5) and sketch the first viewport: what is where, at what scale, where the action sits.
8. **Set the shape, depth and motion stances** (sections 6-7).
9. **Write the direction contract** (section 8). It becomes the first section of the project's `DESIGN.md`; the system step fills in tokens below it.
10. **Run the tests** (section 9). Fail any: rework the part that failed, not the whole world.
11. **Hand over**: `drip_guide system`, build tokens with `palette_generate`, then `drip_mark` with step `system`.

---

## The craft

### 0. Ambition: bold unless asked

The brief's `ambition` is `bold` unless the user asked for plain, safe or corporate. Bold means the page passes the screenshot test (someone would send it to a friend) and the one-risk test (you can name the decision a cautious designer wouldn't make). It does not mean loud everywhere: on Operate and Read, bold is precision and one signature move. `balanced` keeps one signature move and makes the rest familiar; `conservative` is the category standard done perfectly. Full rules: `drip_guide rules/ambition`.

The direction you commit to is the one the user chose on the board. It is **locked**: this step sharpens it, it never swaps its idea, palette or type voice for something you like better. If it can't carry the content, ask.

### The anti-genre

"Tasteful AI" (cream or beige ground, terracotta accent, a polite serif with an italic word, tracked mono eyebrows, hairlines, centred hero, three cards) is what models make when nobody decided anything. Its siblings: near-black with one neon and glow; purple-blue gradients with glass; Inter as the only voice. Drip treats them as a named anti-genre: never a direction unless the brief pins it, and the critic caps Idea and Conviction at 4/10 when it finds one. Details and tokens: `drip_guide direction/genres`.

### 1. Ambition by mode

| | Persuade | Experience | Operate | Read |
|---|---|---|---|---|
| The world may own | the whole page: ground, structure, type, imagery | everything; the interface recedes | type, palette, density, one signature move | the frame: masthead, rail, ground, openers, code and table setting |
| Must stay standard | the offer and the action are legible in the first viewport (1280x800) | a way to navigate and leave | layout model, navigation, controls, states | reading order, navigation, the column (60-75 characters, body 16-18px) |
| Signature example | prices set huge because the price is the offer | the work at full bleed from the first frame | service health drawn as a transit map | section numbers set as a running head like a field guide |
| Motion budget | one orchestrated entrance, one moment | as much as the work needs, with a reduced-motion path | state changes only, 120-250 ms | almost none |
| Failure mode | a poster with no working parts, or a template with a sticker | spectacle that hides the work | a costume of the world (terminal bars, bezels, ledger paper as a table) | the world leaking into the column |

- Do: on Operate, judge "with the name covered, does it read as a product of its category, and is it cleaner than the category standard?"
- Don't: on Persuade, settle for "a headline, a sentence, two buttons, a screenshot, three cards". That skeleton is the template whatever colours paint it.

### 2. Commitment

- **Spend boldness in one place.** One element is the memorable thing; everything around it is disciplined. Before shipping, remove one decoration.
- **One world owns the page.** Sections vary in density, scale and quiet, inside one grammar. A light editorial page that turns into a dark SaaS card grid at section three has two worlds.
- **Commit every atom.** Buttons, links, inputs, tables, nav, footer: each in the world's vocabulary (its radius, its rule weight, its type, its colour jobs).
- **Prove, don't claim.** Show the subject doing its job (the product working, the dish, the room, the timetable). Synthetic demo data is fine at full fidelity and labelled; claims (customers, metrics, prices nobody gave) are never invented.
- **Author the material.** Gradients, glass, icon tiles and blobs are what fills a gap where real content belongs. Fill it with the real thing instead (`drip_guide imagery`, `drip_guide productshots`).
- **In unattended work, the safe rendition is the known risk.** Build the chosen direction fully; the fit check exists to make it clear, not to water it down.

### 3. Colour posture

| Posture | Coverage | Feels | Typical use |
|---|---|---|---|
| Restrained | tinted neutrals + one accent under ~10% (CTA, selection, focus, one highlight) | precise, calm | Operate, Read, product-led Persuade |
| Committed | one saturated colour on 30-60% of the surface (bands, panels, a coloured rail) | confident, branded | Persuade with a strong brand, Operate shells |
| Full palette | 3-4 named colours, each with a job (categories, grades, states, sections) | lively, systematic | consumer, kids, events, data with categories |
| Drenched | the ground itself is the colour; ink and accent sit on it | immersive, memorable | launches, campaigns, Experience |

- Colour commits at page scale: fields that own regions, not accents sprinkled over grey.
- On Operate, colour still does jobs: a coloured shell, state colours, data series, selection. A grey screen with one blue button is the category default without the polish, not restraint.
- Choose hues from the subject's world (the product's material, the place, the trade's real objects), not from the category's habit.
- Details: `drip_guide color`.

### 4. Type voice

- **Roles:** display (heads, big figures), text (body, UI), optional outlier (figures, code, one label role). Two families is the norm; one family with a wide weight or width range is often stronger.
- **Choose like an object.** Ask what the subject's world prints with: a timetable (condensed grotesk), a pharmacy label (plain sans, tabular figures), a wine list (old-style serif), a race bib (heavy extended sans). Then find a web face with that character (`fonts_pair`, `fonts_search`).
- **Saturated defaults** need a reason no other face meets: Inter or Geist as display, Space Grotesk, Space Mono, DM Sans, DM Serif, Plus Jakarta Sans, Outfit, Instrument Sans, Instrument Serif, Syne, Fraunces, Playfair Display, Cormorant, Lora, Newsreader, IBM Plex. A subject association ("books want a serif", "tech wants mono") is not a reason; it is the association the list exists to break.
- **Workhorse faces are right on Operate and Read** (system stacks, a good UI sans). The voice there comes from scale, weight and figures, not from a novelty face.
- **Heads are one weight and one colour.** No single italic or coloured word inside a head as decoration.
- Details: `drip_guide type`.

### 5. The signature

The one thing a visitor would describe an hour later. It is the product's strongest real thing, shown at its best, on the first screen.

| Surface | Weak signature | Strong signature |
|---|---|---|
| Invoicing SaaS | a gradient blob behind a dashboard screenshot | the late-invoice list chasing a payment, live, in the hero |
| Bakery | a stock croissant photo | today's bake list with times, set large like the chalkboard in the shop |
| Dev tool | a fake terminal typing | the real diff with its Accept button, readable at true size |
| Conference | an abstract 3D shape | the date and city set as the headline, the lineup as an index of names |
| Analytics app | four KPI cards with trend arrows | the one chart the team checks every morning, with the anomaly marked |

The **memory test**: if someone left after the first viewport, what would they describe? If the answer is a mood ("it felt premium"), the signature is not there yet.

### 6. Shape and depth stance

Pick one per direction and hold it everywhere.

| Stance | Radius | Separation | Depth |
|---|---|---|---|
| Ruled | 0-2px | 1px rules, a heavier rule for major breaks | none |
| Soft | 8-16px, one radius per nesting level (inner = outer - padding) | tinted surfaces, lightness steps | soft shadow on raised things only |
| Round | 16-24px and pills | colour bands | soft offset shadows |
| Hard | 0px | 2-3px ink borders | hard offset shadow (e.g. 4px 4px 0) on interactive elements only |
| Layered | 12-20px | lightness steps on dark | elevation by lightness, not glow |

Never mix stances (rounded cards inside a ruled editorial page). Never nest cards inside cards.

### 7. Motion stance

| Stance | What moves | Durations |
|---|---|---|
| Still | state changes only | 120-200 ms |
| One moment | one orchestrated entrance or one signature interaction; everything else still | entrance 400-700 ms total, staggers 30-60 ms |
| Responsive | the pointer: press, hover, drag feedback; one character moment | 150-300 ms, springs only on the primary action |
| Cinematic | the work itself (Experience) | as the work needs, always with a reduced-motion path |

Fade-and-rise on every section is the generated default; one orchestrated moment lands harder. Details: `drip_guide motion`.

### 8. The direction contract

About 150 words, seven blocks (the last is the genre's `breaks_if` list). It goes at the top of `DESIGN.md` under `## Direction`. Never into code comments, markup or anything shipped to the browser.

```
## Direction: Door counter
THESIS: The live crowd number is the hero, read like an instrument. Refuses the dramatic climber photo and the motivational headline.
WORLD: Dark (#121416) ground, bone ink, one amber for the live number and "now", a pale blue for booked. A grotesk found with fonts_search for reading (500), a monospace with tabular figures for every number. Square, ruled, no shadows.
STORY: A climber sees how busy it is now and over the next 3 hours, picks a slot, books in two taps.
FIRST VIEWPORT: The number at ~30vw left, a 3-hour forecast bar to its right, the next 4 open slots as buttons under it; nav: wordmark left, "Book" right.
SIGNATURE: The door counter, updating live, with today's curve behind it.
REFUSES: Marketing hero, stock photography, glass cards, gradient glows.
BREAKS IF (Swiss / instrument): warm paper ground · serif display · grain · centred type · drop shadows · radius over 4px · gradients.
```

If a block reads like a mood, the direction is not decided yet. The fit check (`drip_guide fitcheck`) audits the build against this contract.

### 9. The tests

| Test | How | Fails when |
|---|---|---|
| Category guess | Could someone guess this look from the category alone ("fintech, so navy")? Or from category plus its obvious opposite? | yes to either |
| Competitor swap | Put the nearest competitor's name on the page. Does it still work? | it does |
| Thumbnail | At 200px wide, is it distinct from the category's top 3 sites? | it blends in |
| Logo off | With the logo and copy removed, is the world still recognisable? | it is generic |
| Mirror | Would a neighbouring brief in the same category get this exact combination? | yes: change one major decision and say which |
| Breaks if | Does the plan (and later the CSS) contain any token from the genre's `breaks_if` list? | yes, without a one-line reason in `DESIGN.md` |
| Screenshot | Would someone screenshot this and send it to a friend? (bold briefs) | no |

---

## Slop tells in direction (and the fix)

| Tell | Fix |
|---|---|
| Cream ground, serif display, terracotta accent on a brief that never asked for it | Pick the ground and accent from the subject's actual materials |
| Near-black, one neon, glowing edges | Dark only if the scene is dark; no glow; accent from the subject |
| Hairlines, italic serif display, tiny tracked mono labels everywhere | Keep rules where content is tabular; labels in the body face, sentence case |
| Flat fills, thick black borders, hard shadows by reflex | Only for a loud brand; shadow on interactive elements only |
| Centred headline over three equal cards; split hero with a badge row | Structure from the content's own form (a list, a table, a timeline, the product) |
| A hue chosen by category (blue fintech, green health, purple AI) | A hue from the subject's world; check the category-guess test |
| The world is a coloured header on a stock template | Commit every atom; the world reaches the footer |
| A terminal, bezel or ledger costume on a working screen | On Operate, the world lends type, palette, density and one move only |
| A different direction per section | One world; vary density and scale inside it |
| Inter (or Geist) as the display face by default | A display face with a point of view, or set the workhorse at a scale and weight that has one |
| Glass cards on a gradient | Solid surfaces; glass only for one element over media, if at all |
| "Swiss with a Brutalist edge": two genres half-committed | One genre; borrow one named move at most |
| The chosen direction quietly softened during the system step | It's locked; ask before changing its idea, palette or type |

---

## Done when

- [ ] The thesis names what leads and what default it refuses.
- [ ] The genre is named, its slop risk addressed, and its `breaks_if` list is in the contract.
- [ ] It isn't the "Tasteful AI" anti-genre (or a sibling) unless the brief pinned it; ambition matches the brief.
- [ ] Light or dark is justified by the scene.
- [ ] A colour posture is set, every text pair passes `palette_check`.
- [ ] Two families at most, chosen with a reason, previewed with real words.
- [ ] The signature is named and sits in the first viewport sketch.
- [ ] Shape, depth and motion stances are each one line.
- [ ] The seven-block contract is written into `DESIGN.md`.
- [ ] All seven tests pass.

---

## Reference files

- `direction/genres` — the "Tasteful AI" anti-genre and 19 genres: what each is, signature moves with values, type and colour, when to use, slop risks and fixes, and a `breaks_if` list each.
- `direction/alternatives` — deriving candidates from the subject's world, making alternatives differ, template skeletons to refuse, worked example with sketches.

## Sources

Adapted and rewritten from: **Impeccable** (Apache-2.0): modes and how far the world reaches, colour strategies by coverage, light/dark from a physical scene, faces chosen like objects and the saturated-font list, the AI-look calibration, the direction contract, the first viewport as a thesis, prove-don't-claim, commit every atom, the familiar option. **Hallmark** (MIT): genres and what each allows and refuses, postures, the signature, the mirror test, the spent looks, one radius per nesting level. **Taste Skill** (MIT): one system per page, one object never carries the page, real product UI over generic dashboards, no violet by reflex. **UI UX Pro Max** (MIT): style catalogue attributes. Inspired by Anthropic's **frontend-design** (paraphrased): spend boldness in one place and remove one accessory; review a plan against what you would make for any similar brief. New in 0.3: **Ilm-Alan/frontend-design** (MIT: `breaks_if` token fences per genre, hybrid resistance), **Thecsiz/tastemaker** (MIT: conviction, the contextual ceiling, never grade down committed expressive work). Ideas only (no licence, paraphrased): **ziguishian/brand-design-skill** (the chosen option is the locked source of truth).
