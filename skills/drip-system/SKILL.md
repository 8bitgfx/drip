---
name: drip-system
description: Use when creating, extending or documenting a design system - DESIGN.md, design tokens, CSS variables, a Tailwind v4 @theme block, theming and dark mode wiring, radius/shadow/z-index/motion tokens - or when turning a chosen moodboard direction into tokens (step 6 of the Drip loop). Part of Drip.
---

# Design system (Drip)

**Before you do anything: call `drip_guide` with topic `system`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Look before you write: find the existing tokens (`globals.css`, `@theme`, `tailwind.config`, shadcn variables, theme files) first. Extend that system under its own names; never add a parallel set.
2. Never overwrite an existing `DESIGN.md`. Show it, then refresh or merge it with the user's say-so.
3. Three layers: primitive (`--rust-600`) -> semantic (`--accent`) -> component (`--button-bg`). Components read semantic tokens only; no raw hex, px colour or one-off shadow in a component.
4. Name tokens by role, never by value or look: `--text-muted`, not `--grey-500-text` or `--light-blue`. In `@theme inline` map them under a different name (`--color-fg-muted: var(--text-muted)`); a token that references its own name is a cycle.
5. One spacing scale on a 4px base (4 8 12 16 24 32 48 64 96 128). Any length off the scale needs a reason in a comment.
6. One radius family (3 steps + pill), one shadow ladder (3-4 steps), one z-index ladder (base 0, raised 10, dropdown 100, sticky 200, overlay 300, modal 400, toast 500, tooltip 600). Never `z-index: 9999`.
7. Motion is tokens too, the same set `drip_guide motion` uses: `--ease-out`, `--ease-in-out`, `--ease-drawer`, `--ease-enter` and durations 140 / 150 / 200 / 240 / 420ms. No `ease-in` on UI, no `transition: all`.
8. Themes remap semantic tokens only. Primitives never change between light and dark; components never know which theme is on.
9. Every text/surface pair in both themes passes `palette_check` (4.5:1 body, 3:1 large text and UI parts) before you call `drip_mark system`.
10. In Tailwind v4, never define `--spacing-<name>` (it breaks `max-w-*`, `w-*`); keep Tailwind's 4px spacing unit.
11. Only tokens that are used. A token nobody reads is noise; a value used 3+ times with the same intent becomes a token.
12. `DESIGN.md` states the rules in words with exact values in brackets; the token file is the single source of the values.

## Order of work
Read existing tokens -> take the board direction -> colour (`palette_generate`, `palette_check`) -> type (`fonts_pair`, `fonts_preview`)
-> space, radius, shadow, z, motion -> token file -> theming -> DESIGN.md -> one real fragment in both themes -> `drip_mark system`.
On a tweak (quick loop): read DESIGN.md and the token file, use what is there, add a token only for a truly new role.

## Tools
- `drip_status` — see whether the system step is still open and what comes next
- `palette_generate` — OKLCH ramps + light/dark semantic tokens + a Tailwind v4 `@theme` block from the direction's accent
- `palette_check` — contrast for every text/surface pair, both themes
- `fonts_pair`, `fonts_search`, `fonts_preview` — fill the type tokens (see `drip_guide type`)
- `components_find`, `components_get` — when the system will sit on a component library, read its variables first
- `drip_mark` with step `system` — after DESIGN.md and the token file are written and checked

## Read deeper when
| Situation | Call |
|---|---|
| Writing or refreshing DESIGN.md | `drip_guide system/design-md-template` |
| Naming tokens, the full token set, Tailwind v4 `@theme`, shadcn mapping | `drip_guide system/tokens` |
| Light/dark, brand themes, the toggle, no-flash script | `drip_guide system/theming` |
| Picking the palette | `drip_guide color` |
| Picking the type scale and fonts | `drip_guide type` |
| Spacing, grid and containers | `drip_guide layout` |
| Durations and easing choices beyond the tokens | `drip_guide motion` |
