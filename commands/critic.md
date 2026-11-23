---
description: Brutally honest, independent design review of a page, screenshot, logo or file
argument-hint: <URL, file or image path, plus optional context>
---
Critique: $ARGUMENTS

1. If the Drip tools aren't callable, run ToolSearch `select:mcp__plugin_drip_drip__critic_prepare,mcp__plugin_drip_drip__critic_record,mcp__plugin_drip_drip__fitcheck_shot`.
2. Call `critic_prepare` with the target (URL, file path(s) or image path(s)) and any brief I gave. It screenshots or renders the target to image files and returns the exact prompt for the critic.
3. Launch the **drip:critic** subagent (Agent tool, `subagent_type: "drip:critic"`) with that prompt. Do not add your own opinion, context about how it was made, or excuses; the critic must judge only what it sees.
4. Record the verdict with `critic_record`, then show me the critic's review verbatim (scores, ranking, worst problem, fixes), followed by at most 3 lines of yours: which fixes you'd do first. Ask before changing anything.
