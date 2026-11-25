---
name: drip
description: Use when the user asks for Drip (/drip:design) or for real design work on visual UI ("design this properly", "make it beautiful", "make it not look AI-made", "make me a logo") — a page, screen, site, dashboard, component, logo or redesign in any stack. Drip is the design director: it looks at proven work, deals a layout, palette and type, builds with ready-made parts and parallel builders, measures the page and gets an independent critic before hand-off. While a Drip task is open its hooks enforce the checks.
user-invocable: false
---

# Drip

**0. Load the tools.** In Codex, use the Drip MCP server's tools: `drip_start`, `drip_status`, `drip_guide`, and the others as steps need them. If they are missing, check whether Drip is installed and start a new session. In Claude Code they are deferred: load them in ONE call, ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_end,mcp__plugin_drip_drip__refs_gallery,mcp__plugin_drip_drip__refs_site,mcp__plugin_drip_drip__layout_deal,mcp__plugin_drip_drip__pieces_install,mcp__plugin_drip_drip__pieces_preview,mcp__plugin_drip_drip__drip_film,mcp__plugin_drip_drip__drip_kits,mcp__plugin_drip_drip__drip_serve,mcp__plugin_drip_drip__components_find,mcp__plugin_drip_drip__components_get,mcp__plugin_drip_drip__parts_list,mcp__plugin_drip_drip__parts_preview,mcp__plugin_drip_drip__parts_get,mcp__plugin_drip_drip__images_search,mcp__plugin_drip_drip__images_save,mcp__plugin_drip_drip__icons_search,mcp__plugin_drip_drip__drip_kit,mcp__plugin_drip_drip__fitcheck_shot,mcp__plugin_drip_drip__build_prepare,mcp__plugin_drip_drip__page_stitch,mcp__plugin_drip_drip__critic_prepare,mcp__plugin_drip_drip__critic_record,mcp__plugin_drip_drip__drip_execute,mcp__plugin_drip_drip__drip_search`. One call, not fifteen. If nothing loads, tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.

**1. `drip_start`** with the request. Design work runs the **fast loop**: it returns the short guide and the first calls.

**The job:** your own cooler, cleaner take on designs that are already proven (the heroes people save on Dribbble and Awwwards), the way expensive product designers work. Never chase "unique": unique is usually ugly. A page in about 10 minutes.

**Roles:** you (Opus) direct: look, decide, choose pieces, write specs, judge shots, small fixes. `drip:builder` agents (Sonnet) write the code, several in one message. `drip:helper` agents (Haiku) do small jobs. Big writes by you are refused with a pointer to `build_prepare`.

**Pieces, not hand-rolled parts:** `layout_deal` deals finished components from proven free libraries (Magic UI, React Bits, Cult UI, Smooth UI, Aceternity, efferd, Eldora, taste-skill) for every section. Each section is built on one, or says why it is custom. Software, gaming and tech pages are React + Tailwind so those pieces install as they are; products, services and places are one static page.

**The fast loop, in short passes the user can react to:**
- **Pass 1, the hero:** one message: `refs_gallery`, `layout_deal({ kind, trade, has, out: "<folder>" })`, `images_search` if needed. Choose the nav and hero pieces, `pieces_install` (React), ONE `build_prepare` and the builder. `drip_serve`, `fitcheck_shot({ url, hero: true })` once, fix what you see, show the user, stop (unless they asked for the whole page in one go).
- **Pass 2, the sections:** `pieces_install` once, ONE `build_prepare({ sections: [...] })`, every builder in ONE message → `page_stitch` → `fitcheck_shot({ url })` once (fix what matters in one pass, never chase 1-2% numbers) → show the page → `drip_end`.
- **The critic is a reality check at the final version** or when asked: `critic_prepare` → Agent drip:critic → `critic_record`. It is slow: what you can see, fix yourself.
- **Once per machine:** ask which paid UI kits the user owns (AskUserQuestion, multiSelect) and `drip_kits({ owned })`; `/drip:adapt` turns a kit into a niche pack.

**Every call does several things.** One tool, many items (`refs_site` with 4 URLs, `parts_preview` with 6 parts, `images_search` with 4 queries, `fitcheck_shot({ urls })` with every state). Independent calls in one message. For anything else, Code Mode: `drip_search` finds any Drip tool (there are ~120; only the fast loop's are listed), `drip_execute` runs a script of `await drip.<tool>(args)` calls and returns only what matters.

**The critic.** `critic_prepare` returns a prompt. In Codex, launch the `drip-critic` custom agent with that prompt unchanged. If the agent is missing, follow the Codex critic setup in `docs/HOSTS.md`. In Claude Code, launch `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })`. Give the critic only the prepared prompt. Record the verdict with `critic_record`, and show the user its words.

**The full process** (intake, references by role, three comps on a board, a design system, a section plan, one critic at the final version) is for big brand projects or when the user asks for it: `drip_start({ task, loop: "full" })`, then follow `drip_status`. Logos: `drip_start` with mode `logo`.

**Never:**
- purple-blue "AI" gradients, glass on every card, a hero plus three icon cards with nothing to look at, a shouting poster or abstract art where the product should be (unless the user asked for loud);
- invented facts;
- `drip_skip` on your own.

Deep guides on demand (`drip_guide <topic>`): fast, playbook, type, color, layout, landing, motion, imagery, icons, copy, app, mobile, components, a11y, logo, examples/gold.
