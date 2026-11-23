# Components: choosing libraries

Pick by job, not by popularity. A product usually needs one primitive family, one styled base (often shadcn or coss ui on top of it), a handful of specialist packages (toasts, drawers, tables, charts, command palette) and, on marketing pages only, at most one effect library. Call `components_find` with the specific need; this file is how to judge what it returns. Entries in the catalogue marked "check" for price or licence were not verified: open the site and confirm before shipping.

## By need

| Need | First pick | Alternative | Notes |
|---|---|---|---|
| Base components in React + Tailwind | shadcn/ui | coss ui | You own the code. shadcn builds on Radix (or Base UI); coss ui on Base UI with a more mature SaaS look |
| Unstyled primitives, full control | Radix Primitives | Base UI | Base UI exposes `data-starting-style` / `data-ending-style` and `--transform-origin`, nice for motion |
| Accessibility and i18n above all; complex inputs | React Aria Components | - | Best date/time pickers, comboboxes, drag and drop, calendars, number fields |
| Vue, Svelte, Solid, or several frameworks | Ark UI | Headless UI (React/Vue, small set) | Same state-machine behaviour across frameworks |
| HTML + Tailwind, no React | Preline UI | Ark UI (vanilla adapters) | Plain-JS behaviour |
| Dialog, popover, menu, tabs, select | shadcn (Radix/Base UI) | React Aria | Never hand-rolled |
| Command palette | cmdk (shadcn `Command`) | - | Open by shortcut, no animation |
| Toasts | Sonner | - | One toast system per app |
| Mobile drawer / bottom sheet | Vaul (shadcn `Drawer`) | - | Native-feeling drag, snap points |
| Data table | TanStack Table + shadcn table styles | Kibo UI table | Virtualise past ~500 rows |
| Kanban, gantt, dropzone, colour picker, AI prompt input, code block | Kibo UI | 21st.dev alternatives | The complex parts shadcn skips |
| Charts | Recharts via shadcn charts | Tremor | Huge datasets: a canvas-based library |
| Forms | shadcn `Form` pattern (react-hook-form + zod) or the stack's own | React Aria form fields | Validation timing: `drip_guide interaction/forms` |
| Date / range picker | React Aria `DatePicker` / `DateRangePicker` | shadcn `Calendar` + popover | Must accept typed dates |
| Animated versions of standard components | Animate UI | Motion Primitives | Check that motion values match `drip_guide motion` |
| Subtle product motion (morphing dialog, text effects, carousels) | Motion Primitives | Animate UI | Tasteful defaults; still restyle |
| Marketing: marquees, bento grids, number tickers, shimmer | Magic UI | - | One or two per page, never in app UI |
| Marketing: one signature hero effect (spotlight, beams, 3D card) | Aceternity UI | React Bits | One moment; overuse reads as template |
| Text effects, backgrounds, cursors | React Bits | Magic UI | Licence reported as MIT + Commons Clause: confirm |
| Playful crafted pieces (dynamic island, texture cards) | Cult UI | - | Brand must be playful |
| Physical / tactile controls (knobs, switches) | Tactile UI | Bencho | Check licence and price |
| Press / hover / drag micro-interaction ideas | Bencho | - | Learn from, then implement with tokens |
| Many variants of one section to compare | 21st.dev | Preline blocks | Licence varies per component |
| Animation engine | Motion | GSAP (timelines, scroll storytelling) | CSS first when it is enough |
| Icons | One family via `icons_search` (Lucide default) | Phosphor for weights | `drip_guide icons` |

## Build or install?

Install when the component has behaviour: focus management, keyboard navigation, ARIA roles, positioning, collision handling, typeahead, dismissal, drag, virtualisation, date maths. These take weeks to get right and are where hand-rolled UI fails audits.

Build when it is layout and content: cards, stat tiles, page headers, empty states, pricing tables, feature grids, nav bars (using primitives for any menus inside). Build these from the base components and tokens.

Build a custom component on primitives when the catalogue has nothing close: use the primitive for behaviour (Radix `Popover`, React Aria `useListBox`) and write only the look.

## Judging a candidate (read with `components_get`)

| Check | Pass | Fail |
|---|---|---|
| Semantics | `<button>`, `<a>`, `<input>`, `role` from a primitive | `<div onClick>`, `<span>` buttons |
| Keyboard | Tab, Enter/Space, Escape, arrows where expected | Mouse-only |
| Focus | Visible ring, focus trap and return in overlays | `outline-none` with no replacement |
| State | Exposes `data-state` / `aria-*` | Internal state only, no attributes |
| Motion | Named properties, short durations, reduced-motion handling | `transition-all`, 500ms+, `scale(0)`, bounce |
| Tokens | Uses CSS variables / theme classes | Hard-coded hex and px everywhere |
| Dependencies | Uses what the project already has (Motion, Radix) | Pulls a second animation or primitive library |
| Licence | MIT / Apache-2.0 / ISC, or a paid licence the user has | Unknown, "free for personal use", Commons Clause unconfirmed |
| Size | Proportionate to the job | 40KB for a marquee |

If it fails semantics, keyboard or licence, drop it. Motion and token failures are fixable during restyling.

## Mixing rules

- **One primitive family** per app (Radix or Base UI or React Aria). Exceptions: a single React Aria date picker inside a Radix app is acceptable when nothing else does dates well.
- **One styled base**. shadcn and coss ui can coexist only if both are restyled to the same tokens; otherwise pick one.
- **One of each specialist**: one toast library, one drawer, one table engine, one chart library, one icon family.
- **Effects are spice.** Magic UI, Aceternity, React Bits, Cult UI: at most one signature effect per marketing page, and none in authenticated app UI. Two effects on one screen compete; the page reads as a template gallery.

## By surface

| Surface | Lean on | Avoid |
|---|---|---|
| Dense app / dashboard | shadcn or coss ui, TanStack Table, Recharts, cmdk, Sonner | Effect libraries, scroll animation |
| Settings and forms | coss ui / shadcn forms, React Aria for complex inputs | Custom selects |
| Mobile web / PWA | Vaul, React Aria (touch-correct press), native inputs | Hover-dependent components |
| Marketing / landing | Base components + one effect (Magic UI or Aceternity or React Bits) | Several effects, animated everything |
| Docs | shadcn, cmdk search, code blocks (Kibo) | Effects |

## Installing from a registry

```bash
npx shadcn@latest add button dialog dropdown-menu         # shadcn itself
npx shadcn@latest add https://www.kibo-ui.com/r/<name>.json # any shadcn-style registry
```

`components_get` returns the exact command and the files it will write. After installing: read every file it added, check what it added to `package.json`, and look for CSS it appended to your global stylesheet (keyframes, theme variables) so the restyle can replace them.

## Sources

Drip catalogue (`data/catalogue.json`) for libraries, licences and use-when / avoid-when. Emil Kowalski, *emil-design-eng* (MIT): reasons to prefer Sonner- and Vaul-style components (good defaults, edge cases handled). Taste Skill (MIT): one effect, one system. Impeccable (Apache-2.0): replace custom implementations with shared ones.
