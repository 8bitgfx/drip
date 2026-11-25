---
name: drip
description: Use when the user asks for Drip (/drip:design) or for real design work on visual UI ("design this properly", "make it beautiful", "make it not look AI-made", "redesign this page", "make me a logo"): a landing page, app screen, site, dashboard, component or logo, in any stack. Drip is the design director: it looks at proven work, deals a layout, palette and type, builds from finished library pieces with parallel builders, and checks the result.
user-invocable: false
---

# Drip

1. **Load the tools in one call.** ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide`. `drip_start` names the rest for the loop it picks. Nothing loads: tell the user to reconnect `plugin:drip:drip` in `/mcp`, and stop.
2. **`drip_start({ task })`** with the request in the user's words. It returns the task, the first calls, and two guides: `taste.md` (what good looks like) and the loop (`fast.md` for pages; the full playbook for brand work, logos or when asked). Read both; they are the instructions.
3. **Follow the first calls.** Lost at any point: `drip_status` shows what is done and the exact next call.
4. **Finish with `drip_end`.**

Other hosts (Codex and others): `docs/HOSTS.md`. Topic guides on demand: `drip_guide type | color | layout | motion | imagery | icons | copy | landing | app | mobile | a11y | logo`.
