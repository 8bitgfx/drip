# References: gather widely, pick on purpose, study up close

Good reference work looks like this: from the brief, you write queries that come at the surface from three angles (what it is, what quality it should have, what world its audience lives in). Round one is wide: you scan well over a hundred thumbnails and keep 15-30 distinct candidates, with at least two contrasting readings of every feel word, so the comparison space is open before anything converges. Then you commit: you pick the few that solve this brief, each with a reason, open them full size, zoom into the part that matters, and write down what they do in numbers and names, including what each one chose not to do. Every claim of quality is earned by a value. Your studies come from several queries and designers, some from outside the category, so the board holds options rather than ten versions of the trend. Nothing is copied whole; each reference lends one move.

---

## The procedure

1. **Re-read the brief** (`drip_brief` output). Audience, job, feel, loves, hates, the rut to avoid. Hates and the rut tell you what not to collect.
2. **Write 4-6 query lines** before searching (`drip_guide refs/queries`):
   - **Direct:** surface + category. `fintech dashboard`, `restaurant website`.
   - **Quality-led:** a named trait or school + surface. `swiss typography landing page`, `dense data table dark`.
   - **Shipped sites:** `refs_site` on 3-4 real sites of the same kind; they give you measured sizes, which Dribbble shots never do.
   - **Pattern:** the hardest component. `pricing table toggle`, `onboarding empty state`.
   - **Contrast pair:** for each feel word, one query for each of two readings (`playful` → `playful toy ui` and `playful kinetic typography`).
3. **Search.** `refs_search` for the direct and quality-led lines, with `category` where it narrows. Read the contact sheet.
4. **Fan out.** `refs_related` on your best query; take 2-4 specific tags to `refs_tag`, pages 1-3. A shot that stops you: `refs_designer`.
5. **Calibrate once.** One `refs_feed` shows what is current. It is the trend to know about, not the source.
6. **Pick.** From each sheet, `refs_pick` the 2-5 that solve this brief, each with a reason.
7. **View, zoom, study** each pick (`drip_guide refs/studying`): `refs_view` → `refs_zoom` on the detail → `refs_study`. Write while the image is in front of you.
8. **Check the spread** (section 6). Gaps: search a different angle and repeat 6-7.
9. **Shipped evidence** for Operate and Read (`drip_guide refs/sources`): real sites as `image` items on the board.
10. **Summarise** in 4-6 lines what the studies share and where they split, then `drip_guide moodboard`. In `refs` mode, stop here and offer the board.

---

## The craft

### 1. Counts

| Loop | Queries | Scanned | Candidates kept (round 1) | Picked → studied |
|---|---|---|---|---|
| Full loop | `refs_site` on 3-4 shipped sites, plus 1-2 tags for gaps | 30-50 | 4-8 | 4-6 studied (gate: 4 from 3 designers/sites, 3 on-surface) |
| Component or section | 2-3 | 40-80 | 10-15 | 6-8 |
| Logo | 3-4 incl. subject world and type | 80-120 | 15-25 | 6-10 |
| Polish | none | none | none | follow `DESIGN.md` |

A full loop usually studies 8-12 references.

### 2. Round 1 is wide on purpose

Converging early is how a board ends up as one trend in three colours. Before anything is picked:

- 15-30 **distinct** candidates: different grounds, type voices, densities. Ten near-identical dark dashboards count as one.
- For every feel word in the brief, at least **2 contrasting readings** ("bold" as huge type, and "bold" as a drenched colour field).
- Note 2-3 **high-contrast pairs** while scanning (a still, airy page beside a dense, loud one). They open the conversation on the board.
- Never let 3-4 images stand for a whole direction. A direction needs studies, not a vibe.

### 3. Query writing

Dribbble matches titles and tags. Nouns designers put in titles work; adjectives everyone uses don't.

| Works | Why | Doesn't | Why |
|---|---|---|---|
| `bento grid landing page` | pattern noun + surface | `modern landing page` | "modern" is on every shot |
| `brutalist web design` | a named school | `beautiful website` | taste words match nothing |
| `timetable typography` | subject artifact + craft | `clean ui` | returns the median |
| `kanban board dark mode` | component + condition | `best dashboard design` | ranking words are noise |

- Do: change one word between related queries to see what the word buys.
- Don't: repeat a query with synonyms; you get the same 84 shots.

### 4. Pick, view, zoom, study: the calls

**Pick** from the last sheet, a reason each, tied to the brief:

```
refs_pick({ picks: [
  { shot: "7",  why: "type-led hero at ~180px with no imagery: the 'loud' feel without a gradient" },
  { shot: "19", why: "only one using motion trails as structure, not decoration" },
  { shot: "31", why: "the only schedule page whose grid holds 40 rows without feeling dense" } ] })
```

**View** each full size: `refs_view("7")`. Read it top to bottom; note where the eye lands.

**Zoom** on the part that decides it:

```
refs_zoom({ shot: "7", region: "top-left" })            // the nav and headline
refs_zoom({ shot: "19", region: "center" })             // the trail diagram
refs_zoom({ shot: "31", region: { x: 60, y: 10, w: 35, h: 30 } })   // the timetable block
```

Named regions: `top`, `middle`, `bottom`, `left`, `right`, `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`. Use `image: 2` for a shot's second image.

**Study** with values in every field:

```
refs_study({ shot: "7",
  layout:  "12-col, headline spans cols 1-9 at ~180px, image bleeds off the right edge",
  type:    "condensed grotesk caps, display:body ~10:1, -2% tracking",
  color:   "#0E0E0E ground, one acid #D4FF3A on the CTA only (<3% of the surface)",
  density: "~25 words above the fold, 3 sections per screen-height",
  detail:  "nav links in the body face at 16px, sitting on the headline's baseline",
  take:    "the 10:1 type ratio and the single acid accent",
  leave:   "the stock 3D render; it chose no secondary colour at all, and we keep that refusal" })
```

Too vague, the tool answers "Too vague to count" and names the fields to rewrite. It also refuses a shot you haven't `refs_view`ed.

### 5. No unearned praise

A study is worth only what a builder can act on. Before you write a quality word, find the value that earns it; if you can't, the word goes.

| Claim | Earned by | Unearned when |
|---|---|---|
| "refined typography" | a named class, a scale ratio, tracking, a figure style | Inter at default settings, no visible scale |
| "restrained colour" | accent coverage under ~10%, named roles | the accent is on 20%+ of the surface |
| "sophisticated depth" | 2+ shadow layers, lightness steps, a light direction | one black drop shadow |
| "strong hierarchy" | a size ratio, what the eye hits 1st/2nd/3rd | everything within 1.2x of each other |
| "polished" | states shown, alignment you measured | only a happy-path hero |

Three more rules:
- **Restraint counts.** At least one field (usually `leave` or `detail`) says what the design **chose not to do**: no secondary colour, no imagery, no cards, no motion.
- **A real B.** "Chose numbered nav over icons" is a finding; "chose good type over bad type" is a strawman. Every "A over B" names an alternative a competent designer might have picked.
- **Would it apply to any modern site?** Then it isn't a finding. Delete it.

### 6. Spread: a board of options, not of clones

- [ ] Studies come from 3+ queries and 3+ designers (aim for 5+), at most 3 per designer.
- [ ] Most studies ARE the thing being built, and at least 2 are shipped sites (`refs_site`).
- [ ] At least 2 different grounds or colour postures, and 2 different type voices.
- [ ] Each feel word has 2 contrasting readings among the candidates.
- [ ] Below-the-fold sections, states or components are represented, not only heroes.
- [ ] Operate/Read: 2+ shipped products or real sites.

If it clusters into one direction, search again from a different angle.

### 7. Attribution: whose taste is this?

| Label | Means | Set by |
|---|---|---|
| `Candidate` | on a sheet, not chosen | the listing |
| `Agent Pick` | you chose it, with a reason | `refs_pick` / `refs_study` |
| `User Selected` | the user starred it or named it | `board_read` stars, the user's words, `loves` in the brief |

When you summarise references or write directions, say which is which ("two of these are your picks, five are mine"). If the user said "just pick for me", your picks stay `Agent Pick`; never describe them as what the user likes.

### 8. Study, don't copy

- Take **one move per reference**: a grid, a type relationship, a colour proportion, a way of showing the product. Combine moves from 3+ references.
- **Squint test** at the fit check: if someone could say "that's the X shot", change the composition.
- Never lift illustrations, photographs, logos, copy, icon sets or a signature effect. Credit stays on the board.

### 9. Dribbble is concept art

Shots are made to be liked, not used: perfect names, round numbers, no empty or error states, 11px grey labels, charts with no axes. Take composition, type and colour from them. For behaviour, density and states, trust shipped products (`drip_guide refs/sources`).

---

## Slop tells in reference work (and the fix)

| Tell | Fix |
|---|---|
| One query, the category name | 4-6 lines across angles, plus contrast pairs |
| All picks from page 1 of popular | Fan out through tags (pages 2-3) and designers |
| Ten picks that look alike | Widen round 1; run the spread checklist |
| Studying from thumbnails, no zoom | `refs_view` then `refs_zoom` on the detail |
| "Clean layout, nice colours" | Values in every field; the tool rejects the rest |
| "Refined type" on a default face | Earn it with a ratio and a class, or delete it |
| No restraint noted | Record what it chose not to do |
| Delegated picks presented as the user's taste | Keep them `Agent Pick` |
| The build is the most-liked shot with a new logo | One move per reference |

---

## Done when

- [ ] 4+ queries from 3+ angles, with at least one fan-out through `refs_related` and `refs_tag`.
- [ ] Round 1 kept 15-30 distinct candidates with 2 readings per feel word.
- [ ] Every study went pick → view → zoom (where the detail mattered) → study.
- [ ] 6+ studied from 3+ designers; every study has values, a restraint, and a take/leave.
- [ ] The spread checklist passes; attribution is clear in the summary.

---

## Reference files

- `refs/queries` — query patterns per surface type, subject-world prompts by product kind, useful tags.
- `refs/studying` — viewing and zooming, the study fields, the praise check, good and bad studies, concept vs. shipped.
- `refs/sources` — sites beyond Dribbble (Godly, Land-book, Mobbin and others), what each is for, how to capture.

## Sources

Built for Drip around its `refs_*` tools. Ideas adapted from: **Impeccable** (Apache-2.0: candidates from the audience's own world; a referenced product sets the craft bar, not the look). **Hallmark** (MIT: take a reference's composition, never its content). **Taste Skill** (MIT: never copy a reference's code, copy, pictures or signature effect). **UI UX Pro Max** (MIT: style keywords as search terms). New in 0.3: **buttonsprite/visual-direction-moodboard** (MIT: Candidate / Agent Pick / User Selected, a wide first round with contrasting readings per keyword, high-contrast pairs, critique craft not adjectives). Ideas only (no licence, paraphrased, no text reused): **senlindesign/taste-skill** (delete findings that fit any site or cite no value, cross-check praise against the data, at least one restraint, a real B for every "A over B").
