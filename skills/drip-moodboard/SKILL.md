---
name: drip-moodboard
description: Use when building a moodboard or presenting visual directions ("make a moodboard", "show me some directions", "what could this look like", steps 3-5 of the Drip loop, or /drip:design in board mode). Covers the board (studies are added automatically), choice criteria written first, 2-3 directions named like movements with a manifesto that differ in idea, style tiles at equal fidelity, the critic's ranking before the user sees anything, presenting with buttons, and locking the choice. Part of Drip.
user-invocable: false
---

# Moodboard (Drip)

**Before you do anything: call `drip_guide` with topic `moodboard`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`; load the board and critic tools with ToolSearch `+drip board` and `+drip critic`.

A board is a decision tool, not a collage. It turns studied references into 2-3 directions the user can
compare in one look: each a named idea with a manifesto, rendered as a first-viewport comp, ranked by an
independent critic, with Drip's pick and its risk. The user chooses with one click; the choice is locked.

## Rules you must not break
1. A board needs a brief (`drip_brief`). Studies from `refs_study` are already on it; add 3-8 colours and 2-4 fonts with `board_add`, each with a note that has a value.
2. **Write 3-5 choice criteria before forming any direction**, each a threshold (must pass) or a trade-off (more is better), each able to fail a direction.
3. 2-3 directions (4 only if the user asked for range). They **differ in idea**: what the page leads with, its metaphor, its structure. A palette or font swap is the same idea rendered twice.
4. Each direction is named like a movement (1-2 words: "Live Wire", "Door Counter") with a **3-sentence manifesto** in `summary`: the idea; how it looks and moves; what it refuses. Never a mood word ("Modern", "Bold", "Clean").
5. **At least one unexpected pairing**: the subject crossed with a genre from another world, with one line on why it beats the safe version.
6. No AI default as a direction unless the brief pins it (cream + serif + terracotta, neon on black, purple gradients, the SaaS card kit). Ambition is bold.
7. `board_directions` renders every direction as a first-viewport comp at **equal fidelity** with real copy from the brief. No strawman option you wouldn't build.
8. **The critic ranks before the user sees anything**: `critic_prepare({ kind: "directions", context: <criteria> })` → Agent `drip:critic` with the prompt unchanged → `critic_record` with `perDirection`. A REJECT blocks `board_open` and `board_choose`.
9. Rework rejected or "same idea twice" directions with a new idea, not a recolour; re-tile; re-run the critic.
10. Present per `rules/communication`: the link, one line per direction with the critic's score and words, your pick and its risk, then one AskUserQuestion with your pick first.
11. `board_choose` with the user's words in the reason. Chosen = locked. Record why the others lost and what would bring them back; never graft losers onto the winner.

## Tools
- `board_create` — start the board; imports every study so far.
- `board_add` — colours (`#hex`), fonts, images (with `source`), extra shots, each with a specific note.
- `board_directions` — save 2-4 directions (name, summary = manifesto, adjectives, palette, type, items). Replaces the set.
- `board_tile` — re-renders the comps (new copy, or your own comp HTML per direction).
- `critic_prepare` (kind `directions`) → Agent `drip:critic` → `critic_record` (with `perDirection`) — the ranking shown on the board.
- `board_open` — live link, shareable `board.html`, preview screenshot. Blocked until the critic ranked and didn't reject.
- `board_read` — the user's stars, removals and notes (or pasted feedback).
- `board_choose` — lock the direction with its reason; unlocks the system step. On the master board it is also the approval of the project's identity (`approved: false` if you chose for the user).
- `board_project`, `board_import`, `board_attach`, `board_update`, `board_history`, `project_context` — the project's master board, importing the repo's own material, attaching a task, safe changes and the log. `feedback_record`, `project_learn`, `style_extract`, `style_update`, `style_export`, `style_import` — what the project learns. Read `moodboard` ("The project's master board") first.
- `palette_check`, `fonts_pair`, `fonts_preview` — verify each direction's palette and type before tiling.

## Read deeper when
| Situation | Call |
|---|---|
| Criteria, forming directions that differ in idea, manifestos, pairings, tiles, reworking | `drip_guide moodboard/directions` |
| The critic's ranking, publishing, the message, buttons, reading reactions, locking | `drip_guide moodboard/presenting` |
| Naming the genre and its `breaks_if` list, turning the choice into a world | `drip_guide direction` |
| The project already has a master board, approved direction or rules; redesign vs fidelity; feedback | `drip_guide moodboard` ("The project's master board") |
