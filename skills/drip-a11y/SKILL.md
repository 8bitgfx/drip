---
name: drip-a11y
description: Use when building or reviewing any interactive UI for accessibility (contrast, focus rings, keyboard navigation, screen readers, ARIA, form labels and errors, reduced motion, touch target size, alt text, WCAG 2.2 AA), or when code removes outlines, uses clickable divs, placeholder-only inputs or colour-only status. Part of Drip.
user-invocable: false
---

# Accessibility (Drip)

**Before you do anything: call `drip_guide` with topic `a11y`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Contrast (WCAG 2.2 AA): body text 4.5:1; large text (24px, or 18.66px bold) 3:1; icons, focus rings, input borders and chart marks 3:1. Check every pair with `palette_check`.
2. Every focusable element shows a `:focus-visible` ring: 2px solid, 2px offset, 3:1 against its surroundings, instant (never animated). Never `outline: none` without a replacement.
3. Everything works by keyboard: Tab order follows visual order, Enter/Space activate, Escape closes overlays, focus never gets trapped (except inside an open modal) and never lands behind a sticky header. No `tabindex` above 0.
4. Native first: `<button>` for actions, `<a href>` for navigation, `<label>` for inputs, `<dialog>` for modals, real headings and lists. ARIA only fills gaps, and no ARIA beats wrong ARIA.
5. Every input has a visible `<label>` tied by `for`/`id`. Errors are text next to the field, linked with `aria-describedby`, flagged with `aria-invalid="true"`, announced, and never shown by colour alone.
6. Icon-only controls have an accessible name that says the action ("Close dialog", "Delete invoice").
7. Touch targets 44x44 CSS px on touch screens; never under 24x24 (WCAG 2.2 AA), with 8px between neighbours.
8. Respect `prefers-reduced-motion`: no parallax, no auto-scrolling, no large movement; keep state changes as fades or instant swaps. Anything moving longer than 5 seconds has a pause control.
9. Meaningful images get alt text that says what they tell; decorative images get `alt=""`. No text baked into images.
10. Never colour alone: status, errors, links in body text and chart series also differ by text, icon, underline or shape.
11. One `<h1>`, headings in order without skips, landmarks (`header`, `nav`, `main`, `footer`), `lang` on `<html>`, a page `<title>`, a skip link on pages with navigation.
12. Works at 200% zoom and at 320px wide with no lost content and no sideways scroll.

## Tools
- `palette_check` — contrast of every text/background and UI pair in the palette, with the failing pairs named.
- `palette_generate` — rebuild a ramp so the steps you need for text and borders pass.
- `fitcheck_lint` — catches removed outlines without focus-visible, light grey text, placeholder-only patterns it can see.
- `fitcheck_shot` — phone and desktop screenshots to check focus visibility, target sizes and reflow.
- `components_find` — accessible primitives (dialog, menu, combobox, tabs) instead of hand-rolled widgets.

## Read deeper when
| Situation | Call |
|---|---|
| Testing a screen end to end, or patterns for dialogs, menus, tabs, comboboxes | `drip_guide a11y/checklist` |
| Error, empty and label wording | `drip_guide copy/microcopy` |
| Reduced motion alternatives for an animation | `drip_guide motion` |
| Contrast-safe palettes and dark mode | `drip_guide color` |
| Touch, safe areas and mobile input quirks | `drip_guide mobile` |
