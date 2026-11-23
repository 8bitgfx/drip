---
name: drip-refs
description: Use when gathering design references or inspiration for a page, screen, component or brand ("find references", "look for inspiration", "what do good X look like", step 3 of the Drip loop), and before writing any new UI. Covers writing search queries, fanning out through tags and designers, scanning contact sheets, studying shots full size and writing specific notes. Part of Drip.
user-invocable: false
---

# References (Drip)

**Before you do anything: call `drip_guide` with topic `refs`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

References are how a designer escapes their own defaults. You look at 100+ pieces of work, study 8-15 of
them closely, and write down exactly what each one does, so the build is made of decisions you saw work.

## Rules you must not break
1. Search from the brief, not the category name alone. Run 3+ different queries: one direct (surface + category), one quality-led (a named style or trait + surface), one from the subject's own world (print, places, objects).
2. Go past page 1. Keyword search stops after about 2 pages: fan out with `refs_related` -> `refs_tag` -> `refs_designer`.
3. Scan 50-150 thumbnails on contact sheets before opening anything. Reject fast; open slowly.
4. Open 8-15 shots full size with `refs_view` (the gate counts at least 6). Never pick from thumbnails alone.
5. For every shot you keep, write: layout, type, colour, density, motion (if any), and one specific detail, each with a value ("display ~96px condensed, 6:1 over body"). "Nice", "clean", "modern" are rejected by `board_add`.
6. Picks span at least 3 queries, at least 5 designers, and at most 3 from any one designer. At least 2 come from outside the product's category.
7. Take one move per reference, never a whole composition. The build must not be recognisable as any single shot.
8. Treat Dribbble shots as concept art: fake data, perfect content, no states. For Operate and Read surfaces, check moves against at least 2 shipped products or real sites.
9. Never copy a reference's illustration, photography, logo, copy or signature effect. Credit the designer on the board.
10. `board_add` each kept shot right after studying it, with its note. Do not batch notes from memory at the end.

## Tools
- `refs_search` — keyword search (about 2 pages logged out). Write subject + quality + medium.
- `refs_related` — the tags designers use on the top shots for a query; your fan-out map.
- `refs_tag` — deep paging through one tag (20+ pages). The main way past the keyword cap.
- `refs_designer` — everything by a designer whose shot you liked; their work is usually consistent.
- `refs_feed` — popular or recent, by category and timeframe. Once per task, for calibration, never as the source.
- `refs_sheet` — a bigger contact sheet of a 6-24 shot shortlist, side by side.
- `refs_view` — study one shot full size (palette, tags, designer notes, images). Counts toward the gate.
- `board_add` — keep a studied shot with its specific note (`drip_guide moodboard`).

## Read deeper when
| Situation | Call |
|---|---|
| Writing queries for a specific surface (landing, dashboard, docs, mobile, component, brand) | `drip_guide refs/queries` |
| Opening a shot and deciding what to write down | `drip_guide refs/studying` |
| Dribbble is thin for this surface, or you need shipped sites, app flows or type in use | `drip_guide refs/sources` |
