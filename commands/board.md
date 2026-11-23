---
description: Build a moodboard with 2-3 design directions to choose from
argument-hint: <what the board is for>
---
Build a moodboard for: $ARGUMENTS

First make the Drip tools callable: if `drip_start` is not in your tools, run ToolSearch with `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_status` (load other `mcp__plugin_drip_drip__*` tools the same way when a step needs them). If nothing loads, tell me to run `/mcp` and reconnect `plugin:drip:drip`; do not continue without the tools. Load the refs and board tools too: ToolSearch `+drip refs` and `+drip board`.

Call `drip_guide` with topic `moodboard` and follow it. Gather and study references (`drip_guide refs`), `board_create`, `board_add` each with a specific note, `board_directions` into 2-3 genuinely different directions, then `board_open` and show it to me: publish the shareable board file as an artifact if you can, otherwise give me the live link. Recommend one direction with a reason, then wait for my choice.
