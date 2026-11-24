# Moodboard: from studied references to a locked choice

A good board lets the user choose between a few real futures for the design in under a minute, and trust that the choice was worth making. Every reference on it was studied and carries values. Before any direction exists, the criteria that will decide between them are written down from the brief. The directions differ in idea, not in paint: each is named like a movement, argued in a three-sentence manifesto, and at least one crosses the subject with a world it doesn't usually meet. Each is rendered as a style tile at the same fidelity, so the idea decides and not the polish. An independent critic ranks them before the user sees anything; weak ones are reworked, not shown. The user gets a link, one line per direction with the critic's verdict, Drip's pick and its risk, and one question with buttons. The choice is then locked.

---

## The procedure

1. **Brief.** `drip_brief` exists (`drip_guide brief`). For a board-only request the same intake applies, one round of at most 4 questions.
2. **Create.** `board_create(name)`. Every `refs_study` so far is imported; later studies land on it automatically.
3. **Add colours and fonts.** `board_add` 3-8 `#hex` colours from the studies (each with its role) and 2-4 fonts (each with its role); check fonts with `fonts_search`. Images with `source` and licence. The gate needs 6+ items.
4. **Write the choice criteria** (section 2). 3-5 lines, before any direction.
5. **Form 2-3 directions** (`drip_guide moodboard/directions`): an idea each, a movement name, a manifesto, at least one unexpected pairing. Name each one's genre and check its `breaks_if` list (`drip_guide direction/genres`).
6. **Verify each**: `palette_check` (ink on ground ≥ 4.5:1 for body), `fonts_pair` / `fonts_preview` with words from the brief.
7. **Save and comp.** `board_directions` with a real `headline`, `picture` and `layout` per direction and `copy` (`brand`, `body`, `cta`): it renders each as a first-viewport comp at 1440x900. Look at every tile. Unequal fidelity: fix before the critic.
8. **Critic ranks.** `critic_prepare({ kind: "directions", context: "Criteria: …" })` → `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })` with the prompt unchanged → `critic_record({ kind: "directions", …, ranking, perDirection })`.
9. **Rework** what it rejected or cut (section 6). Re-tile and re-run until the set is not rejected (max 3 rounds; then show the best set and say what the critic still objects to).
10. **Present** (`drip_guide moodboard/presenting`): `board_open`, publish `board.html` as an artifact when you can, the message, one AskUserQuestion.
11. **Read and lock.** `board_read` for stars and notes; `board_choose(direction, reason)`. Then `drip_guide direction` and `drip_guide system`.

---

## The craft

### 1. Notes a builder can use

| Item | Weak note | Strong note |
|---|---|---|
| Colour | "nice green" | "#1F3D2B as the whole ground (drenched); cream ink on it ~10:1" |
| Font | "cool serif" | "Display only: high-contrast serif at 96px+, never below 32px; pairs with a plain grotesk body" |
| Image | "vibe" | "Daylight, true colour, people mid-task; crop tight; the treatment for every photo here" |

Studies arrive with their structured fields; don't rewrite them.

### 2. Choice criteria, before the directions

Criteria written after you've seen the options rationalise a favourite. Write them first, from the brief's job, audience, feel, loves and hates.

| Criterion | Kind | Fails a direction when |
|---|---|---|
| The live crowd number is readable in 2 s on a phone | threshold | the number isn't the first thing read at 390px |
| Feels like the gym, not a sports brand | threshold | it could carry a Nike logo unchanged |
| Screenshot-worthy (ambition bold) | trade-off | nobody would send it to a friend |
| Holds real booking density (40 slots/day) | threshold | the layout only works with 4 slots |
| Avoids what climbers get too much of (dark hero photos) | trade-off | it leads with one |

Pass them to the critic in `critic_prepare`'s `context`, show how each direction scores against them on the board message, and use them in `board_choose`'s reason.

### 3. Directions differ in idea

Two directions with the same structure in different colours are one direction rendered twice. Directions differ on the **decision axis**:

| Axis of idea | Example poles |
|---|---|
| What leads | the product working · the number · a statement · the people · the work itself |
| Metaphor / world | an instrument · a printed timetable · a gallery wall · a field guide · a record sleeve |
| Structure | an index · a single huge statement · a timeline · a live demo · a catalogue |

Then they also differ in look (ground, type voice, colour posture, density, shape, energy), but the look follows the idea, not the other way round. Test: describe each in one sentence without naming a colour or a font. If two sentences match, cut one.

### 4. Movements with manifestos

Each direction is a world with a thesis, not "a name + palette".

- **Name**: 1-2 words, like a movement or a school, from the idea: "Door Counter", "Field Guide", "Live Wire". Never "Modern", "Bold", "Minimal Clean".
- **Manifesto** (the `summary` field), exactly three sentences:
  1. the idea: what the surface leads with and why;
  2. how it looks and moves: space, colour, scale, rhythm, in concrete terms;
  3. what it refuses: the category default it turns down.
- **The subtle reference**: where the subject appears as a quiet nod inside the work (grade colours of a climbing wall as the palette; a timetable's rhythm in the type) rather than a literal illustration.

> **Door Counter.** The live crowd number is the hero, read like an instrument at the door. A dark, dense screen: the number at ~30vw in mono, a 3-hour forecast bar, slots as square buttons, amber only for "now". It refuses the dramatic climber photo and the motivational headline.

### 5. The unexpected pairing

At least one direction crosses the subject with a genre from a different world: a Swiss punk record label, an industrial florist, a field-guide bank. Write one line: **why this pairing beats the safe one** for this brief. It must still pass the criteria; strange is not the goal, memorable and fitting is. It also must commit to one genre: "Swiss with a Brutalist edge" is not a pairing, it's a hedge.

### 6. Tiles, the critic, and rework

- **Equal fidelity**: every tile gets the same real copy, the same care, the same checked palette. A polished favourite beside rough alternatives lets the polish decide.
- **No strawmen**: never include a direction you'd refuse to build, to make your pick look good.
- **The critic sees only the brief and the tiles.** Never add your defence, effort or preference to the prompt; `context` holds facts and criteria only.
- **Responding to the ranking:**

| Critic says | Do |
|---|---|
| REJECT (the set) | Replace the weak directions with new ideas, bolder, not recoloured. Re-tile, re-run. `board_open` stays blocked until it's no longer rejected. |
| `cut` on one / "same idea twice" | Drop it, or replace it with a direction that differs on the decision axis |
| `rework` on one | Fix the named problem (timid type, default palette, no idea) at the same fidelity as the others |
| REVISE, ranking clear | Fix the top findings in the kept directions, then present |
| All tied (within 3 points) | Say so; let the criteria decide in your recommendation |

Keep the critic's ranking even if you'd pick differently. You present both.

### 7. Presenting and locking (summary)

Link, one line per direction with the critic's score and its words, your pick and its risk, one AskUserQuestion with your pick first and "Other" open. Full format: `drip_guide moodboard/presenting`. After `board_choose`, the direction is **locked**: later steps don't "improve" it without asking. In `DESIGN.md`, under the direction, note each loser: what it tested, why it lost, what would bring it back.

### 8. Board-only requests

`board` mode runs intake, references, the board, tiles and the critic the same way, then stops after the user picks. Offer the next step in one line ("Want me to turn Door Counter into a system and a first screen?"). Don't write UI files.

---

## Slop tells in moodboards (and the fix)

| Tell | Fix |
|---|---|
| Directions are one layout in two palettes | Differ in idea: what leads, metaphor, structure |
| Names like "Minimal", "Bold", "Elegant" | A movement name from the idea |
| A one-line "vibe" instead of a manifesto | Three sentences: idea, look and motion, refusal |
| Criteria written after picking a favourite | Criteria first, passed to the critic |
| No unexpected pairing; three safe options | One crosses the subject with another world |
| One tile polished, two rough | Equal fidelity, same real copy |
| A strawman direction to make the pick look good | Only directions you'd build |
| Showing the user a set the critic rejected | Rework first; `board_open` is blocked anyway |
| Hiding that the critic ranked differently | Show its ranking next to your pick |
| "A's colours with B's type" grafted on silently | Ask, then build and re-check the merged direction |
| Delegated picks described as the user's taste | Keep them labelled Agent Pick |

## The project's master board (memory across tasks)

The first board of a project is its **master**: it keeps what the project looks like, the approved direction and what was learned. Later boards are **feature** boards (inherit the brand, never change it) or **concept** boards (alternatives).

- **Start**: `drip_start` prints the compact context (also `project_context`). No board yet? `board_project({ action: "bootstrap" })` builds one from the repo's logos, tokens, fonts, DESIGN.md, pages and (with `url`) screenshots of the running app. Imported items are status `current`: existing UI is evidence, not an approved look. `board_import` adds specific files; never replace a board, `board_update` patches with `expect: <revision>`.
- **Fidelity vs redesign**: fidelity extends the approved system. `board_choose` on the master with another direction in redesign mode stores a *proposal* (a style revision); the approved one stays until the user says yes (`board_update({ style: { promote: "sr2" }, approved: true })`; `style: { rollback: true }` goes back). Archive, fork and reset also need the user's yes.
- **Reuse never passes gates**: `board_attach({ adopt: true })` counts the approved direction only if the critic's review of it is on record; `carry: true` counts complete, fresh, same-surface studies. Brief, new research, the build critic and the fit check are still yours.
- **Taste**: `feedback_record` with the user's words, scope (page / feature / brand), source (user-explicit, user-selection, critic, agent-inference) and, when clear, a rule `{ topic, value, avoid }`. Explicit brand feedback becomes an approved rule; anything else is a proposal; a contradiction comes back as a question for the user. `project_learn` lists, approves, rejects and records exceptions. The latest explicit instruction wins over learned defaults.
- **Measured style**: `style_extract` (CSS/tokens and rendered pages) then `style_update` refreshes `.drip/skills/project-design/SKILL.md` (undo with `undo: true`). `style_export` / `style_import` move a style pack between repositories (project-owned material only, no private feedback).
- **Sharing**: `board_project({ share: true })` tracks the memory in Git; feedback stays personal unless `shareFeedback`.

---

## Done when

- [ ] The board has a brief, 6+ items, studies with values, colours and fonts with roles.
- [ ] 3-5 criteria were written before the directions, each a threshold or a trade-off.
- [ ] 2-3 directions differ in idea; each has a movement name and a 3-sentence manifesto; one is an unexpected pairing.
- [ ] Every direction has a checked palette, an available type pairing and a tile at equal fidelity.
- [ ] The critic ranked the set; nothing it rejected or cut was shown unchanged.
- [ ] The user saw the critic's words, your pick and its risk, and chose with buttons.
- [ ] `board_choose` locked the choice with a reason from the brief and the user's words; the losers' reasons are recorded.

---

## Reference files

- `moodboard/directions` — criteria, idea axes, manifestos, unexpected pairings, worked example with three directions, tiles, rework after the critic.
- `moodboard/presenting` — the critic's ranking, publishing, the message, the button question, reading reactions, locking and the loser log.

## Sources

Built for Drip around its `board_*` and `critic_*` tools. Adapted from **Impeccable** (Apache-2.0: directions as complete worlds, one recommendation with honest risk, the category standard as an honest option) and **Hallmark** (MIT: named directions with palette and faces, two rounds as the ceiling, the spent AI looks). New in 0.3: **Owl-Listener/designer-skills** parallel-concepts and concept-selection (MIT: options differ on the decision axis, comparable fidelity, no strawmen, criteria before comparison, never graft the losers), **Anthropic canvas-design** (Apache-2.0: name the movement, write its manifesto, the subtle reference), **Ilm-Alan/frontend-design** (MIT: unexpected pairings, hybrid resistance), **buttonsprite/visual-direction-moodboard** (MIT: attribution, never declare a direction final for the user), **vip999611-ai/Design-review** (Apache-2.0: ties under 3 points).
