# Studying a reference: view, zoom, then write what it really does

Opening a shot is not studying it. Studying means reading it the way its designer built it: where the eye lands and why, what grid holds it, what the type is doing, how much of the surface each colour owns, how dense it is, the one detail that lifts it above competent, and the things it deliberately left out. You look at it full size, zoom into the part that decides it, and write all of that down in values while the image is in front of you. `refs_study` is the only part that reaches the board, the directions and the build.

## The flow

```
refs_pick  → refs_view  → refs_zoom (1-2 regions)  → refs_study
  reason      full size     the detail that decides    values in every field
```

`refs_study` refuses a shot you haven't viewed ("Look at it first"), and refuses vague notes ("Too vague to count"), naming the fields to rewrite.

## The 2-minute protocol

After `refs_view`, go through these in order.

1. **First fixation (5 s).** Where does your eye land first, and why: size, contrast, isolation, colour, a face? Where next?
2. **Grid (15 s).** Count or estimate columns (12, 8, 6, asymmetric 5/7). How many vertical alignment edges? Outer margin as a share of width (~5%, 8%, 12%)?
3. **Zoom (30 s).** `refs_zoom` on the region that decides the shot: the nav and headline (`top-left`), a card (`center`), a chart, the footer (`bottom`), or exact percentages `{x, y, w, h}`. Read the type there: class, weight, tracking, figures.
4. **Type (20 s).** Classify the display face (grotesk, neo-grotesk, geometric, humanist, condensed, extended, old-style, transitional, didone, slab, mono). Estimate display:body (3:1 quiet, 6:1 loud, 10:1 poster). How many sizes on screen?
5. **Colour (15 s).** Ground, ink, accent. Coverage: accent under 5% (restrained), 30-60% (committed), several roles (full palette), the whole ground (drenched). Start from the hexes `refs_view` returns; correct by eye.
6. **Density (10 s).** Words on the first screen (~30, 80, 200?). Items per row. Space or rules as separators? How many container levels?
7. **Detail (15 s).** One specific, transferable move. If you can't name one, the shot is competent, not a reference.
8. **Restraint (10 s).** What could it have done and didn't? No second colour, no imagery, no cards, no motion, no icons.

Then **take** and **leave**.

## The fields

| Field | Write | Example |
|---|---|---|
| `layout` | grid, alignment, what leads, where the action sits | "12-col, head cols 1-6 flush left, product UI cols 7-12 bleeding right; CTA under head" |
| `type` | class, size ratio, weight, case, tracking, sizes in use | "condensed grotesk ~120px caps, tight leading; body 17px; ~7:1; 4 sizes total" |
| `color` | ground, ink, accent with hex, posture, coverage | "warm grey #E9E6E1 ground, #141414 ink, one orange #F2551F on CTA and active state, <5%" |
| `density` | words per screen, items per row, rhythm | "~40 words a screen; 4-col table, 48px rows; ~160px between sections" |
| `detail` | one move worth taking | "prices set in the display face, cents superscript at 40%" |
| `take` | the move this reference lends the design | "the 7:1 condensed head over a quiet body" |
| `leave` | Dribbble fiction, what would be copying, and what it chose not to do | "the fake 3D tilt and stock avatars. It uses no second accent and no icons; keep that." |
| `motion` (optional) | video shots only: what moves, trigger, duration | "rows slide in, 40ms stagger, ~250ms ease-out; nothing else moves" |

## The praise check

Read your study back before calling `refs_study`. Delete or fix any line that:

| Fails because | Example | Fix |
|---|---|---|
| it would describe any modern site | "good use of whitespace" | "~160px between sections, 24px inside groups (~7:1)" |
| it cites no value | "strong typography" | "didone display 140px over 12px mono caption, 2 sizes only" |
| the data contradicts it | "restrained palette" with a coloured ground and 3 accents | call it what it is: "full palette, 3 roles" |
| the reason is a cliché | "for better UX" | the actual effect: "the price is the first thing read" |
| the B is a strawman | "chose readable type over unreadable" | a real alternative: "chose numbered text nav over an icon bar" |

**Cross-checks** that catch flattery:
- "Refined type" on Inter or a system face at default settings with no visible scale → not refined.
- "Sophisticated depth" from one black drop shadow → not sophisticated.
- "Restrained colour" with the accent on more than ~20% of the surface → committed, not restrained.
- "Polished interactions" with no visible states → you can't know from a still; say "states not shown".

Accurate and few beats polished and fake: 3 true findings outweigh 7 generous ones.

## Good studies and bad ones

| Bad (rejected or useless) | Good (a builder can act on it) |
|---|---|
| layout: "Clean and modern" | "Two type sizes only (64/16), hierarchy from weight and colour; ~160px between sections" |
| color: "Nice colours" | "Drenched: the whole ground is #1F3D2B, ink #F1EADB (~11:1), accent is a lighter green for links only" |
| detail: "Love the layout" | "Asymmetric 5/7; text left, one tall photo right that bleeds to the top and right edges" |
| take: "The vibe" | "Section heads set inside the table header row, so each section reads as a ledger page" |
| leave: "Nothing" | "The floating phone mockup. It never uses a card or a shadow; we keep that refusal." |

## Reading a multi-image shot

`refs_view` returns several images when a shot has them; `refs_zoom` takes `image: 2`, `3`…
- **Detail crops** show what the designer was proud of: often the detail to take.
- **The mobile view**: does the composition survive at 390px?
- **Lower sections**: a hero-only shot gives you a first viewport, not a page.

## Concept versus shipped

| Signal | Concept art (take the look, verify the behaviour) | Shipped (trust the behaviour too) |
|---|---|---|
| Content | perfect short names, round numbers | messy lengths, truncation |
| States | only the happy path | empty, loading, error visible |
| Text | 10-12px grey labels | readable sizes, real contrast |
| Charts | smooth curves, no axes | axes, units, legends |

For Operate and Read, back every behavioural move with 2+ shipped products (`drip_guide refs/sources`).

## Translate studies into decisions

| Study says | Becomes |
|---|---|
| display:body ~6:1 | a type scale with a big top jump (`drip_guide type`) |
| accent ~3%, CTA and selection only | Restrained posture (`drip_guide color`) |
| 5/7 asymmetric, flush left | the hero composition (`drip_guide layout`) |
| "no cards, no shadows" (restraint) | the shape and depth stance (`drip_guide direction`) |

## Ethics and credit

- References are for study. Never ship a reference image or reproduce its illustration, photo, logo, copy or icon set.
- The board keeps the designer and the link; leave them there. Never commit shots to the repo.

## Sources

Built for Drip around `refs_view`, `refs_zoom` and `refs_study`. Adapted from **Hallmark** (MIT: mass, interval and entry for comparing compositions) and **Impeccable** (Apache-2.0: the first-viewport memory test; a reference sets the craft bar). New in 0.3: **buttonsprite/visual-direction-moodboard** (MIT: critique concrete craft, never "clean", "modern" or "premium"). Ideas only (no licence, paraphrased): **senlindesign/taste-skill** (the observer step that deletes generic or contradicted findings, cross-checks against the data, a restraint principle, a real B).
