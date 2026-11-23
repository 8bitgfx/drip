---
description: Drip status, API keys, niche packs, pause or stop the current task
---
If the Drip tools aren't callable, run ToolSearch `select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__keys_status,mcp__plugin_drip_drip__keys_open,mcp__plugin_drip_drip__pack_list,mcp__plugin_drip_drip__drip_skip,mcp__plugin_drip_drip__drip_end`.

Call `drip_status`, `keys_status` and `pack_list`, then show me a compact summary: the current task (one line, with the next step), which optional keys are set, and which niche packs exist. Then ask with buttons (AskUserQuestion) what I want:
- **Add API keys**: `keys_open`, then give me the link (keys are pasted into a local page, never into chat).
- **Turn checks off for this task**: `drip_skip` with reason "user chose it in /drip:settings".
- **End the current task**: `drip_end`.
- **Nothing**.
