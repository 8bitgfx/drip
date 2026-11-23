# Interaction: states

A control is not done until every state it can be in has been designed. AI-made UI ships default and hover and stops there; people meet the other six. Write the whole table for each control type once, as tokens and shared styles, and every instance inherits it.

## The full set

| State | Trigger | Applies to |
|---|---|---|
| Default | rest | all |
| Hover | pointer over, fine pointers only | all pointer targets |
| Active / pressed | pointer or key down | pressables |
| Focus-visible | keyboard focus | all focusable |
| Focus (any) | any focus | text inputs, textareas, selects |
| Disabled | not available | all |
| Loading / busy | async work in flight | buttons, forms, regions |
| Selected / on | chosen item, toggle on | tabs, toggles, rows, options, chips |
| Invalid | failed validation | inputs, groups |
| Read-only | visible but not editable | inputs |
| Open / expanded | disclosure open | triggers of menus, accordions, popovers |
| Dragging / drop target | gesture in progress | draggables, drop zones |

## Values

| State | Visual change | Timing |
|---|---|---|
| Hover (filled button) | fill one step toward ink: about 6-8% lightness in OKLCH | 120-150ms in, 100ms out, `ease` |
| Hover (ghost / row) | background from transparent to a 4-6% ink tint | 100ms |
| Hover (link) | underline appears or goes from 1px faint to full ink | 120ms |
| Active | `scale(0.97)` or one step deeper than hover; cards 0.99 | 100-140ms, `--ease-out` |
| Focus-visible | 2px outline, 2px offset, ring token at 3:1 | instant |
| Input focus | border to the action colour + 3px soft ring (action colour at ~20% alpha) | 120-150ms |
| Disabled | opacity 0.45-0.5, no hover/press, no shadow | instant |
| Loading | label hidden (width kept), spinner 14-16px centred, `aria-busy` | spinner shows after 150-300ms, stays at least 300-500ms |
| Selected | fill or indicator + weight/icon change (never colour alone) | 150ms; indicator travel 200ms |
| Invalid | border and message in the danger token, icon beside the message | appears on blur/submit, instant |
| Read-only | no border chrome or a dashed/none border, text at full contrast | n/a |

## The order of state rules

When states combine, the more specific wins. Write CSS in this order so later rules override earlier ones:

1. default
2. hover
3. focus-visible (ring is additive, so it shows together with hover)
4. active
5. selected / `aria-pressed` / `data-state=on`
6. invalid
7. disabled and loading last (they cancel hover and active)

Selected + hover still reads selected: use a slightly deeper selected fill, don't swap back to the hover tint.

## Button in CSS

```css
.btn {
  --bg: var(--accent); --bg-hover: var(--accent-hover); --fg: var(--on-accent);
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  height: 2.25rem; padding-inline: 0.875rem; border-radius: var(--radius-md);
  background: var(--bg); color: var(--fg);
  transition: background-color 140ms ease, scale 140ms var(--ease-out);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
@media (hover: hover) and (pointer: fine) { .btn:hover { background: var(--bg-hover); } }
.btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.btn:active { scale: 0.97; }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; scale: 1; }
@media (hover: hover) and (pointer: fine) { .btn:is(:disabled, [aria-disabled="true"]):hover { background: var(--bg); } }
.btn[aria-busy="true"] { cursor: progress; }
.btn[aria-busy="true"] > .label { visibility: hidden; }
.btn > .spinner { position: absolute; }
```

## Button in Tailwind v4 (cva)

```tsx
const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-[background-color,scale] duration-150 ease-out-strong",
    "active:not-disabled:scale-[0.97]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
    "disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50",
    "aria-busy:cursor-progress [&[aria-busy=true]>.label]:invisible",
    "touch-manipulation",
  ],
  {
    variants: {
      intent: {
        primary: "bg-(--accent) text-(--on-accent) hover:bg-(--accent-hover)",
        secondary: "bg-(--surface-2) text-(--ink) hover:bg-(--surface-3)",
        ghost: "text-(--ink) hover:bg-(--ink)/5",
        danger: "bg-(--danger) text-white hover:bg-(--danger-hover)",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-3.5", lg: "h-11 px-5 text-base" },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);
```

## Loading button behaviour

```tsx
function useDelayedFlag(on: boolean, delay = 200, min = 400) {
  const [show, setShow] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    if (on) {
      const t = setTimeout(() => { shownAt.current = Date.now(); setShow(true); }, delay);
      return () => clearTimeout(t);
    }
    const left = Math.max(0, min - (Date.now() - shownAt.current));
    const t = setTimeout(() => setShow(false), show ? left : 0);
    return () => clearTimeout(t);
  }, [on]);
  return show;
}
```

The button ignores clicks while `pending`, whether or not the spinner is visible yet. After success, the label can swap to "Saved" with a check for 1.5-2s.

## Inputs

| State | Border | Ring | Text |
|---|---|---|---|
| Default | `--border` (3:1 against the surface for the input boundary) | none | `--ink` |
| Hover | one step darker | none | |
| Focus | `--accent` | 3px `--accent` at 20% alpha | caret in accent |
| Invalid | `--danger` | 3px `--danger` at 20% on focus | message below in `--danger`, linked by `aria-describedby` |
| Disabled | `--border` at 50% | none | 50% opacity |
| Read-only | none or transparent | focus ring still shows | full contrast |

Placeholder text at about 50-60% of ink contrast; never the only label.

## Icon buttons

- Visual box 32-40px, icon 16-20px; hit area extended to 40px (desktop) / 44px (touch) with `::after`.
- `aria-label` names the action ("Close dialog", "Copy link"), plus a tooltip with the same words.
- States through `currentColor`: rest at muted ink, hover full ink, active filled variant.

```css
.icon-btn { position: relative; }
.icon-btn::after { content: ""; position: absolute; inset: 50% auto auto 50%; width: 44px; height: 44px; translate: -50% -50%; }
```

## Links

- Underlined in running text (or clearly distinct by weight and colour with 3:1 against surrounding text plus an underline on hover/focus).
- `<a>` for navigation, `<button>` for actions. Links can be opened in a new tab; buttons cannot. Never `<div onClick>`.
- Visited state for content sites where it helps (search results, docs).

## Rows and cards that act

- The whole row is one link or button; nested actions stop propagation and get their own focus.
- Hover: background tint 4-6%; selected: stronger tint plus an indicator; focus-visible: ring inset (`outline-offset: -2px`) so it isn't clipped by `overflow: hidden` parents.
- Row actions appear on hover **and** on `:focus-within`, and are always visible on touch.

## Data attributes beat ad-hoc classes

Primitives expose state as attributes: style them instead of mirroring state into classes.

| Library | Attributes |
|---|---|
| Radix / shadcn | `data-state="open|closed|on|off|checked|unchecked|active|inactive"`, `data-disabled`, `data-highlighted`, `data-side` |
| Base UI | `data-open`, `data-closed`, `data-pressed`, `data-disabled`, `data-starting-style`, `data-ending-style` |
| React Aria | `data-hovered`, `data-pressed`, `data-focus-visible`, `data-selected`, `data-disabled`, `data-invalid` |

React Aria's `data-hovered` is already pointer-aware and `data-pressed` handles touch and keyboard correctly; prefer them over CSS pseudo-classes in that library.

## Checks

- Tab through: each control shows the ring, in reading order.
- Hover each control with a mouse, then emulate touch: no hover-only content, no sticky hover after tap.
- Click and hold: pressed state visible; drag off and release: no action fires.
- Disable each: no hover change, explanation available where needed.
- Trigger loading on a fast network (spinner never flashes) and a slow one (spinner appears, width stable).

## Sources

Emil Kowalski, *emil-design-eng* (MIT): press scale, hover gating. *Make Interfaces Feel Better* (MIT): hit area extension, `currentColor` icon states, static press option. Impeccable (Apache-2.0): the complete state list. UI UX Pro Max (MIT): disabled opacity range, read-only vs disabled, state clarity. Taste Skill (MIT): input focus ring, hover timings. Vercel Web Interface Guidelines (paraphrased): spinner show-delay and minimum time, links vs buttons.
