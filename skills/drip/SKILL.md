---
name: drip
description: Use when the user asks for Drip (/drip:design) or for real design work on visual UI ("design this properly", "make it beautiful", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: it looks at proven work, deals a layout, palette and type, builds with ready-made parts and parallel builders, measures the page and gets an independent critic before hand-off. While a Drip task is open its hooks enforce the checks.
user-invocable: false
---

# Drip

**0. Load the tools.** In Codex, use the Drip MCP server's tools: `drip_start`, `drip_status`, `drip_guide`, and the others as steps need them. If they are missing, check whether Drip is installed and start a new session. In Claude Code they are deferred: load them in ONE call, ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_end,mcp__plugin_drip_drip__refs_gallery,mcp__plugin_drip_drip__refs_site,mcp__plugin_drip_drip__layout_deal,mcp__plugin_drip_drip__parts_list,mcp__plugin_drip_drip__parts_preview,mcp__plugin_drip_drip__parts_get,mcp__plugin_drip_drip__images_search,mcp__plugin_drip_drip__images_save,mcp__plugin_drip_drip__icons_search,mcp__plugin_drip_drip__drip_kit,mcp__plugin_drip_drip__fitcheck_shot,mcp__plugin_drip_drip__build_prepare,mcp__plugin_drip_drip__page_stitch,mcp__plugin_drip_drip__critic_prepare,mcp__plugin_drip_drip__critic_record,mcp__plugin_drip_drip__drip_execute,mcp__plugin_drip_drip__drip_search`. One call, not fifteen. If nothing loads, tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. Design work runs the **fast loop**: it returns the short guide and the first calls.

**The job:** your own cooler, cleaner take on designs that are already proven (the heroes people save on Dribbble and Awwwards), the way expensive product designers work. Never chase "unique": unique is usually ugly. A page in about 10 minutes.

**The fast loop:**
1. Look: `refs_gallery` (or `refs_site` on 3-4 shipped sites), one call.
2. Deal: `layout_deal({ kind, trade, has })`: hero layout with exact sizes, palette, type, nav, footer, buttons.
3. Parts: `parts_list` → `parts_preview` (several at once) → `parts_get`; pictures with ONE `images_search({ queries: [...] })`; real icons with `icons_search`.
4. Hero: nav + hero with `drip_kit` and the dealt set, an entrance on load → `fitcheck_shot({ url, hero: true })`.
5. Sections in parallel: one `build_prepare` + one `drip:builder` Agent per section, all in ONE message (each writes `sections/<id>.html` + `styles/sections/<id>.css`) → `page_stitch`.
6. Check once: `fitcheck_shot({ url })` (one sheet per size; a clean shot records the check), fix blockers, re-check with `numbersOnly`.
7. Critic once: `critic_prepare({ kind: "build", targets: [every state] })` → Agent drip:critic → `critic_record`, fix its top fixes → `drip_end`.

**Every call does several things.** One tool, many items (`refs_site` with 4 URLs, `parts_preview` with 6 parts, `images_search` with 4 queries, `fitcheck_shot({ urls })` with every state). Independent calls in one message. For anything else, Code Mode: `drip_search` finds any Drip tool (there are ~120; only the fast loop's are listed), `drip_execute` runs a script of `await drip.<tool>(args)` calls and returns only what matters.

**The critic.** `critic_prepare` returns a prompt. In Codex, launch the `drip-critic` custom agent with that prompt unchanged. If the agent is missing, follow the Codex critic setup in `docs/HOSTS.md`. In Claude Code, launch `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })`. Give the critic only the prepared prompt. Record the verdict with `critic_record`, and show the user its words.

**The full process** (intake, references by role, three comps on a board, a design system, a section plan, two critic rounds) is for big brand projects or when the user asks for it: `drip_start({ task, loop: "full" })`, then follow `drip_status`. Logos: `drip_start` with mode `logo`.

**Never:**
- purple-blue "AI" gradients, glass on every card, a hero plus three icon cards with nothing to look at, a shouting poster or abstract art where the product should be (unless the user asked for loud);
- invented facts;
- `drip_skip` on your own.

Deep guides on demand (`drip_guide <topic>`): fast, playbook, type, color, layout, landing, motion, imagery, icons, copy, app, mobile, components, a11y, logo, examples/gold.
