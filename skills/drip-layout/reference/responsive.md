# Responsive layout

Every screen works from 320px to 1920px, with a mouse, a finger, a keyboard and at 200% zoom. Layout changes
are structural (columns appear, a sidebar collapses, a table restacks); sizes change smoothly where it helps
(display type, section spacing, gutters). Build narrow first, then add.

## Breakpoints

Use the project's existing breakpoints. For a new one, Tailwind v4's defaults are fine and in `rem`, so they
follow the user's font size:

| Name | Width | What usually changes |
|---|---|---|
| (base) | 0-639px | one column, stacked splits, full-width buttons in forms, bottom sheets |
| `sm` | 40rem / 640px | two-up card grids, inline form rows |
| `md` | 48rem / 768px | tablet: splits side by side if both halves fit, 8-column grid |
| `lg` | 64rem / 1024px | desktop: persistent sidebar, 12 columns, nav links visible |
| `xl` | 80rem / 1280px | container reaches max width; margins grow |
| `2xl` | 96rem / 1536px | nothing new; maybe a third panel in apps |

- Add a breakpoint where the *content* breaks, not for a device. Stretch the window slowly; where it looks wrong, that is the breakpoint.
- One direction for the whole project: `min-width` (mobile first). Mixing `max-width` and `min-width` queries creates gaps and overlaps.
- **Test widths:** 320, 375, 390, 414 (phones), 768, 820 (tablet portrait), 1024 (tablet landscape, small laptop), 1280, 1440 (laptop), 1920 (desktop). `fitcheck_shot` covers phone and desktop; check the in-betweens by resizing.

## Fluid vs discrete

| Thing | How it changes |
|---|---|
| Display and section-head type | fluid `clamp()` (with a rem term) |
| Body text | fixed (16-18px), never fluid |
| Section padding, big gaps | fluid `clamp()` |
| Gutters | fluid or two steps |
| Columns, sidebars, nav pattern | breakpoints |
| Component internals that depend on their own width | container queries |
| Hover vs touch behaviour | `@media (hover: hover)` / `(pointer: coarse)`, never width |

Useful `clamp()` values (375px → 1440px):

| Use | CSS |
|---|---|
| Section padding 64 → 144 | `clamp(4rem, 2.24rem + 7.51vw, 9rem)` |
| Section padding 48 → 96 | `clamp(3rem, 1.94rem + 4.51vw, 6rem)` |
| Gutter 16 → 64 | `clamp(1rem, 4vw, 4rem)` |
| Heading block to content 32 → 64 | `clamp(2rem, 1.3rem + 3vw, 4rem)` |
| Grid gap 16 → 32 | `clamp(1rem, 0.65rem + 1.5vw, 2rem)` |

Type clamps are in `drip_guide type/scales`.

## Container queries

When a component appears in different widths (a card in a sidebar and in a main grid), let it respond to its own
container, not the viewport.

```css
.card-list { container-type: inline-size; }
@container (min-width: 36rem) {
  .card { display: grid; grid-template-columns: 12rem 1fr; gap: 1.5rem; }
}
```

Tailwind v4: `@container` on the parent, `@md:grid-cols-2` on the child.

## Intrinsic grids

Grids that fill themselves without breakpoints:

```css
.cards { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
```

`min(100%, 18rem)` stops overflow on narrow phones. Use `auto-fill` to keep column widths steady with few items,
`auto-fit` to stretch them.

## Units

- `100svh` (small viewport) for full-screen heroes and app shells on mobile; `100dvh` when it must track the toolbar live (chat input bars). Never `100vh` on phones: the toolbar covers the bottom.
- `width: 100%`, never `100vw` for full-width blocks (100vw includes the scrollbar and causes sideways scroll on desktop).
- Text measure in `ch`; component sizes in `rem`; hairlines and small radii in `px`.
- Logical properties (`padding-inline`, `margin-block-start`) so right-to-left languages work.

## Phone patterns

- **Stacking order = reading order.** A split's text comes before its visual. The DOM order matches the visual order (keyboard and screen readers follow the DOM).
- **Navigation:** up to 4-5 top-level items as a bottom tab bar in apps; a menu button opening a full-height sheet on sites. The nav's primary action stays visible next to the menu button when space allows.
- **Sidebars and filters** collapse into a sheet or a disclosure under 1024px.
- **Buttons:** full width in forms and sheets; side by side only if both labels fit on one line.
- **Touch targets:** 44x44px minimum (48 on Android), 8px between neighbours. Extend small icons' hit area with padding or a pseudo-element.
- **Inputs:** 16px font size (smaller makes iOS zoom the page), 44-48px tall, the right `type` and `inputmode`.
- **Safe areas:** with `viewport-fit=cover`, pad fixed bars by `env(safe-area-inset-bottom)` and fold `env(safe-area-inset-left/right)` into the gutter: `padding-inline: max(1rem, env(safe-area-inset-left))`.
- **Fixed bottom bars** reserve their height at the end of the content so nothing hides under them.
- **No hover-only interactions.** Everything reachable by tap; tooltips also open on focus and tap.
- **Viewport meta:** `width=device-width, initial-scale=1`; never disable zoom.

## Tables on small screens

Pick by what people do with the table:

| Situation | Pattern |
|---|---|
| Compare across columns | horizontal scroll inside a wrapper with the first column sticky, plus a visible scroll hint (fade at the edge) |
| Read one row at a time | restack each row as a card: label/value pairs, the row's name as the title |
| Many columns, few matter on phones | hide secondary columns under 768px; full details in the row's detail view |

The column that names the row and the column with the row's action stay visible.

## Images and media

- `width` and `height` attributes (or `aspect-ratio`) on every image to reserve space; no layout shift.
- `srcset` + `sizes` so phones get small files; `<picture>` when the crop must change (a wide hero becomes a 4:5 crop on phones).
- `loading="lazy"` below the fold, never on the main hero image (it is the LCP element).
- `object-fit: cover` with a deliberate `object-position` so the subject survives the crop.
- Video: `playsinline muted` for background loops, a poster frame, and pause under reduced motion.

## Overflow traps

When something scrolls sideways at 320px, look for:
- A fixed width (`w-[600px]`, `min-width` on a card, an image without `max-width: 100%`).
- A long word, URL or code token: `overflow-wrap: anywhere`, and `min-width: 0` on its flex or grid child.
- A grid with `minmax(300px, 1fr)` on a 320px screen: use `minmax(min(100%, 300px), 1fr)`.
- `100vw` widths.
- Negative margins or translated elements poking out: `overflow-x: clip` on the section (not `hidden`, which breaks `position: sticky`).

## Zoom and text size

- At 200% browser zoom nothing is cut off or overlapping; content reflows to one column (WCAG reflow at 320 CSS px).
- Heights come from content: no fixed `height` on text containers; `min-height` if you need a floor.
- Unitless line-heights so user text spacing overrides work.

## Checklist

- [ ] Mobile-first `min-width` queries in rem, the project's breakpoint set.
- [ ] No horizontal scroll at 320px; checked at 375, 768, 1024, 1440, 1920.
- [ ] Reading order on phones = DOM order = visual order.
- [ ] `svh`/`dvh` for full-height areas; no `100vw`.
- [ ] Sidebars and filters collapse under 1024px; tables have a phone pattern.
- [ ] Touch targets 44px, inputs 16px, safe areas respected, no hover-only actions.
- [ ] Images sized, responsive, lazy below the fold; hero image not lazy.
- [ ] Works at 200% zoom.
