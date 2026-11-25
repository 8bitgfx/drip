---
name: drip-polish
description: Final details pass on UI before it ships - shadows and borders, nested radius, optical alignment, tabular numbers, text wrapping, image outlines, focus rings, and empty, loading, error and long-content states. Use when something feels off, looks cheap or isn't crisp.
user-invocable: false
---

# Polish (Drip)

Applies to a built UI, before the fit check. Call `drip_guide polish` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Polish refines; it never redesigns. A wrong value repeated in three places becomes a token.
- Nested radii are concentric: outer radius = inner radius + padding.
- Borders for structure, layered transparent shadows for elevation; one elevation scale.
- Changing numbers use `tabular-nums`; every data view has designed empty, loading, error and long-content states.
