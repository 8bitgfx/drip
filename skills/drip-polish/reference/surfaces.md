# Polish: surfaces

Surfaces are where "feels cheap" usually lives: corners that don't nest, three ways of making a card look raised, shadows lit from different directions, grey borders that turn muddy on tinted backgrounds, photos with dirty edges, dark mode that is just light mode with the lights off. Fix them as a system: a radius scale, an elevation scale, a hairline rule, an image rule.

## Radius

### The scale

Pick a base and derive the rest; personality comes from the base, consistency from the derivation.

| Personality | Base (cards) | Controls | Small (badges, inner items) |
|---|---|---|---|
| Sharp, technical, editorial | 4-6px | 4px | 2px |
| Neutral product | 10-12px | 8px | 6px |
| Soft, friendly, consumer | 16-20px | 12px | 8px |
| Pill system | 24px+ | full | full |

### Nesting

`outer radius = inner radius + padding`

| Inner | Padding | Outer |
|---|---|---|
| 8px | 4px | 12px |
| 8px | 8px | 16px |
| 12px | 8px | 20px |
| 6px | 6px | 12px |

- Applies when the padding is 24px or less. With more padding the layers are separate surfaces; give each its own radius from the scale.
- Inner radius never larger than outer.
- An image flush to a card's edges (no padding) takes the card's radius on the touching corners only, or let `overflow: hidden` on the card clip it.
- Menus: panel 12px with 4px padding means items at 8px.
- Tailwind v4 defaults: `rounded-sm` 4px, `md` 6px, `lg` 8px, `xl` 12px, `2xl` 16px, `3xl` 24px. So `rounded-2xl p-2` holds `rounded-lg`; `rounded-xl p-1` holds `rounded-lg`.

```css
.card { --pad: 8px; --inner: 12px; padding: var(--pad); border-radius: calc(var(--inner) + var(--pad)); }
.card > img { border-radius: var(--inner); }
```

## Elevation

Borders are structure; shadows are height. Choose one per surface.

### The scale (light mode)

```css
:root {
  /* level 1: resting raised (cards, buttons that need edges): ring + tiny lift */
  --shadow-1:
    0 0 0 1px oklch(0 0 0 / 0.06),
    0 1px 2px -1px oklch(0 0 0 / 0.06),
    0 2px 4px 0 oklch(0 0 0 / 0.04);
  --shadow-1-hover:
    0 0 0 1px oklch(0 0 0 / 0.08),
    0 1px 2px -1px oklch(0 0 0 / 0.08),
    0 2px 4px 0 oklch(0 0 0 / 0.06);
  /* level 2: floating (menus, popovers, dropdowns) */
  --shadow-2:
    0 0 0 1px oklch(0 0 0 / 0.06),
    0 4px 8px -2px oklch(0 0 0 / 0.08),
    0 12px 24px -4px oklch(0 0 0 / 0.08);
  /* level 3: modal (dialogs, sheets) */
  --shadow-3:
    0 0 0 1px oklch(0 0 0 / 0.06),
    0 8px 16px -4px oklch(0 0 0 / 0.1),
    0 24px 48px -8px oklch(0 0 0 / 0.14);
}
```

Rules:

- Every level starts with a 1px ring: that is the "border", and because it is transparent black it works on any background colour or image.
- Higher levels: larger blur, larger offset, slightly stronger. All offsets point down (light from above). Never mix a shadow lit from the left with one from above.
- Shadow colour is neutral black at low alpha, or ink-tinted for warm systems (`oklch(0.2 0.02 60 / 0.08)`); never grey hex (`#ccc`) which looks dirty on colour.
- No inner glow, no coloured glow under buttons, no `shadow-2xl` on cards.
- Hover on raised cards: step to `--shadow-1-hover` (150ms) or lift an inner layer 1-2px. Don't animate a big shadow every frame (`drip_guide motion/performance`).

### Dark mode

Shadows vanish on dark backgrounds; height is shown by lighter surfaces and a white hairline.

```css
:root[data-theme="dark"] {
  --surface-0: oklch(0.17 0.005 260);  /* page */
  --surface-1: oklch(0.21 0.005 260);  /* card */
  --surface-2: oklch(0.25 0.006 260);  /* popover */
  --surface-3: oklch(0.28 0.006 260);  /* dialog */
  --shadow-1: 0 0 0 1px oklch(1 0 0 / 0.08);
  --shadow-1-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
  --shadow-2: 0 0 0 1px oklch(1 0 0 / 0.08), 0 8px 24px oklch(0 0 0 / 0.4);
  --shadow-3: 0 0 0 1px oklch(1 0 0 / 0.1), 0 16px 48px oklch(0 0 0 / 0.5);
}
```

- Each level up is about 3-4% lighter in OKLCH lightness.
- Avoid pure black pages (`#000`) under pure white text: use ~15-20% lightness surfaces and ~92-95% lightness text.
- A top inner highlight (`inset 0 1px 0 oklch(1 0 0 / 0.05)`) can make raised dark surfaces read as lit; use it on one level, not all.

### When to use what

| Use a border (hairline) | Use the shadow scale |
|---|---|
| Dividers between list rows and sections | Cards that sit above the page |
| Table cells and header separators | Buttons that need an edge (secondary/outline) |
| Input boundaries (must meet 3:1) | Menus, popovers, tooltips |
| Sidebars and panels that partition layout | Dialogs and sheets |
| Selected / focus states (2px) | Elements over images or varied backgrounds |

## Hairlines

- Colour: ink at alpha, `oklch(from var(--ink) l c h / 0.1)` or a `--line` token (8-12% in light, 8-12% white in dark).
- Width: 1px. For dense tables on high-DPI screens, `0.5px` gives a finer line; check that it still renders on 1x screens (browsers round it to 1px or drop it depending on the engine) and keep 1px as fallback.
- Separate with space before reaching for a line: if 24px of whitespace already groups the content, the divider is noise.
- Don't box everything: a card inside a bordered panel inside a bordered page is three lines doing one job.

## Image outlines

```css
img, video, .media { outline: 1px solid oklch(0 0 0 / 0.1); outline-offset: -1px; }
:root[data-theme="dark"] :is(img, video, .media) { outline-color: oklch(1 0 0 / 0.1); }
```

Tailwind: `outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10`.

- Pure black and pure white only. Tinted neutrals (`slate`, `zinc`, `neutral`, brand greys) pick up the surface colour and read as grime on the edge.
- `outline` doesn't change layout and follows `border-radius`.
- Skip it on full-bleed hero photography and illustrations with transparent backgrounds; use it on thumbnails, avatars, screenshots and product shots that sit on a surface.

## Backgrounds and fills

- Page and surfaces from tokens; a subtle step between page and card (2-4% lightness) or a shadow-ring, not both plus a border.
- Tints for hover and selected are the ink or accent at low alpha (4-8% hover, 10-14% selected), so they work on any surface.
- Gradients only if the direction asked for them; if used, one, large, low contrast, with grain to avoid banding (`gradient_mesh`).
- Glass (`backdrop-filter: blur`) only over real content that benefits (a toolbar over a canvas), with a solid fallback and at most one glass layer on screen.

## Focus ring as a surface detail

The ring is part of the surface language: same width, colour and offset everywhere, radius following the element (outlines follow `border-radius`). Inside clipped containers use `outline-offset: -2px`. On coloured buttons the 2px offset keeps the ring readable against the fill.

## Checks

- [ ] Every nested pair of rounded surfaces checked with the formula.
- [ ] Every raised surface uses one level of the scale; no border + shadow + tint stacking.
- [ ] All shadows fall downward; no coloured glows.
- [ ] Dark mode screenshots: elevation readable by surface lightness, rings visible, no black shadows doing nothing.
- [ ] Image outlines pure black/white at 10%.
- [ ] Hairlines alpha-based; no hard-coded grey hex.

## Sources

*Make Interfaces Feel Better* (MIT): concentric radius formula and the 24px limit, layered shadow-as-border values for light and dark, borders vs shadows table, image outline rules. Impeccable (Apache-2.0): semantic tokens across themes, polish as refinement. Taste Skill (MIT): soft hover shadow limits, no glow. Drip's `drip_guide color` and `drip_guide system` for the surrounding token structure.
