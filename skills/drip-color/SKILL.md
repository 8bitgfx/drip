---
name: drip-color
description: Colour rules - palettes, brand and accent colour, neutrals, OKLCH ramps, contrast, dark mode, state colours, gradients, grain and palettes taken from a reference image. Use when choosing or fixing colour, or when a UI looks generic, flat, too colourful or AI-made.
user-invocable: false
---

# Colour (Drip)

Applies to any palette, theme or colour fix. Call `drip_guide color` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Work in OKLCH. One accent for action, selection and focus.
- Neutrals carry the UI (90-95% of every screen); never pure `#000` text.
- Body text 4.5:1; large text and UI parts 3:1, in every theme (`palette_check`); colour is never the only signal.
- Dark mode is re-derived, never inverted. No violet/indigo accent unless the brand or the user asks.
