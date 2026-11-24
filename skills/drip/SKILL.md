---
name: drip
description: Use when the user asks for Drip (/drip:design) or for a real design process on visual work ("design this properly", "with references / a moodboard", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: intake questions, studied references, critic-ranked directions, a system, the build, and an independent harsh critic before hand-off. While a Drip task is open its hooks enforce the loop.
user-invocable: false
---

# Drip

**0. Load the tools.** In Codex, use the `drip_start`, `drip_brief`, `drip_status` and `drip_guide` tools from the Drip MCP server. If they are missing, check whether Drip is installed and start a new session. In Claude Code the tools are deferred: ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_brief,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide`. Load others when a step needs them (`+drip refs`, `+drip board`, `+drip critic`, `+drip fitcheck`, `+drip kit`, `+drip logo`, `+drip execute` for Code Mode). If nothing loads, tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. It picks the mode (design · logo · refs · board · polish) and returns the one guide you need in full: the **playbook** for pages, the logo guide for logos. Read it once, properly; it is short because every line is load-bearing. Then follow its NEXT line. Lost? `drip_status`.

**The page loop** (about 25 calls):
1. Intake: one question round, material first → `drip_brief`.
2. Look: `refs_site` on 3-4 shipped sites → `refs_study`, both batched.
3. Directions: `board_create` → `board_directions` (2 first-viewport comps) → critic ranks → `board_open` → user picks → `board_choose`.
4. System: `drip_kit` → DESIGN.md → `drip_mark system`.
5. Hero first: nav + hero → `fitcheck_shot({ hero: true })`.
6. Sections in plan order → `fitcheck_shot` (the page gate) → the critic once, plus one confirming round → `fitcheck_done` → `drip_end`.

**Tools that save time** (load with `+drip <name>` in Claude Code):
- **Code Mode:** `drip_search` returns tool signatures; `drip_execute` runs one sandboxed script of `await drip.<tool>(args)` calls. Use it whenever you'd make 5+ calls in a row (compare palettes and font pairs, study several sites, check several pages) and return only what matters.
- `components_local_find` / `components_plan`: the project's own components before new ones (a gate asks for it when the project has components). `drip_check({ changed: true })`: the project's lint, types and tests plus the slop lint, before `fitcheck_done`.
- `pattern_study` → build → `pattern_compare`: when the user points at a component or page to match (measured spec, pixel diff, axe).
- `art_generate`, `shader_hero`, `scene_render`: original art and backgrounds instead of stock. `refs_gallery`: Awwwards, Godly, One Page Love and more beside Dribbble.
- `feedback_record`: every reaction the user gives, so the project's memory learns it.
- `drip_serve` / a local `.html` path in `fitcheck_shot`: no dev server needed.
- `fitcheck_shot({ steps })`: interactions (drag, click, type, key) captured as states for you and the critic.
- `drip_compare`: before / after, build vs comp, us vs competitors, on one sheet.
- `board_brand`: the brand on one board. `drip_kit({ template })`: base CSS, DESIGN.md, comp, brand-board templates.
- `images_save({ slots })`: web-ready crops (WebP, focal point, size budget) + `<picture>`. `gradient_mesh`: licence-free backgrounds. `components_find({ kind: "background" })`: hero effects.
- `optical_center`: where the eye puts the centre of a mark or object, and its pivot. `logo_export`: favicons and app icons.

**The critic.** `critic_prepare` returns a prompt. In Codex, launch the `drip-critic` custom agent with that prompt unchanged. If the agent is missing, follow the Codex critic setup in `docs/HOSTS.md`. In Claude Code, launch `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })`. Give the critic only the prepared prompt. Record the verdict with `critic_record`, and show the user its words.

**Never:**
- the safe default (cream + terracotta + serif, neon on black, gradients, Inter, a hero + 3 cards) unless the user asked for plain;
- invented facts;
- `drip_skip` on your own.

Deep guides are on demand (`drip_guide <topic>`):
- type
- color
- layout
- landing (its sections and pricing)
- motion
- imagery
- productshots
- icons
- copy
- app
- mobile
- components
- a11y
- logo
- adapt
- patterns (match a reference)
- studio (original art)
- moodboard (project memory)
- readme
- examples/portfolio
