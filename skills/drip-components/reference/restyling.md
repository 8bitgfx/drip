# Components: restyling to the tokens

An installed component is a first draft. Shipping it with its defaults is the single most common reason AI-made UI looks AI-made: everyone has seen the default shadcn card, the zinc border, the `rounded-md` everywhere, the 3px blurry focus halo. Restyling is not decoration on top; it is replacing every visual decision the library made with the one the product's system made.

## Before you start

- The tokens must exist. If there is no palette, type scale, radius and shadow set yet, do that first (`drip_guide system`, `drip_guide color`, `drip_guide type`). Restyling to nothing just moves the defaults around.
- Read the component's file top to bottom. List every hard-coded visual value: colour classes, radius, shadow, border, ring, height, padding, font size and weight, transition, animation keyframes, icon size.

## The pass, in order

1. **Map the theme variables.** shadcn components read `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`. Point them at the project's tokens once, globally, instead of editing every component.
2. **Radius.** Set `--radius` from the system; then check nesting: a popover's items, a card's inner image, a button inside an input group. Outer = inner + padding (`drip_guide polish/surfaces`).
3. **Borders and shadows.** Replace stock `border` + `shadow-xs` with the system's elevation tokens: hairline borders for structure, shadow-as-border for raised surfaces, one overlay shadow for popovers and dialogs.
4. **Focus.** Replace the library's ring (`focus-visible:ring-[3px] ring-ring/50`) with the product's: 2px outline, 2px offset, the ring token.
5. **Type.** Font size, weight, tracking and line height from the type scale; `font-medium` on buttons only if the system says so. Numbers `tabular-nums` where they change.
6. **Sizes.** Heights and paddings from the size table (`components/anatomy`), so buttons, inputs and selects align.
7. **Motion.** Replace `transition-all` and stock durations with named properties and the motion tokens (`drip_guide motion/easing`); fix `transform-origin` on overlays.
8. **Icons.** Swap the library's icon imports for the project's one family (`icons_search`, `icons_get`), at the size the component's size sets, stroke matching the text weight.
9. **Delete.** Remove variants, sizes and slots the product doesn't use. Less surface, fewer inconsistencies.
10. **Dark mode.** Check every state in dark. Shadows mostly disappear in dark; elevation moves to lighter surfaces and white hairlines.
11. **Sheet it.** Render variants x sizes x states, light and dark; `fitcheck_shot`.

## Tailwind v4 theme mapping

```css
@import "tailwindcss";

:root {
  /* the product's tokens (names from drip_guide system/tokens; palette_generate prints them) */
  --bg: oklch(0.985 0.004 85);
  --text: oklch(0.21 0.01 85);
  --text-muted: oklch(0.48 0.01 85);
  --border: oklch(0.21 0.01 85 / 0.1); /* shadcn also reads --border, so it maps itself */
  --accent: oklch(0.62 0.19 35);
  --on-accent: oklch(0.99 0 0);
  --accent-subtle: oklch(0.95 0.03 35);

  /* shadcn's names pointed at them */
  --background: var(--bg);
  --foreground: var(--text);
  --muted-foreground: var(--text-muted);
  --input: var(--border);
  --primary: var(--accent);
  --primary-foreground: var(--on-accent);
  --ring: var(--accent);
  --radius: 10px; /* the base of the radius scale in DESIGN.md; the @theme block derives the rest */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* Name clash: in shadcn, "accent" is the SUBTLE hover background (bg-accent on menu items),
     not the brand colour. Point shadcn's accent utilities at the subtle token, never at --accent. */
  --color-accent: var(--accent-subtle);
  --color-accent-foreground: var(--text);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

Colour values come from `palette_generate` and are checked with `palette_check`; never pick them by eye in a component file.

## What to change in a typical shadcn button

| Default | Change to | Why |
|---|---|---|
| `transition-all` | `transition-[background-color,scale] duration-150 ease-out-strong` | Never animate everything |
| no press state | `active:not-disabled:scale-[0.97]` | Feedback within 100ms |
| `focus-visible:ring-[3px] focus-visible:ring-ring/50` | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)` | Crisp, consistent, survives forced colours |
| `shadow-xs` on outline variant | `shadow-(--shadow-border)` or none | System elevation |
| `rounded-md` | the radius token for this size | Nesting and personality |
| `h-9 px-4 py-2` | the size table values | Alignment with inputs |
| `hover:bg-primary/90` | `hover:bg-(--brand-hover)` | Tokenised hover step, not opacity (which shows the background through) |
| `[&_svg:not([class*='size-'])]:size-4` | size from the component size | Icons scale with the button |

## Typical card / popover / dialog changes

- Card: drop `shadow-sm` + `border` combo for one elevation decision; padding from the spacing scale (20-24px desktop, 16px mobile); title weight and size from the type scale; inner media radius = card radius - padding.
- Popover / menu: one overlay shadow token; 4-6px inner padding with items whose radius = popover radius - padding; item height 32-36px; origin variable for motion.
- Dialog: backdrop from the scrim token (not `bg-black/50` everywhere); max width from content; close button as an icon button with a 40px hit area; footer actions right-aligned, primary last.
- Inputs: border token at 3:1 for the boundary, focus border + soft ring, 16px font on touch.

## Restyling effect components (Magic UI, Aceternity, React Bits)

- Colours: replace their neon gradients and purple-blue defaults with the palette; one accent.
- Speed: halve the default animation speed or slow it until it reads as ambient, not busy.
- Reduced motion: add a static fallback; most effect components ship without one.
- Pause offscreen and in hidden tabs.
- Remove decorative layers (grain, extra glow, particles) unless the direction calls for them.

## Do / Don't

- **Do:** change the component file; it's yours. **Don't:** wrap and override with `!` classes.
- **Do:** fix the theme variables once. **Don't:** recolour each component with hex classes.
- **Do:** delete unused variants. **Don't:** keep `outline`, `secondary`, `ghost`, `link` "just in case" if the design has two.
- **Do:** check dark mode per state. **Don't:** assume the library's dark theme fits your palette.

## Checks

- Search the component folder for raw colours (`#`, `rgb(`, `bg-zinc`, `bg-slate`, `text-gray`), raw radii (`rounded-[`), `shadow-sm`/`shadow-xs`, `transition-all`, `ring-[3px]`. Each hit is either a token or deleted.
- `fitcheck_lint` for off-scale values; `fitcheck_shot` the sheet; compare with the chosen direction (`fitcheck_compare`).

## Sources

*Make Interfaces Feel Better* (MIT): express changes in the project's existing styling system, shadows over borders for depth, concentric radii. Impeccable (Apache-2.0), *polish*: missing token vs one-off triage, promote reused values to tokens. Emil Kowalski, *emil-design-eng* (MIT): press feedback, origin-aware popovers. shadcn/ui documentation for its theme variable names.
