# Logos and wordmarks

A good logo is one idea, drawn so precisely that it looks inevitable. You can describe it in one sentence, and that
sentence belongs to no one else. It reads at 16px in one colour, on light and on dark, and it still reads as the same
thing mirrored, squinted at and next to the best marks in its category. Its curves are a handful of smooth Béziers,
its strokes feel even because they were made uneven on purpose, and its letters were kerned and cut by hand from a
typeface chosen for a reason. Nothing in it is decoration. Nothing in it is a pun you get once and then tire of.
The last Drip logo failed every one of these: a glossy drop that read as blood, a stock serif wordmark, a lumpy
nine-node drip. This guide exists so that never happens again.

## The procedure

0. **Defaults.** The default is the house style in `drip_guide logo/house-style`: one bold silhouette with one
   master for every size, flat palette colour (main + one accent, no gradients, foil, glow or texture), the user
   seeing finalists after one critic round, and ONE postable brand board per logo built from
   `drip_kit({ template: "logo-board" })`. Read its section 1, what a user rejected in their own words, first.
1. **Open the task.** `drip_start` with the request (mode `logo`). Read the project first: README, existing
   `brand/` or `public/` assets, current favicon, CSS tokens, the product's own copy. Never ask what you can read.
2. **Identity intake** (AskUserQuestion, one round, at most 4 questions, your recommended answer first, "Other" open).
   Ask only what the project didn't tell you:
   - **The name**: what it means, where it came from, how it's said. A name with a story gives you concepts for free.
   - **Where it lives**: app icon, favicon, a game's loading screen, merch, signage, a GitHub avatar, print. This
     decides the mark type more than taste does (an app icon needs a symbol; a newsletter can live on a wordmark).
   - **Competitors and neighbours**: 2-4 names. Their marks are the ones yours must not resemble.
   - **Loves and hates**: marks they admire or dislike, one sentence each ("negative space sharpens positive
     selection"), plus anything to avoid (a colour, an animal, a symbol with baggage in their market).
   - **"Like an artist" means what?** If the brief says artistic, hand-made, painterly or "like an artist", ask:
     hand-made texture (ink bleed, brush grain) or designer-polished craft (precise curves, considered type)?
     Recommend the second: for logos people almost always mean crafted precision. A real Drip job lost a whole
     round faking ink with displacement filters; the verdict was "messy, unprofessional".
   Store it with `drip_brief`. Add 3 brand attributes that rule things out ("exact, unhurried, warm" rules out
   playful and loud), and one sentence on what the audience already gets too much of.
3. **Category study.** Keyword search returns generic logos ("paint drip logo" gave clip art), so use it only to
   map the category's defaults. For quality, page through branding tags with `refs_tag` ("branding",
   "logotype", "wordmark", "brand identity", "lettering") and `refs_designer` for 2-3 identity studios.
   `refs_pick` 6-8, `refs_view` + `refs_study` each (what the mark leads with, construction, weight, what it chose
   not to do). From these, write two lists: the **category defaults** and the **peer set** (3-4 top branding
   shots, ideally from other categories, used in the peer test and shown next to your finalists).
   Read `drip_guide logo/cliches` for the category's clichés.
4. **Concepts.** 8-12 one-sentence concepts across at least 2 mark types, produced by 3-4 parallel subagents that
   each own one direction (`drip_guide logo/concepts`). Cut to 8 yourself: no clichés, no literal name pictures,
   no two concepts with the same idea.
5. **Sketch as SVG, from code.** Start a small JS module from the first sketch (`brand/logo/concepts.mjs`, one
   function per concept returning SVG markup, shared helpers for the grid and the wordmark paths) and generate
   every sheet from it. Iteration becomes "change one function, rerender", not hand-editing files. Each concept
   is a rough black SVG on a 256 viewBox. Rough means unrefined, not lumpy: still few nodes, still one path for
   organic shapes. Write the generated files to `brand/logo/concepts/`.
6. **Sheet, greyscale.** `logo_sheet` with all concepts, black only. Per direction, show what decides fast: the
   wordmark (or lockup) on light, the same on dark, and the icon large and small. Look at the smallest column
   first: anything that's a smudge there is cut or simplified now. **Every later iteration gets the same 32px
   and 16px check on light and dark**, not just the final.
7. **Critic ranks.** `critic_prepare({ kind: "logo", targets: [<sheet file>] })` → Agent `drip:critic` with the
   prompt unchanged → `critic_record`. Cut what it rejects; rework what it calls generic once.
8. **Build the top 3 that differ most** (in idea, not just style) in black on the 256 grid with exact angles,
   overshoot, stroke contrast and clean junctions (`drip_guide logo/construction`; wordmarks:
   `drip_guide logo/wordmarks`). Save `-v1`, `-v2`… per change.
9. **Test each finalist.** `logo_test` per SVG, then the manual tests: 16px squint, one colour, reversed with
   irradiation compensation, mirror and 180°, letter test, peer test (`drip_guide logo/testing`). Fix and retest
   until no hint is left and no fatal flaw remains.
10. **Critic on finalists.** One `logo_sheet` of the 3 finalists plus their `logo_test` renders and the 3 peer
    shots side by side → `critic_prepare` kind `logo`, with the context "would a brand studio ship this? Name
    the 3 amateur tells" → critic → `critic_record`. A fatal flaw kills a finalist whatever its score. Nothing
    reaches the user before this, and nothing more than this: fix only fatal flaws, then show the user. Never run
    extra rework rounds the user didn't ask for; on a real job three of them turned a mark the user liked into
    "a croissant and a basic cloud with a line".
11. **User picks.** Greyscale sheet next to the peer shots + one line per finalist (idea, critic score, one honest
    risk), your pick first. AskUserQuestion with the finalists as options. **Chosen = locked.** The user's words
    beat the critic's score: when they prefer a version the critic ranked lower, theirs wins and you say so.
12. **Colour, lockups, deliverables.** Colour on the locked mark, FLAT (`palette_generate`, `palette_check`;
    house-style section 2: main colour body, accent on the idea's part, versions for light, dark and the brand
    colour), lockups, clear space, the file set, favicon and app icon, BRAND.md (`drip_guide logo/deliverables`).
    Final `logo_test` on the coloured primary and the favicon.
13. **The brand board.** Study 3-4 single-image brand boards first (`refs_tag` "brand guidelines", "brand book",
    "logo presentation"; `refs_view` them) and note their system. Then `drip_kit({ template: "logo-board" })`,
    fill it (the mark as a symbol coloured per tile, the outlined wordmark, flat phone and card renders), render it
    with `render_html` at scale 2, and look at it at 600px wide before showing it. One board per logo. `drip_end`
    with the hand-off.

## The craft

### Identify, don't explain

A logo is a name tag with a face, not an illustration of the business. Nike's mark doesn't show shoes. The job is
to be **recognisable, ownable and durable**; meaning accrues from use. Meaning still matters as a source of form,
but it should be one step removed from the obvious.

- **Do** reach for the *subtle reference*: the subject as a quiet structural quote (a bakery's B whose bowls are two
  proving loaves seen from above), not a picture (a loaf).
- **Don't** draw the name. A cup for "Cup Coffee", a drop for "Drip", a rocket for "Launch". If the literal reading
  is unavoidable, push it two steps further or drop it.
- **Concept before style.** Each direction is one sentence of idea first ("paint that won't stay inside the
  selection box": breaking out of the template). Styling the same literal pun twice is one concept, and it failed
  twice on a real job.
- **Don't** assemble a mark from primitives (a rect plus a circle, a circle plus a triangle). It reads as "basic":
  there's no craft in the curves. Draw the outline as a designed path.

### Mark types and when each fits

| Type | Fits when | Risk |
|---|---|---|
| Wordmark | Short or distinctive name (≤ 10 letters), web and print first | Generic if the type isn't customised |
| Lettermark / monogram | Long name, needs a square form, initials already used | Initials are rarely ownable; needs a strong idea |
| Symbol (abstract or pictorial) | App icon, favicon, games, physical product | Needs years of exposure to carry a name alone |
| Combination | Most new brands: symbol for small spaces, wordmark for clarity | Two weak halves; the parts must share DNA |
| Emblem | Heritage, sports, games, craft goods, badges | Dies at small size; needs a simplified symbol for 16px |
| Mascot | Kids, games, food, community brands | Illustration skills; needs a reduced head-only version |

Explore at least 2 types. A new product with an app icon almost always needs a symbol plus a wordmark.

### Construction in one paragraph

Black first on a 256-unit square. Nodes sit on the extremes of curves (top, bottom, left, right), handles are
horizontal or vertical there, and a circle is four nodes. Round shapes overshoot flat ones by 1-3% of their
height; pointed apexes overshoot more. Horizontal strokes are 5-10% thinner than vertical ones so they look equal.
Where strokes meet, thin them so the joint doesn't clot. Gaps and strokes never drop under 16 units. Full method:
`drip_guide logo/construction`.

- **Do** draw with `M`, `C`, `L`, `A` and `Z`, coordinates rounded to 0-1 decimals, `fill-rule="evenodd"` for holes.
- **Don't** hand-place many points to approximate a curve. Nine nodes on a drop is a lumpy drop.
- **Liquid and organic shapes are ONE path** with continuous tangents at every join: shoulder fillet → neck
  S-curve that pinches → bulb arc, the tangent vertical where neck meets bulb. Rect + circle + a goo blur looks
  cheap and isn't a vector. A straight tapered neck meeting a vertical bulb tangent kinks visibly at large sizes.
  Thin drips read as legs (the octopus problem). Details in `drip_guide logo/construction`.
- **Optical centring: centre the body, not the box.** The centre of a mark is where a viewer puts it. A box
  with drips hanging off it is centred on the box; the drips are details. Drips, tails, sparkles, antennae and
  descenders stretch the bounding box without moving the eye's centre, so centring the box hangs the body high or
  shoves it sideways. Run `optical_center` on the mark: it strips the thin parts and returns the body's centre,
  the offset to apply in a frame, and the `transform-origin` for animating it. Centre the body in the icon frame,
  align lockup text to the body's edges, lift it 1-3% (centred shapes read low), and check at 32px.

- Build in solid black on the 256-unit viewBox with exact angles only (0/15/30/45/60/90°); colour comes last.

### Wordmarks: chosen, then made

Start from a typeface picked for structure (stress, aperture, terminals, width), previewed with the real name in
`fonts_preview`. Then kern by eye at display size, tighten tracking, and make one or two deliberate interventions:
a cut, a ligature, one unique letter, a shared stroke. Outline to paths with `logo_outline`, always: a wordmark
SVG shown through `<img>` (GitHub READMEs, most sites) can't load fonts. Keep the path data in the repo so
renders are deterministic. A wordmark that is "Fraunces, 600, default spacing" is not a wordmark; it's a font.
Full method: `drip_guide logo/wordmarks`.

**Lockups align to the font's metrics, measured, not eyeballed.** `logo_outline` returns ascender, cap height,
x-height, baseline and advance widths; snap the mark to them (for example the frame's top on the ascender, its
bottom on the baseline, drips hanging below like a descender). `drip_guide logo/deliverables`.

### Colour comes last, and small

- **Do** decide colour on the locked black mark: one brand colour, plus black and white. Two colours need a reason;
  three need a system.
- **Do** check how the colour reads in the category and culture: red in a medical or "drip" context reads as blood,
  green in finance as profit, purple gradients in tech as "AI startup".
- **Do** show the mark in its colours, not only as a black or white silhouette: "logos are flat white or black...
  be a proper brand" was a real user's complaint. Body in the main colour, the idea's part in the accent.
- **Don't** use a gradient, gloss, bevel, foil, lit edge or glow, on the mark or behind it. If the mark needs
  effects to look good, the form is weak. Gradient plus sheen reads as a "cheap button"; flat colour won on two
  real jobs, and a user answered a gradient "foil" version with "I'm asking for the logo to be flat and good".
- **Don't** fake hand-made texture with SVG filters (displacement, turbulence, blur). It fails as a vector, dies
  at small sizes and reads as messy. If texture is truly the brief, draw it as shapes in a secondary asset.

### Small sizes decide the design

At 16px every 16 units of the 256 grid is one pixel. A 10-unit gap vanishes, a 12-unit hairline turns grey, three
details merge into one blob. Design the 16px version alongside the large one, not after it. Below ~24px, details
may blur as long as the silhouette still reads. If it doesn't, make a reduced version (symbol only, fewer
elements) and say so in BRAND.md.

## Slop tells (and the fix)

| Tell | Fix |
|---|---|
| The literal object for the name (drop for Drip, leaf for Eco) | Push to a subtle reference, or let a wordmark carry it |
| Glossy highlight, gradient, bevel or drop shadow on the mark | Flat solid fill; form does the work |
| Lumpy curves: many nodes, tiny segments, wobbly outlines | Redraw with nodes on extremes, 3-6 nodes per closed shape |
| Stock font wordmark at default spacing | Kern, tighten, one customised letter, outline (`logo/wordmarks`) |
| Sparkle ✦, neural nodes, hexagon, infinity loop for anything "AI" | Read `logo/cliches`; find the idea in the product, not the category |
| Monoline outline icon in a rounded square (generic app-icon look) | Solid shapes, a silhouette that reads filled |
| Near-miss angles (44°, 31°) and almost-touching shapes ("tangent kisses") | Exact 45°/30°; either overlap clearly or leave ≥ 16 units |
| Mark + name centred in a pill or circle badge with no reason | Free-standing mark; containers only for emblems that need them |
| Three or more colours, rainbow segments | One colour plus black and white |
| A tagline inside the logo | Taglines live next to the logo in layouts, never in the master |
| Text on a curve around a circle (amateur emblem) | Only for true emblems, set with care, and a reduced symbol for small sizes |
| Detail that disappears below 64px | Remove it, or make a reduced version |
| Displacement/turbulence filters faking ink or paint | Crafted vector shapes; texture never in the master |
| Mark built from primitives (rect + circle), goo blur joining them | One designed path with continuous tangents |
| Thin parallel drips or tails (reads as legs, an octopus) | Fewer, fuller forms with varied lengths |
| Lockup where the mark floats off the type's lines | Snap to `logo_outline` metrics: ascender, cap, baseline |

## Done when
- [ ] Brief stored: name meaning, where it lives, competitors, avoid list, 3 attributes that rule things out.
- [ ] 8-12 one-sentence concepts across ≥ 2 mark types, from ≥ 3 parallel subagents; a `logo_sheet` exists.
- [ ] The critic ranked the concepts; the 3 built finalists differ in idea.
- [ ] Concept SVGs are generated from one JS module; every iteration was checked at 32 and 16px on light and dark.
- [ ] Every final path: nodes on extremes, ≤ 2 decimals, no `logo_test` construction hints, no `<text>`, no filters.
- [ ] Wordmark outlined with `logo_outline`, path data in the repo; lockup snapped to the measured metrics.
- [ ] Each finalist passes 16px, one colour, reversed (compensated), mirror/180°, letter test and peer test.
- [ ] No fatal flaw: legible at 16px, no resemblance to an existing mark, no unfortunate reading.
- [ ] The critic judged the finalists; the user picked from a greyscale sheet; the pick is locked.
- [ ] Deliverables exported (SVG + PNG, mono, reversed, symbol, lockups, favicon set, app icon) and BRAND.md written.
- [ ] Every colour version is flat: solid palette fills, no gradient, glow, foil or texture on or behind the mark.
- [ ] One brand board per logo from the `logo-board` kit, readable at 600px wide, nothing under 19px.

## Reference files
- `drip_guide logo/house-style` — the default: what a user rejected in their words, the flat mark, the one-image brand board, DEFAULTS
- `drip_guide logo/concepts` — mark types in depth, the concept sentence, parallel concept agents, scoring and cutting
- `drip_guide logo/construction` — the 256 grid, Béziers, overshoot, stroke contrast, junctions, SVG hygiene
- `drip_guide logo/wordmarks` — choosing the base face, kerning, customisation moves, outlining, licences
- `drip_guide logo/testing` — every stress test, the peer test, fatal flaws, the critic on finalists
- `drip_guide logo/deliverables` — colour, lockups, clear space, minimum sizes, file set, favicon, BRAND.md
- `drip_guide logo/cliches` — clichés per category, conventions to honour and to break, what reads as amateur

## Sources
- logo-design-skill by Kaan Kiziltug (MIT): the core process (identify, don't explain; one-sentence concepts;
  cheap divergence, expensive builds; black first on a 256 viewBox with exact angles; versioned iterations; the
  letter test, junction check, peer test, literalness check, overshoot, irradiation, mirror/180° checks; greyscale
  checkpoint; red flags; "one fatal flaw outweighs a high total"). Its trademarked logo library was not used.
- logo-designer-skill by neonwatty (MIT): parallel concept subagents with one assigned direction each, reading the
  project before asking, named SVG groups, minimum stroke widths for small sizes.
- rampstackco/claude-skills (MIT): category conventions and clichés, conventions worth breaking for positioning,
  typographic registers, the production mark set, liked/disliked references with one sentence each.
- Drip's critic (`agents/critic.md`): logo fatal flaws and the craft axis.
- Owl-Listener designer-skills (MIT): options must differ in idea; equal fidelity when comparing.
- ziguishian brand-design-skill (no licence, ideas only): the chosen mark is locked; no simulated consent.
- Drip's own logo job (two rejected rounds): disambiguating "like an artist", one-path liquid shapes, flat over
  gloss, metric-aligned lockups, code-generated concept sheets, branding tags over keyword search.
- The Nimbus job (eight rounds): flat colour marks, the user's pick over extra critic rounds, the one-image brand
  board system measured from Sinline and Roamify (Ashfuq Hridoy), Seture (Visvibe) and Session (Lucas Fields).
