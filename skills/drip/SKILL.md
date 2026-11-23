---
name: drip
description: Use for ANY user-interface work — a new page, screen, site, landing page, dashboard, component, redesign, restyle, or a visual tweak ("make it look better", "this looks mid/AI-made", "polish this") — in any frontend stack. Drip is the design director: it runs a real designer's process (brief, references, moodboard, direction, system, assets, build, fit check) through the Drip MCP tools, and its hooks block UI file writes until the process is done.
---

# Drip: work like a real designer

**Step 1, always: call `drip_start` with what you are designing.** It decides the loop (full or quick), lists the guides you must read, returns the first one, and tells you the next call. The plugin **blocks writing UI files** until the task's requirements are met, and **blocks ending your turn** after UI changes until a fit check is recorded. There is no shortcut: do the work.

Lost at any point: `drip_status` (checklist + the exact next call).

## The loop

| # | Step | Do | Tools | Guide |
|---|---|---|---|---|
| 1 | Brief | Who, job of the surface, feeling, constraints. Ask max 3 questions, else state assumptions. Read the project's existing tokens/components first. | — | `brief` |
| 2 | References | 3+ searches, scan contact sheets, open 8-15 picks full size, note what each does well | `refs_search` `refs_related` `refs_tag` `refs_designer` `refs_view` | `refs` |
| 3 | Moodboard | Add picks with specific notes, cluster into 2-3 real directions | `board_create` `board_add` `board_directions` | `moodboard` |
| 4 | Direction | Show the board, user picks (or you pick with a reason when told to proceed) | `board_open` `board_read` `board_choose` | `direction` |
| 5 | System | DESIGN.md + tokens: palette, type, spacing, radius, motion | `palette_generate` `palette_check` `fonts_pair` `fonts_preview` → `drip_mark system` | `system` `color` `type` `layout` |
| 6 | Assets | One icon family, real imagery, gradients/texture | `icons_*` `images_search` `images_save` `gen_image` `gradient_mesh` | `icons` `imagery` |
| 7 | Build | Proven components first, restyled to tokens | `components_find` `components_get` | `components` + surface guide |
| 8 | Fit check | Screenshot, compare with the direction, score honestly, fix, repeat | `fitcheck_shot` `fitcheck_compare` `fitcheck_lint` `fitcheck_done` | `fitcheck` |
| 9 | Polish | The invisible details | — | `polish` `interaction` `motion` |

**Quick loop** (tweak to existing UI): `drip_start` with size `quick` → read the guides it lists → change → `fitcheck_lint` (+ `fitcheck_shot` if it runs) → `fitcheck_done`.

## Rules you must not break
1. No UI before `drip_start`. No new page/component before references, a board and a chosen direction.
2. Read a craft's guide (`drip_guide <topic>`) before doing that craft. Skimming this file is not reading.
3. Follow the project's existing system (DESIGN.md / tokens) unless the task is a redesign — and say so if you change it.
4. One accent colour, one type pairing, one icon family, one radius scale — unless the direction says otherwise.
5. Real content: real copy, real product UI, real imagery. No lorem, no fake stats, no placeholder boxes.
6. Prefer a proven component (`components_find`) over hand-rolling, then restyle it — never ship library defaults.
7. Every colour pair passes contrast (`palette_check`); every interactive element has hover, press, focus-visible and disabled.
8. Never ship without a fit check on a real screenshot at phone and desktop size.
9. References are for studying, never for copying a design one-to-one.
10. Never call `drip_skip` on your own; only when the user explicitly asks to skip the process.

## The craft skills (each has a guide; the loop tells you when)
`drip-brief` · `drip-refs` · `drip-moodboard` · `drip-direction` · `drip-system` · `drip-color` · `drip-type` · `drip-layout` · `drip-landing` · `drip-app` · `drip-mobile` · `drip-components` · `drip-interaction` · `drip-motion` · `drip-imagery` · `drip-productshots` · `drip-icons` · `drip-copy` · `drip-a11y` · `drip-fitcheck` · `drip-polish`

Shared rules: `drip_guide rules/hard-rules`, `rules/slop-tells`, `rules/per-surface`, `rules/licences`.
