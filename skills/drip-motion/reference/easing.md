# Motion: easing, duration and springs

Every value in this file is a starting point that has shipped in good products. Use the project's tokens if they exist; otherwise add these once and reference them everywhere.

## The curve set

| Token | Value | Use for |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Anything entering or leaving: menus, popovers, toasts, modals, press release |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Something already on screen travelling or morphing: tab indicator, reorder, carousel step, resize |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets and drawers (iOS-like, used by Vaul / Ionic) |
| `--ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | Authored entrances that settle softly: hero lines, success state, onboarding |
| `ease` | browser keyword | Colour, background, border, shadow on hover; Sonner-style toasts |
| `linear` | browser keyword | Progress, hold-to-confirm fills, spinners, marquees, scrubbed scroll |

Never:

- `ease-in` on UI. It delays the first frames, which are the ones the user watches.
- The bare keywords `ease-out` / `ease-in-out` for authored motion. They are too flat; the custom curves above have the punch.
- Overshoot curves (`back.out`, `elastic`, `cubic-bezier(.34,1.56,.64,1)`) on menus, buttons, modals. Overshoot belongs to drag release and playful brands only.
- Inventing a curve that "looks familiar". If you need another, take it from easing.dev or easings.co and add it as a token.

## Duration table

| Element | Enter | Exit | Curve |
|---|---|---|---|
| Button / pressable `:active` | 100-160ms | same | `--ease-out` |
| Hover colour/background | 100-150ms | 100ms | `ease` |
| Focus ring | 0ms (appears in full) | 0ms | none |
| Tooltip | 125-150ms | 100ms | `--ease-out` |
| Subsequent tooltip in same group | 0ms | 0ms | none |
| Dropdown, select, context menu | 150-200ms | 120-150ms | `--ease-out` |
| Popover / hover card | 150-200ms | 120ms | `--ease-out` |
| Accordion (height) | 200ms | 150-200ms | `--ease-out` |
| Tab indicator travel | 200-250ms | n/a | `--ease-in-out` |
| Modal / dialog + backdrop | 200-250ms | 150-200ms | `--ease-out` |
| Sheet / drawer | 300-500ms | 250-350ms | `--ease-drawer` |
| Toast | ~400ms | 200-300ms | `ease` |
| Page / view transition | 200-300ms | 150-200ms | `--ease-out` |
| Hero entrance (whole sequence) | 600-1100ms | n/a | `--ease-enter` |
| Spinner rotation | 600-800ms per turn | n/a | `linear` |
| Skeleton shimmer | 1200-1600ms per sweep | n/a | `ease-in-out` or `linear` |

Rules of thumb:

- **Exit at about 75% of enter.** The user already decided; don't make them watch.
- **Scale duration with distance.** A 6px move: 150ms. A 300px panel: 300ms. A full-screen sheet: 400-500ms. A tiny resize with the full duration looks like a flicker; clamp: `duration = clamp(150, delta / 2, 300)` ms.
- **Asymmetric where the user is deciding.** Hold-to-delete fills over 1.5-2s `linear`; release snaps back in 200ms `--ease-out`.
- **Personality shifts the whole set, not one value.** A calm editorial product can sit 20% slower; a dense tool 20% faster. Shift every token together.

## Springs

Two ways to write the same idea in Motion:

```ts
// Perceptual (easier to reason about): how long, how much bounce
{ type: "spring", duration: 0.35, bounce: 0 }

// Physical (more control): mass, stiffness, damping
{ type: "spring", stiffness: 400, damping: 35, mass: 1 }
```

| Use | Config |
|---|---|
| UI default (layout shifts, segmented control, morphing button) | `duration: 0.3-0.4, bounce: 0` |
| Sheet snap after drag | `duration: 0.4-0.5, bounce: 0.1-0.15` |
| Drag-to-dismiss settle, playful toggle | `duration: 0.5, bounce: 0.2` |
| Icon swap (scale 0.25 to 1 + blur 4px to 0) | `duration: 0.3, bounce: 0` |
| Smoothing a pointer-driven value | `useSpring(v, { stiffness: 150-300, damping: 20-30 })` |

- Bounce never above 0.3. Smaller elements tolerate a little more bounce than large ones; a big panel with the same bounce looks heavy and slow to settle.
- Springs have no fixed end time. If something must finish before the next step (a sequence), use a tween or await the animation's promise.
- Springs are the right tool whenever the user can interrupt: they carry velocity into the new target. CSS transitions also retarget, but restart their timing.

## Tokens in the common stack

### CSS variables (any stack)

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-press: 140ms;
  --dur-fast: 150ms;   /* hover, tooltip */
  --dur-base: 200ms;   /* menus, popovers */
  --dur-modal: 240ms;
  --dur-sheet: 420ms;
}
```

### Tailwind v4

`--ease-*` in `@theme` generates `ease-*` utilities. Durations use the arbitrary-variable form.

```css
@import "tailwindcss";
@theme {
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
}
```

```tsx
<button className="transition-[scale,background-color] duration-150 ease-out-strong active:scale-[0.97]" />
<div className="transition-[opacity,translate] duration-200 ease-out-strong starting:opacity-0 starting:translate-y-1" />
```

- `transition-transform` in v4 covers `transform, translate, scale, rotate`. For mixed sets use brackets: `transition-[opacity,scale]`.
- Bare `transition` is a curated list (colours, opacity, shadow, transforms), still broader than needed; prefer naming.
- `starting:` maps to `@starting-style`; `motion-reduce:` / `motion-safe:` to the media query.

### Motion (motion/react)

```tsx
import { MotionConfig } from "motion/react";

export const ease = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
  enter: [0.22, 1, 0.36, 1],
} as const;

<MotionConfig transition={{ duration: 0.2, ease: ease.out }} reducedMotion="user">
  {children}
</MotionConfig>
```

`reducedMotion="user"` makes Motion drop transform and layout animation when the OS asks, while keeping opacity. Still check each authored moment by hand.

### GSAP equivalents

`power2.out` is close to a mild ease-out; for the strong curve register a custom ease (`CustomEase.create("out", "0.23,1,0.32,1")`). Avoid `back`, `elastic` and `bounce` on UI.

## Do / Don't

- **Do:** one token set, used everywhere. **Don't:** `duration-300 ease-in-out` sprinkled per component.
- **Do:** a dropdown at 180ms `--ease-out`. **Don't:** 400ms `ease-in-out`.
- **Do:** `linear` for a progress fill. **Don't:** ease a progress bar; it lies about progress.
- **Do:** `ease` for a toast that should feel calm. **Don't:** borrow the toast's 400ms for a menu.
- **Do:** spring with `bounce: 0` for layout. **Don't:** bounce a modal.

## Checking feel

Values that depend on feel cannot be settled from code. Slow the animation to 10-20% in DevTools > Animations, step frame by frame, and look for: two states visibly overlapping in a crossfade (add 2-4px blur during the swap), the wrong transform origin, properties finishing at different times, a hard stop at the end (curve too weak). Then look at it again later with fresh eyes.

## Sources

Emil Kowalski, *emil-design-eng* (MIT) for the curve set and duration bands; *animate* skill (licence unclear, paraphrased) for the build order; Impeccable (Apache-2.0) for duration-by-consequence and the settle curve; Taste Skill (MIT) for hover/press timing tokens; *Make Interfaces Feel Better* (MIT) for the icon-swap spring.
