# Fit check: the rubric in full

Eight axes, scored 1 to 5 from screenshots. For each: what to look at, what each score looks like, the questions that settle a borderline score, and the fixes that move it up. When torn between two scores, take the lower and write what would earn the higher.

Score calibration:
- **1** broken or absent. **2** clearly weak, a visitor would notice. **3** competent and ordinary: fits the category, could be anyone's. **4** what a good studio ships: deliberate, consistent, no visible faults. **5** exceptional and specific: name the reason or do not give it.
- Most first builds land at 3 on most axes. That is normal, and it is a fail.
- Score the worst screen, not the best. A great hero with a broken pricing section is not a 5 on layout.

## 1. Hierarchy

**Look at:** where the eye lands first, second, third on each screen; the squint test; how many things compete for attention; whether the primary action is findable in 3 seconds.

| Score | Looks like |
|---|---|
| 1 | No entry point. Text walls or a uniform grid; the action cannot be found |
| 2 | Several elements shout at once (big image, big heading, three filled buttons, badges), or everything is the same size |
| 3 | The h1 leads, but below the hero every section, card and button has equal weight |
| 4 | One clear entry per screen; the primary action wins over secondaries; supporting text is visibly quieter (size and colour step) |
| 5 | Reading order is unmistakable in a 25% thumbnail and matches what the user needs most, including inside dense app screens |

**Settle it:** Squint: is the most important thing still the most visible? Count the filled buttons per screen (more than one is a 3 at best). Count options at the main decision point (more than four visible, ungrouped: 3 at best).

**Move it up:** one primary per screen; size step of 1.25x or more between levels; demote meta to a muted colour; group secondary actions in a menu; cut competing badges and accents.

## 2. Layout

**Look at:** shared left and right edges, the grid, spacing rhythm (tight inside groups, loose between), density, section composition, the phone screenshot.

| Score | Looks like |
|---|---|
| 1 | Overlaps, horizontal scroll, broken phone layout |
| 2 | Off-grid drift, cramped boxes (text closer than 8px to a box edge), random gaps, a lone orphan on a grid row |
| 3 | Clean but templated: centred stacks, three equal columns, every section the same height and gap |
| 4 | Edges agree down the page; one spacing scale; groups read as groups; sections vary in composition; the phone layout is designed (order, sizes, targets) |
| 5 | A composition with a point of view (scale contrast, asymmetry, a strong axis) that still reads instantly; nothing could move without getting worse |

**Settle it:** Do the left edges of headings, body and images line up? Is the space above a heading at least twice the space below it? Does any section at 1440 hold only a heading and a line? Does the phone stack keep the right order?

**Move it up:** pull strays onto the container lines; snap gaps to the scale (4, 8, 12, 16, 24, 32, 48, 64, 96); vary one section's composition; give thin sections mass (bigger visual, wider body) or merge them; redesign the phone order. `drip_guide layout`.

## 3. Type

**Look at:** the display and body faces, the size scale, weights in use, line length, leading, wraps and orphans, numerals in tables and prices.

| Score | Looks like |
|---|---|
| 1 | Unreadable: body under 14px, contrast failing, lines over 120 characters |
| 2 | One default face for everything with timid steps (16/18/20); more than four weights; headings that look like body |
| 3 | A sensible scale and readable body, but generic faces, a few awkward wraps, section headings too small beside the hero |
| 4 | A pairing that fits the direction; clear ratio (1.25 or more); body 16px+ at 1.5-1.65 leading and 45-75ch; headings balanced; three weights at most; tabular numbers where figures compare |
| 5 | Type is the identity: a display face used with confidence, tight tracking on large sizes, optical details right, every line wraps well at both sizes |

**Settle it:** Count font families (more than three: 2 at best) and weights (more than three in running use: 3 at best). Any heading ending on one word? Any line over 80 characters?

**Move it up:** display face from the direction (`fonts_pair`); one bigger step for section heads; `text-wrap: balance` on headings and `pretty` on body; `max-width: 65ch`; tracking -0.02em on display sizes. `drip_guide type`.

## 4. Color

**Look at:** the number of hues, where the accent appears, neutrals (tinted or flat), contrast of text and controls, dark mode if present.

| Score | Looks like |
|---|---|
| 1 | Text you cannot read; clashing hues |
| 2 | Default AI gradients, several competing accents, failing contrast on secondary text |
| 3 | One palette, but the accent sprawls (headings, icons, borders, backgrounds) or greys are flat and lifeless beside the brand |
| 4 | Neutrals tinted toward the brand hue; one accent used as a signal (primary action, active state, focus, one data series); every text pair passes (`palette_check`) |
| 5 | The palette is memorable and owned; restraint and contrast hold in light and dark; colour does real work (state, data) and nothing else |

**Settle it:** Estimate the accent's share of the first screen (over ~10% with no declared colour-led direction: 3). Any grey text on a coloured surface? Any pure `#000` on `#fff`?

**Move it up:** strip the accent from everything but the primary action and states; tint greys toward the anchor hue; fix failing pairs with `palette_generate`. `drip_guide color`.

## 5. Imagery

**Look at:** every picture, icon, illustration and product shot; their size, subject, consistency and honesty.

| Score | Looks like |
|---|---|
| 1 | Broken images, empty boxes where pictures belong |
| 2 | Gradient placeholders, drawn SVG scenes, blobs, stock cliches, emoji icons |
| 3 | Real images, but generic subjects, small sizes or mismatched grades; icons from one family but over-used |
| 4 | Real subjects (the user's, the product, or well-chosen stand-ins) at sizes that matter; one light, grade and treatment; one icon family used sparingly |
| 5 | The images sell the product better than the copy and could not belong to another business |

**Settle it:** The deletion test on each picture: would removing it lose a fact? Is the product itself shown (for software, a real capture)? Do the images look like one shoot?

**Move it up:** `drip_guide imagery` (find, generate, capture); `drip_guide productshots` for product UI; delete decorative icons (`drip_guide icons`).

## 6. Polish

**Look at:** focus rings, hover and active states, disabled and loading states, radii, shadows and borders, icon alignment, numerals, empty and error states, motion.

| Score | Looks like |
|---|---|
| 1 | Controls with no states; outline removed; broken layouts on interaction |
| 2 | Mixed radii, shadow plus border plus tint on cards, missing focus, icons off their text line, stock empty states |
| 3 | States mostly exist; a few inconsistencies (two button recipes, radius drift, uneven icon sizes) |
| 4 | Every control has hover, focus-visible, active and disabled; one radius scale with nested radii right; one depth recipe; loading, empty and error states designed; motion only where it helps |
| 5 | Nothing left to fix: optical alignment, tabular numbers, themed selection, caret and scrollbars, 44px targets, no layout shift |

**Settle it:** Tab through: is every focus ring visible? Count radius values and button recipes on one screen. Is there an empty state for every list?

**Move it up:** `drip_guide polish` and `drip_guide a11y`: one recipe per thing, states for every control, cut decorative motion.

## 7. Copy

**Look at:** the h1 and subhead, section headings, buttons, microcopy, proof, slop words.

| Score | Looks like |
|---|---|
| 1 | Lorem ipsum, `[Company Name]`, empty headings |
| 2 | Slop words, fake stats, eyebrows on every section, "Learn more →", invented testimonials |
| 3 | Clear and correct, but generic: it would pass unchanged on a competitor's page |
| 4 | The h1 names product and buyer; headings and buttons alone tell the story; verb+object buttons; real errors and empty states; nothing invented |
| 5 | A voice of its own; every line carries a fact; microcopy is as considered as the hero |

**Settle it:** The swap test on the h1. Read only headings and buttons: do they tell the story? Count slop tells (three or more: 3 at best).

**Move it up:** `drip_guide copy` and `copy/slop-rewrites`.

## 8. Fidelity

**Look at:** the build beside the chosen direction in `fitcheck_compare`: mass, palette, type, feel.

| Score | Looks like |
|---|---|
| 1 | No direction was chosen, or the build ignores it |
| 2 | A different look: the default AI page wearing the direction's accent colour |
| 3 | Palette and fonts match, but composition and mood drifted to a template |
| 4 | Clearly the chosen direction: its mass, palette, type and three adjectives, adapted sensibly to real content |
| 5 | Better than the board while unmistakably being it |

**Settle it:** Would someone shown the board and the build say "same project"? Do the three adjectives describe the build? Where is the largest divergence, and is it a reasoned improvement or drift?

**Move it up:** fix the largest divergence first (usually mass or type); reread notes with `board_read`; never declare drift intentional without a reason tied to real content.

## Scoring record

Write one line of evidence per axis before calling `fitcheck_done`:

```
hierarchy 4  hero h1 leads, one filled CTA; pricing tiers now differ by size of the featured plan
layout    3  sections 3-5 share one composition and gap; feature section is a heading + line on a 1440 canvas
type      4  Fraunces/Inter pairing from the board, 1.333 scale, body 17/1.6 at 62ch
color     4  accent only on CTA and active nav; greys tinted 0.01 toward hue 40; all pairs pass
imagery   4  real roastery photos, one warm treatment; icons Lucide 1.5 in nav only
polish    4  focus rings on all controls, radius 12/8, one shadow recipe
copy      4  h1 "Coffee roasted in Leith, shipped Mondays"; no slop tells left
fidelity  4  mass and palette match "Workshop warm"; hero image smaller than the board's
verdict   fail (layout 3)
```

Then call `fitcheck_done` with `scores` (all eight axes), `verdict` ("pass" only when every axis is 4+, otherwise "fail") and `fixes` (what you fixed, or what is still wrong). Set `acceptedByUser: true` only when the user said to ship with the remaining gaps.

## Your scores and the critic's

Your eight 1-5 scores are the self-critique: they decide whether the page is ready to be judged, not whether it ships. The drip:critic subagent scores its own axes 1-10 with weights (idea, conviction, fit, hierarchy and composition, craft, system, delivery) and gives the verdict that counts.

| Your axis | Closest critic axis | Note |
|---|---|---|
| Hierarchy, Layout | Hierarchy & composition | the critic also asks whether the right thing is first |
| Type, Color, Polish | Craft, System | the critic also checks one world top to bottom and no hybrid genre |
| Imagery, Copy | Delivery, Fit | real content, phone, contrast, the client's hates |
| Fidelity | Fit | brief and chosen direction |
| (none) | Idea, Conviction | you can't grade your own idea fairly; that is the critic's job |

When your scores say pass and the critic says REVISE, the critic wins. When the critic passes something you scored 3, fix your 3 anyway if it's cheap, and say so.

## Sources

New in 0.3: the mapping to the critic's weighted axes follows **vip999611-ai/Design-review** (Apache-2.0, modified) and **Thecsiz/tastemaker** (MIT). Adapted and rewritten from Impeccable (Apache-2.0) critique and critique-rubric references (honest scoring bands, heuristic checks, cognitive load and the four-option limit, design specificity), Hallmark (MIT) gates and pre-emit critique (score bands per axis, thin sections, contrast and accent footprint, mass and entry comparison), and Taste Skill (MIT) finish checklist.
