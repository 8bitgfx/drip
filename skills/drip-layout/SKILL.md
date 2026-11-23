---
name: drip-layout
description: Use when laying out a page, screen or component - spacing, grids, composition, alignment, visual hierarchy, density, responsive breakpoints, fluid sizing with clamp(), containers and max-widths, above-the-fold, whitespace, card and section anatomy - or when a layout feels cramped, empty, templated or "off". Part of Drip.
user-invocable: false
---

# Layout and spacing (Drip)

**Before you do anything: call `drip_guide` with topic `layout`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. One spacing scale on a 4px base: 4 8 12 16 24 32 48 64 96 128. No 13px, 22px or 37px; at most a few optical nudges, each with a comment.
2. Group by proximity: space between groups is at least 2x the space inside a group. Space above a heading is larger than below it.
3. One container width per page (1200-1280px for content, 65ch for prose) with the same side gutters top to bottom: 16px phone, 24px tablet, 32-64px desktop.
4. Every block starts on the container's left edge or a grid column. Two text edges per page at most. Nothing centred that is wider than about 640px or longer than 3 lines.
5. Mobile first. No horizontal scroll at 320px. Test 375, 768, 1024, 1440 and 1920.
6. The hero's headline, one line of support and the main action are visible without scrolling at 1440x900 and 390x844. Use `svh`/`dvh`, never `100vh`, for full-height sections.
7. Density follows the surface: marketing sections 96-160px apart; product UI panels 16-24px padding, 32-48px between groups; tables 40-48px rows by default.
8. Touch targets 44x44px (WCAG floor 24x24), 8px apart. Desktop controls 32-40px high with the same hit area.
9. Use `gap` for sibling spacing, not margins on children. Use grid for 2D page structure, flex inside components.
10. No cards in cards, no box around every group. Proximity and a hairline come before a container.
11. Do not make every section the same skeleton (heading, three equal cards). Vary composition by content; never the same composition twice in a row.
12. Fluid sizes with `clamp()` always include a rem term; layout changes (columns, sidebars) happen at breakpoints, not by shrinking type.

## Order of work
Name the screen's job -> write the reading order (or the section list) -> pick each section's composition from its content
-> set container, gutters, grid -> lay out at 375px first -> space with the scale -> align edges -> check the fold -> `fitcheck_shot` and squint -> stress with long and empty content.
On a tweak: keep the page's container, grid and scale; match the neighbours' spacing exactly.

## Tools
- `refs_search`, `refs_view` — study how references compose a screen: grid, density, where the eye lands
- `fitcheck_shot` — screenshots at phone and desktop sizes to check rhythm, alignment and the fold
- `fitcheck_lint` — static checks for off-scale spacing, overflow and other layout slop
- `fitcheck_compare` — the build next to the chosen board direction
- `components_find` — proven layout primitives (sidebars, data tables, sheets) before hand-rolling

## Read deeper when
| Situation | Call |
|---|---|
| Breakpoints, fluid sizing, containers, mobile layouts, tables on phones | `drip_guide layout/responsive` |
| Composing a page or section: heroes, splits, grids, bento, rhythm, card and section anatomy | `drip_guide layout/composition` |
| Product UI: density, sidebars, panels, tables, forms, dashboards | `drip_guide layout/density` |
| Spacing and layout tokens | `drip_guide system/tokens` |
| Heading sizes and the space around text | `drip_guide type/scales` |
