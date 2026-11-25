---
name: drip-fitcheck
description: Review rules for built UI - judging from real screenshots at phone and desktop, self-critique with a lint and eight scores, and the independent drip:critic. Use after building or changing UI, or when asked to critique, review or QA a design.
user-invocable: false
---

# Fit check (Drip)

Applies after any UI change and to every review request. Call `drip_guide fitcheck` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Never judge from code: `fitcheck_shot` at phone and desktop, and look at every screenshot.
- Self-critique first: `fitcheck_lint`, the genre's `breaks_if` list, the slop list, 8 honest scores.
- When the critic runs, its prompt goes unchanged, its words are recorded, and the work is never defended to it; at most 3 rounds.
- Fix by severity, S0 and S1 first; never fix by adding decoration. The chosen direction is locked.
