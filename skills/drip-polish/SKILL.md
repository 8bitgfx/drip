---
name: drip-polish
description: Use for the final details pass on any UI before it ships, or when something "feels off", "looks cheap", "isn't crisp" - shadows and borders, border radius nesting, optical alignment, icon and text alignment, tabular numbers, font smoothing, text wrapping, image outlines, hairlines, focus rings, scrollbars, selection colour, cursors, empty/loading/error and long-content states. Part of Drip; a checklist pass after the build and before the fit check.
---

# Polish (Drip)

**Before you do anything: call `drip_guide` with topic `polish`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Polish refines; it never redesigns. Keep the chosen direction, content and behaviour; if the concept is wrong, say so instead of smuggling in a new one.
2. Fix in the system first: a wrong value repeated in three places becomes a token, a one-off becomes the shared component.
3. Nested radii are concentric: outer radius = inner radius + padding (when padding is 24px or less).
4. Borders for structure (dividers, inputs, tables); layered transparent shadows for elevation. One elevation scale; in dark mode elevation is lighter surfaces plus a 1px white hairline at 6-10%.
5. Changing numbers use `tabular-nums`; headings use `text-wrap: balance`; short paragraphs `text-wrap: pretty`; root gets `antialiased`.
6. Align optically: icon-side padding 2px less than text-side; play icons nudged right; icons centred on the text's cap height, not the line box.
7. Images get a 1px inset outline in pure black at 10% (light) / pure white at 10% (dark), never a tinted grey.
8. Every focusable element shows the same focus ring: 2px, 2px offset, 3:1 contrast, no transition.
9. Every data view has designed empty, loading, error and long-content states; nothing renders "undefined", "NaN" or a blank box.
10. No layout shift: images have dimensions or aspect ratios, loading keeps sizes, fonts swap without reflow, scrollbars don't jump the page.
11. Hit areas at least 24px (44px on touch), never overlapping; cursors match what happens (`pointer` only on links if the system says so, `text`, `grab`, `not-allowed`).
12. Check every state, both themes, phone and desktop on a real screenshot before calling it done.

## Numbers at a glance
| What | Value |
|---|---|
| Radius nesting | outer = inner + padding (e.g. 12px image + 8px padding = 20px card) |
| Shadow-as-border (light) | `0 0 0 1px oklch(0 0 0 / .06), 0 1px 2px -1px oklch(0 0 0 / .06), 0 2px 4px oklch(0 0 0 / .04)` |
| Dark elevation | surfaces 3-4% lighter per level + `0 0 0 1px oklch(1 0 0 / .08)` |
| Image outline | `outline: 1px solid oklch(0 0 0 / .1); outline-offset: -1px` (white / .1 in dark) |
| Hairline | ink at 8-12% alpha, 1px |
| Icon stroke | 1.5px beside regular text, 2px beside semibold |

## Tools
- `fitcheck_lint` — static pass: off-scale values, raw colours, `transition: all`, missing focus styles, tinted image outlines.
- `fitcheck_shot` — phone + desktop screenshots, light and dark; zoom into the details you changed.
- `fitcheck_compare` — the build next to the chosen direction, to catch drift.
- `palette_check` — contrast of text, borders, focus ring and states.
- `icons_search`, `icons_get` — replace a stray icon with one from the project's family.
- `fitcheck_done` — scores and verdict; required before ending the turn.

## Read deeper when
| Situation | Call |
|---|---|
| Running the full pass (long, grouped, checkable) | `drip_guide polish/checklist` |
| Radius, shadows, borders, hairlines, image outlines, dark-mode elevation | `drip_guide polish/surfaces` |
| Empty, loading, error, long text, big numbers, offline, permission states | `drip_guide polish/edge-states` |
| Press, hover, focus, overlays | `drip_guide interaction` |
| Anything that moves | `drip_guide motion` |
