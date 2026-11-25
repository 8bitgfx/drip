# Design system: tokens, theming and DESIGN.md

A good system is small, named by purpose and boring to use. Every colour, size, gap, corner, shadow, layer and
curve on screen comes from a token; every token has one job and is used in more than one place; a new screen
can be built by someone who has only read `DESIGN.md`. Light and dark are two renderings of the same roles, not
two designs. The system is the chosen direction made exact: if the moodboard said "warm, quiet, editorial", the
tokens are where that becomes `oklch(97% 0.01 70)`, a 1.25 type ratio and 4px corners. Good systems are also
humble: they grow from what the project already has instead of replacing it.

## The procedure

Do these in order. Step 6 of the Drip loop is this whole list.

1. **Read what exists.** Search the project for tokens before inventing any:
   - CSS custom properties: `--color-`, `--font-`, `--text-`, `--space-`, `--radius-`, `--shadow-`, `--ease-`, `--z-` in `globals.css`, `app.css`, `index.css`, `styles/`.
   - Tailwind v4 `@theme` blocks, Tailwind v3 `tailwind.config.*` `theme.extend`.
   - shadcn/ui variables (`--background`, `--foreground`, `--primary`, `--radius`) and `components.json`.
   - CSS-in-JS theme objects, `tokens.json` (DTCG / Style Dictionary), an existing `DESIGN.md`.
   - Then the rendered truth: computed styles of `body`, `h1`, `a`, `button`, a card. Values that differ from the tokens are drift.
2. **Decide: extend, refresh or replace.** Extend when a coherent system exists (the common case). Refresh when it drifted. Replace only when the user asked for a redesign; say so out loud before you do it. See "Extending an existing system" below.
3. **Take the direction's inputs.** From the chosen board direction: the palette (one accent), the type pairing, three adjectives, the density. No board yet on a full-loop task? Stop and run the direction steps first (`drip_status` tells you).
4. **Colour.** Call `palette_generate` with the direction's accent hex (and `neutralTint` 0 for pure grey, about 0.01 for a warm or cool tint). Keep the ramps as primitives, map the semantic roles, then run `palette_check` on every text/surface pair in both themes. Details: `drip_guide color`.
5. **Type.** Call `fonts_pair` with the direction's mood words, check candidates with `fonts_preview` using a real headline from the product, then set the scale. Details: `drip_guide type`.
6. **Space, size, shape, depth, layers, motion.** Fill the tables below. Keep Tailwind's spacing; add only what is missing.
7. **Write the token file.** One file (`tokens.css` or the existing entry stylesheet). Primitives, then semantic tokens, then the Tailwind `@theme` mapping. Exact shape: `drip_guide system/tokens`.
8. **Wire theming.** `:root` = light, `.dark` / `[data-theme="dark"]` = dark overrides of semantic tokens only, `color-scheme`, a no-flash script. `drip_guide system/theming`.
9. **Write `DESIGN.md`** at the project root from the template in `drip_guide system/design-md-template`. Words first, exact values in brackets, named rules.
10. **Prove it.** Build one real screen fragment (a card with a heading, body text, a primary and secondary button, an input, a badge) in both themes using only tokens. If you needed a raw value, the system is missing a token: add it or change the design.
11. **Call `drip_mark` with step `system`.** Only after 7-10 are done and `palette_check` passes.

On a quick-loop task (a tweak), skip 3-9: read `DESIGN.md` and the token file, use what is there, and add a token only if the tweak truly needs a new role.

## The craft

### Three layers of tokens

| Layer | Example | Who reads it | Changes with theme? |
|---|---|---|---|
| Primitive | `--rust-600: oklch(55% 0.17 40)` | only semantic tokens | never |
| Semantic | `--accent: var(--rust-600)` | components, pages (in Tailwind via `@theme inline` as `--color-accent`) | yes |
| Component | `--button-primary-bg: var(--accent)` | one component | rarely, by inheritance |

- **Do** keep primitives as the full ramps (`palette_generate` gives 11 steps, 50 to 950) even if you use 5 of them; ramps make later states easy.
- **Don't** let a component read a primitive: `bg-blue-600` in a button means dark mode and rebrands need a code hunt.
- **Do** add component tokens only for components with real variants (button, input, badge). Most components need none.
- **Don't** create one token per value ("--padding-17"). Tokens are decisions, not a list of everything you typed.

### Naming

Pattern: `--{category}-{role}-{variant}-{state}`, each part optional after the role.

| Good | Bad | Why |
|---|---|---|
| `--text` / `--text-muted` | `--dark-grey` | role survives a theme switch |
| `--surface-raised` | `--white-2` | white is wrong in dark mode |
| `--accent-hover` | `--accent-darker` | in dark mode hover may be lighter |
| `--radius-control` | `--radius-6` | the value can change, the role cannot |
| `--shadow-overlay` | `--shadow-big` | says where it goes |

Semantic colours use short role names (`--bg`, `--text`, `--accent`); Tailwind exposes them as `--color-*` in
`@theme inline` under a different name (`--color-fg: var(--text)`). Never `--color-bg: var(--color-bg)`: that is a
cycle and the colour vanishes. Full file: `drip_guide system/tokens`.

- **Do** reuse the project's vocabulary (`--background`, `--card`, `--primary` in a shadcn app). Consistency beats your taste in names.
- **Don't** rename existing tokens. Map new roles to them.

### The token set (what a full system has)

| Family | Tokens | Notes |
|---|---|---|
| Colour: surfaces | `bg`, `surface`, `surface-raised`, `surface-sunken`, `overlay` (scrim) | 3 surface levels is enough for most products |
| Colour: text | `text`, `text-muted`, `text-subtle`, `on-accent`, `text-inverse` | `text-subtle` only for disabled and placeholders, still 4.5:1 for placeholders |
| Colour: lines | `border`, `border-strong`, `focus` | `focus` ring 3:1 against both adjacent colours |
| Colour: action | `accent`, `accent-hover`, `accent-active`, `accent-subtle` (tinted bg) | one accent |
| Colour: state | `success`, `warning`, `danger`, `info`, each with `-subtle` and `-text` | never colour alone, add icon or word |
| Type | `font-display`, `font-body`, `font-mono`; `text-xs` ... `text-display`, each with line-height and tracking | `drip_guide type` |
| Space | Tailwind's 4px unit, or `--space-1` (4) to `--space-10` (128) | 4 8 12 16 24 32 48 64 96 128 |
| Size | `control-sm` 32, `control` 40, `control-lg` 48; `icon-sm` 16, `icon` 20, `icon-lg` 24 | one height per control size |
| Layout | `container` (1200-1280px), `container-prose` (65ch), `gutter` | `drip_guide layout` |
| Radius | `radius-sm`, `radius-md`, `radius-lg`, `radius-full` | see below |
| Shadow | `shadow-hairline`, `shadow-raised`, `shadow-overlay` (menus), `shadow-modal` | role names; Tailwind owns `shadow-sm` etc. |
| Border | `border-width` 1px, `focus-width` 2px, `focus-offset` 2px | hairlines are 1px, never 0.5px in CSS |
| Z-index | `z-base` 0, `z-raised` 10, `z-dropdown` 100, `z-sticky` 200, `z-overlay` 300, `z-modal` 400, `z-toast` 500, `z-tooltip` 600 | gaps leave room; never 9999 |
| Motion | `dur-press` 140, `dur-fast` 150, `dur-base` 200, `dur-modal` 240, `dur-sheet` 420ms; `ease-out`, `ease-in-out`, `ease-drawer`, `ease-enter` | shared with `drip_guide motion` |

### Radius

Pick one family from the direction and keep it:

| Family | sm (chips, inputs inside) | md (buttons, inputs) | lg (cards, panels) | xl (modals, sheets) |
|---|---|---|---|---|
| Sharp | 2px | 4px | 6px | 8px |
| Soft (default) | 4px | 8px | 12px | 16px |
| Round | 8px | 12px | 20px | 28px |

- **Do** nest concentrically: outer radius = inner radius + padding (a 12px card with 8px padding holds a 4px inner element). Above 24px of padding, treat the layers as separate surfaces.
- **Don't** put the same radius on everything. A 16px button inside a 16px card looks bloated.
- **Do** keep pill (`9999px`) for things that are pills by meaning: tags, toggles, avatars. A pill button is a direction choice, not a default.

### Shadow and depth

Decide first: does this world use shadows, tonal layering (surfaces a few % lighter or darker), or hairlines? Write it down; mixing all three is the cheap look.

```css
--shadow-hairline: 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.08);   /* ring that replaces a border */
--shadow-raised:   0 1px 2px oklch(20% 0.01 var(--hue) / 0.06), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);
--shadow-overlay:  0 4px 12px -2px oklch(20% 0.01 var(--hue) / 0.10), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);
--shadow-modal:    0 16px 40px -8px oklch(20% 0.01 var(--hue) / 0.18), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);
```

`--hue` is the page's anchor hue. In Tailwind v4 markup: `shadow-(--shadow-raised)`.

- **Do** tint shadows toward the page hue and keep alpha under 0.2. Shadows have an offset and a blur.
- **Don't** use `rgba(0,0,0,0.1)` the same on every card, zero-offset coloured glows, or a hard `4px 4px 0` block shadow unless the direction is neo-brutalist.
- **Do** use a card's border *or* its shadow, never both at full strength.
- **Dark mode:** shadows barely read. Elevation becomes lightness (each level about 3-4% L lighter) plus a 1px light ring (`0 0 0 1px oklch(100% 0 0 / 0.08)`). `drip_guide system/theming`.

### Motion tokens

The same set the motion guide uses, so every skill speaks one vocabulary:

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 140ms | press feedback |
| `--dur-fast` | 150ms | hover, tooltip, colour change |
| `--dur-base` | 200ms | menus, popovers, small reveals |
| `--dur-modal` | 240ms | dialogs |
| `--dur-sheet` | 420ms | sheets, drawers |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | anything entering, leaving or responding (the default) |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | things that move or morph while on screen |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | sheets and drawers |
| `--ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | an authored entrance that settles softly |

No `ease-in` on UI (it starts slow exactly when the user is watching). Exits run a little shorter than enters.
Product UI stays at 100-300ms. A `prefers-reduced-motion` block removes movement. Choices beyond tokens:
`drip_guide motion`.

### Extending an existing system

1. **Inventory** the roles it already covers (surfaces, text, accent, borders, radius, shadows, type steps).
2. **Map, don't duplicate.** If the project calls its page colour `--background`, your "bg" role *is* `--background`. Write the mapping in DESIGN.md.
3. **Fill gaps in its style.** Missing `warning`? Add `--warning` beside `--destructive`, same format (if the project stores bare `H S L` channels, so do you).
4. **Consolidate drift** only inside your task's scope: replace near-duplicates (`#111827`, `#111`, `#0f172a` for one role) with the token, and list what you changed.
5. **Never** change a value other screens depend on without saying so. A token change is a global change.
6. **Add a `## Variants` note** in DESIGN.md when one page legitimately needs something else, instead of overriding locally.

- **Do** say in one line what you kept: "Kept the shadcn tokens and Geist; added a warning colour, a 3-step shadow ladder and motion tokens."
- **Don't** drop a fresh `tokens.css` with new names next to a working theme. Two systems is worse than one imperfect one.
- A value used 3+ times with the same intent becomes a token; a token nobody reads is removed.

### When to call `drip_mark system`

All true: the token file exists and the app imports it; every colour, font, radius and shadow in new code reads a token; `palette_check` passed for every text/surface pair in light and dark (if dark ships); DESIGN.md is written or refreshed; one real fragment renders correctly from tokens alone. Not before. The fit check later compares the build against DESIGN.md, so a vague DESIGN.md costs you there.

## Slop tells in systems

| Tell | Fix |
|---|---|
| Raw hex and `px` colours scattered through components | Move to semantic tokens; components read `var(--accent)` or the utilities `@theme inline` generates (`bg-accent`) |
| Tailwind default palette as the brand (`indigo-500`, `blue-600`, `slate-*` everywhere) | Generate ramps from the direction's accent with `palette_generate`; keep Tailwind's palette for nothing or for data colours only |
| One radius (`rounded-xl`) on every element regardless of nesting | Radius family + concentric rule |
| The same `shadow-lg` on every card | A ladder by elevation; most cards sit at hairline or raised |
| `z-50`, `z-[999]`, `z-[9999]` | The named z ladder |
| Token names that describe values (`--gray-light-2`) | Role names |
| Dark mode done with `dark:` classes on every element | Remap semantic tokens once; components stay theme-blind |
| `#000` text on `#fff`, or pure black dark mode | Tinted near-black ink (L 15-22%) and near-white paper; dark bg L 12-18% |
| A DESIGN.md that lists hex codes with no rules | Named rules, where and why, exact values in brackets |
| Two parallel token sets (old theme + new tokens.css) | One set, mapped |
| `transition: all 0.3s ease` everywhere | Duration and easing tokens, explicit properties |

## Done when
- [ ] The project has exactly one token file (or one block in its entry stylesheet) and it is imported once.
- [ ] Primitives, semantic tokens and the Tailwind `@theme` mapping are present, in that order.
- [ ] No raw colour, shadow, radius or z-index in the code you wrote (search for `#`, `rgb(`, `z-[`, `rounded-[`).
- [ ] Light and dark (if shipped) only differ in the semantic block; components contain no `dark:` colour overrides.
- [ ] `palette_check` output for every text/surface pair, both themes, is pasted or summarised: all pass.
- [ ] Radius nests concentrically; shadows have offset and blur; one z ladder.
- [ ] DESIGN.md exists at the root with the template's sections, named rules and exact values.
- [ ] A fragment (heading, text, two buttons, input, badge) renders correctly from tokens in both themes.
- [ ] `drip_mark` step `system` called.

## Reference files
- `drip_guide system/design-md-template` — the full DESIGN.md template with instructions per section
- `drip_guide system/tokens` — naming, the complete token file, Tailwind v4 `@theme`, shadcn and DTCG mappings
- `drip_guide system/theming` — light/dark wiring, brand themes, the toggle and the no-flash script

## Sources
- Impeccable (Apache-2.0): the DESIGN.md convention and section order, "extend the incumbent, don't replace it", extract-only-what-repeats, primitive vs semantic tokens.
- Hallmark (MIT): the token family table, z-index ladder, motion durations, Tailwind v4 `@theme static` and `--spacing-*` trap, shadcn mapping, dark re-derivation.
- Taste Skill (MIT): one system per page, one radius family, one button recipe, rhythm tokens.
- Make Interfaces Feel Better (MIT): concentric radius, shadows instead of borders, dark-mode rings.
- UI UX Pro Max (MIT): z-index and semantic colour token guidance, dark-mode pairing.
- Anthropic frontend-design: inspiration only (the compact token plan before building), paraphrased.
