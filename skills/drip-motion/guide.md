# Motion

Good motion is mostly invisible. It answers the user within a frame, shows where things came from and went, and then gets out of the way. The interface never makes anyone wait for it to finish performing; the 50th use of the day feels as fast as the first. A few authored moments (a first-run success, a landing-page hero) may carry character, and they are rare on purpose. Everything moves on the compositor, reverses cleanly when interrupted, and still reads as a whole page with motion turned off.

## The procedure

Run these in order. Steps 1 and 2 can end the job with zero lines of code, and that is a good outcome.

1. **Read what exists.** Search the project for `--ease`, `--duration`, `transition`, `@keyframes`, `motion/react`, `framer-motion`, `gsap`, and the `@theme` block. If curves and durations already exist, extend them; never start a parallel set. Note the Motion version (14.2+ matters, see `motion/performance`).
2. **Gate: frequency.** How often will one person see this?

   | Frequency | Decision |
   |---|---|
   | 100+ a day, or keyboard-triggered (command palette, shortcuts, list arrow keys) | No animation. State changes instantly. |
   | Tens a day (hover, row selection, tab switch) | Colour/opacity at 100-150ms, or nothing |
   | Occasional (menus, modals, sheets, toasts) | Standard motion from the tables below |
   | Rare or first-time (onboarding, success, empty-state first fill, hero) | Room for an authored moment |

3. **Gate: purpose.** Write the one word: **feedback** (the UI heard you), **continuity** (where it came from / went), **state** (what changed), **relationship** (this belongs to that), **explanation** (how a feature works, marketing only), **delight** (rare tier only). No word, no motion. Data the user is reading or acting on never moves for style.
4. **Pick the cheapest tool.** CSS transition for state you toggle with a class or attribute; `@starting-style` for enter-on-mount; CSS keyframes for one-shot sequences and anything that must stay smooth while the page loads; WAAPI (`el.animate()`) for JS control without a library; Motion for springs, exit animations of unmounted nodes, layout/shared-element moves and gestures. Do not add a dependency for a fade.
5. **Before hand-building a moving component, look for one.** Call `components_find` ("toast", "drawer", "animated tabs", "number ticker"). Sonner, Vaul, Radix/Base UI with their `data-state` / `data-starting-style` hooks already solve origin, exit and focus. See `drip_guide components`.
6. **Pick properties, curve, duration** from the craft section. Write them as tokens, not literals.
7. **Plan interruption and exit.** What happens if it is triggered again halfway? Where does it leave to?
8. **Ship reduced motion and hover gating in the same change.**
9. **Check it.** Slow it to 10-20% in DevTools > Animations and step frame by frame. Trigger it twice fast. Toggle `prefers-reduced-motion` in DevTools rendering. `fitcheck_lint`, then `fitcheck_shot` the resting states, then `fitcheck_done`.

## The craft

### Properties

| Want | Animate | Not |
|---|---|---|
| Move | `translate` / `transform: translate()` (percentages are of the element's own size) | `top`, `left`, `margin` |
| Grow / shrink | `scale` | `width`, `height`, `padding` |
| Appear / disappear | `opacity`, then `visibility: hidden` or unmount at the end | `display` alone |
| Reveal / wipe | `clip-path: inset()` | `height` from 0 |
| Soften a crossfade | `filter: blur(2-4px)` during the swap | blur above 20px |
| Elevation on hover | opacity of a pseudo-element that holds the bigger shadow | `box-shadow` every frame |

- **Do:** `transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);`
- **Don't:** `transition: all .3s ease;` (it will animate the padding someone adds next month).

### Easing

| Situation | Curve |
|---|---|
| Entering or leaving the screen (menus, toasts, modals) | `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` |
| Moving or morphing while on screen (tab indicator, reorder, resize) | `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` |
| Sheets and drawers | `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` |
| Authored entrance that settles softly (hero, success) | `--ease-enter: cubic-bezier(0.22, 1, 0.36, 1)` |
| Colour, background, border on hover | `ease` at 100-150ms |
| Progress bars, hold-to-confirm fill, marquees, spinners | `linear` |

`ease-in` starts slowly at exactly the moment the user is watching, so a 200ms `ease-in` menu feels slower than a 200ms `ease-out` one. The browser's own `ease-out` is too weak to feel intentional. Never overshoot (no `back.out`, no elastic) on UI. Full tables and Tailwind v4 / Motion tokens: `motion/easing`.

### Duration

| Element | Enter | Exit |
|---|---|---|
| Press feedback | 100-160ms | same, on release |
| Hover colour | 100-150ms | 100ms |
| Tooltip | 125-150ms | 100ms; 0ms when moving between tooltips |
| Dropdown, popover, select | 150-200ms | 120-150ms |
| Modal / dialog | 200-250ms | 150-200ms |
| Sheet, drawer | 300-500ms | 250-350ms |
| Toast | ~400ms `ease` | 200-300ms |
| Authored hero entrance (whole sequence) | 600-1100ms | none |

Distance and consequence set duration: a 6px drop is 150ms, a full-height sheet is 400ms. Over 300ms on routine UI reads as latency. A faster spinner makes a load feel faster even when it is not.

- **Do:** a 180ms select.
- **Don't:** a 400ms dropdown "so people can see it".

### Springs

Use a spring when the motion can be grabbed, flung or reversed mid-way (drag release, sheet snap, a morphing island), or when it follows the pointer. Springs keep their velocity when retargeted; duration tweens restart.

- UI default in Motion: `{ type: "spring", duration: 0.35, bounce: 0 }`.
- Drag release, playful toggles: `bounce: 0.1-0.25`. Never above 0.3.
- Pointer-following decoration: smooth the raw value with `useSpring(value, { stiffness: 100-300, damping: 20-30 })` instead of setting it every move. Never on functional data (a chart, a balance).

### Enter and exit

- Start from something: `opacity: 0; transform: translateY(6-8px)` or `scale(0.96)`. Never `scale(0)`.
- Exits are smaller and quicker than enters: the user's attention is already elsewhere. A fixed `translateY(-4px to -12px)` plus fade beats sliding the full height.
- Leave the way you came when space matters: a toast that rose from the bottom leaves down; a drawer leaves to its edge.
- Mount animations: CSS `@starting-style` (or Tailwind v4 `starting:` variant) instead of a `mounted` state flag.
- Don't play enter animations on page load for things that were already there: `AnimatePresence initial={false}` for toggles, tabs, icon swaps.
- Remove instantly when motion adds nothing: dismissing a selection, clearing a search, keyboard-driven removals.

```css
.menu {
  transform-origin: var(--transform-origin); /* Base UI; Radix: var(--radix-dropdown-menu-content-transform-origin) */
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
}
.menu[data-starting-style], .menu[data-ending-style] { opacity: 0; transform: scale(0.96); }
.menu[data-ending-style] { transition-duration: 130ms; }
```

### Interruption

- Toggles, hover, toasts, accordions: CSS transitions or springs. Keyframes jump back to frame 0 when re-triggered.
- In JS sequences, stop running animations before starting new ones; never stack them.
- Test: click twice inside 100ms, hover in and out quickly, press Escape mid-open. It must reverse from where it is.

### Groups

One entrance per container; stagger only what reads as a list; 30-80ms steps in product UI with shrinking gaps; cap a long list after the 5th-6th item; exits leave together. Full rules: `motion/choreography`.

### Scroll

- **Product UI:** nothing animates on scroll. No card reveals, no parallax, no sticky headers that morph.
- **Marketing:** at most one scroll-tied moment per page, in its own section, scrubbed or fired once (`once: true`), never on text parallax, never smooth-scroll libraries that take over native scrolling unless the brief is an experience piece. Everything is visible with JS off and with reduced motion.
- Prefer native `animation-timeline: view()` / `scroll()` with a static fallback over scroll listeners.

### Reduced motion

Reduced motion means fewer and gentler, not none.

```css
@media (prefers-reduced-motion: reduce) {
  .menu, .toast, .sheet { transition-property: opacity; transform: none !important; }
  .stagger > * { animation-delay: 0ms !important; }
}
```

```tsx
const reduce = useReducedMotion(); // motion/react
<motion.div initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} />
```

Tailwind v4: `motion-safe:` and `motion-reduce:` variants. Loops (marquees, auto-advance, shimmer) stop entirely and show their finished frame. Anything that moves for more than 5 seconds needs a pause control regardless.

### Hover

Gate it: `@media (hover: hover) and (pointer: fine)`. Tailwind v4's `hover:` already applies only on hover-capable devices. Move a child, not the target (`.card:hover .card-body { translate: 0 -2px }`), so the hit area never slides away from the cursor. Lift 1-2px, image zoom 1.02-1.03 inside `overflow: hidden`. No tilt, no magnetic buttons, no glow following the cursor in product UI.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| `transition-all duration-300` on every element | Name properties; 150-200ms; strong ease-out token |
| Every section fades up as you scroll | Remove; let content stand. One authored moment at most, on marketing only |
| Cards `hover:scale-105` with shadow bloom | Lift 2px or darken the border one step; no scale on cards with text |
| Modal pops from `scale(0)` or zooms from 0.5 | `scale(0.96)` + opacity, 200-250ms, centred origin |
| Dropdown grows from its centre | `transform-origin` at the trigger via the library's CSS variable |
| `bounce`, `back.out`, `elastic` on buttons and menus | Bounce 0; overshoot only on drag release or a playful brand |
| Stagger of 100-150ms on a 20-item list | 30-50ms, cap after item 6, total under 300ms |
| Panel slides in, then its rows cascade in | One entrance: the panel carries its rows |
| Typing-text headline, gradient that shifts forever, pulsing dot | Static text; stop loops; a live dot only for real live status |
| Animated counters on every number | One count per page at most, final value in the HTML, tabular numerals |
| Command palette with a 300ms open | Instant |
| No `prefers-reduced-motion` anywhere | Add the block above in the same change |

## Done when

- [ ] Every animation has a one-word purpose and passes the frequency gate; keyboard paths are instant.
- [ ] Only `transform`, `opacity`, `clip-path`, bounded `filter` (and accordion height) animate; no `transition: all`.
- [ ] Curves and durations come from tokens; nothing uses `ease-in`; UI durations are 100-300ms (overlays to 500).
- [ ] Popovers scale from their trigger; modals from centre; nothing from `scale(0)`.
- [ ] Re-triggering mid-animation reverses smoothly (checked by double-clicking and hover in/out).
- [ ] No group has two entrance layers; staggers are non-uniform and finish in ~300ms in product UI.
- [ ] Reduced motion keeps opacity/colour feedback, drops movement, stops loops (checked in DevTools).
- [ ] Hover motion is pointer-gated and never moves the hit area.
- [ ] Nothing animates on scroll in product UI; marketing content is readable with JS off.
- [ ] `fitcheck_lint` is clean for motion rules and `fitcheck_done` has run.

## Reference files

- `drip_guide motion/easing` — curve and duration tables, springs, tokens for CSS, Tailwind v4 and Motion.
- `drip_guide motion/choreography` — groups: roles, relationships, stagger maths, view swaps, direction, removal.
- `drip_guide motion/performance` — frame budget, property cost tiers, main thread vs compositor, the traps.
- `drip_guide motion/recipes` — working code for the common pieces.

Related: `drip_guide interaction` (states, overlays, drag), `drip_guide polish` (the final details pass).

## Sources

- Emil Kowalski, *emil-design-eng* (MIT): the frequency gate, the strong custom curves, origin-aware popovers, never `scale(0)`, transitions over keyframes, springs for interruption.
- *Make Interfaces Feel Better* (MIT): subtle exits, skip-on-load, motion restraint, never `transition: all`.
- *animate*, *choreograph*, *animation-performance* skills (licence unclear; ideas paraphrased, no text reused): the build order, one-entrance-per-container, non-uniform stagger.
- Impeccable (Apache-2.0), *animate* reference: duration by consequence, hover moves a child not the target, motion thesis.
- Taste Skill (MIT), motion reference: scroll restraint, hover distances, pause for long-running motion.
- UI UX Pro Max (MIT), `motion.csv`: intensity tiers and the cleanup rules for loops.
