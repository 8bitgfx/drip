---
name: drip-color
description: Use when choosing or fixing colour - a palette, brand or accent colour, neutrals, OKLCH ramps, contrast, dark mode, state colours (error, success, warning), gradients, mesh gradients, grain, or a palette taken from a reference image. Also when a UI looks "generic", "flat", "too colourful" or "AI-made". Part of Drip.
user-invocable: false
---

# Colour (Drip)

**Before you do anything: call `drip_guide` with topic `color`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Work in OKLCH. Lightness steps you can predict; hue stays put while you lighten or darken.
2. One accent. It marks action, selection and focus, and covers under 10% of a product screen (under 5% when restrained). A second hue needs a job the first cannot do.
3. Neutrals carry the UI: 90-95% of every screen is ground, surface, ink and lines. Tint greys toward the page hue (chroma 0.004-0.015), or keep them pure grey; never default Tailwind `slate`/`gray` as a brand.
4. Never pure `#000` text or `#fff` dark-mode text. Ink at L 15-24%; dark ground at L 12-18%, dark text at L 92-96%.
5. Contrast, checked with `palette_check`, every pair, every theme: body text 4.5:1 (aim 7:1), large text (24px, or 18.66px bold) 3:1, icons, borders of inputs and focus rings 3:1.
6. Muted text is still text: 4.5:1. Grey text never sits on a coloured surface; tint it from that surface's hue.
7. Colour is never the only signal: errors, status and chart series also get an icon, a word, a shape or a position.
8. Dark mode is re-derived, never inverted: surfaces get lighter with elevation, the accent loses 0.02-0.04 chroma and gains 5-10% L, shadows become rings.
9. Gradients: 2-3 stops, one hue family or neighbours, never as text, never on buttons, never purple-to-blue or purple-to-pink by default.
10. No violet/indigo (hue 270-320) accent unless the brand or the user asks for it. It is the default AI tell.
11. Grain lives only inside the one gradient or hero art, at 4-10% opacity, never animated, never over body text.
12. State colours come in three tones each (fill, subtle background, text) and every tone passes contrast where it is used.

## Order of work
Read brand + tokens -> name the strategy (temperature, posture, light or dark first) -> find the accent (direction, brand, `palette_from_image`)
-> `palette_generate` -> map semantic roles -> `palette_check` every pair, every theme -> apply, squint at a screenshot -> record in DESIGN.md.
On a tweak: use the existing tokens; never add a new hue to fix one element.

## Tools
- `palette_generate` — from the accent hex: 11-step OKLCH ramps, tinted neutrals, state colours, light/dark tokens, Tailwind v4 `@theme`
- `palette_check` — WCAG contrast for fg/bg pairs (hex); run it on every text/surface pair in both themes
- `palette_from_image` — pull the main colours from a reference shot or brand photo, then seed `palette_generate`
- `gradient_mesh` — soft mesh gradient + grain as CSS/SVG with a preview, from 2-4 palette colours
- `refs_view` — study a reference's colour use full size before borrowing its palette

## Read deeper when
| Situation | Call |
|---|---|
| Dark mode, dark-first products, both themes | `drip_guide color/dark-mode` |
| Gradients, mesh gradients, grain, glows, backgrounds | `drip_guide color/gradients` |
| Picking a palette from a mood, an industry or a reference | `drip_guide color/palettes-by-mood` |
| Putting colour into tokens and themes | `drip_guide system` |
| Wiring the light/dark switch itself | `drip_guide system/theming` |
