---
name: drip-direction
description: Use when choosing or committing to a look ("what style should this be", "make it distinctive", "it looks generic / AI-made / templated", "give me alternatives"), after a moodboard direction is chosen, and before writing tokens or UI. Covers the genres and styles catalogue, making alternatives that really differ, committing to a point of view, and scaling ambition to the surface mode. Part of Drip, between the moodboard and the system.
---

# Direction (Drip)

**Before you do anything: call `drip_guide` with topic `direction`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

A direction turns a chosen board card into a world you could recognise with every word removed: one idea,
one ground and ink, one type voice, one signature move, committed as far as the surface's mode allows.

## Rules you must not break
1. One idea per surface, written as a thesis: what it leads with, and the category default it refuses. If it reads like a mood ("modern and trustworthy"), it is not decided yet.
2. Scale ambition to the mode. Persuade/Experience: the world may own the page. Operate: it lends type, palette, density and one signature move; layout, navigation and controls stay standard. Read: it owns the frame; the reading column stays calm.
3. Pick a colour posture before picking colours: Restrained (accent under ~10%), Committed (one colour on 30-60%), Full palette (3-4 colours with jobs), Drenched (the ground is the colour).
4. Light or dark comes from the scene sentence (who, where, under what light), never from habit.
5. Two type families at most (three if the third has one narrow role). Faces are chosen from the subject's world; a saturated default (Inter as display, Space Grotesk, DM Sans, Plus Jakarta Sans, Outfit, Fraunces, Playfair Display, Instrument Serif) needs a reason no other face satisfies.
6. Name the signature: the one thing a visitor would describe an hour later. It is on the first screen and it is the product's real thing at its best, not decoration.
7. Spend boldness in one place. Everything around the signature is quiet and exact.
8. One world owns the page, top to bottom. A world that stops after the hero is a template with a good hero.
9. Commit every atom: buttons, inputs, nav, links and tables are restyled in the world's vocabulary. A stock component inside a committed world is a lapse.
10. Never land in an AI default when the brief leaves the look free: cream + high-contrast serif + terracotta; near-black + one neon; broadsheet hairlines + italic serif + tracked mono labels; flat saturated fills + black borders + hard offset shadows; the SaaS card kit; purple-to-blue gradients; a hue picked for the category (blue = finance, green = health).
11. A brief- or brand-pinned look wins over all of the above. Push quality inside it instead.
12. Run the three tests before the system step: category guess, competitor-name swap, thumbnail. Fail any: rework.

## Tools
- `board_read` / `board_choose` — the chosen direction's card (name, palette, type, items) is your starting point.
- `refs_view` — reopen the chosen direction's anchor shots when making decisions.
- `fonts_pair`, `fonts_preview`, `fonts_search` — test the type voice with real words from the brief.
- `palette_from_image`, `palette_generate`, `palette_check` — posture and contrast before tokens.
- `gen_image` — only if a direction needs a visual test or authored imagery and a provider is set (`gen_providers`).
- `drip_mark` (step "system") — after the direction is written into `DESIGN.md` with tokens.

## Read deeper when
| Situation | Call |
|---|---|
| Naming the genre, its signature moves and its slop risks | `drip_guide direction/genres` |
| Making alternatives that differ for real, or the work looks templated | `drip_guide direction/alternatives` |
| Turning the direction into tokens and `DESIGN.md` | `drip_guide system` |
