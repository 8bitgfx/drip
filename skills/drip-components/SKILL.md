---
name: drip-components
description: Use when building, adding or refactoring any UI component - button, input, dialog, menu, table, card, tabs, toast, drawer, command palette, date picker, chart, animated text or hero effect - or when choosing or installing a component library (shadcn/ui, Radix, Base UI, React Aria, coss ui, Kibo UI, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI). Part of Drip; covers finding a proven component first, restyling it to the project's tokens, and designing variants, sizes, states and APIs that last.
user-invocable: false
---

# Components (Drip)

**Before you do anything: call `drip_guide` with topic `components`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Look at this project first: `components_local_find` for every component you are about to write; reuse or extend what exists. Then search outside: `components_find` for every component with behaviour (focus, keyboard, overlays, selection, drag). Hand-roll only when nothing fits, and say why.
2. Read the code before installing (`components_get`). Reject components with `<div onClick>`, missing keyboard support, `transition-all`, or a licence you cannot ship.
3. Behaviour from an accessible primitive (Radix, Base UI, React Aria, Ark); look from the project's tokens. Never build a dialog, menu, select, combobox, tooltip or date picker from scratch.
4. Restyle every installed component to the project's tokens before it ships. Library defaults (zinc greys, `rounded-md` everywhere, stock shadows, stock focus ring) are a slop tell.
5. No raw hex, px radii or one-off shadows inside components: colours, radii, shadows, spacing and motion come from tokens (`drip_guide system`).
6. Every component ships its full state set: default, hover, active, focus-visible, disabled, plus loading / selected / invalid where they apply (`drip_guide interaction`).
7. Variants describe intent (`primary`, `secondary`, `ghost`, `danger`), not looks (`blue`, `rounded`). At most one primary action per view.
8. Sizes are a closed set (`sm` 32px, `md` 36-40px, `lg` 44-48px) where height, padding, font size, icon size and radius change together.
9. One library per job. Don't mix two button systems or two toast libraries; effect libraries (Magic UI, Aceternity, React Bits) supply one signature moment per page at most, never app chrome.
10. APIs: pass through native props and `className`, accept `ref`, expose state as `data-*` attributes, support controlled and uncontrolled use, compose with `asChild`/`render` instead of boolean-prop explosions.
11. Components survive real content: long text, empty values, 0 and 1,000,000, RTL, 200% zoom.

## Which library for what (short)
| Need | Reach for |
|---|---|
| Base components (React + Tailwind) | shadcn/ui or coss ui, on Radix / Base UI |
| Complex inputs, dates, a11y-critical | React Aria Components |
| Toasts / drawers / command palette | Sonner / Vaul / cmdk |
| Tables, kanban, dropzones, AI inputs | TanStack Table, Kibo UI |
| Subtle product motion | Motion Primitives, Animate UI |
| One marketing signature moment | Magic UI, Aceternity, React Bits (licence: check), Cult UI |

## Tools
- `components_local_find` — the project's OWN components first (props, variants, usage, file:line) plus approved patterns. `components_index` refreshes the index (the others do it for you).
- `components_plan` — a page as sections, product components and primitives: what to reuse, what is new, card-grid and needless-abstraction warnings.
- `components_preview` — one component alone: sizes, states, keyboard walk, stress cells (narrow, long, RTL, dark, zoom), in your Storybook / Ladle or a generated page.
- `components_audit` — near-duplicate components and CSS, token drift, import cycles, with file:line and the component to reuse.
- `components_save` — record an approved component in `.drip/patterns/` for later tasks.
- `drip_check` — project lint / typecheck / tests + `fitcheck_lint` + the audit (+ dry-lint when it can run); receipts skip unchanged work.
- `components_find` — "what's the best X for this stack": ranked picks from the curated catalogue and live registries, with licence and install command.
- `components_get` — read a component's source and install command before you add it.
- `components_registries` — search 500+ shadcn-style registries when the catalogue has nothing.
- `components_catalogue` — the curated list with use-when / avoid-when, to choose a library family.
- `icons_search`, `icons_get` — icons from the project's one family for slots.
- `fitcheck_lint`, `fitcheck_shot`, `fitcheck_done` — check states, tokens and the rendered result.

## Read deeper when
| Situation | Call |
|---|---|
| Choosing between libraries, or deciding build vs install | `drip_guide components/choosing-libraries` |
| Installed something and need to make it yours | `drip_guide components/restyling` |
| Designing a component's variants, sizes, states, slots and API | `drip_guide components/anatomy` |
| States and overlay behaviour in detail | `drip_guide interaction` |
