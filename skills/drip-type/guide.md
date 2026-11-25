# Typography

Good typography is invisible where people read and unmistakable where the product speaks. Body text is set at a
size, measure and line-height you can read for ten minutes without noticing it. Every role (headline, section
title, card title, body, label, metadata, data) is recognisable at a glance, with fewer sizes than you would
guess, because size, weight and space work together. The faces were chosen for this product, previewed with its
own words, and loaded without a flash or a jump. Numbers line up. Headlines break where the sense breaks.

## The procedure

1. **Read what exists.** Fonts already loaded (`next/font`, `@font-face`, `@fontsource` imports, `font-family` in CSS, `--font-*` tokens), the current sizes in use, DESIGN.md. If the product has a type system, improve how it is used; changing faces changes identity and needs the user's yes.
2. **Name the roles** the surface needs. Marketing: display, heading, title, lead, body, label, small. Product UI: page title, section title, body, label, small, data. Docs: h1-h3, body, code, caption. Fewer roles is better.
3. **Decide the voice.** From the direction's adjectives: does the type carry the personality (Persuade/Experience pages), or should it disappear into the task (Operate/Read)? Product UI is often one well-tuned sans. Marketing usually earns a display face.
4. **Shortlist faces.** `fonts_pair` with the direction's mood words. Add 2-3 of your own via `fonts_search` (filter `variable: true`). Drop any overused default unless you can argue for it.
5. **Preview with real words.** `fonts_preview` with the product's actual headline and a line of real body copy, including numbers. Compare 2-3 pairings side by side. Judge shape and colour on the page, not the font's reputation. To choose between single faces, `fonts_compare` sets 2-6 of them on one sheet with your copy and prints x-height, cap height, width per em, stroke contrast and stem from the files: faces with similar x-height and width pair without size fixes; a display face with high contrast wants a low-contrast text face. A wordmark is built with `wordmark_build` (kerning per pair, small-size preview).
6. **Set the scale.** Pick the ratio and base for the surface, then line-height and tracking per step (`drip_guide type/scales`). Round to whole pixels or clean rems.
7. **Write tokens.** Font stacks, sizes with their line-height and tracking (`--text-title`, `--text-title--line-height`...) into the token file (`drip_guide system/tokens`).
8. **Load properly.** Variable or only the used weights, `display: swap`, fallback with metric overrides, preload only the above-the-fold faces (`drip_guide type/details`).
9. **Set the details.** Tabular numbers, wrapping, smoothing, punctuation, selection.
10. **Look.** Screenshot at 375 and 1440 with real copy. Squint: can you tell heading, body, label and meta apart without reading? Is any line longer than ~75 characters? Any headline stub (one word alone on a line)?

On a tweak: keep the project's faces; fix roles, sizes and spacing inside the existing scale.

## The craft

### Pairing in one paragraph

Pair by contrast in structure, not by mood words: a serif display with a sans text face, a grotesk with a mono
for data, a wide display with a narrow text face. Two faces that are almost alike (two geometric sans) look like
a mistake. Match x-heights roughly so the faces sit together on a line. One family with a strong range of weights
or an optical-size axis is often the best "pairing". Full method and alternatives to the overused list:
`drip_guide type/pairing`.

- **Do** give each face a fixed job: display for h1-h2 only, text face for everything else including buttons, labels and h3.
- **Don't** use the display face for buttons, form labels, table text or anything below ~20px unless it was designed for small sizes.

### Scale: fewer sizes, bigger gaps

| Surface | Base | Ratio | Typical steps (px) |
|---|---|---|---|
| Marketing / landing (Persuade) | 16-18 | 1.25-1.333 | 14, 16, 20, 25, 31, 39, 49, 61, 76 (pick 6-7) |
| Product UI (Operate) | 14-16 | 1.125-1.2, fixed rem | 12, 13, 14, 16, 18, 20, 24, 30 (pick 5-6) |
| Docs / long reading (Read) | 17-18 | 1.2-1.25 | 14, 17, 20, 24, 30, 36 |
| Mobile app | 16-17 | 1.2 | 13, 15, 17, 20, 24, 28, 34 |

- **Do** make adjacent roles differ by at least 1.2x in size, or by size plus a weight step. 16 and 17px for two roles is noise.
- **Don't** create a new size for one element. If a card title wants 19px, it is a title (20px) or body (16px).
- **Do** use fluid `clamp()` for marketing display sizes only. Product UI stays fixed: a headline that shrinks in a sidebar looks broken, not responsive.
- **Do** set the hero h1 at the Display role: `clamp(3rem, 1.2rem + 7.5vw, 9rem)`, about 127px at 1440 and 48px at 390 (`kit/base.css`). Fewer words, not a smaller size.

Full tables with line-height and tracking per step: `drip_guide type/scales`.

### Line-height, measure, tracking

| Size | Line-height | Tracking |
|---|---|---|
| 12-14px (labels, captions) | 1.35-1.5 | +0.005 to +0.01em |
| 15-18px (body) | 1.5-1.65 | 0 |
| Long-form prose | 1.6-1.75 | 0 |
| 20-24px (titles, lead) | 1.3-1.4 | 0 to -0.01em |
| 28-40px (section heads) | 1.15-1.25 | -0.01 to -0.02em |
| 48-64px (display) | 1.05-1.12 | -0.02 to -0.03em |
| 72px+ (hero) | 0.95-1.05 | -0.025 to -0.04em |

- **Measure:** 45-75 characters per line for body (target 60-70, `max-width: 65ch`); 35-60 on phones happens naturally. Wider lines need a little more line-height.
- **Do** set the measure on the text element (`p { max-width: 65ch }`, `h1 { max-width: 20ch }`), not on the whole section.
- **Don't** track body text, and never more than +0.05em on anything lowercase.
- **Do** loosen tracking on all-caps (if you use it at all, for a wordmark or a short tag): +0.04 to +0.08em.
- **Serif body** wants a touch more line-height than sans (+0.05).
- **Light on dark** reads heavier: +0.05 line-height, +0.005em tracking, and drop a weight step (400 to 350) on variable fonts.
- Measure: about 20ch for h1 and 30ch for h2.

### Weight and hierarchy

- **Three weights per page at most**, chosen as clear steps: 400 / 500 / 600 for product UI; 400 / 700, or 300 beside 800, for editorial contrast.
- **Do** combine signals: a section head is bigger *and* heavier *and* has more space above it. Space above a heading is 1.5-2x the space below it, so it belongs to what follows.
- **Don't** make everything bold. If six things are bold, nothing is.
- **Don't** use colour for hierarchy in running text (a blue heading, a grey paragraph, a black paragraph). Ink for both; muted only for metadata.
- **Large display can be lighter** (400-500) because size already gives it weight; small headings need 600 to hold their own.
- **Labels and buttons:** 500, sentence case, the text face, same size as body or one step smaller.

### Case and emphasis

- Sentence case for headings, buttons, labels, menu items, table heads. Title Case Reads As Shouting And Slows Scanning.
- All caps only for very short items where it is the system's voice (a wordmark, a 2-word tag), tracked +0.06em, never for paragraphs or buttons by default.
- Emphasis inside text: weight (500/600) or italics. Not colour, not underline (that means link), not caps.
- A headline is one style: no single word in italics, colour or a highlight for "flair". Stress comes from the words and from where the line breaks.

### Numbers

- `tabular-nums` for anything compared in a column or that updates (tables, prices, scores, timers, stats, pagination). Proportional figures for prose.
- Right-align numeric columns; align decimals with the same number of decimal places.
- A number and its unit never break apart: use a non-breaking space (`10&nbsp;MB`, `5&nbsp;min`).
- Big stat numbers use the display face at a weight that matches the headline, `tabular-nums lining-nums`.
More (slashed zero, fractions, oldstyle figures): `drip_guide type/details`.

### Wrapping

- `text-wrap: balance` on h1-h3 and short centred blocks (it works on up to ~6 lines).
- `text-wrap: pretty` on paragraphs, captions, list items, card text: prevents a lone last word.
- Long text (10+ lines) and code: neither.
- Break a headline by hand only between phrases, and check that break at 375px.
- URLs, IDs and user content: `overflow-wrap: anywhere` and `min-width: 0` on the flex/grid child, never `word-break: break-all` on prose.

### Rendering

- `-webkit-font-smoothing: antialiased` on the root (macOS renders heavier without it; other systems ignore it). Tailwind: `antialiased` on `<html>`.
- `font-synthesis: none`: never let the browser fake bold or italic; load the real style.
- `font-optical-sizing: auto` (default) so variable fonts with an `opsz` axis adjust their design at each size.
- `text-rendering: optimizeLegibility` only on large headings if kerning looks off; it is slow on long text.

## Slop tells (and the fix)

| Tell | Fix |
|---|---|
| Inter (or Roboto, Poppins, Montserrat) for everything with no reason | Shortlist with `fonts_pair`, preview 2-3, pick the one that fits the direction |
| Tracked all-caps eyebrow label above every heading ("FEATURES", "HOW IT WORKS") | Delete it. Let the heading say what the section is |
| Gradient or rainbow text in the headline | Solid ink; size and weight do the work |
| One word in italic serif or accent colour inside a sans headline | One style per headline; let the words and the line break carry stress |
| 9+ font sizes, many 1-2px apart | 5-7 sizes on a ratio |
| Headline at line-height 1.5 with loose tracking | 1.05-1.15 and negative tracking at display sizes |
| Body text at 14px light grey | 16px+, ink colour, muted only for meta |
| Paragraphs spanning the full 1280px container | `max-width: 65ch` on the paragraph |
| Centred multi-line paragraphs | Left-align text longer than 2-3 lines |
| Monospace for labels and small UI text to look "technical" | Mono only for code, IDs, measurements, tabular data |
| Bold used on every title, label and button | Three weights, clear jobs |
| Numbers jumping width in a live counter or table | `tabular-nums` |
| Title Case Buttons And Menu Items | Sentence case |
| Display face used for buttons and table cells | Text face for all UI below ~20px |
| `font-weight: 600` on a font that only loaded 400 (faux bold) | Load the weight, `font-synthesis: none` |
| Flash of invisible text, then a layout jump | `font-display: swap` + metric-matched fallback |
| A lone word on the last line of a headline | `text-wrap: balance` |
| Middle-dot meta strings ("Design · Code · Ship") as decoration | Real structure: a list, a sentence, or nothing |

## Done when
- [ ] One or two families (plus mono only if code/data needs it), each with a fixed job, chosen after `fonts_preview` with real copy.
- [ ] 5-7 sizes on a stated ratio, written as tokens with line-height and tracking.
- [ ] Body 16px+ at line-height 1.5-1.65 and measure under 75ch; nothing under 12px; inputs 16px on mobile.
- [ ] Display sizes have tight line-height (≤1.15) and negative tracking (≥ -0.04em).
- [ ] At most three weights; hierarchy visible in a squinted screenshot.
- [ ] No eyebrow caps, no gradient text, no accent-word headline, sentence case everywhere.
- [ ] `tabular-nums` on every compared or changing number.
- [ ] `text-wrap: balance` on headings, `pretty` on short paragraphs; no stubs at 375px and 1440px.
- [ ] Fonts load with `swap`, only used weights or a variable file, fallback with metric overrides, no faux bold.

## Reference files
- `drip_guide type/scales` — complete scales per surface with rem values, line-heights, tracking, clamp formulas
- `drip_guide type/pairing` — how to choose and pair, the overused list and fresher alternatives by role
- `drip_guide type/details` — numerals, OpenType features, loading and performance, variable fonts, punctuation

## Sources
- Impeccable (Apache-2.0): role-based type systems, fixed scales for product UI, 45-75ch measure, compensation for light-on-dark, line-break and optical alignment notes, display and tracking limits.
- Hallmark (MIT): weight discipline, display line-height and tracking ranges, headline length rules, banned and saturated font lists, loading rules, labels in sentence case.
- Taste Skill (MIT): readable text sizes and contrast, one size per kind of element, sentence case, banned default faces, level ratios.
- Make Interfaces Feel Better (MIT): `text-wrap` balance vs pretty, font smoothing, tabular numbers.
- UI UX Pro Max (MIT): font pairing data, line-height and line-length guidelines, weight hierarchy, mobile text size, font loading.
- Anthropic frontend-design: inspiration only (distinct pairings, type as an active design element, the eyebrow and accent-word tells), paraphrased.
