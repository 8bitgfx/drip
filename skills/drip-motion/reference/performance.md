# Motion: performance

Motion that misses frames is worse than no motion: the same easing at 30fps reads as broken. The question here is never "does it look right?" but "does every frame finish in time on a mid-range phone?". A fast laptop hides almost everything in this file.

## The frame budget

| Refresh rate | Budget per frame |
|---|---|
| 60Hz | 16.7ms |
| 90Hz | 11.1ms |
| 120Hz (most phones, many laptops) | 8.3ms |

Design against 8ms. One forced layout on a complex page can cost 50-100ms: not one dropped frame but six to twelve.

Two things decide whether you fit: **what** you animate (cost per frame) and **where** it runs (can other work block it).

## What you animate: cost tiers

| Tier | Properties | Per-frame work |
|---|---|---|
| Composite only | `transform` (`translate`, `scale`, `rotate`), `opacity` | Cheapest; runs on the compositor |
| Usually composited | `filter` (Chromium), `clip-path` (newer Chromium), `background-color` (gaining support) | Measure in Safari and Firefox |
| Paint | `box-shadow`, `border-radius`, `color`, `background`, `outline` | Repaint every frame |
| Layout + paint | `width`, `height`, `padding`, `margin`, `top`, `left`, `border-width`, `font-size`, `gap`, `grid-template-*` | Re-measures the element and often its neighbours |

### Swap down a tier

| Instead of | Do |
|---|---|
| `width`/`height`/`padding` to grow | `scale` (children scale too; layout space stays) |
| `top`/`left`/`margin` to move | `translate` (percentages are of the element's own size) |
| `box-shadow` on hover | Put the larger shadow on a `::after` and animate its `opacity` |
| `height: 0 -> auto` for reveal | `clip-path: inset(0 0 100% 0) -> inset(0)`, or `grid-template-rows: 0fr -> 1fr` for a true accordion (still layout; keep it 200ms) |
| `display: none` toggle | `opacity` + `visibility`, or `@starting-style` with `transition-behavior: allow-discrete` |
| Sidebar `margin-left` push | `translate` the sidebar; reflow the content once at the end |

```css
.card { position: relative; }
.card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: 0 8px 24px oklch(0 0 0 / 0.12); opacity: 0;
  transition: opacity 150ms ease;
}
@media (hover: hover) and (pointer: fine) { .card:hover::after { opacity: 1; } }
```

## Where it runs

| Driver | Thread |
|---|---|
| CSS transitions and keyframes on `transform`/`opacity` | Compositor: keeps running while JS is busy |
| WAAPI (`el.animate()`), Motion's `animate()` and `motion.*` values it hands to WAAPI | Can be compositor |
| `requestAnimationFrame` loops, GSAP tweens, Motion layout animations (`layout`, `layoutId`), `onUpdate`, `transformTemplate`, drag/inertia, `useTransform` chains | Main thread, always |

The danger is motion that plays **while the page is working**: route changes, hydration, data fetching, a long list rendering. A tab indicator driven by a shared layout animation during navigation drops frames; the same indicator as a CSS transition on `transform` does not.

Working split: CSS (or WAAPI) for predetermined motion and anything that plays during loading; Motion for springs, exits of unmounted nodes, layout and gestures when the page is idle.

### Motion specifics

- Motion 14.2+ combines `x`, `y`, `scale`, `rotate` on HTML elements into one accelerated `transform`. Before 14.2 they run on the main thread; on old versions use `animate={{ transform: "translateX(100px)" }}` for motion that must survive load.
- Layout animations measure the DOM every frame: keep them to small subtrees, never a whole page.
- Motion values (`useMotionValue`, `useSpring`) update outside React render: use them for pointer-driven values.

## React traps

**Animating through state.** `setState` in `requestAnimationFrame`, `pointermove`, `scroll` or drag handlers re-renders every frame; the render alone eats the budget.

```tsx
// Drops frames
onPointerMove={(e) => setX(e.clientX)}
// Smooth
onPointerMove={(e) => { ref.current!.style.transform = `translateX(${e.clientX}px)`; }}
// or: x.set(e.clientX) with a motion value
```

**Inherited CSS variables.** Writing a per-frame value to a custom property on a parent (`--drag: 40px`) recalculates style for every descendant. It gets slower as content grows, which is the tell. Set `transform` on the moving element directly.

**Blur.** Animated `filter: blur()` gets expensive fast, worst in Safari. 2-4px softens a crossfade; never animate above 20px. Static `backdrop-filter` over a large, scrolling area costs on every scroll frame: keep glass panels small.

**Too many layers.** Hundreds of simultaneously animating nodes (big staggered grids, particle effects) exhaust GPU memory on phones. Animate the container or the first few items.

## `will-change`

Browsers already promote elements when a `transform`/`opacity` animation starts. The promotion itself can cause a one-pixel jump or a first-frame hitch, mostly in Safari. Only then:

```css
.sheet { will-change: transform; }        /* the moving element only */
```

- Never `will-change: all`, never on `*` or large containers, never for paint properties (`background`, `padding`) it cannot help.
- Each promoted layer costs GPU memory. Add it while the animation is known to run (e.g. on `pointerdown` for a drag) and remove it after, for anything big.
- It earns a permanent place on an element with an expensive paint that moves often, like a blurred hero layer; keep that layer small.

## Loops and offscreen work

- Pause loops and canvases when offscreen (`IntersectionObserver`) and when the tab is hidden (`document.visibilitychange`).
- Kill GSAP tweens and Motion animations on unmount; clear intervals.
- Skeleton shimmer: one gradient animated by `transform` on a pseudo-element, not `background-position` on every skeleton row.

## Diagnose in this order

1. **Which properties animate?** Expand `transition: all` and Motion shorthands into the real list. Layout properties first, then shadow and radius.
2. **Does the jank line up with the page being busy?** Navigation, fetch, hydration, long tasks -> move it to CSS/WAAPI.
3. **Is React re-rendering per frame?** Look for state updates in rAF, pointer, scroll and drag handlers.
4. **Does it get worse with more content?** Inherited custom property, or too many nodes animating.
5. **Old Motion shorthands under load?** Upgrade or use the transform string.
6. **Animated blur above 20px, or a big backdrop-filter?**
7. **Still a first-frame hitch or 1px jump?** Now add `will-change: transform`.

Every fix names which cause it addresses. "Added will-change, seems smoother" is not a diagnosis.

## Measuring

- DevTools Performance panel: record the interaction, look for red frames and long tasks overlapping the animation.
- DevTools Rendering: Paint flashing (green = repaint each frame) and Layer borders.
- CPU throttling 4-6x models a slow CPU, not a weak GPU or small memory; confirm on a real mid-range phone over remote debugging before saying "smooth".
- Say which findings are verified from code and which need a device recording.

## Sources

*animation-performance* skill (licence unclear; ideas paraphrased, no text reused): tiers, main-thread vs compositor, the React and CSS-variable traps, diagnosis order. Emil Kowalski, *emil-design-eng* (MIT): CSS beats JS under load, WAAPI, Motion acceleration caveat. *Make Interfaces Feel Better* (MIT): `will-change` rules. Impeccable (Apache-2.0): bound expensive effects, stop offscreen loops. UI UX Pro Max (MIT), `motion.csv`: tween cleanup and visibility pausing.
