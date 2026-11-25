---
name: drip-layout
description: Layout rules - spacing, grids, containers, composition, alignment, hierarchy, density, responsive breakpoints, fluid sizing with clamp(), above-the-fold and whitespace. Use when laying out a page, screen or component, or when a layout feels cramped, empty, templated or off.
user-invocable: false
---

# Layout and spacing (Drip)

Applies to every page, screen and component. Call `drip_guide layout` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- One spacing scale on a 4px base: 4 8 12 16 24 32 48 64 96 128.
- Group by proximity: space between groups is at least 2x the space inside a group.
- One container width per page, the same side gutters top to bottom; every block starts on the container's left edge or a grid column.
- Mobile first: no horizontal scroll at 320px; `svh`/`dvh`, never `100vh`.
