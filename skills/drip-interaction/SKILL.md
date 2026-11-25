---
name: drip-interaction
description: Interaction rules - hover, press, focus-visible, disabled, loading and selected states, tooltips, popovers, menus, dialogs, drag, feedback, optimistic updates, undo, forms and validation. Use when building or reviewing how UI responds to people, or when it feels unresponsive or laggy.
user-invocable: false
---

# Interaction (Drip)

Applies to every control and overlay. Call `drip_guide interaction` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Every interactive element has default, hover, active, focus-visible and disabled states; async controls add loading, toggles add selected.
- Visible feedback within 100ms of every press; hover effects only under `(hover: hover) and (pointer: fine)`, and nothing is reachable only by hover.
- Popovers, menus and tooltips scale from their trigger; modals stay centred; Escape closes the topmost overlay.
- Prefer optimistic updates with undo over confirmation dialogs.
