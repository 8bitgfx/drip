---
name: drip-type
description: Use when choosing fonts or a font pairing, setting a type scale, fixing hierarchy, line-height, line length, letter-spacing, numerals, font loading or variable fonts, or when text looks generic, cramped, flat or "AI-made". Applies to CSS, Tailwind, next/font, @font-face and any UI or marketing page. Part of Drip.
user-invocable: false
---

# Typography (Drip)

**Before you do anything: call `drip_guide` with topic `type`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. One family, or two with clearly different jobs (display + text). A third face only for code or figures. Never two similar sans-serifs.
2. Do not default to Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Nunito, Raleway, DM Sans, Plus Jakarta Sans or Space Grotesk. Use one only when the project already does, the user asks, or you can say why it beats the alternatives you previewed.
3. A real scale, not a pile of sizes: 5-7 sizes per surface. Marketing on a 1.25-1.333 ratio from 16px; product UI fixed rem on 1.125-1.2.
4. Reading text is 16px or more (17-20px for long reading). Dense product UI may use 13-14px for table cells and labels. Nothing under 12px. Inputs 16px on phones.
5. Body line-height 1.5-1.65 (prose 1.6-1.75); headings 1.05-1.25, tighter as they grow. Never 1.5 on a 64px headline.
6. Measure 45-75 characters for body (`max-width: 65ch`), about 20ch for h1, 30ch for h2.
7. Tracking: 0 for body; -0.01 to -0.04em on large display (never tighter than -0.04em); never track lowercase body text.
8. Three weights at most on a page. Hierarchy from size and weight together, not colour, not capitals.
9. No tracked all-caps eyebrow over headings, no gradient text, no one-word-in-a-different-colour headline. Sentence case everywhere.
10. `font-variant-numeric: tabular-nums` on every number that is compared or changes: tables, prices, timers, counters, stats.
11. `text-wrap: balance` on headings, `text-wrap: pretty` on short paragraphs.
12. Load only the weights you use, `font-display: swap`, a metric-matched fallback, preload at most 2 files, `font-synthesis: none`. Prefer variable fonts.

## Order of work
Read loaded fonts + DESIGN.md -> name the roles -> `fonts_pair` with the mood words + `fonts_search` -> `fonts_preview` 2-3 pairings with the real headline
-> pick a scale for the surface -> tokens (size + line-height + tracking) -> load (variable, swap, fallback) -> details (numerals, wrapping) -> screenshot at 375 and 1440.
On a tweak: keep the project's faces; fix roles, sizes and spacing inside the existing scale.

## Tools
- `fonts_pair` — pairings ranked by the direction's mood words, with a specimen (flags overused ones)
- `fonts_search` — every open font (Fontsource/Google) by name, category, variable-only; gives the npm package
- `fonts_preview` — specimen of a pairing with your real headline; judge with your eyes before choosing
- `refs_view` — study a reference's type full size: sizes, weights, spacing, case

## Read deeper when
| Situation | Call |
|---|---|
| Building the scale: sizes, line-heights, tracking per step, fluid `clamp()` | `drip_guide type/scales` |
| Choosing faces, pairing logic, overused fonts and alternatives | `drip_guide type/pairing` |
| Numerals, loading, variable fonts, wrapping, punctuation, optical details | `drip_guide type/details` |
| Turning the scale into tokens | `drip_guide system/tokens` |
| Space around headings and text blocks inside a layout | `drip_guide layout` |
