# Directions: ideas worth choosing between

A direction is a complete, buildable point of view: an idea about what this surface leads with, a world that expresses it (ground, ink, accent, type voice, shape, density, energy), a movement name and a manifesto. Directions on one board must differ enough that choosing is a real decision about the idea, not about paint. This file is the method: criteria first, then ideas, then worlds, then tiles, then the critic.

## 1. Criteria first

Write 3-5 before any direction exists. Each comes from the brief and can fail a direction.

- **Threshold**: pass/fail. "The offer and price are readable in the first viewport at 390px."
- **Trade-off**: more is better, weigh against the others. "Screenshot-worthy." "Feels like the trade, not the category."

Always include one criterion from **ambition** (bold: "would someone screenshot it?") and one from **hates** if the user named any. Keep them for `critic_prepare`'s `context` and `board_choose`'s reason.

## 2. Find the ideas

Start from the studies, the brief's uniquely-true line, and the job. For each candidate idea, fill one line:

| Leads with | Metaphor / world | Structure | One sentence (no colour or font named) |
|---|---|---|---|
| the live number | an instrument at the door | one huge reading + forecast + slots | "How busy it is, right now, read like a gauge." |
| the routes | a setter's printed sheet | an index of this week's routes | "The wall's new routes, listed like a printed topo." |
| the grade colours | a climbing wall's hold colours | colour fields per grade | "The gym's own colour system becomes the page." |

Keep 2-3 whose sentences are clearly different. Two sentences that could swap = one idea; cut one.

## 3. Cluster the studies into worlds

Tag each board item on the six look axes, then assign it to the idea it serves best.

| Axis | Poles |
|---|---|
| Ground | light / mid / dark; paper / white / colour field |
| Type voice | grotesk / serif / condensed / mono / rounded / display |
| Colour posture | restrained (<10% accent) / committed (30-60%) / full palette / drenched |
| Density | airy / standard / dense |
| Shape | square and ruled / soft and rounded / cut and angular |
| Energy | still / one orchestrated moment / responsive and playful |

Each direction needs 3+ items that define it (its **anchors**). An idea with 1-2 items is a hunch: find evidence or drop it. The look follows the idea; if two directions also share 4+ look values, push one further.

## 4. The unexpected pairing

One direction crosses the subject with a genre from another world. Pick a genre from `drip_guide direction/genres` that the category never uses, and test it against the criteria.

| Subject | Safe genre | Unexpected pairing | Why it can win |
|---|---|---|---|
| Bouldering gym | sports photo hero | Swiss transit signage | the crowd level and slots become a departure board: instant to read |
| Accounting SaaS | product-minimal | retro print ledger (two inks) | the product is a ledger; the print logic makes numbers the hero |
| AI model portfolio | atmospheric dark | field guide / natural history plates | each capability catalogued like a specimen: curious, specific |
| Florist | organic, sage and beige | industrial: steel, stencil type, a work-order grid | sells the craft and the timing, not just the flowers |

Commit to the paired genre; take its `breaks_if` list seriously. "X with a touch of Y" is a hedge, not a pairing.

## 5. Write the cards

| Field (`board_directions`) | Rule | Example |
|---|---|---|
| `name` | 1-2 words, a movement from the idea | "Door Counter" |
| `summary` | the 3-sentence manifesto: idea · look and motion · refusal | see below |
| `adjectives` | 2-4 that each rule something out | "live, dense, exact" |
| `palette` | 4-6 hex in role order: ground, ink, accent, support | `#121416 #ECEAE4 #F2A93B #24282C` |
| `type` | real, available faces | "Host Grotesk 500 + Atkinson Hyperlegible Mono" |
| `items` | 3+ board items | `2, 5, 9` |

Check before saving: `palette_check` (body text ≥ 4.5:1; Read surfaces aim for 7:1), `fonts_pair` with the adjectives as mood, `fonts_preview` with the brief's real headline.

## Worked example

Brief: *a bouldering gym's site and booking. Climbers on phones, at or on the way to the gym, checking how busy it is and booking a slot. Persuade homepage, Operate booking. Uniquely true: live crowd level from the door counter; routes reset every Tuesday. Hates: dark climber photos. Ambition: bold.*

Criteria: (T) crowd level readable in 2 s at 390px · (T) 40 slots/day fit without scrolling forever · (T) no dark hero photo · (trade-off) screenshot-worthy · (trade-off) feels like this gym, not a sports brand.

**Door Counter** · Swiss/instrument
- Manifesto: The live crowd number is the hero, read like an instrument at the door. A dark, dense screen: the number at ~30vw in mono, a 3-hour forecast bar, slots as square buttons, amber only for "now". It refuses the dramatic climber photo and the motivational headline.
- Adjectives: live, dense, exact · Palette: `#121416 #ECEAE4 #F2A93B #24282C #7FA7C9` · Type: Host Grotesk 500 + Atkinson Hyperlegible Mono · Items: 2, 5, 9

**Setter's Sheet** · Editorial / retro print (unexpected pairing: a printed topo sheet)
- Manifesto: The week's new routes are the reason to come, so the page is the setter's printed sheet. Chalk-white ground, condensed caps for grades, routes listed with line-and-number notation, one hold colour for the CTA and "busy". It refuses the sports-brand look entirely; pairing a gym with print logic beats the safe photo hero because Tuesday's reset is the news.
- Adjectives: printed, square, quiet · Palette: `#F7F6F2 #1B1C1E #E4572E #D9D7D0` · Type: Barlow Condensed 700 + Barlow 400 · Items: 1, 6, 11

**Grade Fields** · Playful / full palette
- Manifesto: The gym's grade colours become the whole system. Each grade is a field of colour, shapes rounded like holds, the week's routes as cards you can flick through. It refuses dark, serious sportswear branding.
- Adjectives: colourful, rounded, playful · Palette: `#FFF4E0 #22201C #2B6FE0 #E8C130 #D8434E #3E9A5B` · Type: Gabarito 800 + Manrope 400 · Items: 3, 8, 12, 15

Three different ideas (the number, the routes, the colour system); three different structures (instrument, index, cards).

## 6. Tiles

`board_tile({ copy: { brand: "Crux", headline: "38 climbing now · quiet till 6pm", body: "Book a slot in two taps. New routes every Tuesday.", cta: "Book a slot" } })`

- Same real copy on every tile. Default copy from the brief is the floor, not the goal.
- Look at each tile at full size before the critic: wrong font fallback, failing contrast, a palette chip in the wrong role. Fix, re-tile.
- A tile that looks better because it got more work: bring the others up, don't bring it down.

## 7. After the critic

`critic_record` with `perDirection: [{ name, score, verdict: "keep" | "rework" | "cut", note }]` puts the ranking on the board.

| Verdict | Do |
|---|---|
| Set REJECTED | New ideas for the weak slots (not recolours), re-tile, re-run. Board stays blocked. |
| `cut` / same idea twice | Drop it or replace it with a direction that differs on the decision axis |
| `rework` | Fix the named problem at the same fidelity; re-tile all so fidelity stays equal |
| `keep` | Leave it alone; don't polish it past the others |

Max 3 critic rounds on directions. After that, present the best set and quote what the critic still objects to.

## 8. Merges and splits

- **Merge** when the user asks ("A's colour, B's type"). Write the merged card, re-run `palette_check`, check it still differs in idea from the rest, `board_directions` again (it replaces the set), re-tile, and ask before choosing it.
- **Split** when one direction holds two incompatible anchors.
- Never graft a loser's best move onto the winner on your own.

## Operate and Read boards

The world lends less on working screens and documents, so the idea lives in **where the signature move sits** and **density**: status drawn as a transit map, a schedule set in a timetable rhythm, a docs frame like a field guide. Layout model, navigation and controls stay standard; the reading column stays calm. Bold here means precision.

## Sources

Method built for Drip's `board_directions`, `board_tile` and the critic. Adapted from **Impeccable** (Apache-2.0: colour strategies by coverage, the category-guess check, Operate and Read limits) and **Hallmark** (MIT: postures, axes of a theme). New in 0.3: **Owl-Listener/designer-skills** (MIT: concepts differ on the decision axis, equal fidelity, no strawmen, criteria as thresholds and trade-offs), **Anthropic canvas-design** (Apache-2.0: movement name, manifesto, the subtle reference), **Ilm-Alan/frontend-design** (MIT: unexpected pairings with a stated reason, no hybrids).
