# Gradients, mesh gradients and grain

A gradient is a light source or a material, not a decoration. The good ones look like light falling on a surface,
a sky, a sheet of coloured paper, a lit studio backdrop: one or two related hues, soft, a little grain, used once.
The generated ones are linear purple-to-blue washes behind every section. When in doubt, a flat colour is better.

## When a gradient earns its place

| Use | OK? |
|---|---|
| The hero's background art or one brand band | Yes, once per page |
| Behind a product screenshot or object, as a lit "stage" | Yes |
| A card that is the page's one feature moment | Yes, one card |
| An image placeholder or avatar fallback (seeded from the name) | Yes |
| Every section background | No |
| Buttons, inputs, badges, nav | No (flat colour; a 1-step hover) |
| Text (`background-clip: text`) | No |
| Borders around cards ("gradient border" glow) | No, unless the direction is explicitly about it, once |
| Product UI surfaces (dashboards, tables, settings) | No |

## Rules

- **2-3 stops, one hue family or neighbours** (within ~40 degrees), varying mostly in lightness. Complementary hues (orange to blue) through a muddy middle look cheap; if you need two distant hues, interpolate in OKLCH: `linear-gradient(in oklch, ...)` keeps the middle clean.
- **Interpolate in OKLCH** (`in oklch` or `in oklab`) to avoid the grey dead zone sRGB produces between saturated colours.
- **Radial before linear.** Light is radial. A soft radial from one corner or behind the subject looks like lighting; a two-stop linear diagonal looks like a template.
- **Low chroma for grounds.** Background gradients stay under chroma ~0.12; save saturated colour for the accent.
- **No banding.** Long, subtle gradients band on 8-bit screens. Add grain (below) or more stops.
- **Text on a gradient** must pass contrast at the *worst* point under it. Put text on the calm end.
- **One per page** for a decorative gradient (mesh, glow, lit stage). Two decorative gradients compete.

```css
/* A soft lit ground */
.hero {
  background:
    radial-gradient(60% 50% at 30% 35%, oklch(92% 0.05 60) 0%, transparent 70%),
    radial-gradient(50% 60% at 80% 70%, oklch(90% 0.04 30) 0%, transparent 70%),
    oklch(97% 0.01 60);
}

/* A two-stop gradient done right: one hue, lightness change, OKLCH interpolation */
.band { background: linear-gradient(in oklch 160deg, oklch(36% 0.08 250), oklch(24% 0.06 255)); }
```

## Mesh gradients with `gradient_mesh`

Call `gradient_mesh` with 2-4 colours from the palette (not new ones).

| Want | Colours | softness | grain |
|---|---|---|---|
| Calm, premium | 2-3 neighbours in hue, small L differences (e.g. paper, peach, sand) | 0.7-0.9 | 0.06-0.10 |
| Energy, launch | accent + one neighbour + a dark or light base | 0.4-0.6 | 0.10-0.15 |
| Night, technical | deep base (L 14-20%) + one muted cool + one accent at low share | 0.6-0.8 | 0.08-0.12 |
| Print, risograph feel | 2 flat-ish hues, harder edges | 0.2-0.4 | 0.15-0.25 |

- Pass `base` (the ground under the blobs), usually the page `bg` or a step darker/lighter, so the gradient melts into the page edge.
- Change `seed` until the composition leaves a calm area where the text goes. Text sits on the calm part, never on the busiest blob.
- Save it with `out` (e.g. `public/art/hero-mesh.svg`) and use it as a background image; the SVG scales without banding.
- The CSS version (stacked radial-gradients) is fine for small areas; prefer the SVG for full-bleed heroes.
- Animated mesh gradients: only if the direction asks for motion there, slow (12s+ loops), paused off-screen and under `prefers-reduced-motion`, with no layout cost. Usually: don't.

## Grain

Grain makes digital colour feel like a material and hides banding. It is a texture budget, not a filter for everything.

- **Where:** inside the gradient or hero art only. Never over UI, body text, photos or the whole page by default.
- **Opacity:** 4-10% on a section, up to 15% inside one card or plate, under 5% wherever text sits on it.
- **Never animated.** Drifting or flickering grain is distracting and costs frames.
- **Light specks on dark grounds**, dark specks on light grounds. Use `mix-blend-mode: overlay` or `soft-light` so it tints rather than greys.
- **Pure CSS/SVG**, no image requests. `gradient_mesh` returns a grain overlay you can put on a `::after` with `pointer-events: none`.

```css
.grain { position: relative; isolation: isolate; }
.grain::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.08; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
```

Untreated noise at very low opacity can read as a grey haze. If it looks dirty rather than textured, raise the
contrast of the specks (an `feColorMatrix` that thresholds alpha) and lower the opacity, or drop it.

## Glows, spotlights and blur

- **Glow behind an object** (a product on a dark stage): one soft radial in a muted version of the accent, under the object, 40-60% of its width larger. Once.
- **Never** coloured glows around buttons or cards, `box-shadow: 0 0 40px <accent>`, or neon text shadows.
- **Backdrop blur** belongs to things that float over content (a sticky header over scrolling content, a sheet, a popover). With blur, keep the surface at least 70-85% opaque so text stays legible on anything; check it over the busiest content it can sit on. Glass cards in a static layout are decoration.

## Backgrounds without gradients

Often better than any gradient:
- A flat tinted ground one step off white (`oklch(97% 0.012 hue)`).
- A full-bleed band in the brand colour (committed posture), text in its `on-` colour.
- A photograph with a calm area for the words.
- Fine structure: a 1px grid or dot pattern at 6-10% ink, confined to one band or panel, never behind body text.

## Slop tells

| Tell | Fix |
|---|---|
| Purple-to-blue or purple-to-pink diagonal hero | One-hue radial lighting, or a flat brand ground |
| Gradient on every section, alternating | Flat grounds; one moment per page |
| Gradient text in the headline | Solid ink; emphasis through size and weight |
| Muddy grey middle between two saturated colours | `in oklch` interpolation or neighbouring hues |
| Visible banding stripes | Grain at 4-8%, or the SVG mesh |
| Blurry blobs floating behind every card | Remove; one mesh in the hero at most |
| Neon glow borders on dark cards | 1px ring, elevation by lightness |
| Glassmorphism panels on a gradient everywhere | Solid surfaces; blur only for floating layers |
| Grain over the whole page including text | Grain only inside the art |
