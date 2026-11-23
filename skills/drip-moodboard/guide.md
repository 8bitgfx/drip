# Moodboard: from studied references to a choice

A good board does one job: it lets the user choose between a few real futures for the design in under a minute. Every item on it was studied and carries a note that says what to take, with values. The items are grouped into two to four directions that differ on several axes at once (ground, type voice, colour posture, density, shape, energy), each with a concrete name, a one-sentence thesis, a palette in role order and a real type pairing. It is shared as a link the user can open, star and annotate. You lead with the direction you believe in and say its risk. The user's reactions are read back, and the choice is locked with a reason that comes from the brief.

---

## The procedure

1. **Brief.** In the Drip loop the brief exists (`drip_guide brief`). For a standalone "make me a moodboard for X": scan the project if there is one, then write three lines (scene, job, mode) and state them as assumptions. Do not skip this: directions are judged against it.
2. **Create.** `board_create(name, brief)`. Name it after the surface: "Ferrous pricing page", "Climbing gym app".
3. **Collect.** References come from `drip_guide refs`. After each `refs_view`, `board_add` the shot with its note. Add:
   - **colours** as `#hex` items taken from the shots you studied (`refs_view` returns palettes; `palette_from_image` extracts from an image URL), each noted with its role ("ground for a drenched direction"),
   - **fonts** as font-name items, noted with their role ("display, condensed, for prices and heads"); check availability with `fonts_search`,
   - **images** (photos, real-site screenshots) with `source` and licence.
4. **Check balance** before clustering (table in section 2). Fill gaps with another search.
5. **Cluster** into 2-4 directions (`drip_guide moodboard/directions`), then save them with `board_directions`.
6. **Verify each direction**: `palette_check` its palette (ink on ground passes 4.5:1 for body text; accent text passes 4.5:1 or is used only for large text and fills), `fonts_pair` or `fonts_preview` for its pairing.
7. **Show.** `board_open`. Publish `board.html` as an artifact when an Artifact/publish tool exists; otherwise send the live link. Write the message (`drip_guide moodboard/presenting`).
8. **Read.** When the user replies or reacts, `board_read` (with `pasted` if they pasted feedback from the static board).
9. **Revise** if needed: re-cluster, add, remove, merge. At most two revision rounds before you ask what quality is missing.
10. **Choose.** `board_choose(direction, reason)`. Then `drip_guide direction` and `drip_guide system`.

---

## The craft

### 1. Notes that a builder can use

Same standard as reference notes (`drip_guide refs/studying`): what to take, where, with a value.

| Item | Weak note | Strong note |
|---|---|---|
| Shot | "great hero" | "Headline flush left on 7 of 12 cols, product UI overlapping by one col, CTA pair under it" |
| Colour | "nice green" | "#1F3D2B as the whole ground (drenched), cream ink on it reaches about 10:1" |
| Font | "cool serif" | "Display only: high-contrast serif at 96px+, never below 32px; pairs with a plain grotesk body" |
| Image | "vibe" | "Daylight, true colour, people mid-task; crop tight; the treatment for all photos in this direction" |

### 2. What a balanced board holds

| Item type | Count | Why |
|---|---|---|
| Studied shots / sites | 6-12 | composition, type and colour evidence |
| Colours (`#hex`) | 3-8 | palettes you can test, not adjectives |
| Fonts | 2-4 | type voices to compare |
| Images | 0-4 | photography or material treatment, when the subject has things to show |
| Shipped evidence | 2+ on Operate/Read | real density and states |

Coverage check: first viewports **and** lower sections or components; at least 2 grounds or colour postures; at least 2 type voices; at least 2 items from outside the category. A board that only holds heroes produces a page that only has a hero.

### 3. Directions: few, different, committed

- **Count.** Three is the default. Two when the brief is tight (a brand already fixes colour and type, an Operate screen inside a product). Four only when the user asked for range. One is not a choice; five is shopping.
- **Difference.** Each pair of directions differs on at least 3 of these 6 axes:

| Axis | Poles |
|---|---|
| Ground | light / mid / dark; paper / white / colour field |
| Type voice | grotesk / serif / condensed / mono / rounded / display |
| Colour posture | restrained / committed / full palette / drenched |
| Density | airy (~40 words a screen) / standard / dense (data, tables) |
| Shape language | square and ruled / soft and rounded / cut and angular |
| Energy | still / one orchestrated moment / responsive and playful |

- **Commitment.** Each direction is the best version of itself, not a hedge between the others.
- **The canon option.** One direction may be the category standard done perfectly ("what the best product in the category would ship"). Label it honestly. Never pass it off as a bold option, and never make it your default recommendation without a reason from the brief.

### 4. The direction card

| Field | Rule | Example |
|---|---|---|
| name | 1-3 words, a concrete noun from the subject's world | "Departure board" |
| summary | one sentence: the idea, then what it refuses | "The schedule is the hero, set like an airport board; refuses the screenshot-in-a-browser hero." |
| adjectives | 3, each ruling out its opposite | "dense, mechanical, high-contrast" |
| palette | 4-6 hex in role order: ground, ink, accent, support | `#0E0F12 #F2EFE6 #FFB800 #2A2D33` |
| type | real faces, display + text (one family is fine) | "Barlow Condensed 700 + IBM Plex Sans" (check availability) |
| items | 3+ board items that define it | `2, 5, 9, 14` |

### 5. Presenting

The message is short: the link, one line per direction, your pick with its risk, one question. Full templates: `drip_guide moodboard/presenting`.

- Do: "I'd build **Departure board**: it makes the schedule the hero, which is the job. Risk: dark and dense may feel like a tool, not a brand."
- Don't: list four options with pros and cons and ask "which do you prefer?".

### 6. Reading reactions

| Signal | Means | Do |
|---|---|---|
| Stars cluster in one direction | the choice is made | confirm in one line, `board_choose` |
| Stars split across directions on one axis (e.g. every starred item is dark) | the axis is decided, the direction is not | re-cluster around that axis value |
| Removals | an axis or a move is rejected | drop it from every direction, not only that item |
| A note on an item ("love this type") | a fixed requirement | carry it into whichever direction wins |
| "A's colours with B's type" | a merge | build the merged card, check it still differs from the rest and passes contrast, then confirm |
| "None of these" | the axes were wrong | ask which was closest and on what; search again from a new angle |

### 7. Choosing

- The user picks: `board_choose(direction, reason)` with their words in the reason.
- The user says "you decide" (or no one can answer): pick from the brief, not from taste. Reason names the scene and the job: "Departure board: shift leads check it 30 times a shift on a tablet in a bright bay; density and contrast serve that best."
- Never pick the safest direction because it is safe. Never pick the boldest because it is bold.

### 8. Standalone boards

When the user only asks for a moodboard ("make me a moodboard for a tea brand"), run a compact version of the loop. The gates still apply and still help.

1. `drip_start` with their request.
2. A three-line brief, stated as assumptions: scene, job, mode. One question at most, only if the subject is unclear.
3. References: 3+ queries across angles, 6-10 `refs_view`, `board_add` after each (`drip_guide refs`).
4. Colours and fonts as their own items.
5. 2-3 directions, `board_open`, the message with your pick.
6. End with one line offering the next step ("Want me to turn this into a system and a first screen?"). Do not write UI files for a board-only request.

A board-only result is finished when the user has a link, the directions, and a recommendation; it does not need a fit check.

---

## Slop tells in moodboards (and the fix)

| Tell | Fix |
|---|---|
| Directions are the same layout in two palettes | Vary 3 of 6 axes; merge look-alikes |
| Names like "Minimal", "Bold", "Elegant", "Modern Clean" | A concrete noun from the subject's world |
| Adjectives like "clean, modern, professional" | Adjectives that rule things out: "dense, square, loud" |
| Every direction dark, or every direction cream | Check the ground axis; at least one differs |
| Palette of 8 near-identical greys | 4-6 colours with roles; at least one does a job besides "neutral" |
| Type pairing "Inter + Inter" in every direction | Each direction has its own voice; check `fonts_pair` |
| Notes: "nice vibe", "love it" | Values: size, ratio, coverage, grid |
| A board of hero shots only | Add sections, components, states |
| Four options, no recommendation | Lead with your pick and its risk |
| Presenting before the gate (fewer than 8 items) | Collect more; `board_directions` refuses anyway |
| An AI-default look offered as a direction without the brief asking | Replace it, or label it as the canon option if it truly is the category standard |

---

## Done when

- [ ] The board has a brief, 8+ items, and every note carries a value.
- [ ] 2-4 directions are saved; every pair differs on 3+ axes.
- [ ] Each direction has a concrete name, a thesis, 3 ruling adjectives, a palette checked for contrast, an available type pairing, and 3+ items.
- [ ] The board was shared (artifact or live link) with one line per direction and a recommendation with its risk.
- [ ] Reactions were read with `board_read`.
- [ ] `board_choose` was called with a reason from the brief.

---

## Reference files

- `moodboard/directions` — clustering method, the axis grid, worked example with three full direction cards, merges and splits.
- `moodboard/presenting` — publishing, message templates, reading the live and static board, revision rounds, unattended runs.

## Sources

Built for Drip around its `board_*` tools. Ideas adapted from: **Impeccable** (Apache-2.0: directions as complete worlds; present one committed direction with honest risk, alternates beside it; the category standard as a quiet, honest option; re-roll limits and asking what quality is missing). **Hallmark** (MIT: options vary on a stated axis; two rounds as the ceiling; named directions with palette and faces; the spent AI looks). **UI UX Pro Max** (MIT: style axes and palette roles). Inspired by Anthropic's **frontend-design** (paraphrased): plan palette as a few named values and type by role, and revise any part of a plan that reads as the default for any similar page.
