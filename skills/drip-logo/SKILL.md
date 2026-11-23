---
name: drip-logo
description: Use when the user wants a logo, wordmark, lettermark, monogram, app icon, favicon or brand mark, or asks to redesign, critique or fix one ("make me a logo", "our logo looks cheap", "need a wordmark for X"). Covers identity intake, divergent concepts, SVG construction, wordmark customisation, stress tests, the critic, lockups and deliverables. Part of Drip.
user-invocable: false
---

# Logos and wordmarks (Drip)

**Before you do anything: call `drip_guide` with topic `logo`.** It returns the full guide and records the read;
the Drip hooks block writing brand files until it is read. No Drip task yet? Call `drip_start` (mode `logo`) first.
If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. A logo identifies; it does not explain. Every concept is one sentence of idea (before any style) that could not describe a competitor's mark. Never the first idea, a category cliché (`logo/cliches`) or a literal picture of the name (a cup for "Cup").
2. 8-12 concepts across at least 2 mark types before drawing anything final. Divergence comes from separate subagents, one direction each.
3. Build in solid black first, on a 256-unit viewBox, exact angles only (0/15/30/45/60/90°). Colour comes last.
4. Curves are few clean Béziers: nodes on extremes, handles horizontal or vertical, no tiny segments. `logo_test` hints with "lumpy" are failures, not notes.
5. Never ship stock text. A wordmark starts from a chosen typeface, then gets kerned and customised (1-2 deliberate moves), then outlined with `logo_outline`; lockups snap to its measured metrics.
6. Nothing in the mark smaller than 16 units on the 256 grid (1px at 16px). No live `<text>`, filters, raster or gradient-plus-gloss in the master; flat colour, one tiny highlight at most. Organic shapes are ONE path with continuous tangents, never rect + circle + blur.
7. Every finalist passes `logo_test`, the 16px squint, one colour, reversed, mirror/180° and the peer test against 3-4 exemplary marks.
8. One fatal flaw outweighs a high total: illegible at 16px, looks like an existing mark, or an unfortunate reading (a red drop reads as blood).
9. The critic ranks concepts before the user sees them, and judges finalists. Show the user greyscale first.
10. Chosen = locked. Never "tidy up" the picked mark during lockups or exports without asking.
11. Generate concepts from one small JS module (one function per concept); check every iteration at 32 and 16px on light and dark; save versions (`mark-v1.svg`), never overwrite.
12. "Artistic" or "like an artist" in a brief: ask whether they mean hand-made texture or polished craft. Default to craft; never fake ink with filters.

## Tools
- `drip_start` (mode `logo`), `drip_brief` — open the task, store the identity brief
- `refs_tag` (branding tags) / `refs_designer` — the peer set of top branding work; `refs_search` only maps category defaults (keywords return generic logos)
- `refs_pick` / `refs_view` / `refs_zoom` / `refs_study` — study the picked marks closely
- `fonts_search` / `fonts_pair` / `fonts_preview` — the base typeface for a wordmark, previewed with the real name
- `logo_outline` — outline text to SVG paths and get the font metrics (ascender, cap height, x-height, baseline, advances)
- `logo_sheet` — 4-24 concepts numbered on one sheet (light, dark, 32px)
- `logo_test` — one SVG at 16-128px, light/dark/mono/inverse/busy ground, plus path stats
- `critic_prepare` (kind `logo`) → Agent `drip:critic` with that prompt unchanged → `critic_record`; before the user sees anything ("would a brand studio ship this? name the 3 amateur tells"), next to 3 peer shots
- `palette_generate` / `palette_check` — brand colour after the black mark works
- AskUserQuestion — intake, and the pick between finalists; `drip_end` to hand off

## Read deeper when
| Situation | Call |
|---|---|
| Writing concepts, mark types, running the parallel concept agents | `drip_guide logo/concepts` |
| Drawing the SVG: grid, Béziers, overshoot, stroke contrast, junctions | `drip_guide logo/construction` |
| The mark is (or includes) a wordmark or lettermark | `drip_guide logo/wordmarks` |
| Stress tests, peer test, fatal flaws, the critic on finalists | `drip_guide logo/testing` |
| Lockups, clear space, colour, file set, favicon, BRAND.md | `drip_guide logo/deliverables` |
| Category clichés and the conventions worth breaking | `drip_guide logo/cliches` |
| Choosing the base typeface itself | `drip_guide type/pairing` |
| Brand colour ramps and contrast | `drip_guide color` |
