---
description: Brutally honest, independent design review of a page, screenshot, logo, file, film or video
argument-hint: <URL, file, image or video path, plus optional context>
---
Critique: $ARGUMENTS

1. If the Drip tools aren't callable, run ToolSearch `select:mcp__plugin_drip_drip__critic_prepare,mcp__plugin_drip_drip__critic_record,mcp__plugin_drip_drip__fitcheck_shot`.
2. Call `critic_prepare` with the target and any brief I gave. Pick the kind from the target: a page or screen URL → "build"; a logo (SVG/PNG of a mark) → "logo"; a film composition or a video file (.mp4/.webm/.mov) → "motion" (it shoots timestamped frame sheets and transition strips); anything else → "any". It renders the target to image files and returns the exact prompt for the critic.
3. Launch the **drip:critic** subagent (Agent tool, `subagent_type: "drip:critic"`) with that prompt. Do not add your own opinion, context about how it was made, or excuses; the critic must judge only what it sees.
4. Record the verdict with `critic_record`, then show me the critic's review verbatim (scores, ranking, worst problem, fixes), followed by at most 3 lines of yours: which fixes you'd do first. Ask before changing anything.
