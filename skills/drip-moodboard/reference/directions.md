# Directions: clustering a board into real choices

A direction is a complete, buildable point of view: a world (ground, ink, accent, type voice, shape, density, energy) plus an idea about what this surface leads with. Directions on one board must be different enough that choosing between them is a real decision. This file is the method: tag, find the clusters, test the difference, then write the cards.

## The method

### 1. Tag every item on the six axes

Make a quick table in your head or in a scratch note. One row per board item, one value per axis.

| # | Item | Ground | Type voice | Posture | Density | Shape | Energy |
|---|---|---|---|---|---|---|---|
| 1 | timetable poster | light paper | condensed | restrained | dense | square, ruled | still |
| 2 | gym app concept | dark | grotesk + mono | restrained | dense | square | live data |
| 3 | grade-colour wall photo | colour fields | — | full palette | mid | rounded | playful |
| … | | | | | | | |

Postures, from the colour strategy (`drip_guide color`):
- **Restrained:** tinted neutrals plus one accent under ~10% of the surface.
- **Committed:** one saturated colour carries 30-60% of the surface.
- **Full palette:** 3-4 named colours, each with a job.
- **Drenched:** the ground itself is the colour.

### 2. Find what co-occurs

Values that keep appearing together are a cluster: "dark + mono figures + dense + live data" or "paper + condensed + ruled". Pick the item that embodies each cluster best: the **anchor**. A direction without a clear anchor is usually a compromise; drop it.

### 3. Seed 3, assign the rest

- Seed one direction per anchor (2-4 anchors).
- Assign every other item to the direction whose axis values it shares most.
- An item that fits nowhere: drop it from the directions or keep it as a shared detail (a pattern every direction would use, like a table filter row). Do not force it.
- Each direction needs 3+ items. A direction with 1-2 items is a hunch; find evidence or drop it.

### 4. Test the difference

For each pair of directions, count the axes on which they differ. **Fewer than 3: merge them** or push one further along an axis. Then run three quick tests:

| Test | Question | Fails when |
|---|---|---|
| Thumbnail | Shrink all three to 200px wide. Can you tell them apart? | two read as the same layout in different colours |
| Name swap | Swap the names. Does any card still fit? | the names are moods, not worlds |
| Category guess | Could someone guess this direction from the product category alone? | it is the category's default look |

### 5. Fill each card

- **Palette:** `palette_from_image` on the anchor's image URL, then curate to 4-6 hex in role order (ground, ink, accent, support, optional second accent and muted). `palette_check` ink on ground (body text 4.5:1 minimum; aim for 7:1 on Read surfaces) and accent in its role.
- **Type:** `fonts_pair` with the direction's adjectives as the mood, then `fonts_preview` the pairing with real words from the brief. One family is a valid answer. Faces must be available for the web (`fonts_search`) and licensed.
- **Summary:** one sentence: what leads, in what world, and the category default it refuses.
- **Adjectives:** 3 that each rule something out. "Dense" rules out airy; "nice" rules out nothing.

## Worked example

Brief: *a bouldering gym's site and booking. Climbers, on phones, often at the gym or on the way, checking how busy it is and booking a slot. Persuade for the homepage, Operate for booking. Uniquely true: live crowd levels from the door counter, and routes reset every Tuesday. Rut: dark photo of a climber with a motivational headline.*

**Direction A: Chalk**
- Summary: the gym as a clean, chalked wall: big condensed type on white, routes listed like a printed setter's sheet; refuses the dramatic climbing photo.
- Adjectives: bright, square, quiet
- Palette: `#F7F6F2` ground (chalk), `#1B1C1E` ink (graphite), `#E4572E` accent (one hold colour, CTA and "busy" state), `#D9D7D0` support (rules)
- Type: Barlow Condensed 700 for heads and grades + Barlow 400 for text
- Axes: light paper · condensed · restrained · airy · square and ruled · still
- Items: 1, 6, 11

**Direction B: Route card**
- Summary: the gym's grading colours become the whole system: each grade is a field of colour, holds-like rounded shapes, the week's new routes as cards; refuses the dark sports-brand look.
- Adjectives: colourful, rounded, playful
- Palette: `#FFF4E0` ground, `#22201C` ink, `#2B6FE0` grade blue, `#E8C130` grade yellow, `#D8434E` grade red, `#3E9A5B` grade green
- Type: Gabarito 800 for heads + Manrope 400 for text
- Axes: colour fields · rounded geometric · full palette · mid · rounded · playful
- Items: 3, 8, 12, 15

**Direction C: Door counter**
- Summary: the live crowd level is the hero, read like an instrument: a dark, dense screen built around the number at the door; refuses a marketing hero entirely.
- Adjectives: live, dense, exact
- Palette: `#121416` ground, `#ECEAE4` ink, `#F2A93B` accent (the live number and "now"), `#24282C` support (panels), `#7FA7C9` second accent (booked)
- Type: Host Grotesk 500 + Atkinson Hyperlegible Mono for every number
- Axes: dark · grotesk + mono · restrained · dense · square · live data
- Items: 2, 5, 9

Differences: A/B differ on 6 axes, A/C on 4, B/C on 5. All pass.

Recommendation in the message: **Door counter**, because the job is "how busy is it, then book", and only C makes that the first thing a climber sees. Risk: dark and dense may undersell the gym's community feel; B is the answer if that matters more.

## The AI defaults: never a direction by accident

Generated interfaces cluster around a handful of looks regardless of subject. Each is fine when the brief or brand pins it. When the brief leaves the look free, a direction that lands in one of these has failed the category-guess test.

| Default | Looks like | If you find one on your board |
|---|---|---|
| Warm editorial | cream ground (~#F4F1EA), high-contrast serif display, terracotta/clay accent | ask what in this subject is actually cream and serif; usually nothing |
| Neon on black | near-black, one acid green or vermilion, glow | keep dark only if the scene is dark; drop the glow, choose the accent from the subject |
| Broadsheet | hairlines, zero radius, italic serif display, small tracked mono labels | keep the rules if the content is tabular; drop the costume |
| Flat brutalist kit | saturated flat fills, thick black borders, hard offset shadows, heavy condensed caps | keep only if the brand is loud by nature |
| SaaS card kit | everything in identical rounded cards, one radius, soft grey shadow, gradient washes | make the content's own structure (table, timeline, list) carry the page |
| Purple-blue gradient | violet into blue on hero and buttons | remove; pick a hue from the subject's world |

## Merges and splits

- **Merge** when two directions differ on fewer than 3 axes, or when the user asks ("A's colour, B's type"). Write the merged card, re-run `palette_check` (a new ground changes every contrast pair), re-check the difference against the remaining directions, then `board_directions` again.
- **Split** when one direction holds two incompatible anchors (a dark dense one and a bright airy one). Each becomes its own card with its own items.
- `board_directions` replaces the previous set, so always send the full list.

## Operate and Read boards

The world lends less on working screens and documents, so directions differ on fewer, more precise things:
- **Operate:** type voice, palette and posture of the shell (a coloured rail or header, a tinted ground), density, and the one signature move (status drawn as a transit map, a schedule set in a timetable rhythm). The layout, navigation model and controls stay standard for the platform.
- **Read:** the frame (masthead, rail, ground, section openers, how code and tables are set). The reading column stays calm in every direction: real measure (60-75 characters), body near 16-18px, real contrast.

Still require 3 axes of difference; on Operate and Read, "density" and "where the signature move lives" count as axes.

## Sources

Method built for Drip's `board_directions`. Ideas adapted from **Impeccable** (Apache-2.0: colour strategies by coverage; the AI-look calibration; the category-guess self-check; on Operate the world lends type, palette, density and one signature move; on Read it owns the frame and the column stays calm), **Hallmark** (MIT: posture names, axes of a theme, the spent looks), **UI UX Pro Max** (MIT: style attributes as axes), and Anthropic's **frontend-design** (paraphrased: the clusters AI-made design falls into, and checking a plan against what you would produce for any similar brief).
