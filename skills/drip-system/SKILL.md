---
name: drip-system
description: Design system rules - DESIGN.md, design tokens, CSS variables, Tailwind v4 @theme, theming and dark mode wiring, and radius, shadow, z-index and motion tokens. Use when creating, extending or documenting a system, or turning a chosen direction into tokens.
user-invocable: false
---

# Design system (Drip)

Applies to tokens, theming and DESIGN.md. Call `drip_guide system` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Look before you write: find the existing tokens and extend that system under its own names; never overwrite an existing `DESIGN.md`.
- Three layers: primitive, semantic, component. Components read semantic tokens only.
- Name tokens by role, never by value or look. One 4px spacing scale, one radius family, one shadow ladder, one z-index ladder.
- Themes remap semantic tokens only; every text/surface pair passes `palette_check` in both themes.
