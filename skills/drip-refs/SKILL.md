---
name: drip-refs
description: Use when gathering design references or inspiration for a page, screen, component, logo or brand ("find references", "look for inspiration", "what do good X look like", step 2 of the Drip loop, or /drip:design in refs mode), and before writing any new UI. Covers search queries from 3+ angles, fanning out through tags and designers, scanning contact sheets, then pick → view → zoom → study with structured notes that carry values. Part of Drip.
user-invocable: false
---

# References (Drip)

**Before you do anything: call `drip_guide` with topic `refs`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`; load the refs tools with ToolSearch `+drip refs`.

References are how a designer escapes their own defaults. You scan 100+ pieces of work, pick the few that
solve this brief, look at them full size and up close, and write down in values what each one does and
what it chose not to do, so the build is made of decisions you saw work.

## Rules you must not break
1. Search from the brief, not the category name alone. 3+ angles: direct (surface + category), quality-led (a named trait or school), subject world (print, places, objects), plus the hardest component.
2. Go past page 1: `refs_related` → `refs_tag` (pages 2-3) → `refs_designer`.
3. Round 1 is wide: 15-30 distinct candidates on sheets, with at least 2 contrasting readings of each feel word. Reject fast; open slowly.
4. **Pick before you look closer**: `refs_pick` 2-5 per sheet, each with a reason tied to this brief, not "nice".
5. **View the original**: `refs_view` shows every image full width, long pages in top-to-bottom sections; study the whole design. `refs_zoom` only for one small detail. Never study from a thumbnail; `refs_study` refuses unviewed shots.
6. **Study with values**: `refs_study` every field with a size, ratio, hex, count or named type class. "Clean", "modern", "premium", "elegant" are rejected.
7. No unearned praise: a claim ("refined type", "restrained colour") needs the value that earns it. At least one field records what the reference **chose not to do**; every "A over B" names a real B.
8. Gate: **6+ studied from 3+ designers** (a full loop usually studies 8-12). At most 3 from one designer; at least 2 from outside the category.
9. Attribution: every reference is a `Candidate` until you pick it (`Agent Pick`) or the user stars it (`User Selected`). "Just pick for me" is never recorded as the user's taste.
10. Take one move per reference, never a whole composition. Never copy illustration, photography, logos, copy or a signature effect.
11. Dribbble shots are concept art: for Operate and Read, back behavioural moves with 2+ shipped products.

## Tools
- `refs_search` — keyword search (about 2 pages logged out). Subject + quality + medium.
- `refs_related` — tags designers use on the top shots for a query; the fan-out map.
- `refs_tag` — deep paging through one tag (20+ pages). The main way past the keyword cap.
- `refs_designer` — everything by a designer whose shot stopped you.
- `refs_feed` — popular or recent, by category. Once per task, for calibration, never as the source.
- `refs_gallery` — curated galleries beyond Dribbble in one call: Awwwards, One Page Love (sites and sections), Minimal Gallery, 21st.dev (components), feeds. Numbered sheet; the numbers work in `refs_pick`, `refs_view`, `refs_study`, `board_add` (with `kind: "shot"` for tagged numbers).
- `refs_sources` — which sources exist, what each is for, which work right now.
- `refs_sheet` — a contact sheet of a 6-24 shot shortlist, side by side.
- `refs_pick` — commit to a shortlist from the last sheet, a reason each.
- `refs_view` — one shot full size (images, palette, tags, notes).
- `refs_zoom` — crop a region: `top`, `center`, `top-left`… or `{x,y,w,h}` in %.
- `refs_study` — structured notes; counts toward the gate and goes on the board automatically.

## Read deeper when
| Situation | Call |
|---|---|
| Writing queries for a specific surface (landing, dashboard, docs, mobile, component, brand) | `drip_guide refs/queries` |
| Viewing, zooming and writing a study that survives the praise check | `drip_guide refs/studying` |
| Dribbble is thin for this surface, or you need shipped sites, app flows or type in use | `drip_guide refs/sources` |
