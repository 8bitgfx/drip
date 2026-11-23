---
description: Design anything with Drip — a page, app screen, logo, redesign, polish pass, or just references / a moodboard
argument-hint: <what you want, e.g. "portfolio for Claude", "logo for my bakery", "polish the navbar">
---
Design request: $ARGUMENTS

1. **Load Drip's tools.** If `drip_start` isn't callable, run ToolSearch `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_brief,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_status` (load other `mcp__plugin_drip_drip__*` tools the same way when a step needs them, e.g. ToolSearch `+drip refs`). If nothing loads, tell me to run `/mcp` and reconnect `plugin:drip:drip`, and stop.
2. **Load the `drip` skill** (the design director) and follow it exactly.
3. **Pick the mode from my words**: full design (new page, screen, site, logo, redesign), quick (polish or tweak existing UI), references only, or moodboard only. Call `drip_start` with the request and the mode.
4. **Ask me first** (unless the request is a tiny tweak or I said "just do it"): one round of up to 4 clickable questions (AskUserQuestion), the way the `drip` skill says. Record the answers with `drip_brief`.
5. **Aim high.** Unless I asked for plain or conservative, the result must be distinctive and memorable, never the safe default. The critic will reject boring work.
6. Talk to me the Drip way: short, decisions first, pictures and links instead of paragraphs, one question at a time with buttons.
