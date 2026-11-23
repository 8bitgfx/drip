---
description: Fit check a page — screenshots, compare with the direction, slop lint, honest scores
argument-hint: <page URL, e.g. http://localhost:3000>
---
Fit check: $ARGUMENTS

First make the Drip tools callable: if `drip_start` is not in your tools, run ToolSearch with `select:mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_status` (load other `mcp__plugin_drip_drip__*` tools the same way when a step needs them). If nothing loads, tell me to run `/mcp` and reconnect `plugin:drip:drip`; do not continue without the tools. Load the fit-check tools too: ToolSearch `+drip fitcheck`.

Call `drip_guide` with topic `fitcheck`. Then `fitcheck_shot` on the URL, `fitcheck_compare` against the chosen direction (if there is one), `fitcheck_lint` on the changed files. Score honestly 1-5 on every axis as a design director who did not build it, list the problems by impact, fix them, shoot again, and record the result with `fitcheck_done`.
