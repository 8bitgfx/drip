# Studying a reference: what to look at and what to write down

Opening a shot is not the same as studying it. Studying means reading it the way its designer built it: where the eye lands and why, what grid holds it, what the type is doing, how much of the surface each colour owns, how dense it is, and the one detail that makes it more than competent. You write that down in values while the image is in front of you. The note is the only part that reaches the build.

## The 90-second protocol

Run `refs_view` on the shot. It returns the images full size, the palette Dribbble extracted, tags and the designer's notes. Then go through these in order.

1. **First fixation (5 s).** Where does your eye land first? Why: size, contrast, isolation, colour, a face? Where does it go second? A strong reference has an obvious answer.
2. **Grid (15 s).** Count columns or estimate them (12, 8, 6, asymmetric 5/7). Find the alignment edges: how many vertical lines do things snap to? Estimate the outer margin as a share of width (about 5%, 8%, 12%). Is the layout symmetric, split, or offset?
3. **Type (20 s).** Classify the display face: grotesk, neo-grotesk, geometric, humanist, condensed, extended, serif (old-style, transitional, didone), slab, mono, display. Estimate the display size against body (3:1 is quiet, 6:1 is loud, 10:1 is a poster). Note weight, case, tracking, leading. How many sizes are on screen? Fewer than 5 usually means a disciplined scale.
4. **Colour (15 s).** Name ground, ink and accent. Estimate coverage: does the accent own under 5% (restrained), 30-60% (committed), several named roles (full palette), or the whole ground (drenched)? Use the palette `refs_view` returns as the starting hexes; correct by eye.
5. **Density (10 s).** Words on the first screen (roughly 30, 80, 200?). Items per row. Is space used as a separator or are there rules and boxes? How many container levels deep?
6. **Motion (10 s, video shots only).** What moves, triggered by what, roughly how long (under 200 ms, about 300 ms, over 500 ms), and whether it explains a change or decorates.
7. **The detail (15 s).** One specific, transferable move: prices in the display face, a 1px rule that runs into the margin, a table whose header is the section title, numbers in tabular figures aligned on the decimal. If you cannot name one, the shot is competent, not a reference.

Then decide **take** and **leave**.

## Take and leave

- **Take** one move. The move must survive being moved to your product: a grid ratio, a type relationship, a colour proportion, a way of showing the product, a component treatment, a motion rule.
- **Leave** whatever is concept-art fiction or would be copying: the illustration, the photo, the copy, the logo, the fake data, the floating device, the effect that is the designer's signature.

## Note format

What you pass to `board_add` as the note. One to three lines, values included.

```
Layout: 12 col, headline cols 1-7 flush left, live product UI cols 6-12 overlapping by one col; CTA pair under head.
Type: neo-grotesk 600 ~88px, -2% tracking, two lines; body 18px; ratio ~5:1; 4 sizes total.
Colour: off-white ground, ink #111, one cobalt on CTA + selected row only (~3%).
Take: the product UI overlapping the headline column. Leave: the fake 3D tilt and the stock avatars.
```

Shorter is fine when one thing matters:

```
Take: section heads set inside the table header row, so each section reads as a ledger page; 1px rules, no boxes.
```

## Good notes and bad notes

| Bad (rejected or useless) | Good (a builder can act on it) |
|---|---|
| "Clean and modern" | "Two type sizes only (64/16), everything else is weight and colour; huge gaps between sections (~160px)" |
| "Nice colours" | "Drenched: the whole ground is #1F3D2B, ink cream, the accent is just a lighter green for links" |
| "Love the layout" | "Asymmetric 5/7 split; text column left, a single tall photo right that bleeds to the edge and the top" |
| "Cool animation" | "Numbers count up once on load (~600 ms ease-out) and never again; nothing else moves" |
| "Good dashboard" | "Left rail 56px icon-only, filters as a single row of chips over the table, totals pinned in the table footer" |
| "Great typography" | "Didone display at 140px with tight leading over a mono caption at 12px; only black and one red" |

## Reading a multi-image shot

Many shots hold several images (a hero, detail crops, mobile views). `refs_view` returns up to 8 with `maxImages`. Look for:
- **The detail crops:** they show what the designer was proud of. Often that is the detail to take.
- **The mobile view:** does the composition survive at 390px, or was it designed only for a 1440 frame?
- **Lower sections:** a shot that only has a hero gives you a first viewport, not a page.

## Concept versus shipped

| Signal | Concept art (take the look, verify the behaviour) | Shipped (trust the behaviour too) |
|---|---|---|
| Content | perfect short names, round numbers | messy lengths, real counts, truncation |
| States | only the happy path | empty, loading, error states visible |
| Text | 10-12px grey labels | readable sizes, real contrast |
| Charts | smooth curves, no axes | axes, units, legends |
| Frame | device floating on a gradient | a real browser or app window, or none |

For Operate and Read surfaces, back every behavioural move (table density, navigation model, filter pattern) with at least 2 shipped products. `drip_guide refs/sources` lists where to find them.

## Translate notes into decisions

Notes become tokens and layouts later. Keep the numbers rough but real; the system step (`drip_guide system`) sets exact values.

| Note says | Becomes |
|---|---|
| ratio ~6:1 display to body | type scale with a big jump at the top (`drip_guide type`) |
| accent ~3%, CTA and selection only | Restrained colour strategy (`drip_guide color`) |
| 5/7 asymmetric split, flush left | layout grid and hero composition (`drip_guide layout`) |
| 48px table rows, totals pinned | Operate density (`drip_guide app`) |
| one count-up on load, nothing else moves | motion budget (`drip_guide motion`) |

## Ethics and credit

- References are for study. Never download and ship a reference image, never reproduce a shot's illustration, photo, logo, copy or icon set.
- The board keeps the designer and the link; leave them there.
- Never redistribute shots outside the board (no committing them to the repo).

## Sources

Built for Drip around `refs_view` and `board_add`. Ideas adapted from **Hallmark** (MIT: mass, interval and entry as the three questions for comparing a composition; take a reference's composition, not its compliance) and **Impeccable** (Apache-2.0: the first-viewport memory test; a reference sets the craft bar). Inspired by Anthropic's **frontend-design** (paraphrased): structure such as numbering or rules should encode real information.
