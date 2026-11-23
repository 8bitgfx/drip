# Polish

Polish is the hundred small decisions nobody notices individually and everybody feels together. A polished interface has corners that nest, edges that sit on the same lines, numbers that don't wobble, text that breaks in sensible places, shadows that agree on where the light is, focus that is always findable, and no state that looks unfinished. It is not more decoration. Most good polish removes something: a second border, an extra shadow, a one-off colour, a gap of 13px where the scale says 12 or 16. The page looks the same as before at a glance, and better the longer you look.

## The procedure

1. **Read the system.** `DESIGN.md`, the tokens (`@theme`, `:root`), the shared components. Polish expresses fixes in the project's own styling system (Tailwind in a Tailwind project, CSS in a CSS project); never add a second one.
2. **Collect evidence on the real thing.** `fitcheck_shot` at phone and desktop, light and dark. Then use it: hover, focus with the keyboard, press, open every overlay, resize between breakpoints, zoom to 200%. Slow motion to 10% in DevTools to see transitions.
3. **Run the static pass.** `fitcheck_lint`; `palette_check` for text, borders, focus ring and every state colour.
4. **Triage in this order** and fix top-down; don't perfect a corner while a state is missing:
   1. Broken or misleading: actions that fail silently, wrong state shown, unreadable contrast, keyboard dead ends.
   2. Missing states: loading, empty, error, disabled, success, long content (`polish/edge-states`).
   3. Drift from the system: off-scale spacing, raw colours, wrong component, inconsistent radius or elevation.
   4. Surface details: radius nesting, shadows, hairlines, image outlines (`polish/surfaces`).
   5. Type details: wrapping, numerals, smoothing, alignment.
   6. Motion details (`drip_guide motion`).
   7. Code: dead styles, duplicated values, debug output.
5. **Classify each fix** before making it: **missing token** (add to the system), **one-off** (replace with the shared component or token), **local defect** (fix in place). Fix at the narrowest correct level.
6. **Walk the checklist** (`polish/checklist`) for the surfaces you touched.
7. **Verify** with fresh screenshots of the same views and states; `fitcheck_compare` against the chosen direction; `fitcheck_done`.

## The craft

### Radius

`outer = inner + padding`. A card with 8px padding around a 12px-radius image has a 20px radius. Above ~24px padding, the layers read as separate surfaces; choose each radius on its own. Pills (`9999px`) only on things that are pills: tags, switches, small buttons in a playful system.

- **Do:** `rounded-2xl p-2` around `rounded-lg` (16 = 8 + 8).
- **Don't:** `rounded-xl` on the card and `rounded-xl` on the image inside it.

### Shadows and borders

Borders separate (dividers, table cells, input boundaries); shadows lift (cards, menus, dialogs). A raised card does not also need a border; use a shadow whose first layer is a 1px ring. Keep 3-4 elevation levels and use them by meaning: resting, raised, overlay, modal. Details and token values: `polish/surfaces`.

### Hairlines

1px lines at low contrast (ink at 8-12% alpha) separate without shouting. Use alpha, not a fixed grey, so they work on any surface. On high-DPI screens a 0.5px line can be crisper for dense tables (`border-width: 0.5px` renders on 2x screens, rounds up on 1x); test on both.

### Optical alignment

- Button with a trailing arrow: icon side 2px less padding (`pl-4 pr-3.5`).
- Play triangle: shift 1-2px right of centre.
- Icons next to text: centre on cap height. With `display: flex; align-items: center` most 16px icons beside 14px text look right; for running text use `vertical-align: -0.125em` and size `1em`-`1.25em`.
- Large headings: pull the first letter's side bearing back (`margin-inline-start: -0.04em` to `-0.06em`) when the heading sits flush with body text below.
- Numbers and currency: align on the decimal in tables (right-align + `tabular-nums`).
- Text in pill buttons and badges can look low because of descender space; check visually and nudge with 1px padding difference only if it does.

### Type rendering

| Detail | Rule | Tailwind |
|---|---|---|
| Smoothing | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` on the root, once | `antialiased` on `<html>` or `<body>` |
| Headings | `text-wrap: balance` (works up to ~6 lines) | `text-balance` |
| Short body, captions, list items | `text-wrap: pretty` | `text-pretty` |
| Long body (10+ lines), code | neither | - |
| Changing numbers (counters, prices, timers, table columns) | `font-variant-numeric: tabular-nums` | `tabular-nums` |
| Static big display numbers | proportional (looks better) | - |
| Ranges and times | en dash with thin spaces or none (`9-5` becomes `9–5`) | - |
| Quotes and apostrophes | curly (`“ ” ’`) in content | - |
| Ellipsis | the single character `…` | - |
| Units | non-breaking space (`10&nbsp;MB`, `⌘&nbsp;K`) | - |
| All caps labels | +4% to +8% letter spacing | `tracking-wide` |
| Large headings (40px+) | -1% to -3% letter spacing | `tracking-tight` |

More in `drip_guide type`.

### Images

- 1px outline, `outline-offset: -1px`, pure black at 10% in light mode, pure white at 10% in dark (`outline-black/10 dark:outline-white/10`). Never `slate`, `zinc` or a brand-tinted grey: a tinted edge reads as dirt.
- Fixed `aspect-ratio` or width/height attributes so nothing shifts on load; `object-fit: cover` with a deliberate `object-position` for faces.
- Below-the-fold images `loading="lazy"`, the hero `fetchpriority="high"`.
- A muted placeholder surface while loading, not a white flash.

### Focus rings

One ring everywhere: `outline: 2px solid var(--ring); outline-offset: 2px`, 3:1 against what is around it, no transition. Inset (`outline-offset: -2px`) inside containers with `overflow: hidden`. `scroll-margin` / `scroll-padding-top` so sticky headers never cover focused elements.

### Scrollbars

- `scrollbar-gutter: stable` on the root (or on scroll containers) so opening a dialog or loading content doesn't shift the layout by the scrollbar width.
- Thin, themed scrollbars in app panels: `scrollbar-width: thin; scrollbar-color: var(--ink-faint) transparent;`. Leave the page's main scrollbar native.
- Don't hide scrollbars on things people need to know scroll; use a fade edge (mask gradient 16-24px) to hint overflow on horizontal scrollers.
- `overscroll-behavior: contain` on modals, menus and sidebars so scrolling them doesn't scroll the page.

### Selection, caret, cursor

- `::selection { background: color-mix(in oklch, var(--accent) 25%, transparent); color: inherit; }`: on-brand, still readable.
- `caret-color: var(--accent)` on inputs.
- `accent-color: var(--accent)` for native checkboxes, radios, ranges and progress.
- `user-select: none` only on controls (buttons, tabs, drag handles), never on content people may want to copy. Code, IDs and keys get `user-select: all` on a click-to-copy element.
- Cursors: `text` in inputs, `grab`/`grabbing` on drag handles, `not-allowed` (or default) on disabled, `progress` while busy, `zoom-in` on zoomable images, `col-resize` on column handles. Pick one convention for `pointer` on buttons and keep it everywhere.

### Theme details

- `<meta name="theme-color">` per scheme so mobile browser chrome matches; `color-scheme: light dark` on the root so native controls and scrollbars follow.
- Dark mode is not inverted light mode: surfaces get lighter as they rise, shadows mostly vanish, saturated colours drop 10-20% chroma, pure white text drops to ~90-95% lightness.
- Favicon and app icons for both schemes if the logo disappears on dark tabs.

### Copy-level details

- Same term for the same thing everywhere (don't mix "project", "workspace", "space").
- Sentence case for UI labels unless the system says otherwise.
- Buttons say what happens ("Save changes"), not "Submit" or "OK".
- Truncated text shows its full value on hover/focus. More in `drip_guide copy`.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Same radius on card and the image inside it | Concentric: outer = inner + padding |
| Border and shadow and background tint on every card | One elevation decision per surface |
| Dark-mode cards with black drop shadows | Lighter surface + white hairline at 6-10% |
| Grey `border-zinc-200` outline on photos | `outline-black/10` inset, `outline-white/10` in dark |
| Prices jitter while counting or updating | `tabular-nums`, reserved width |
| Headline with one orphan word on the last line | `text-balance` |
| Spinner in an empty white box | Skeleton of the real layout |
| "No data" in grey and nothing else | Empty state with why and the one next action |
| Icon sits 1-2px high next to its label | Flex centre or `vertical-align: -0.125em`, icon `1em` |
| Arrow button with equal padding looks lopsided | Icon side 2px less |
| `cursor: pointer` on disabled buttons | `not-allowed` or default, no hover change |
| Page jumps sideways when a modal opens | `scrollbar-gutter: stable` |
| Default blue text selection on a warm brand | Themed `::selection` |
| Gradients, glows and glass added "to make it pop" | Remove; polish is subtraction |

## Done when

- [ ] Every item in `polish/checklist` for the touched surfaces is ticked or consciously skipped with a reason.
- [ ] No raw colours, radii, shadows or spacings outside tokens (`fitcheck_lint` clean).
- [ ] Nested radii are concentric; elevation uses the scale; dark mode elevation is by surface, not black shadow.
- [ ] Changing numbers are tabular; headings balanced; short text pretty; root antialiased.
- [ ] Images have inset neutral outlines and fixed aspect ratios.
- [ ] One focus ring, visible everywhere, never covered by sticky UI.
- [ ] Empty, loading, error, long-content and zero/huge-number states are designed and screenshotted.
- [ ] No layout shift on load, on modal open or on state change.
- [ ] Light and dark, phone and desktop screenshots reviewed; `fitcheck_compare` shows no drift; `fitcheck_done` has run.

## Reference files

- `drip_guide polish/checklist` — the long, grouped, checkable pass.
- `drip_guide polish/surfaces` — radius, elevation, borders, hairlines, image outlines, dark mode, with tokens.
- `drip_guide polish/edge-states` — empty, loading, error, partial, long, huge, offline, permission.

Related: `drip_guide interaction`, `drip_guide motion`, `drip_guide type`, `drip_guide icons`, `drip_guide a11y`, `drip_guide fitcheck`.

## Sources

- *Make Interfaces Feel Better* (MIT): concentric radius, optical alignment, shadows over borders, image outline colours, font smoothing, tabular numbers, text wrapping, hit areas, icon stroke weight.
- Emil Kowalski, *emil-design-eng* (MIT): unseen details compound; review with fresh eyes and in slow motion.
- Impeccable (Apache-2.0), *polish* and *harden*: polish is refinement not redesign, triage order, missing-token vs one-off, edge-state coverage.
- Taste Skill (MIT): focus ring drawn in full, hover distances, no decoration to "add polish".
- UI UX Pro Max (MIT): focus visibility, disabled styling, layout-shift and font-loading rules.
- Vercel Web Interface Guidelines (no reuse licence; inspiration only, paraphrased): typography characters (ellipsis, curly quotes, non-breaking spaces), `color-scheme` and `theme-color`, scrollbar gutter, scroll margins for anchors.
