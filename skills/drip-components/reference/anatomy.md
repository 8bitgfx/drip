# Components: anatomy

What a finished component is made of: parts (slots), a closed set of variants and sizes, every state, rules for content, and an API that makes the right use easy. Use this as the spec when building a base component or reviewing an installed one.

## The anatomy sheet (write one per component)

| Part | Question |
|---|---|
| Purpose | What single job does it do? What does it never do? |
| Slots | Which parts exist (icon, label, description, badge, shortcut, action)? Which are optional? |
| Variants | Which intents? Which one is the default? |
| Sizes | Which sizes, and what changes together per size? |
| States | Which of: hover, active, focus-visible, disabled, loading, selected, invalid, read-only, open? |
| Content | Min and max content; what happens at each (wrap, truncate, scroll)? |
| Behaviour | Keyboard map, focus rules, what the primitive handles |
| API | Props, defaults, controlled/uncontrolled, composition points |
| Tokens | Which colour, radius, shadow, spacing, type and motion tokens it reads |

## Shared size table

Components that sit in a row must share heights per size.

| Size | Control height | Padding x | Font | Icon | Radius (example with 10px base) | Gap |
|---|---|---|---|---|---|---|
| `sm` | 32px | 10-12px | 13px | 14px | 6px | 6px |
| `md` | 36px (dense) / 40px | 14px | 14px | 16px | 8px | 8px |
| `lg` | 44-48px | 18-20px | 15-16px | 18-20px | 10px | 8-10px |

Touch layouts use `lg` for primary controls or extend hit areas to 44px.

## Button

- **Slots:** leading icon, label, trailing icon or shortcut hint, loading spinner (overlay).
- **Variants:** `primary` (one per view), `secondary`, `ghost`, `danger`; `link` only if it must look like a link but act as a button.
- **States:** all of default / hover / active / focus-visible / disabled / loading; `aria-pressed` for toggle buttons.
- **Content:** label is a verb or verb + noun ("Create project"), 1-3 words, never wraps (min-width from content, never fixed width). Icon-side padding 2px less than the text side for optical balance.
- **API:** native button props, `intent`, `size`, `asChild`, `loading`; defaults `type="button"`.
- **Icon-only:** square, `aria-label` required (make it a required prop in the type), tooltip with the same words.

## Input / textarea / select

- **Slots:** label, control, leading addon (icon, currency), trailing addon (clear, unit, show password), helper text, error message.
- **States:** hover, focus, invalid, disabled, read-only; selects add open.
- **Content:** placeholder is an example, not a label; long values scroll horizontally in inputs, wrap in textareas; textarea grows with content up to a max (`field-sizing: content` where supported) then scrolls.
- **API:** wrap label + control + messages in a `Field` that wires `id`, `aria-describedby`, `aria-invalid` automatically, so consumers can't forget them.

## Checkbox, radio, switch

- Visual 16-20px, label clickable, row hit area 24px+ (44px on touch).
- Checkbox has checked, unchecked, indeterminate. Switch is for immediate effect only; in a form that submits, use a checkbox.
- Checkmark appears instantly or scales from 0.7 to 1 in 150ms; the switch knob slides 120-160ms.

## Card

- **Slots:** media, header (title, meta, action), body, footer (actions).
- **Variants:** `plain` (no chrome, grouped by spacing), `outlined` (hairline), `raised` (shadow token). Pick one for a page, don't mix three.
- **Interactive card:** the whole card is one link (stretched link pattern: `a::after { content:""; position:absolute; inset:0 }`), nested buttons sit above it with `position: relative; z-index: 1`. Hover on fine pointers: border one step darker or 2px lift on an inner layer.
- **Content:** title clamps at 2 lines, description at 3; media has a fixed aspect ratio (no layout shift); inner media radius = card radius - padding.

## Dialog

- **Slots:** title (required, for `aria-labelledby`), description, body, footer actions, close button.
- **Sizes:** `sm` 400-440px (confirm), `md` 520-560px (form), `lg` 720-800px (editor); full screen or sheet on phones.
- **Behaviour:** primitive handles focus trap, return, Escape, scroll lock. Body scrolls, header and footer stay.
- **API:** `open` / `onOpenChange` + `defaultOpen`; `Dialog.Trigger asChild` for any element.

## Menu / select / combobox

- Items 32-36px (desktop), 44px (touch); inner padding 4-6px; item radius = panel radius - padding.
- **Slots per item:** icon, label, description, shortcut, check (for selected), submenu chevron.
- Groups with labels and separators; destructive items last.
- Combobox: show matches as you type, highlight the matched part, an empty state ("No results for 'xyz'"), and keep the typed text when nothing is chosen.

## Tabs and segmented control

- Tabs switch views in place; a segmented control switches a mode or filter of the same view.
- Indicator: underline 2px (tabs) or filled pill (segmented); moves with a 200ms `--ease-in-out` translate.
- Keyboard: arrows move between tabs, Home/End; activation on focus for instant panels, on Enter/Space for expensive ones.
- Labels don't change width on selection (no bold jump): reserve the bold width with a hidden bold copy or use a weight change of at most 100 in a variable font.

## Table

- Header sticky, 36-40px rows (dense 32px), cell padding 12-16px x; numbers right-aligned with `tabular-nums`, text left; one alignment per column.
- Row hover tint, selected tint + checkbox, focus-visible ring inset.
- Sort indicator in the header button; filter and search above; pagination or virtualisation past a few hundred rows.
- Empty, loading (skeleton rows of real height) and error states in the table body, keeping the header.

## Badge, tag, avatar

- Badge: 20-22px high, 6-8px padding x, 12px medium text; semantic variants only; never a dot plus a word plus an icon.
- Tag (removable): includes a remove button with its own label ("Remove tag: design").
- Avatar: fixed sizes (24, 32, 40, 64), image outline 1px at 10% black/white, initials fallback with a deterministic colour from the palette.

## Toast, empty state, skeleton

- Toast: icon, title, optional description, optional action, close; see `drip_guide interaction/overlays`.
- Empty state: what this is, why it's empty, the one action that fills it; a small illustration or icon at most.
- Skeleton: the same boxes as the loaded content, same radii, muted surface, optional shimmer.

## API patterns

```tsx
// Compound component: parts, not props
<Card>
  <CardMedia src={src} alt="" ratio="16/9" />
  <CardHeader>
    <CardTitle>Quarterly report</CardTitle>
    <CardAction><Button intent="ghost" size="sm">Share</Button></CardAction>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// Polymorphism by composition
<Button asChild intent="secondary"><a href="/docs">Read the docs</a></Button>

// Controlled or uncontrolled
<Tabs defaultValue="overview" />
<Tabs value={tab} onValueChange={setTab} />
```

Rules:

- Spread native props, merge `className` last, accept `ref`.
- Emit `data-slot`, `data-variant`, `data-size`, `data-state` so parents can target parts without new props.
- Make required accessibility props required in TypeScript (`aria-label` on icon-only buttons, `title` on dialogs).
- Prefer one `size` and one `intent` over booleans; prefer children and parts over `title` / `subtitle` / `footer` props.
- Defaults are the common case: a bare `<Button>Save</Button>` must look right.
- Document each component with a live sheet of variants x sizes x states, not prose.

## Review questions

1. Can a new teammate use it correctly without reading its source?
2. Is there any prop that 90% of uses set to the same value? Make it the default.
3. Does any state look identical to another (hover vs selected, disabled vs read-only)?
4. What happens with a 120-character label, an empty value, a missing image, RTL?
5. Does it align with its neighbours at every size?

## Sources

Emil Kowalski, *emil-design-eng* (MIT): good defaults, minimal setup, invisible edge-case handling. *Make Interfaces Feel Better* (MIT): concentric radii, optical padding on icon buttons, image outlines, hit areas. Impeccable (Apache-2.0): complete state coverage and content resilience. UI UX Pro Max (MIT): touch targets, read-only vs disabled, table and form guidance. Radix, Base UI and React Aria documentation for the composition patterns.
