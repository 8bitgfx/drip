# Fit check

A good fit check is the review a strong design director gives a page they did not make: done from real screenshots at the sizes people use, against the direction everyone agreed on, with honest scores, the few problems that matter most named first, and concrete fixes. It is not a celebration and not a list of fifty nits. A page passes when nothing on it reads as machine-made, the hierarchy is obvious at a glance, it holds up on a phone, and it looks like the direction it was meant to be. The thread that built the page is its weakest reviewer, so the check is built to stop you grading your own intentions.

## The stance

- **Read the page, not the intent.** You know why each choice was made; the visitor does not. Judge only what the screenshot shows.
- **First impression first.** Before looking closely, look at each screenshot for five seconds and write one line: what is this, who is it for, what do I do. If you cannot answer, that is the top finding.
- **Specific or silent.** "The pricing cards feel heavy" is useless. "The three pricing cards use a shadow, a border and a tinted fill at once; drop the shadow and the fill" is a finding.
- **Cost order.** A screen with nothing worth looking at outranks a 2px misalignment. Fix what changes the impression first.
- **No softening, no inventing.** Do not pad with praise; do not manufacture a weakness to look rigorous. A clean axis scores high and says why.

## The procedure

1. **Shoot.** `fitcheck_shot` the page at phone (390 wide) and desktop (1440 wide). For an app screen, shoot the states you touched too: empty, loading, error, a long-content case. Look at every screenshot full size, top to bottom, one screen at a time.
2. **Five-second read.** For each screenshot write: what it is, who it is for, the one action, where the eye lands first. Then the squint test: blur your eyes (or imagine the screenshot at 25%). The most important thing must still be the most visible thing.
3. **Compare.** `fitcheck_compare` puts the build beside the chosen direction. Answer three lines: **Mass** (does the weight sit in the same place at a similar size?), **Palette and type** (same colours, same faces, same contrast of sizes?), **Feel** (do the direction's three adjectives describe the build?). Name the largest divergence. Use `board_read` if you need the direction's notes.
4. **Lint.** `fitcheck_lint` on the changed files. Errors are defects; fix them. Warnings are suspects: confirm and fix, or keep with a reason.
5. **Slop pass.** Walk the 48 visual tells below over the screenshots. Count what you find. Three or more tells means the copy and polish axes cannot score above 3. Detail and fixes: `fitcheck/slop-tells-visual`.
6. **Score.** Eight axes, 1 to 5, using the rubric below (full descriptions in `fitcheck/rubric`). Write one line of evidence per score.
7. **Rank the fix list.** Every axis under 4 produces at least one fix. Rank all fixes by cost to the page (what most changes the impression), and mark the top three.
8. **Fix the top three,** then re-shoot the same sizes and re-score. Never fix a weak section by adding decoration, a gradient, an icon or more words; fix it with hierarchy, scale, a real picture or by cutting.
9. **Repeat** until every axis is 4 or more, at most three rounds. After the third, stop.
10. **Record.** `fitcheck_done` with the eight scores, the verdict (`pass`, or `fail` while anything is under 4), the fixes made and anything left open (`acceptedByUser: true` only if the user said to ship with those gaps). Then tell the user the result in the report format below.

## The rubric

Score what the screenshots show. A 3 is the honest default for competent, ordinary work. A 4 is what a good studio would ship. A 5 is rare and must name what makes it exceptional.

| Axis | Look at | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **Hierarchy** | What the eye sees first, second, third; the squint test | Everything shouts or nothing does; the action is hard to find | A clear h1, but sections and actions all weigh the same | One clear entry point per screen, a primary action that wins, secondary things visibly quieter | The order of reading is unmistakable at a glance and matches the user's priorities exactly |
| **Layout** | Grid, alignment, spacing rhythm, density, phone layout | Elements drift off the grid, cramped boxes, broken phone layout | Aligned but generic (centred stack, three equal cards), even spacing everywhere | Shared edges, a spacing scale with tight groups and generous separations, phone layout designed not squeezed | Composition with intent (asymmetry, scale contrast) that still reads instantly; nothing could move 4px |
| **Type** | Faces, scale, weights, measure, leading, wraps | Default system or Inter-everything, tiny size steps, lines of 120 characters | Sensible scale, but timid steps, more than 3 weights, a few awkward wraps | A pairing that fits the direction, clear steps (1.25+ ratio), 45-75ch measure, balanced headings, no orphans | Type carries the identity; details like tabular numerals, optical sizes and tracking are all right |
| **Color** | Palette discipline, accent footprint, contrast, dark mode | Default gradients, many accents, failing contrast | One palette, but the accent is everywhere or greys are flat and untinted | Tinted neutrals, one accent used as a signal (under ~10% of the screen), every text pair passes | The palette is the brand: memorable, restrained, contrast-perfect in both themes |
| **Imagery** | Pictures, icons, illustration, product shots | Empty boxes, gradient placeholders, drawn SVG scenes, stock cliches, emoji icons | Real images but generic, small, mismatched grades; one icon family | Real subjects at a size that matters, one visual world, one icon family at the right weight | Images are the most persuasive thing on the page and could belong to no other product |
| **Polish** | States, focus, radii, shadows, borders, alignment details, motion | Missing focus, broken states, mixed radii, shadows plus borders everywhere | States exist; small inconsistencies (radii, shadow recipes, icon alignment) | Every control has hover, focus, active, disabled; one radius scale; consistent depth; motion purposeful | Invisible craft everywhere: optical alignment, tabular numbers, themed selection and scrollbars, nothing to fix |
| **Copy** | Headlines, buttons, microcopy, slop words, proof | Slop words, fake stats, eyebrows, "Learn more", lorem | Clear but generic; could sit on a competitor's page | Names the product and buyer, verb+object buttons, real errors and empties, no slop | Copy has a voice of its own and every line carries a fact |
| **Fidelity** | Build vs the chosen direction | Unrelated to the direction | Same palette, but the mood and composition drifted to a default | Clearly the chosen direction, with sensible changes for real content | The build is better than the direction while unmistakably being it |

1 means broken or absent: the axis fails outright (unreadable text, no layout on phone, no images where needed, copy is placeholder).

**Pass:** every axis 4 or 5, `fitcheck_lint` has no errors, and the five-second read answers what, who and the action on both sizes.

## The visual slop tells

Look for these in the screenshots. One is a smell; three is a pattern. Fix for each in `fitcheck/slop-tells-visual`.

**Colour and surface**
1. Purple-to-blue or purple-to-pink gradient anywhere (backgrounds, buttons, text).
2. Gradient text on headlines.
3. Glowing blobs, aurora washes or blurred orbs behind content.
4. Glassmorphism on many surfaces at once.
5. Neon glow shadows (coloured zero-offset shadows) on dark backgrounds.
6. Accent colour on everything: buttons, icons, headings, borders, badges.
7. Pure black text on pure white, or flat untinted greys beside a coloured brand.
8. Framework default palette (Tailwind indigo/violet/slate) as the brand.
9. Cream paper, high-contrast serif and terracotta accent, unasked: the "tasteful AI" look.

**Layout and structure**
10. Hero, three feature cards, testimonials, CTA band, footer: the template page.
11. Everything centred on one axis: eyebrow, headline, subhead, two buttons, image.
12. Three equal cards with an icon in a tinted rounded square above each heading.
13. A card inside a card inside a card.
14. Every section separated the same way with the same gap.
15. A row of identical stat cards (big number, small label), all equally loud.
16. Bento grid of unrelated tiles with no hierarchy.
17. Thin section: a heading and one line adrift on a wide empty screen.
18. A lone item on the last row of a grid.
19. Horizontal scroll or cut-off content on the phone screenshot.
20. Sticky header covering content or the focused field.

**Type**
21. Inter (or the system font) for everything, display included, with no reason.
22. Small uppercase tracked labels (eyebrows) above many headings.
23. One word in a heading set in the accent colour, italic or highlighted.
24. Headline at 72px+ beside body at 14px with nothing between.
25. Heavy 800-900 weights on many headings.
26. Lines of body text running the full width (well over 75 characters).
27. Headings ending on a single orphaned word.
28. Monospace used as costume for labels and meta that are not code.

**Imagery and icons**
29. Empty image boxes, grey placeholders or gradient rectangles where a picture belongs.
30. Drawn SVG illustrations of people, plants, buildings; illustration-pack characters.
31. Floating 3D shapes, glass spheres or abstract renders as hero art.
32. Stock cliches: laptop on desk, team laughing at a whiteboard, handshake.
33. Emoji as icons; sparkles on anything AI.
34. Two icon families, or icons at mismatched weights.
35. A fake browser window or phone frame with styled divs inside, posing as the product.
36. Logo wall of companies nobody named.

**Copy and chrome**
37. Eyebrow labels ("FEATURES", "HOW IT WORKS") on most sections.
38. Decorative 01 / 02 / 03 numbering on things that have no order.
39. Fake stats: "10x faster", "99.9%", "10,000+ teams".
40. Invented testimonials with default names and stock faces.
41. Slop words in headlines: unlock, seamless, elevate, supercharge.
42. "Learn more →" and "Get started →": arrows glued to every button.
43. Decorative badges and pulsing status dots with no real state ("LIVE", "NEW", "AI").
44. Middle-dot status strings ("Fast · Secure · Reliable").

**Polish and interaction**
45. Thick coloured left border on cards, callouts or list items.
46. No visible focus ring; outline removed.
47. Shadow plus border plus tinted fill on the same card; three different radii on one screen.
48. Every card lifts and scales on hover; bouncy easing; every section fades in on scroll.

## How to fix the top problems

| Problem | Fix that works | Fix that does not |
|---|---|---|
| No clear hierarchy | Make one thing per screen clearly largest; demote the rest a size step and a colour step | Adding a badge or colour to the important thing |
| Generic template page | Lead with the product or the real picture; vary section compositions; cut a section | Adding animation or a gradient to the same structure |
| Thin, empty sections | Add mass: a bigger real visual, a wider body, a statement set large, or merge sections | More words |
| Weak type | Bigger size steps, a display face from the direction, fewer weights, set measure | A gradient or accent word in the headline |
| Accent sprawl | Keep the accent for the primary action and one signal; everything else neutral | A second accent to balance it |
| Imagery missing or generic | `drip_guide imagery`: user's photos, product capture, found or generated with direction | A blob, a mesh gradient, an illustration pack |
| Slop copy | `drip_guide copy`: cut first, rewrite from facts | Synonyms for the same filler |
| Polish gaps | `drip_guide polish`: states, one radius scale, one shadow recipe, focus | Hover effects on everything |
| Drifted from the direction | `fitcheck_compare`, then fix the biggest of mass, palette, type | Declaring the drift intentional without a reason |

## Report format

After `fitcheck_done`, tell the user, briefly:

```
Fit check: OPEN (round 2 of 3)            or   Fit check: PASS
Hierarchy 4, Layout 4, Type 3, Color 4, Imagery 4, Polish 4, Copy 4, Fidelity 4

Five-second read: Invoicing for freelance designers; primary action "Start free trial" lands second after the hero image.
Largest divergence from "Workshop warm": headline uses the body sans, not the direction's serif.

Fixed this round:
- Hero: swapped stock laptop for a capture of the invoice editor (imagery 3 → 4)
- Removed eyebrows on 5 sections, rewrote 3 buttons as verb + object (copy 3 → 4)
- Unified card radius to 12px and dropped borders under shadows (polish 3 → 4)

Still open:
- Type 3: section headings at 28px under a 72px hero; need the 40px step and the display face.
```

## Done when

- [ ] Phone and desktop screenshots were taken with `fitcheck_shot` after the last change, and looked at in full.
- [ ] The five-second read answers what, who and the one action on both sizes.
- [ ] `fitcheck_compare` was run and the largest divergence named.
- [ ] `fitcheck_lint` shows no errors; every warning is fixed or explained.
- [ ] Every axis has a score with one line of evidence; every axis is 4 or 5, or the round limit was reached and the gaps are reported.
- [ ] No more than two visual slop tells remain, each kept on purpose with a reason.
- [ ] `fitcheck_done` was called with the scores, verdict and fixes.

## Reference files

- `drip_guide fitcheck/rubric`: each axis in full, with what 1 to 5 look like, what to check, and the usual fixes.
- `drip_guide fitcheck/slop-tells-visual`: the 48 tells, how to spot each in a screenshot, and the fix.

Related guides: `drip_guide copy`, `drip_guide a11y`, `drip_guide polish`, `drip_guide imagery`, `drip_guide icons`, `drip_guide type`, `drip_guide color`, `drip_guide layout`.

## Sources

Ideas adapted and rewritten from: Impeccable (Apache-2.0) critique, critique-rubric, audit, polish and craft-floor references (design-director stance, design specificity, severity by cost, the honest-score rule, cognitive load, personas); Hallmark (MIT) gates and review references (pre-emit scoring, fresh-context review, mass/interval/entry comparison against a comp, ranked findings, the visual tells and their fixes); Taste Skill (MIT) finish gate and checklist (rounds that end, screenshots at real widths, the "your eyes" check); unslop-ui (MIT) decoration and surface rules (eyebrows, numbering, badges, dots, edge stripes, decorative motion). Inspired by Vercel's Web Interface Guidelines (paraphrased, no text reused).
