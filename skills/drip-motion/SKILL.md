---
name: drip-motion
description: Motion rules - whether something should move, which property, curve and duration, springs, enter and exit, staggers, scroll effects, reduced motion and the frame budget. Use when adding, tuning or reviewing animation or transitions, or when motion feels janky or slow.
user-invocable: false
---

# Motion (Drip)

Applies to every animation and transition. Call `drip_guide motion` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Decide whether it should move before choosing a curve; name its purpose in one word or do not build it.
- Animate `transform` and `opacity`; never `transition: all`; never `ease-in` on UI.
- UI motion stays at 100-300ms, exits faster than enters; never enter from `scale(0)`.
- Product UI: nothing animates on scroll. Ship `prefers-reduced-motion` with the animation.
