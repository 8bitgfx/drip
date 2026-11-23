---
name: drip-moodboard
description: Use when building a moodboard or presenting visual directions ("make a moodboard", "show me some directions", "what could this look like", step 4-5 of the Drip loop), including standalone requests with no build attached. Covers collecting references with specific notes, clustering them into 2-4 genuinely different directions, publishing the board, reading the user's reactions and locking a choice. Part of Drip.
user-invocable: false
---

# Moodboard (Drip)

**Before you do anything: call `drip_guide` with topic `moodboard`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

A board is a decision tool, not a collage. It turns studied references into 2-4 named directions the user
can compare in one look and choose between, so the build starts from a choice instead of a default.

## Rules you must not break
1. A board needs a brief. Standalone request? Write a 3-line brief first (audience, job, mode) and pass it to `board_create`.
2. Every item has a note a builder could act on: what to take, with values ("condensed caps ~120px over 17px body"). `board_add` rejects vague notes.
3. Collect 8-20 items before clustering: 6-12 studied shots, 3-8 colours as `#hex`, 2-4 fonts, images with their `source`. The gate needs 8.
4. Make 2-4 directions (3 is the default). Each differs from every other on at least 3 of the 6 axes: ground, type voice, colour posture, density, shape language, energy.
5. "The same look in two colours" is one direction. Merge it and find a real alternative.
6. Name directions with a concrete noun from the subject's world ("Timetable", "Darkroom", "Seed packet"), never a mood word ("Modern", "Bold", "Clean").
7. Each direction has: a one-sentence thesis, 3 adjectives that each rule something out, 4-6 hex colours in role order (ground, ink, accent, support), a type pairing of real, available faces, and 3+ items.
8. Never let an unexamined AI default be a direction: cream + serif + terracotta, near-black + one neon, purple-blue gradients, the SaaS card kit. Allowed only when the brief pins it.
9. Publish to share: `board_open`, then publish its `board.html` as an artifact if an Artifact/publish tool exists; otherwise give the live localhost link. Plus one line per direction.
10. Lead with the direction you would fight for and its honest risk. Ask one question. Then `board_read` before deciding.
11. `board_choose` with a reason tied to the brief (audience, job, mode), never "it looks best". Choose alone only when the user told you to.

## Tools
- `board_create` — start the board with a name and the brief.
- `board_add` — add shots (listing number or id), image URLs (with `source`), `#hex` colours and font names, each with a note.
- `board_directions` — save 2-4 directions (name, summary, adjectives, palette, type, items). Replaces earlier ones.
- `board_open` — live link, shareable self-contained `board.html`, and a preview screenshot.
- `board_read` — the user's stars, removals and notes (or feedback they pasted from the static board).
- `board_choose` — lock the direction with its reason; unlocks building.
- `board_list` — earlier boards in this project.
- `palette_from_image`, `palette_check`, `fonts_pair`, `fonts_preview` — build and verify each direction's palette and type.

## Read deeper when
| Situation | Call |
|---|---|
| Clustering items, testing that directions really differ, writing direction cards | `drip_guide moodboard/directions` |
| Publishing the board, writing the message, reading reactions, revising | `drip_guide moodboard/presenting` |
| Turning the chosen direction into a full visual world | `drip_guide direction` |
