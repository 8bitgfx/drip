# Polish: the checklist

Walk this after the build and before `fitcheck_done`. Each line is checkable by looking at a screenshot, using the page, or reading the code. Tick it, fix it, or write down why it doesn't apply. Groups are ordered by triage priority: broken before missing, missing before drift, drift before detail.

Set up first: phone (375px) and desktop (1440px) screenshots in light and dark (`fitcheck_shot`), DevTools open with Rendering (paint flashing, `prefers-reduced-motion`, `prefers-color-scheme`) and Animations (10% speed) panels.

## 1. Nothing broken or misleading

- [ ] Every button and link does something visible; nothing fails silently.
- [ ] The state shown is the real state (a toggle that failed to save flips back with an error).
- [ ] No "undefined", "null", "NaN", "[object Object]", "Invalid Date", "$NaN" anywhere.
- [ ] No lorem ipsum, "Product Name", "John Doe", placeholder images or TODO text.
- [ ] Console has no errors or React key / hydration warnings.
- [ ] Keyboard alone can reach and operate everything; no traps outside modals.
- [ ] Body text contrast at least 4.5:1, large text and UI boundaries at least 3:1 (`palette_check`).
- [ ] Links look like links; buttons look like buttons; nothing clickable looks static.

## 2. States exist

- [ ] Every interactive element: default, hover (pointer devices), active, focus-visible, disabled.
- [ ] Async actions: loading without layout shift; double-submit ignored.
- [ ] Toggles, tabs, options, rows: selected state distinct from hover by more than colour.
- [ ] Inputs: focus, invalid with message, disabled, read-only.
- [ ] Data views: empty (first use and no results), loading, error with retry, partial (some items failed).
- [ ] Success is visible: the result appears, or a quiet confirmation.
- [ ] Destructive actions: undo, or a confirm with the action named on the button.
- [ ] Permission-limited views explain why something is missing or read-only.
- [ ] Offline or failed network shows a message, keeps input, offers retry.

## 3. System consistency

- [ ] Spacing values are all on the scale (no 13px, 18px, 22px if the scale is 4/8-based).
- [ ] Colours all come from tokens; no raw hex, `rgb()`, or Tailwind palette greys (`zinc-*`, `slate-*`) outside the token file.
- [ ] One type scale; same role = same size, weight, line height everywhere.
- [ ] One radius scale; same component = same radius everywhere.
- [ ] One elevation scale (3-4 levels), used by meaning.
- [ ] One icon family, one stroke weight per surface, sizes from the component size.
- [ ] One button system; one primary action per view.
- [ ] Repeated custom implementations replaced with the shared component.
- [ ] Same term for the same thing across the whole flow.

## 4. Layout and alignment

- [ ] Edges line up: text, inputs, images and cards share left edges within a section.
- [ ] Related items are close; separate groups have clearly more space between them than within.
- [ ] Section rhythm is consistent (same vertical gap between sections of the same kind).
- [ ] Nothing touches the viewport edge on phones; 16px minimum side gutter.
- [ ] No horizontal page scroll at any width from 320px up.
- [ ] Content doesn't stretch past a readable measure (body text 60-75 characters per line).
- [ ] Icon + text pairs centred on the text's cap height.
- [ ] Buttons with a trailing or leading icon use 2px less padding on the icon side.
- [ ] Play icons and other asymmetric glyphs are optically centred.
- [ ] Inputs, selects and buttons in a row share a height.
- [ ] Table numbers right-aligned; text left-aligned; headers aligned with their column content.
- [ ] Sticky headers and footers don't cover content, anchors or focused fields (`scroll-padding-top`).

## 5. Surfaces

- [ ] Nested radii concentric: outer = inner + padding (padding 24px or less).
- [ ] Borders only where they mean structure; raised surfaces use the shadow scale, not border + shadow + tint.
- [ ] Shadows agree on light direction (all fall downward) and get softer and larger with elevation.
- [ ] Hairlines use alpha (ink at 8-12%), not fixed greys, so they work on every surface.
- [ ] Images have a 1px inset outline: pure black 10% (light), pure white 10% (dark).
- [ ] Images have fixed aspect ratios or dimensions; `object-fit: cover` with deliberate focal point.
- [ ] Dark mode: higher surfaces are lighter; white hairline at 6-10% instead of black shadows; no pure `#000` backgrounds behind pure `#fff` text.
- [ ] Overlay backdrop is a neutral scrim (ink at 40-60%), not coloured.
- [ ] No decorative glass, glow, gradient border or grain that the chosen direction didn't ask for.

## 6. Typography

- [ ] Root has `antialiased` (`-webkit-font-smoothing: antialiased`).
- [ ] Headings `text-wrap: balance`; no single-word last line on headings.
- [ ] Short paragraphs, captions, list items `text-wrap: pretty`.
- [ ] Changing numbers (prices, counters, timers, stats, table columns) `tabular-nums`.
- [ ] Real characters: `…` not `...`, curly quotes and apostrophes, en dash for ranges, `×` for dimensions.
- [ ] Non-breaking spaces between numbers and units, and inside shortcuts (`⌘ K`).
- [ ] All-caps labels have +4-8% tracking; large display text has negative tracking.
- [ ] Line height: ~1.5 for body, 1.1-1.25 for headings, tighter for large display.
- [ ] Fonts load without invisible text or reflow (`font-display: swap` + matched fallback metrics, or `optional`).
- [ ] Truncated text shows the full value on hover/focus (a tooltip reachable by keyboard, not only the native `title` attribute).
- [ ] Long words and URLs break (`overflow-wrap: anywhere` in user content).
- [ ] Text is selectable where people would copy it; controls are not.

## 7. Icons

- [ ] One family; stroke 1.5px beside regular text, 2px beside semibold.
- [ ] Icons use `currentColor`; states via colour/opacity, not separate files.
- [ ] Outline at rest, filled for active/selected (if the family has both).
- [ ] Sizes on the family's grid (16/20/24), not 17px or 22px.
- [ ] Icon-only buttons have an `aria-label` and a tooltip; decorative icons `aria-hidden`.
- [ ] Directional icons flip in RTL; logos, checkmarks and media controls don't.
- [ ] No emoji standing in for icons in UI chrome.

## 8. Interaction details

- [ ] Press feedback on pressables (`scale(0.97)` or deeper tone), 100-160ms.
- [ ] Hover only on `(hover: hover) and (pointer: fine)`; no sticky hover after a tap.
- [ ] One focus ring everywhere: 2px, 2px offset, 3:1, no transition; inset inside clipped containers.
- [ ] Hit areas at least 24px, 44px on touch; pseudo-element extensions don't overlap neighbours.
- [ ] Tooltips: ~500ms first delay, instant for neighbours, open on focus.
- [ ] Overlays open from their trigger, close on Escape, return focus.
- [ ] Spinners delayed ~150-300ms and shown at least ~300-500ms.
- [ ] `touch-action: manipulation` on controls; tap highlight replaced by a real press state.
- [ ] Cursor matches the action (`text`, `grab`, `not-allowed`, `progress`, `zoom-in`).

## 9. Motion

- [ ] No `transition: all`; only `transform`, `opacity` (and justified `clip-path`, small `filter`, accordion height) animate.
- [ ] Curves from tokens; no `ease-in` on UI; UI durations 100-300ms.
- [ ] Nothing enters from `scale(0)`; popovers from their trigger, modals from centre.
- [ ] No enter animation on page load for things already there (`initial={false}`).
- [ ] No scroll reveals or parallax in product UI.
- [ ] Reduced motion keeps meaning (opacity, colour), drops movement and loops.
- [ ] Re-triggering mid-animation reverses smoothly.

## 10. Content resilience

- [ ] Long names, titles and emails (60-120 characters) wrap or truncate cleanly.
- [ ] Empty strings and missing optional fields leave no awkward gaps or orphan separators (`·`, `|`, `,`).
- [ ] 0, 1 and plural counts read correctly ("1 file", "0 files", locale plural rules).
- [ ] Large numbers formatted (`Intl.NumberFormat`), compact where space is tight (`12.4K`), full value on hover.
- [ ] Dates and times localised and relative where it helps ("2 min ago", absolute on hover).
- [ ] German-length text (+30-40%) doesn't break buttons, tabs or nav.
- [ ] RTL: logical properties (`margin-inline-start`, `ps-*`), mirrored layout, correct icons.
- [ ] 200% zoom: no overlap, no clipped text, no horizontal scroll on content.
- [ ] Missing images show a neutral placeholder with the right aspect ratio.

## 11. Page-level details

- [ ] `scrollbar-gutter: stable` (or equivalent) so the layout doesn't jump when scrolling starts or modals lock scroll.
- [ ] `overscroll-behavior: contain` on modals, drawers, side panels.
- [ ] Themed `::selection`, `caret-color`, `accent-color`.
- [ ] `color-scheme` set; `<meta name="theme-color">` for light and dark.
- [ ] Title per page/route; favicon works on light and dark tabs.
- [ ] No layout shift on load (CLS): images sized, fonts matched, skeletons same size as content, ads/embeds reserved.
- [ ] Safe areas respected on phones (`env(safe-area-inset-*)`) for fixed bars.
- [ ] Print or share previews (Open Graph image, title, description) exist for public pages.

## 12. Code hygiene

- [ ] No `console.log`, commented-out blocks or unused imports introduced.
- [ ] No duplicated style values that should be tokens; no new token for a single exception.
- [ ] No `!important` added to win specificity fights.
- [ ] No inline styles for things the system covers.
- [ ] No leftover experimental classes or files from earlier iterations.

## 13. Final look

- [ ] Squint at the full page: one clear focal point per view, hierarchy reads in grey-scale.
- [ ] Phone and desktop, light and dark, reviewed from fresh screenshots (`fitcheck_shot`).
- [ ] Side by side with the chosen direction (`fitcheck_compare`): no drift in type, colour, density.
- [ ] Look again after a break; what bothers you then is real.
- [ ] `fitcheck_done` run and its verdict addressed.

## Sources

*Make Interfaces Feel Better* (MIT): surfaces, typography, icons, hit areas and motion items. Impeccable (Apache-2.0), *polish* and *harden*: triage order, state coverage, content resilience, code cleanup. Emil Kowalski, *emil-design-eng* (MIT): motion and interaction items, review with fresh eyes. UI UX Pro Max (MIT): focus, loading and layout-shift items. Taste Skill (MIT): no added decoration, focus drawn in full. Vercel Web Interface Guidelines (paraphrased, no text reused): typographic characters, non-breaking spaces, scroll padding, `color-scheme`, theme-color, safe areas.
