---
name: drip-logo
description: Logo rules - logos, wordmarks, lettermarks, monograms, app icons, favicons and brand marks, including redesigning or fixing one, and the one-image brand board that presents it. Covers concepts, SVG construction, wordmark customisation, stress tests, flat colour, lockups, the brand board and deliverables. Use when the user wants a logo or says theirs looks cheap.
user-invocable: false
---

# Logos and wordmarks (Drip)

Applies to any logo or brand mark; logo tasks run in `drip_start` mode `logo`. Call `drip_guide logo` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- The default is the house style (`drip_guide logo/house-style`): read its section 1, what a user rejected in their own words, before you draw.
- A logo identifies; it does not explain. Every concept is one sentence of idea that could not describe a competitor's mark.
- 8-12 concepts across at least 2 mark types before drawing anything final.
- One bold silhouette, one master for every size. Simple over layered: no inner cuts or details that collapse at 16px.
- Build in solid black on a 256-unit viewBox with exact angles only; colour comes last.
- Colour is FLAT: solid palette fills, main colour + one accent. Never gradients, foil, glow, gloss, bevel or texture, and never imagery behind the mark.
- Every finalist passes `logo_test` and the 16px squint. The user sees the finalists after ONE critic round and picks; chosen = locked. Critic rounds never override the user's taste.
- The presentation is ONE board image per logo: `drip_kit({ template: "logo-board" })`, 1600x1200 rendered at 2x, brand-tint ground, 7 palette-colour tiles, nothing under 19px.

## Read deeper when
| Situation | Call |
|---|---|
| The default mark, colour and board, and what users rejected | `drip_guide logo/house-style` |
| Mark types, writing concepts, parallel concept agents, cutting | `drip_guide logo/concepts` |
| Drawing it: the 256 grid, Béziers, overshoot, junctions, SVG hygiene | `drip_guide logo/construction` |
| A wordmark: choosing the face, kerning, customising, outlining | `drip_guide logo/wordmarks` |
| Stress tests, the peer test, fatal flaws, the critic on finalists | `drip_guide logo/testing` |
| Colour, lockups, clear space, the file set, favicon, BRAND.md | `drip_guide logo/deliverables` |
| The category's clichés and what reads as amateur | `drip_guide logo/cliches` |
