---
name: drip-a11y
description: Accessibility rules for interactive UI - contrast, focus rings, keyboard use, screen readers, ARIA, form labels and errors, reduced motion, touch targets, alt text and WCAG 2.2 AA. Use when building or reviewing a UI, or when code removes outlines, uses clickable divs, placeholder-only inputs or colour-only status.
user-invocable: false
---

# Accessibility (Drip)

Applies to every interactive UI. Call `drip_guide a11y` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Body text 4.5:1; large text and UI parts 3:1. Check every pair with `palette_check`.
- Every focusable element shows a `:focus-visible` ring: 2px solid, 2px offset, 3:1, instant. Never `outline: none` without a replacement.
- Native first: `<button>`, `<a href>`, `<label>`, `<dialog>`; ARIA only fills gaps.
- Touch targets 44x44 CSS px (never under 24x24); reduced motion handled; never colour alone.
