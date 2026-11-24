---
name: drip
description: Use when the user asks for Drip (/drip:design) or for a real design process on visual work ("design this properly", "with references / a moodboard", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: intake questions, studied references, critic-ranked directions, a system, the build, and an independent harsh critic before hand-off. While a Drip task is open its hooks enforce the loop.
user-invocable: false
---

# Drip

**0. Load the tools.** In Codex, use the Drip MCP server's tools: `drip_start`, `drip_brief`, `drip_status`, `drip_guide`, and the others as steps need them. If they are missing, check whether Drip is installed and start a new session. In Claude Code they are deferred: load them in ONE call, ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_brief,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__refs_site,mcp__plugin_drip_drip__refs_search,mcp__plugin_drip_drip__refs_tag,mcp__plugin_drip_drip__refs_gallery,mcp__plugin_drip_drip__refs_view,mcp__plugin_drip_drip__refs_study,mcp__plugin_drip_drip__board_create,mcp__plugin_drip_drip__board_directions,mcp__plugin_drip_drip__board_tile,mcp__plugin_drip_drip__board_choose,mcp__plugin_drip_drip__board_plan,mcp__plugin_drip_drip__critic_prepare,mcp__plugin_drip_drip__critic_record,mcp__plugin_drip_drip__drip_kit,mcp__plugin_drip_drip__fonts_compare,mcp__plugin_drip_drip__palette_check,mcp__plugin_drip_drip__components_find,mcp__plugin_drip_drip__images_search,mcp__plugin_drip_drip__fitcheck_shot,mcp__plugin_drip_drip__fitcheck_done,mcp__plugin_drip_drip__drip_end,mcp__plugin_drip_drip__drip_search,mcp__plugin_drip_drip__drip_execute`. One call, not fifteen; load others only when a step needs them (`+drip logo`, `+drip execute` for Code Mode). If nothing loads, tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. It picks the mode (design · logo · refs · board · polish) and returns what you need now; the rest arrives when it is used.

**Always ask: what matters here?** What does the user want, and what will they be excited to see? Put the effort there (the product working, the real work big, a visualisation, an interaction, a great footer) and skip trivia nobody looks at. Think creatively; take decisions from the references, never their surface.

**The page loop:**
1. Intake: only what the request leaves open (often nothing) → `drip_brief`. A redesign of a weak site: fresh look or keep the brand.
2. References by role BEFORE any comp: competitors (their shipped sites), the same kind of page, the style you aim for. Scouts can do this in Swarm Mode.
3. Directions: 3 different ideas, each saying what it takes from which reference → critic ranks, weak ones dropped → show the user the two best comps → `board_choose`.
4. Design system (after the pick): `drip_kit` → DESIGN.md; on a big project a living system page (`drip_kit template "system"`).
5. Plan with `board_plan`: each section's idea, form, the move it takes from a studied reference, its picture source, two or three eye-candy moments, the footer. Then `components_find` and the picture tools for the parts.
6. Hero first → `fitcheck_shot({ hero: true })`; re-checks with `numbersOnly`.
7. Sections → `fitcheck_shot` (the page gate) → the critic → `fitcheck_done` → `drip_end`.

**Work in batches: every call does several things.** Speed and tokens come from fewer, fuller calls:
- One tool, many items: `refs_site` with 3-4 URLs, `refs_view` with several shots, `refs_study` with every study, `fonts_compare` with 4 faces, `palette_check` with every pair, `fitcheck_shot({ urls: [...] })` with every state or page, `critic_prepare` with every state as `targets`.
- Different tools at once: Code Mode is the default. `drip_execute` runs one script of `await drip.<tool>(args)` calls (`drip_search` gives signatures) and returns only what matters: fonts × palettes, several sites studied, every page checked. Independent tool calls go in one message.
- Swarm Mode is on by default: scouts gather references, builders make sections, the checker re-checks, while you direct.
- Re-checks use `numbersOnly`; full screenshots only for the page gate and the critic.

**Tools that save time** (load with `+drip <name>` in Claude Code):
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
