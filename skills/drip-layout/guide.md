# Layout and spacing

A good layout makes the reading order obvious before anyone reads a word. Blur the screen and you can still point
to the one thing that matters most, the second thing, and the groups. Related things sit close; unrelated things
sit far apart; nothing needs a box to say it belongs together. Edges line up from the nav to the footer. Spacing
comes from one scale and has rhythm: tight inside groups, generous between them, the biggest gaps between
sections. The structure fits the content (a list looks like a list, a comparison like a table) instead of every
section being three cards. It holds from 320px to 1920px without a sideways scroll, and the first screen shows
what the page is and what to do.

## The procedure

1. **Name the job of the screen.** Sell (landing), operate (app), read (docs), play (experience). The job sets density and how adventurous the composition can be (`drip_guide layout/density` for product UI).
2. **Write the reading order.** Primary element, secondary, then the groups, as a short list. For a page: the list of sections, each with its one idea and its content (a screenshot, a table, three real items, a quote).
3. **Pick the structure per section from its content** (`drip_guide layout/composition`): a split for a claim plus proof, a table for comparisons, rows for lists, a showcase for one big visual. Never the same composition twice in a row.
4. **Set the frame.** Container width, gutters, grid columns and gap, section spacing. Write them as tokens if the system lacks them.
5. **Sketch narrow first.** 375px: one column, reading order = DOM order. Then decide what changes at 768 and 1024 (columns appear, a sidebar arrives, a split goes side by side).
6. **Space with the scale.** Inside groups 4-12px, between related groups 16-32px, between sections 64-160px. Use `gap`.
7. **Align.** Everything on the container edge or a column line. Check the left edges of nav, headings, body text, cards and footer form one or two vertical lines.
8. **Check the fold** at 1440x900 and 390x844: headline, one line, main action visible; nothing half-cut that looks broken.
9. **Squint and screenshot.** `fitcheck_shot` at phone and desktop. Squint: primary, secondary, groups, in order? Any section that is just a heading and a paragraph? Any dead space beside short text?
10. **Stress it.** Longest real headline, a 40-character name, an empty state, 3 items vs 30 items, 200% zoom, German-length strings (30-40% longer).

## The craft

### The spacing scale

| Token | px | Typical use |
|---|---|---|
| 1 | 4 | icon to label, tight inline gaps |
| 2 | 8 | inside a control group, label to input, between tags |
| 3 | 12 | list items, compact card internals |
| 4 | 16 | card padding (dense), paragraph spacing, form field gaps |
| 6 | 24 | card padding (default), grid gap, heading to body in a card |
| 8 | 32 | between groups in a panel, card padding (roomy) |
| 12 | 48 | heading block to content, between major groups |
| 16 | 64 | section padding on phones, between page regions in apps |
| 24 | 96 | section padding on desktop (product marketing) |
| 32 | 128 | section padding on desktop (spacious, editorial) |

Tailwind v4: these are `p-1` ... `p-32` with the default 4px unit. Do not define `--spacing-*` names.

- **Do** make the gap between groups at least twice the gap inside them (8px inside a field, 24px between fields groups; 24px between cards, 96px between sections).
- **Don't** use one value for everything. Even 24px everywhere makes every element look equally important and nothing grouped.
- **Do** put 1.5-2x more space above a heading than below it, so the heading belongs to its content.
- **Don't** reach for off-scale values to "make it fit". Change the structure or the content instead.

### Grids and containers

| Thing | Value |
|---|---|
| Content container | `max-width: 1200-1280px` (75-80rem), centred |
| Wide container (galleries, dashboards) | 1440px, or full width with gutters |
| Prose container | `max-width: 65ch` (about 640-720px) |
| Side gutters | 16px under 640px, 24px to 1024px, 32-64px above: `padding-inline: clamp(1rem, 4vw, 4rem)` |
| Columns | 4 on phones, 8 on tablets, 12 on desktop |
| Column gap | 16px phone, 24px desktop (32px for airy marketing) |
| Row gap in card grids | equal to or larger than the column gap |

- **Do** let the outer element own the background and vertical padding and an inner container own width and `padding-inline`. Full-bleed bands then keep the same content edges.
- **Don't** let paragraphs run the full container width. Text gets `max-width: 65ch` even inside a wide layout.
- **Do** keep the column count above 1440px; let the margins grow instead of stretching cards.
- **Do** avoid orphans in grids: 7 items in a 3-column grid leaves one alone. Change the count, the columns (4+3 with a lead item), or make the last row deliberate.

```css
.section { padding-block: clamp(4rem, 2.24rem + 7.51vw, 9rem); }   /* 64px at 375 → 144px at 1440 */
.container { width: 100%; max-width: 80rem; margin-inline: auto; padding-inline: clamp(1rem, 4vw, 4rem); }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 1.5rem; }
```

### Hierarchy and alignment

- **The squint test.** Blur the screenshot: you should see one dominant element, one secondary, and clear groups. If everything is a grey band of equal weight, add contrast: a bigger heading, a bigger visual, more space between groups, or remove things.
- **One primary per view.** One filled button, one biggest heading, one visual that is clearly the lead.
- **Left-aligned by default.** Centred layout is for short, symmetric things: a one-line hero on a poster page, a pricing head over three symmetric tiers, an empty state. Long centred text is hard to read and looks generated.
- **Two edges.** A page has the container's left edge and at most one more (the split line of two-column sections). Keep the same split ratio on every split.
- **Asymmetry is fine and often better:** 5/7 or 4/8 splits look intentional; 6/6 is neutral; alternating image left/right every section (zigzag) looks templated.

### Rhythm between sections

- Sections part by space or a full-width change of background, not by rules and shadows.
- Mix gap sizes on long pages (a 96px gap after a light section, 144px before a big one); space should match the mass it frames. A 144px gap under a 200px section is a hole.
- Pace: a dense section (a grid, a table) is followed by a calm one (a statement, a large visual).
- A section that is only a heading and a paragraph is unfinished: give it its content (a visual, a list, real items), set the line as a statement, or merge it into a neighbour.

### Above the fold

- At 1440x900 the first screen shows: the nav, the headline, one sentence, the primary action, and the start of the visual. At 390x844 (about 660-700px usable): headline, sentence and action at least.
- `min-height: 100svh` for a full-screen hero (the small viewport height avoids the jump when the mobile toolbar collapses). Never `100vh` on phones.
- The fold should not slice a card, window or screenshot in a way that looks broken. Either it ends 24px+ above the fold, or it clearly bleeds off as a large visual.
- Product UI has no fold drama: the task starts immediately; no hero.

### Card anatomy

```
┌─ card (padding 24px; 16px dense, 32px roomy) ──┐
│ media (optional, full-bleed to card edges,     │
│        fixed aspect ratio: 16:9, 4:3, 1:1)      │
│ 16px                                            │
│ title (title size, 1-2 lines, balance)          │
│ 4-8px                                           │
│ meta (small, muted)                             │
│ 12px                                            │
│ body (2-3 lines, line-clamp if variable)        │
│ 16-24px, pushed to the bottom (mt-auto)         │
│ actions / footer                                │
└────────────────────────────────────────────────┘
```

- **Do** keep internal spacing smaller than the gap between cards.
- **Do** make cards in a row the same height (`grid` rows stretch; `flex flex-col` + `mt-auto` on the footer aligns actions).
- **Do** use one card recipe per page; border *or* shadow, one radius, one padding.
- **Don't** nest cards. A card inside a card becomes a section with a hairline, or a tinted well.
- **Don't** make a card when the content is a list. Rows with hairlines scan faster than a grid of boxes.
- Media inside a padded card: either full-bleed at the top (radius only on the outer corners) or inset with a concentric radius (outer = inner + padding).

### Section anatomy

- **Head block:** heading (6 words or fewer reads best) + at most one line of lead, on the left edge, 16-24px between them, 32-64px to the content.
- **Body with mass:** a visual 360px+ tall, three or four real items across, a list or table of 3+ rows, or a statement set large. The body's widest row spans most of the container (10 of 12 columns); a narrow text block with the right half empty looks unfinished.
- **No eyebrow label** over the heading and no "01 / 02 / 03" unless the content is really a sequence.

### Optical alignment

Geometry is a starting point; the eye is the judge.
- Icon + text buttons: the icon side gets about 2px less padding than the text side.
- Play triangles and arrows: shift 1-2px toward their point.
- Large headings: pull 0.04-0.06em left so the stem lines up with body text below.
- Round shapes (avatars, circular icons) look smaller than squares of the same size; make them 1-2px larger when they sit in a row with squares.
- Text inside pills and buttons sits low because of caps height; check and nudge 1px if needed.
- Concentric radius for nested rounded things: outer = inner + padding.

### Whitespace

- Whitespace is how you group, not decoration. If a page feels empty, the fix is usually bigger content (a larger heading, a larger visual, a fuller section), not smaller gaps.
- If a page feels crowded, remove things before shrinking the spacing: fewer cards, shorter copy, one action instead of three.
- Dense product UI is not "no whitespace"; it is small, consistent whitespace with strong alignment.

## Slop tells (and the fix)

| Tell | Fix |
|---|---|
| Hero, then three equal icon cards, then a CTA band, then footer | Sections built from the real content: a screenshot, a table, a list, a quote; varied compositions |
| Everything centred, including paragraphs | Left edge; centre only short symmetric blocks |
| Same 24px gap everywhere | Tight inside groups, 2x+ between groups, largest between sections |
| Off-scale values (13px, 18px, 22px, 37px) | The 4px scale |
| Cards inside cards, borders around every group | Proximity, hairlines, tinted wells |
| Zigzag: image left, image right, image left | One split side, varied ratios, or other compositions |
| Paragraphs spanning 1200px | `max-width: 65ch` |
| Bento grid with decorative empty tiles | Every tile carries real content; one lead tile |
| A tiny section: heading + one sentence + lots of air | Give it content, set it as a statement, or merge it |
| Hero using `h-screen` that jumps on mobile | `min-h-svh` |
| Horizontal scroll on a phone | Find the fixed width (`w-[600px]`, long word, wide table) and fix the cause |
| Grid with one orphan card in the last row | Change the count or the column spans |
| Sticky header + sticky sidebar + sticky CTA + chat bubble | One sticky element per axis at most |
| Uneven left edges (nav at 24px, content at 32px, footer at 40px) | One container for all |
| Decorative section numbers and eyebrows | Delete; the heading speaks |

## Done when
- [ ] All spacing comes from the 4px scale; groups separated by at least 2x their inner spacing.
- [ ] One container width and gutter from nav to footer; left edges line up in a screenshot.
- [ ] Body text max 65ch; nothing long is centred.
- [ ] Each section has real content with mass; no two neighbours share the same composition.
- [ ] Headline, one line and the main action visible at 1440x900 and 390x844.
- [ ] No horizontal scroll at 320px; checked at 375, 768, 1024, 1440, 1920 with `fitcheck_shot`.
- [ ] Touch targets 44px on touch layouts, 8px apart; controls share heights.
- [ ] No cards in cards; card rows equal height with aligned actions.
- [ ] Squint test passes: primary, secondary, groups in order.

## Reference files
- `drip_guide layout/responsive` — breakpoints, fluid sizing, containers and container queries, mobile patterns, tables and images
- `drip_guide layout/composition` — page and section compositions, heroes, rhythm, bento, anatomy, how to vary
- `drip_guide layout/density` — product UI: density levels, app shells, sidebars, tables, forms, dashboards

## Sources
- Impeccable (Apache-2.0): the squint test, grouping by proximity before containers, rhythm from tight and generous intervals, 4px base, structure from priority, optical corrections after looking, product UI permissions.
- Hallmark (MIT): container and column numbers, section and head-block sizes, surface ladder, composition catalogue, rhythm by mass, two breakpoints in rem, fluid vs discrete, hero postures.
- Taste Skill (MIT): one section per screen thinking, equal edges, two text lines, the fold rules, splits that do not alternate, one card height per row, no strip sections.
- Make Interfaces Feel Better (MIT): concentric radius, optical alignment of icons and buttons, minimum hit areas.
- UI UX Pro Max (MIT): breakpoints and test widths, touch spacing, viewport units, container widths, z-index and fixed element guidance.
- Anthropic frontend-design: inspiration only (structure encodes information; numbered markers only for real sequences), paraphrased.
