# Components

A designer-built component library looks like it was made for this product and nobody else, and behaves like it was made by people who obsess over accessibility. The trick is that those are two different jobs: proven open-source primitives already solve the behaviour (focus, keyboard, ARIA, positioning, dismissal), and the product's tokens supply the look. A good component has a small, obvious API, a closed set of variants and sizes, every state designed, and it does not break when the content is long, empty, translated or zoomed. Nothing in it looks like a library default.

## The procedure

1. **Read the project.** What stack (React? Tailwind v4? which version of shadcn, if any)? Is there a `components/ui` folder, a `DESIGN.md`, tokens in `@theme` or `:root`? Which primitive family is already used (Radix, Base UI, React Aria)? Stay inside it. Mixing primitive families doubles bundle size and gives two keyboard models.
2. **Name the need precisely.** Not "a table" but "sortable, filterable table with row selection, 2,000 rows, sticky header". Not "a picker" but "date range picker with presets".
3. **Search the project, then the world.** `components_local_find` with the precise need: an existing component (or an approved pattern from `.drip/patterns/`) beats a new one. Plan a whole page with `components_plan` (sections, product components, primitives; it says what is reused and warns about a page of identical cards). Then `components_find` with the precise need. It ranks the curated catalogue (shadcn, coss ui, Kibo, Radix, Base UI, React Aria, Magic UI, Motion Primitives, Animate UI, Cult UI, Aceternity, React Bits, Sonner, Vaul, cmdk, TanStack Table, Recharts, Tremor) and live registries. Nothing good? `components_registries` to search wider. See `components/choosing-libraries` for which library for what.
4. **Read before installing.** `components_get` for the top one or two candidates. Check: semantic elements, keyboard support, state attributes, how it animates, dependencies it pulls in, licence. Reject anything that fails; don't plan to "fix it later".
5. **Install** with the command `components_get` returns (`npx shadcn@latest add ...` for registry items). Commit the untouched install separately if the project uses git, so the restyle diff is readable.
6. **Restyle to the tokens.** Replace every default colour, radius, shadow, focus ring, font size and motion value with the project's tokens. Delete what the design doesn't need. See `components/restyling`.
7. **Complete the anatomy.** Variants, sizes, states, slots, content resilience. See `components/anatomy` and `drip_guide interaction/states`.
8. **Compose, don't fork.** Build product components (a `PlanCard`, an `InviteDialog`) by composing the base ones; don't copy-paste a base component to change one class.
9. **Check.** `components_preview` the component alone (sizes, states, a Tab walk, narrow / long / RTL / dark / zoom cells), then render every variant x size x state on one scratch page or story, `fitcheck_shot` it in light and dark, `fitcheck_lint`, then use it in the real screen and `fitcheck_done`.
10. **Reuse audit.** `components_audit` (or `drip_check`): near-duplicate components, repeated CSS, hard-coded values that equal a token, import cycles. Fix what is a real duplicate; if two things only look alike, record why in `.drip/check/exceptions.json`. When the user accepts a component, `components_save` it so the next task reuses it.

## The craft

### Install, then own

shadcn-style registries copy source into the project: you own it. That is the point. Treat installed code as a first draft you are expected to edit, not a dependency to wrap.

- **Do:** edit `components/ui/button.tsx` to use your tokens and variants.
- **Don't:** wrap it in `MyButton` that overrides half the classes with `!important` or `twMerge` battles.

Packaged libraries (Radix primitives, React Aria, Sonner, Vaul, cmdk, TanStack Table) stay as dependencies; style them through their state attributes and class props.

### Which layer does what

| Layer | Examples | Your job |
|---|---|---|
| Primitive (behaviour) | Radix, Base UI, React Aria, Ark, Headless UI | Never rewrite; style via attributes |
| Base component (look) | `Button`, `Input`, `Dialog`, `Menu` in `components/ui` | Tokens, variants, sizes, states |
| Product component | `PricingCard`, `ProjectRow`, `InviteDialog` | Composition of base components, real content |
| Effect (marketing) | Magic UI marquee, Aceternity spotlight, React Bits text | One per page at most, restyled, reduced-motion safe |

### Variants

- Intent-named, few. Buttons: `primary`, `secondary`, `ghost`, `danger`, optionally `link`. Badges: `neutral`, `info`, `success`, `warning`, `danger`.
- One `primary` per view. Two equal primaries means no hierarchy.
- **Do:** `intent="danger"`. **Don't:** `color="red" rounded outline big`.

### Sizes

| Size | Height | Padding x | Font | Icon | Use |
|---|---|---|---|---|---|
| `sm` | 32px | 10-12px | 13-14px | 14-16px | dense tables, toolbars |
| `md` | 36-40px | 14-16px | 14px | 16px | default desktop |
| `lg` | 44-48px | 18-24px | 15-16px | 18-20px | touch, marketing CTAs, mobile |

Inputs, selects and buttons share heights per size so they align in a row. Icon-only buttons are square at the same height.

### States

Default, hover, active, focus-visible, disabled; plus loading, selected, invalid, read-only, open where they apply. Style them through attributes the primitive already sets (`data-state`, `data-disabled`, `aria-invalid`, `aria-busy`). Values: `drip_guide interaction/states`.

### API design

- **Native first.** A `Button` accepts every `<button>` prop and defaults `type="button"`. Spread `...props` last-but-one, merge `className` with `cn()` last.
- **`ref` is a prop** in React 19; on React 18 use `forwardRef`.
- **Composition over configuration.** `<Button asChild><Link href="/new">New</Link></Button>` (Radix Slot) or Base UI's `render` prop instead of `href` / `as` / `isLink` booleans. Compound parts (`Card`, `CardHeader`, `CardContent`) instead of `title`, `subtitle`, `footer`, `headerAction` props.
- **Controlled and uncontrolled.** `value`/`onValueChange` and `defaultValue`. Follow the primitive's naming.
- **State out as data attributes**, so parents can style children without new props: `data-variant`, `data-size`, `data-state`.
- **Good defaults beat options.** If 90% of uses pass the same prop, make it the default. A component that needs five props to look right is unfinished.
- **No boolean explosions.** `isLarge`, `isSmall`, `isPrimary`, `isGhost` are one `size` and one `intent`.

```tsx
type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };

export function Button({ className, intent, size, asChild, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button" data-intent={intent ?? "primary"} data-size={size ?? "md"}
      type={asChild ? undefined : type}
      className={cn(button({ intent, size }), className)}
      {...props}
    />
  );
}
```

### Composition patterns

- **Slots**: leading icon, label, trailing icon / badge / shortcut. Gap from a token (8px at `md`). Icons size from the component's size, not per use.
- **Groups**: `ButtonGroup`, `InputGroup` (input + addon + button) join radii on the shared edges and keep one focus ring around the group.
- **Lists of the same thing**: render through one row component; vary content, not structure.
- **Empty, loading, error** are part of the component that fetches, not afterthoughts (`drip_guide polish`).

### Content resilience

- Text truncates with ellipsis on one line where layout needs it (`min-w-0` on the flex child, `truncate`), and shows the full value in a tooltip or on focus; elsewhere it wraps.
- Numbers use `tabular-nums` and right-align in tables.
- Logical properties (`ps-3`, `me-2`, `start-0`) so RTL works; directional icons flip.
- No fixed widths on anything holding text; budget 30-40% expansion for translations.
- Test with: empty, one character, 120 characters, 0, 1,000,000, a missing image.

## Worked example: "add a users table with search and bulk delete"

1. Need, precisely: sortable table, text search, row selection, bulk delete with undo, ~3,000 rows, React + Tailwind v4 + shadcn already installed (Radix).
2. `components_find "data table sorting filtering row selection"` returns TanStack Table + shadcn data-table pattern, Kibo table. Project already uses shadcn: stay with it.
3. `components_get` on the shadcn data-table: check it uses `<table>` semantics, `aria-sort` on sortable headers, checkbox cells with labels. It does.
4. Install `table`, `checkbox`, `input`, `dropdown-menu`; add `@tanstack/react-table` and `@tanstack/react-virtual` (3,000 rows).
5. Restyle: row height 40px (dense 36px), header sticky on `--surface-1` with a hairline, numbers `tabular-nums` right-aligned, selected rows tinted accent at 10%, focus ring inset, radius on the wrapper only.
6. States: skeleton rows of real height while loading, empty-first-use and no-results states inside the table body with the header kept, error with Retry.
7. Bulk delete: a selection bar appears in place of the toolbar ("3 selected · Delete · Clear"), deletes optimistically, Sonner toast "3 users deleted. Undo" for 6s.
8. Sheet the states, `fitcheck_shot` light and dark, `fitcheck_done`.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Stock shadcn look: zinc greys, `rounded-md` on everything, `shadow-xs`, 3px soft ring | Restyle to tokens; nested radii concentric; your focus ring |
| Hand-made dropdown with `useState` and a `<div>` list | Radix/Base UI menu or select via `components_find` |
| Three toast systems (custom, react-hot-toast, Sonner) | One: Sonner |
| Aceternity spotlight + Magic UI marquee + React Bits text on one page | One signature effect, the rest static |
| Glowing gradient border on every card | Hairline border or shadow-as-border token |
| `Button` with 14 boolean props | `intent` + `size` + composition |
| Every button `primary` | One primary, secondary/ghost for the rest |
| `transition-all` copied from the registry | Name the properties (`drip_guide motion`) |
| Icons from two libraries in one toolbar | One family (`drip_guide icons`) |
| Component breaks on a long name | `min-w-0` + truncate or wrap; test with long content |

## Done when

- [ ] Every behavioural component comes from a primitive or a vetted library found with `components_find`; any hand-rolled one has a stated reason.
- [ ] Licences of everything installed are known and shippable (check entries marked "check" in the catalogue).
- [ ] No library defaults remain: colours, radii, shadows, focus ring, type and motion all reference tokens.
- [ ] Variants are intent-named; sizes are a closed set with matching heights across buttons and inputs.
- [ ] Every state is designed and visible on a variant x size x state sheet in light and dark.
- [ ] APIs pass native props, `className` and `ref`, and compose with `asChild`/`render` rather than booleans.
- [ ] Components hold up with empty, long, numeric, RTL and zoomed content.
- [ ] `fitcheck_lint` is clean and `fitcheck_done` has run.
- [ ] `components_local_find` was run for every new component and `components_audit` shows no high findings (or each has a recorded reason).

## Reference files

- `drip_guide components/choosing-libraries` — which library for which need, build vs install, licences.
- `drip_guide components/restyling` — turning an installed component into the product's own.
- `drip_guide components/anatomy` — variants, sizes, states, slots and API for the core components.

Related: `drip_guide interaction`, `drip_guide motion`, `drip_guide system`, `drip_guide icons`, `drip_guide polish`.

## Sources

- Drip's own catalogue (`data/catalogue.json`) for libraries, licences and use-when / avoid-when.
- Emil Kowalski, *emil-design-eng* (MIT): the Sonner principles - good defaults over options, little setup, handle edge cases invisibly.
- Impeccable (Apache-2.0), *polish*: replace one-offs with shared components, promote reused values to tokens, missing-token vs one-off triage.
- *Make Interfaces Feel Better* (MIT): express fixes in the project's existing styling system, static press option on buttons.
- UI UX Pro Max (MIT): state clarity and touch-target guidance.
- Taste Skill (MIT): one system, one effect, no stacked effects.
