# Motion: recipes

Working starting points for the pieces that come up most. Tokens (`--ease-out`, `--ease-in-out`, `--ease-drawer`, `--ease-enter`) are defined in `motion/easing`. Before building any of these from scratch, check whether the library you already use does it (`components_find`): shadcn/Radix, Base UI, Sonner and Vaul expose the hooks used below.

## Press feedback

```css
.pressable { transition: scale 140ms var(--ease-out); }
.pressable:active:not(:disabled) { scale: 0.97; }
```

Tailwind v4: `transition-[scale] duration-150 ease-out-strong active:not-disabled:scale-[0.97]`.

- 0.96-0.98. Below 0.95 feels cartoonish. Large surfaces (cards, tiles) 0.98-0.99.
- Give the button component a `static` / `noPress` option for places where the movement distracts (dense toolbars, submit buttons in a busy form).

## Dropdown / popover / select (Radix via shadcn, Tailwind v4)

```tsx
<DropdownMenuContent
  className="origin-(--radix-dropdown-menu-content-transform-origin)
    data-[state=open]:animate-in data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
    data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
    duration-150 ease-out-strong"
/>
```

That uses the `tw-animate-css` utilities shadcn installs (they read Tailwind's duration and ease values). shadcn's defaults also add `slide-in-from-top-2` per side; keep that slide at 2 (8px) or drop it, never larger. Without them, plain CSS on the state attributes:

```css
.menu { transform-origin: var(--radix-dropdown-menu-content-transform-origin); }
.menu[data-state="open"]   { animation: pop-in 170ms var(--ease-out); }
.menu[data-state="closed"] { animation: pop-out 120ms var(--ease-out); }
@keyframes pop-in  { from { opacity: 0; transform: scale(0.97); } }
@keyframes pop-out { to   { opacity: 0; transform: scale(0.97); } }
```

Base UI: `transform-origin: var(--transform-origin)` and style `[data-starting-style]` / `[data-ending-style]` with a transition (interruptible), as in the main guide.

Radix keyframes are acceptable here because the library unmounts after the exit; for a toggle you manage yourself, use a transition.

## Tooltip

```css
.tooltip {
  transform-origin: var(--radix-tooltip-content-transform-origin);
  transition: opacity 130ms var(--ease-out), transform 130ms var(--ease-out);
}
.tooltip[data-state="delayed-open"] { /* first open: animated */ }
.tooltip[data-state="instant-open"] { transition-duration: 0ms; }
```

Provider: `delayDuration={500}` (first tooltip waits), `skipDelayDuration={300}` (moving to a neighbour within 300ms opens it instantly, and the `instant-open` rule skips the animation).

## Modal / dialog

```css
.dialog   { transform-origin: center; transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.backdrop { transition: opacity 220ms var(--ease-out); }
.dialog[data-starting-style], .dialog[data-ending-style] { opacity: 0; transform: scale(0.96) translateY(4px); }
.backdrop[data-starting-style], .backdrop[data-ending-style] { opacity: 0; }
.dialog[data-ending-style], .backdrop[data-ending-style] { transition-duration: 160ms; }
```

Backdrop and panel share duration so they read as one surface. A dialog opened by keyboard shortcut opens without animation.

## Sheet / drawer

Use Vaul for anything draggable. Its open curve is `--ease-drawer` around 500ms. A non-draggable side sheet:

```css
.sheet { transition: transform 420ms var(--ease-drawer); }
.sheet[data-state="closed"] { transform: translateX(100%); }  /* its own width, whatever it is */
```

Close at 300ms. On phones the bottom sheet uses `translateY(100%)`.

## Toast

Use Sonner. If you must build one:

```css
.toast {
  transition: opacity 400ms ease, transform 400ms ease;
  @starting-style { opacity: 0; transform: translateY(100%); }
}
.toast[data-leaving] { opacity: 0; transform: translateY(100%); transition-duration: 250ms; }
```

Transitions, not keyframes: toasts arrive in bursts and must retarget. Pause the dismiss timer on hover, on focus and while the tab is hidden.

## Accordion

```css
.panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms var(--ease-out); }
.panel[data-state="open"] { grid-template-rows: 1fr; }
.panel > .inner { overflow: hidden; min-height: 0; }
```

Or Radix's `--radix-accordion-content-height` with a 200ms height keyframe. This is the one tolerated layout animation: keep it at 200ms and never on a list with hundreds of rows. FAQ pages often read better fully open.

## Tab / segmented indicator

CSS, driven by the active tab's measured box (stays smooth during navigation):

```tsx
<span aria-hidden className="absolute inset-y-1 left-0 rounded-md bg-(--surface-2)
  transition-[translate,width] duration-200 ease-in-out-strong"
  style={{ translate: `${active.left}px 0`, width: active.width }} />
```

Width animating here is small and isolated; if it janks, set width instantly and animate only `translate` + `scale`. Motion alternative: a `layoutId="tab-indicator"` element inside the active tab; avoid it on tabs that trigger route loads.

## Icon swap (copy -> check, play -> pause)

```tsx
<AnimatePresence mode="popLayout" initial={false}>
  <motion.span key={copied ? "check" : "copy"}
    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    transition={{ type: "spring", duration: 0.3, bounce: 0 }}>
    {copied ? <Check /> : <Copy />}
  </motion.span>
</AnimatePresence>
```

No Motion in the project: stack both icons (one `absolute inset-0`), cross-fade `opacity`, `scale` and `filter` with `transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]`. Hold the check 1.5-2s, then swap back.

## Number change

```tsx
<span className="tabular-nums">{value}</span>
```

For a change worth noticing (a total updates), swap the digits that changed: each changed digit exits 8px up with fade and the new one enters from 8px below, 200ms `--ease-out`. Reserve the width; never animate a price, year or phone number counting up from zero. One counting animation per page at most, final value in the HTML.

## Hold to confirm

```css
.hold .fill { clip-path: inset(0 100% 0 0); transition: clip-path 200ms var(--ease-out); }
.hold:active .fill { clip-path: inset(0); transition: clip-path 1500ms linear; }
```

Fire the action on `transitionend` of the fill while still pressed; keyboard users get the same via a held Space/Enter or a plain confirm step.

## View transitions (same-document)

```ts
document.startViewTransition?.(() => flushSync(() => setView(next))) ?? setView(next);
```

```css
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 200ms; animation-timing-function: var(--ease-out); }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation: none; } }
```

Give a shared element a `view-transition-name` on both states for continuity (a thumbnail growing into a detail view). Keep names unique per page.

## Skeleton

```css
.skeleton { position: relative; overflow: hidden; background: var(--surface-2); border-radius: inherit; }
.skeleton::after {
  content: ""; position: absolute; inset: 0; translate: -100% 0;
  background: linear-gradient(90deg, transparent, oklch(1 0 0 / 0.5), transparent);
  animation: shimmer 1400ms ease-in-out infinite;
}
@keyframes shimmer { to { translate: 100% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton::after { animation: none; } }
```

Skeletons match the real layout's boxes so nothing jumps when content lands. Show them only if loading takes over ~300ms.

## Scroll reveal (marketing only, once)

```css
@supports (animation-timeline: view()) {
  .reveal { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
}
@keyframes rise { from { opacity: 0; translate: 0 16px; } }
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
```

One section per page, never on cards, rows or text blocks across the whole page.

## Sources

Emil Kowalski, *emil-design-eng* (MIT): press scale, origin-aware popovers, tooltip skip-delay, toast transitions, hold-to-confirm with clip-path. *Make Interfaces Feel Better* (MIT): icon swap values, static prop. *animate* skill (licence unclear): the set of recipes worth having; code here is written fresh. Taste Skill (MIT): counting and number rules. Radix, Base UI, Vaul and Sonner documentation for their state attributes.
