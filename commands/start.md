---
description: Design something with Drip — new page, component, redesign, or a polish pass
argument-hint: <what to design, e.g. "pricing page for a dev tool" or "polish the navbar">
---
Design with Drip: $ARGUMENTS

First make the Drip tools callable: if `drip_start` is not in your tools, run ToolSearch with `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_status` (load other `mcp__plugin_drip_drip__*` tools the same way when a step needs them). If nothing loads, tell me to run `/mcp` and reconnect `plugin:drip:drip`; do not continue without the tools.

Then load the `drip` skill (it is the design director) and follow it: call `drip_start` with this task plus context from the project and conversation (new UI or a redesign = full loop; a polish pass or tweak = size "quick"), read every guide it lists with `drip_guide`, and do the steps in order. Use `drip_status` whenever you are unsure what is next. When the work is done and fit-checked, `drip_end`.
