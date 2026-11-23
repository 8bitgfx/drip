---
name: drip
description: Use when the user asks for Drip (/drip:design) or for a real design process on visual work ("design this properly", "with references / a moodboard", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: intake questions, studied references, critic-ranked directions, a system, the build, and an independent harsh critic before hand-off. While a Drip task is open its hooks enforce the loop.
user-invocable: false
---

# Drip

**0. Load the tools** (they're deferred): ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_brief,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide`. Load others when a step needs them (`+drip refs`, `+drip board`, `+drip critic`, `+drip fitcheck`, `+drip kit`, `+drip logo`). If nothing loads, tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. It picks the mode (design · logo · refs · board · polish) and returns the one guide you need in full: the **playbook** for pages, the logo guide for logos. Read it once, properly; it is short because every line is load-bearing. Then follow its NEXT line. Lost? `drip_status`.

**The page loop** (about 25 calls):
1. Intake: one AskUserQuestion round, material first → `drip_brief`.
2. Look: `refs_site` on 3-4 shipped sites → `refs_study`, both batched.
3. Directions: `board_create` → `board_directions` (2 first-viewport comps) → critic ranks → `board_open` → user picks → `board_choose`.
4. System: `drip_kit` → DESIGN.md → `drip_mark system`.
5. Hero first: nav + hero → `fitcheck_shot({ hero: true })`.
6. Sections in plan order → `fitcheck_shot` (the page gate) → the critic once, plus one confirming round → `fitcheck_done` → `drip_end`.

**The critic.** `critic_prepare` returns a prompt. Launch `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })` with that prompt unchanged: no defence of the work, no context about effort. Record the verdict with `critic_record`, and show the user its words.

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
- examples/portfolio
