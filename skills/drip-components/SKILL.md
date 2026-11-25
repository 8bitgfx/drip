---
name: drip-components
description: Rules for pieces and components of a UI - buttons, inputs, dialogs, menus, tables, tabs, toasts, command palettes, animated text and hero effects, and choosing or installing libraries such as shadcn/ui, Radix, Base UI, React Aria, Magic UI or Aceternity. Use when adding, restyling or writing one.
user-invocable: false
---

# Components (Drip)

Applies whenever a piece is chosen, installed, restyled or written. Call `drip_guide components` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Look at the project first (`components_local_find`), then outside (`components_find`); hand-roll only when nothing fits, and say why.
- Behaviour from an accessible primitive (Radix, Base UI, React Aria, Ark); never a dialog, menu, select, combobox, tooltip or date picker from scratch.
- Restyle every piece to the project's tokens before it ships; library defaults are a slop tell.
- Variants describe intent (`primary`, `ghost`, `danger`); one library per job.
