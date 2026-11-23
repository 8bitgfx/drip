---
name: drip-icons
description: Use when adding, choosing or fixing icons in a UI (icon libraries like Lucide, Phosphor, Tabler, Heroicons, icon buttons, toolbars, nav icons, feature icons, brand logos for integrations), or when a screen uses emoji as icons, mixes icon sets, or has an icon on every heading. Part of Drip.
user-invocable: false
---

# Icons (Drip)

**Before you do anything: call `drip_guide` with topic `icons`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. One icon family per project, chosen once and written in `DESIGN.md`. If the project already uses one, keep it. Brand marks (Simple Icons) are the only second source.
2. Never emoji, Unicode symbols or text glyphs (★ ✓ → ⚙) as icons. Use the family, or no icon.
3. Sizes on the family's grid: 16, 20, 24 (32-48 only for empty states and feature art). Never an odd scale like 19px or 22px.
4. Stroke follows the text beside it: 1.5 next to regular 14-16px text, 2 next to medium/semibold, one stroke width per surface.
5. Icons are `currentColor`. State changes the colour; selected may swap outline to filled. Never hard-coded fills.
6. Every icon-only control has an accessible name (`aria-label` or visually hidden text) and a hit area of 44x44 on touch, 24x24 minimum. Decorative icons get `aria-hidden="true"`.
7. Label icons in navigation and toolbars unless the meaning is universal (search, close, menu, more, back). An unlabeled icon needs a tooltip and a name.
8. No icon in a tinted rounded square above every feature card, no icon on every heading, bullet or KPI label. An icon must carry meaning or be the control.
9. One meaning, one icon: the same action uses the same glyph everywhere; no glyph means two things.
10. Align icons to the first line of text (optical centre on the cap height), with a 6-8px gap at 16px text.
11. No arrow icon glued after button or link text, except `↗`-style external link marks and real next/previous controls.

## Tools
- `icons_search` — find icons by meaning within the chosen family (Iconify sets: Lucide, Phosphor, Tabler, Heroicons, Radix, Material Symbols, Simple Icons for brands).
- `icons_get` — fetch the SVG of a chosen icon, ready to inline or import.
- `fitcheck_shot` — check icon size, alignment and weight at real size on phone and desktop.
- `fitcheck_lint` — catches emoji used as icons and the sparkles tell.

## Read deeper when
| Situation | Call |
|---|---|
| Choosing a family, or mapping common actions to icon names | `drip_guide icons/families` |
| Icon buttons, focus, hit areas, names | `drip_guide a11y` |
| Press and hover feel of icon buttons | `drip_guide interaction` |
| Pictures, illustration or spot art bigger than an icon | `drip_guide imagery` |
| Labels and accessible names that go with icons | `drip_guide copy` |
