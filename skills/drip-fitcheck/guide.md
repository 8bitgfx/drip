# Fit check

A good fit check is two reviews of a page from real screenshots at the sizes people use. The first is yours: quick, honest, against the direction everyone agreed on, catching the obvious before anyone else has to. The second is the critic's: a subagent with no history, no stake and no access to your reasoning, judging only the brief, the direction and the pixels, harshly and specifically. You fix what it finds in order of severity, re-shoot, and run it again until it passes, at most three rounds. Then you show the user exactly what it said, not a softened version, and hand off with what is still open. The thread that built the page is its weakest reviewer; the critic exists because you are.

## The stance

- **Read the page, not the intent.** The visitor doesn't know why each choice was made. Judge only what the screenshot shows.
- **First impression first.** Five seconds per screenshot: what is this, who is it for, what do I do. If you can't answer, that is the top finding.
- **Specific or silent.** "The pricing cards feel heavy" is useless. "Shadow, border and tinted fill on the same card; drop the shadow and the fill" is a finding.
- **Cost order.** A page with nothing worth looking at outranks a 2px misalignment.
- **No softening, no inventing.** Don't pad with praise; don't manufacture weaknesses.

---

## The procedure

### Part 1: self-critique (cheap)

1. **Shoot.** `fitcheck_shot` at phone (390) and desktop (1440); `dark: true` if the page has a dark theme. App screens: shoot the states you touched (empty, loading, error, long content). Look at every screenshot full size, top to bottom.
2. **Five-second read** per screenshot: what, who, the one action, where the eye lands first. Squint: the most important thing must still be the most visible.
3. **Compare.** `fitcheck_compare` against the chosen direction's tile and references. Three lines: **Mass** (weight in the same place at a similar size?), **Palette and type** (same colours, faces, size contrast?), **Feel** (do the adjectives and the manifesto describe the build?). Name the largest divergence.
4. **Genre fence.** Check the CSS and components against the chosen genre's `breaks_if` list (in `DESIGN.md`). Every hit is removed or justified in one line.
5. **Lint.** `fitcheck_lint` on the changed files. Errors are defects; warnings are suspects.
6. **Slop pass.** Walk the 48 visual tells below. Three or more: copy and polish can't score above 3.
7. **Score** eight axes 1-5 (rubric below; full version in `fitcheck/rubric`), one line of evidence each.
8. **Fix** everything under 4, top three by cost first. Re-shoot.

### Part 2: the critic until PASS

9. **Prepare.** `critic_prepare({ kind: "build", targets: ["http://localhost:3000"] })`. It screenshots the page at the configured sizes and returns the prompt. For a review outside a loop (`/drip:critic`, a URL, a file, an image), use `kind: "any"`.
10. **Launch** `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt: <the returned prompt> })`. Unchanged. Nothing added about effort or intent.
11. **Record.** `critic_record({ kind: "build", verdict, scores, worst, fixes, summary })` with its numbers and words copied, not paraphrased.
12. **Respond by severity** (table below). Re-shoot after fixing.
13. **Repeat** 9-12 until **PASS**, at most 3 rounds. The Stop hook blocks the end of your turn on full loops until the latest build passed or 3 rounds ran.
14. **Record yours.** `fitcheck_done` with your 8 scores, verdict and fixes (`acceptedByUser: true` only if the user said to ship with the gaps).
15. **Hand off** (format below), then `drip_end`.

---

## Responding to the critic

The critic writes findings as `P# [S0-S3 · evidence · confidence] location — what — why — fix`.

| Severity | Means | Do |
|---|---|---|
| **S0** blocker | wrong or unreadable core message, broken layout, unreadable text, a fatal flaw | fix before anything else; no PASS is possible while one is open |
| **S1** high | a default where an idea should be, timid scale on a bold brief, failing contrast, fake content | fix all of them this round |
| **S2** medium | a weak section, an inconsistent recipe, drift from the direction | fix when cheap; otherwise list under "Left" |
| **S3** polish | details | at the polish pass (`drip_guide polish`) |

- **Fix the root, not the symptom.** "Nothing to look at" is fixed by a picture (the product mockup, a fan of real cards, a render), not by bigger type or colouring a word.
- **Its fix list is ordered by impact.** Work in that order.
- **"WHAT'S GENERIC"** lines are S1 by default on bold briefs: replace the default with the direction's own move.
- **REJECT on a build** means the idea didn't survive into the page. Go back to the direction contract and the signature move; don't polish.
- **Disagreeing.** If a finding contradicts the brief or the user's explicit choice (the user asked for exactly that), say so to the user in one line next to the quote. Never edit the critic's words or drop a finding silently.
- **Direction-level problems** ("the direction itself is the default") are a question for the user, not a silent redesign. The direction is locked.
- **After round 3** without a PASS: stop. Report the verdict, the score and the open findings. Offer one next step.

## The self-critique rubric

Score what the screenshots show. 3 is the honest default for competent, ordinary work; 4 is what a good studio ships; 5 must name what makes it exceptional. When torn, take the lower.

| Axis | Look at | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **Hierarchy** | first, second, third; squint test | everything shouts or nothing does | clear h1, then everything equal | one entry per screen, a primary action that wins | reading order unmistakable at a glance |
| **Layout** | grid, edges, rhythm, phone | drift, cramped, broken phone | aligned but generic (centred stack, three cards) | shared edges, a spacing scale, designed phone layout | a composition with intent that still reads instantly |
| **Type** | faces, scale, weights, measure, wraps | default face, timid steps | sensible but generic, awkward wraps | a pairing that fits, 1.25+ ratio, 45-75ch | type carries the identity |
| **Color** | palette discipline, accent footprint, contrast | default gradients, failing contrast | one palette, accent sprawls | tinted neutrals, accent as a signal, all pairs pass | the palette is the brand |
| **Imagery** | pictures, icons, product shots | placeholders, blobs, stock, emoji | real but generic or small | real subjects at sizes that matter, one family | could belong to no other product |
| **Polish** | states, focus, radii, depth, motion | missing focus, mixed radii | small inconsistencies | every state, one radius scale, one depth recipe | nothing left to fix |
| **Copy** | headlines, buttons, slop words | slop, fake stats, "Learn more" | clear but generic | names product and buyer, verb+object buttons | a voice of its own |
| **Fidelity** | build vs chosen direction | unrelated | palette matches, composition drifted | clearly the direction, adapted to real content | better than the tile, unmistakably it |

Your pass: every axis 4+, no lint errors, no unexplained `breaks_if` hits. Your pass is the ticket to the critic, not the finish line.

## The visual slop tells

One is a smell; three is a pattern. Fixes in `fitcheck/slop-tells-visual`.

**Colour and surface**
1. Purple-to-blue or purple-to-pink gradient anywhere.
2. Gradient text on headlines.
3. Glowing blobs, aurora washes or blurred orbs behind content.
4. Glassmorphism on many surfaces at once.
5. Neon glow shadows on dark backgrounds.
6. Accent colour on everything.
7. Pure black on pure white, or flat untinted greys beside a coloured brand.
8. Framework default palette (Tailwind indigo/violet/slate) as the brand.
9. Cream paper, polite serif and terracotta accent, unasked: the "Tasteful AI" anti-genre.

**Layout and structure**
10. Hero, three feature cards, testimonials, CTA band, footer: the template page.
11. Everything centred on one axis.
12. Three equal cards with an icon in a tinted rounded square above each heading.
13. A card inside a card inside a card.
14. Every section separated the same way with the same gap.
15. A row of identical stat cards, all equally loud.
16. Bento grid of unrelated tiles with no hierarchy.
17. A heading and one line adrift on a wide empty screen.
18. A lone item on the last row of a grid.
19. Horizontal scroll or cut-off content on the phone screenshot.
20. Sticky header covering content or the focused field.

**Type**
21. Inter (or the system font) for everything, display included, with no reason.
22. Small uppercase tracked eyebrows above many headings.
23. One word in a heading in the accent colour, italic or highlighted.
24. Headline at 72px+ beside body at 14px with nothing between.
25. Heavy 800-900 weights on many headings.
26. Body lines well over 75 characters.
27. Headings ending on a single orphaned word.
28. Monospace as costume for labels that aren't code.

**Imagery and icons**
29. Empty boxes, grey placeholders or gradient rectangles where a picture belongs.
30. Drawn SVG illustrations of people, plants, buildings.
31. Floating 3D shapes or glass spheres as hero art.
32. Stock cliches: laptop on desk, team at a whiteboard, handshake.
33. Emoji as icons; sparkles on anything AI.
34. Two icon families, or mismatched weights.
35. A fake browser or phone frame with styled divs posing as the product.
36. Logo wall of companies nobody named.

**Copy and chrome**
37. Eyebrow labels ("FEATURES") on most sections.
38. Decorative 01 / 02 / 03 numbering on things with no order.
39. Fake stats: "10x faster", "99.9%", "10,000+ teams".
40. Invented testimonials with default names and stock faces.
41. Slop words: unlock, seamless, elevate, supercharge.
42. Arrows glued to every button.
43. Decorative badges and pulsing dots with no real state.
44. Middle-dot status strings ("Fast · Secure · Reliable").

**Polish and interaction**
45. Thick coloured left border on cards or callouts.
46. No visible focus ring.
47. Shadow plus border plus tint on one card; three radii on one screen.
48. Every card lifts on hover; bouncy easing; every section fades in on scroll.

## How to fix the top problems

| Problem | Fix that works | Fix that doesn't |
|---|---|---|
| No clear hierarchy | One thing per screen clearly largest; demote the rest a size and colour step | a badge or colour on the important thing |
| Generic template page | Lead with the product or the real picture; vary compositions; cut a section | animation or a gradient on the same structure |
| Timid on a bold brief | Scale up: headline, colour field, image; spend boldness in the signature | more elements |
| Thin sections | Add mass or merge sections | more words |
| Weak type | Bigger steps, the direction's display face, fewer weights | an accent word in the headline |
| Accent sprawl | Accent on the primary action and one signal only | a second accent |
| Imagery missing | `drip_guide imagery` / `productshots` | a blob or mesh gradient |
| Slop copy | `drip_guide copy`: cut, then rewrite from facts | synonyms for the filler |
| `breaks_if` hit / drift | Remove the token; return to the contract | declaring the drift intentional |

## Hand-off format

From `rules/communication`. Short, visual, the critic quoted:

```
Done: pricing page for Ledgerly, in the Ledger Print direction.
<desktop screenshot> <phone screenshot>
Critic: PASS 76/100 (round 2): "Finally has a point of view; the FAQ is still the template's."
Left: FAQ section is stock accordion (S2); annual prices are placeholders until pricing.ts is final.
Files: DESIGN.md · board · app/pricing/page.tsx
```

Not passed after 3 rounds:

```
Critic: REVISE 64/100 after 3 rounds: "The hero earns its place; everything under it is a SaaS kit."
Worst: sections 3-5 are three equal icon cards (S1).
Left: those sections; I'd rebuild them as one comparison table. Want me to?
```

Never write "looks great" next to a REVISE. Never round the score.

## Done when

- [ ] Phone and desktop screenshots were taken after the last change and looked at in full.
- [ ] `fitcheck_compare`, `fitcheck_lint` and the `breaks_if` check ran; the largest divergence is named.
- [ ] Your 8 scores have evidence; everything under 4 was fixed before the critic.
- [ ] The critic ran with its prompt unchanged; every S0/S1 was fixed before the next round.
- [ ] The critic passed the latest build, or 3 rounds ran and the open findings are listed.
- [ ] `fitcheck_done` was called; the user saw the critic's own words.

## Reference files

- `drip_guide fitcheck/rubric`: your 8 axes in full, what 1 to 5 look like, how they relate to the critic's axes.
- `drip_guide fitcheck/slop-tells-visual`: the 48 tells, how to spot each, and the fix.

Related guides: `drip_guide copy`, `drip_guide a11y`, `drip_guide polish`, `drip_guide imagery`, `drip_guide icons`, `drip_guide type`, `drip_guide color`, `drip_guide layout`, `drip_guide direction/genres`.

## Sources

Adapted and rewritten from: **Impeccable** (Apache-2.0: critique, rubric, audit, the design-director stance, severity by cost, honest scores); **Hallmark** (MIT: gates, fresh-context review, mass/interval/entry comparison, ranked findings, visual tells); **Taste Skill** (MIT: finish gate, rounds that end, screenshots at real widths); **unslop-ui** (MIT: decoration and surface rules). New in 0.3: **vip999611-ai/Design-review** (Apache-2.0, modified: severity S0-S3 with evidence and confidence, caps, the independent panel behind the critic); **Thecsiz/tastemaker** (MIT: conviction, the contextual ceiling, the dogma test); **Ilm-Alan/frontend-design** (MIT: `breaks_if` token fidelity); **Anthropic knowledge-work-plugins design-critique** (Apache-2.0: match the stage). Inspired by Vercel's Web Interface Guidelines (paraphrased, no text reused). Ideas only: **guoyuhan1220/critique-design** (no licence: "specificity or silence").
