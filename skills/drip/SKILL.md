---
name: drip
description: Use when the user asks for Drip (/drip:design) or for a real design process on visual work ("design this properly", "with references / a moodboard", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: intake questions, studied references, critic-ranked directions, a system, the build, and an independent harsh critic before hand-off. While a Drip task is open its hooks enforce the loop.
user-invocable: false
---

# Drip: work like a real designer

**0. Load the tools** (they're deferred). If `drip_start` isn't callable: ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_brief,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_status`; load others the same way when a step needs them (ToolSearch `+drip refs`, `+drip board`, `+drip critic`, `+drip logo`). Nothing loads → tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. It picks the mode (design · logo · refs · board · polish), the loop, the niche packs, the guides you must read, and tells you the next call. Then follow it. Lost: `drip_status`.

## The loop (full)
| # | Step | Do | Tools |
|---|---|---|---|
| 1 | **Intake** | ONE round of ≤ 4 clickable questions (AskUserQuestion), options specific to this request, your recommendation first. Read the project first; never ask what you can look up. | AskUserQuestion → `drip_brief` |
| 2 | **References** | 3+ angles of search, scan sheets, **pick** the few that fit, **view + zoom + study** each (structured notes with values). 6-12 studied, 3+ designers. | `refs_search` `refs_tag` `refs_related` `refs_designer` → `refs_pick` → `refs_view` → `refs_zoom` → `refs_study` |
| 3 | **Directions** | Board auto-collects studies. 2-3 directions that differ in **idea**, each named like a movement with a manifesto; at least one daring. Render **style tiles**. | `board_create` `board_add` `board_directions` `board_tile` |
| 4 | **Critic ranks** | Independent harsh review of the tiles. Rework anything it rejects BEFORE the user sees it. | `critic_prepare` → Agent `drip:critic` → `critic_record` |
| 5 | **User chooses** | Board link + one line per direction with the critic's score + your pick and its risk; ask with buttons. Chosen = locked. | `board_open` → AskUserQuestion → `board_choose` |
| 6 | **System** | DESIGN.md + tokens from the direction | `palette_generate` `palette_check` `fonts_pair` `fonts_preview` → `drip_mark system` |
| 7 | **Build** | Proven components restyled; real copy and imagery; one signature move | `components_*` `icons_*` `images_*` `gen_image` `gradient_mesh` |
| 8 | **Check** | Screenshots, self-critique, then the critic until PASS (max 3 rounds) | `fitcheck_shot` `fitcheck_compare` `fitcheck_lint` → critic → `fitcheck_done` |
| 9 | **Hand-off** | Screenshots, critic verdict in its own words, what's left | `drip_end` |

**Logo mode**: intake → refs → 8-12 one-sentence concepts → `logo_sheet` → critic ranks → refine top 2-3 in black first → `logo_test` → critic → user picks → lockups. Read `drip_guide logo`.
**Polish mode** (quick): read the listed guides → change → `fitcheck_lint` (+ `fitcheck_shot`) → `fitcheck_done`.
**Refs / board only**: stop after the summary / the board and offer the next step.

## The critic
`critic_prepare` renders the work to files and returns a prompt; launch `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })` **with that prompt unchanged**; no defence of the work, no context about effort. Record with `critic_record`, show the user its words. Self-critique before calling it; it's the independent second opinion, not a substitute for looking.

## Rules you must not break
1. **Ambition is bold by default** (`drip_guide rules/ambition`). The safe default (cream + terracotta + serif, centred hero + 3 cards, neon-on-black, gradients, Inter) is a failure unless the user asked for plain.
2. Read a craft's guide (`drip_guide <topic>`) before doing that craft. Skimming this file is not reading.
3. Studying means looking closely: pick, view full size, zoom into details, write values. A contact sheet is not research.
4. Options differ in idea, not palette. Equal fidelity, no strawmen.
5. Follow an existing system unless it's a redesign; say so if you change it. Chosen = locked; never "improve" a user's pick without asking.
6. Real content only: no lorem, fake stats, fake logos or placeholder boxes.
7. Contrast passes (`palette_check`); every control has hover, press, focus-visible, disabled.
8. Talk like `rules/communication`: decisions first, short, show don't tell, one question with buttons.
9. Never call `drip_skip` on your own.

Worked examples (read the one that matches before you start): `drip_guide examples/portfolio`, `examples/logo`, `examples/adapt`, `examples/lazy-run`.

Craft guides: brief · refs · moodboard · direction · system · color · type · layout · landing · app · mobile · components · interaction · motion · imagery · productshots · icons · copy · a11y · fitcheck · polish · logo · adapt. Shared rules: `rules/ambition`, `rules/communication`, `rules/hard-rules`, `rules/slop-tells`, `rules/per-surface`, `rules/licences`.
