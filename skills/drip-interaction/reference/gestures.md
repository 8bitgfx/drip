# Interaction: drag, swipe and gestures

A gesture feels right when the element stays glued to the finger, keeps the momentum of the flick when you let go, slows down instead of hitting a wall at its limits, and never jumps when a second finger lands. Most of this is handled by good libraries (Vaul for sheets, dnd-kit or Pragmatic drag and drop for lists, Embla for carousels, Motion's `drag`). Reach for one first (`components_find`); build your own only for something genuinely custom, and then follow every rule here.

## The rules

1. **Glue to the pointer.** During the drag, the element follows the pointer 1:1 with no transition and no easing. Set `transform` directly on the element each `pointermove` (or a motion value). Never route it through React state or a CSS variable on a parent.
2. **Capture the pointer.** On `pointerdown`, call `el.setPointerCapture(e.pointerId)` so the drag continues when the pointer leaves the element or the window edge.
3. **One pointer.** Track the starting `pointerId` and ignore others until it ends. Without this, a second finger makes the element jump to it.
4. **A small threshold before starting.** Treat movement under ~3-5px (mouse) or ~8-10px (touch) as a click/tap, not a drag, so taps still work.
5. **Decide the axis early.** On a vertical sheet, if the first ~10px of movement is mostly horizontal, let the page or carousel have the gesture.
6. **Release on momentum, not only distance.** Dismiss or snap when distance passes the threshold *or* velocity passes ~0.11 px/ms (about 110 px/s); a quick flick is enough.
7. **Settle with a spring.** On release, animate from the current position and velocity to the target (`{ type: "spring", duration: 0.4-0.5, bounce: 0.1-0.2 }`), so an interrupted or reversed gesture keeps its speed.
8. **Damp past the edge.** Beyond a limit the element moves less the further you pull (rubber band) instead of stopping dead.
9. **Clean up every way a gesture can end.** `pointerup`, `pointercancel` (the browser took over to scroll), `lostpointercapture`, window `blur`. Clear state and release capture each time; the next drag must work without a reload.
10. **Always an alternative.** Every drag result is reachable without dragging: buttons to move up/down, keyboard (Space to pick up, arrows to move, Space to drop, Escape to cancel), a close button on swipeable sheets and toasts.

## Code shape

```ts
const SWIPE_DISTANCE = 120;      // px
const SWIPE_VELOCITY = 0.11;     // px per ms

function onPointerDown(e: PointerEvent) {
  if (drag.active) return;                    // one pointer only
  drag = { active: true, id: e.pointerId, startY: e.clientY, startT: performance.now(), y: 0 };
  el.setPointerCapture(e.pointerId);
  el.style.transition = "none";
}

function onPointerMove(e: PointerEvent) {
  if (!drag.active || e.pointerId !== drag.id) return;
  const raw = e.clientY - drag.startY;
  drag.y = raw < 0 ? -damp(-raw) : raw;       // rubber band upwards past the top
  el.style.transform = `translateY(${drag.y}px)`;
}

function onPointerUp(e: PointerEvent) {
  if (!drag.active || e.pointerId !== drag.id) return;
  const velocity = Math.abs(drag.y) / (performance.now() - drag.startT);
  const dismiss = drag.y > SWIPE_DISTANCE || (drag.y > 0 && velocity > SWIPE_VELOCITY);
  el.style.transition = "transform 300ms var(--ease-drawer)";
  el.style.transform = dismiss ? "translateY(100%)" : "translateY(0)";
  end();
}

const damp = (d: number) => 8 * Math.sqrt(d);  // grows slower the further you pull
```

Velocity over the whole gesture is a fair approximation; for long drags, measure over the last ~100ms of movement instead.

## CSS for draggable things

```css
.draggable {
  touch-action: none;          /* or pan-y on a horizontal swiper, pan-x on a vertical one */
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}
.draggable[data-dragging] { cursor: grabbing; }
html[data-dragging] { cursor: grabbing; user-select: none; }  /* keep the cursor while outside the element */
```

- `touch-action` must be set before the gesture starts; it cannot be changed mid-gesture.
- Prevent image ghost-dragging inside draggables: `draggable="false"` on `<img>`.
- Scrollable content inside a draggable sheet: only start the sheet drag when the content is scrolled to the top (Vaul does this).

## Reordering lists

- Lift the item: shadow up one level, `scale(1.02)`, a slight opacity drop on the original slot or a placeholder of the same height.
- Neighbours move out of the way with a 150-200ms transform transition; the dragged item itself has no transition.
- Drop: the item settles into its slot with a 200ms spring or `--ease-out`.
- Auto-scroll the container when dragging within ~40-60px of its edge, speed rising toward the edge.
- Announce moves for screen readers ("Item 3 moved to position 1") via a live region; dnd-kit and React Aria do this.

## Sliders

- Thumb 16-20px visual, 44px hit area on touch; the whole track is clickable and jumps the thumb there.
- Show the value while dragging (tooltip above the thumb or a live label) and in a text field for precise entry.
- Keyboard: arrows step, Page Up/Down step by 10%, Home/End to limits.
- No transition on the thumb while dragging; 150ms when it jumps after a track click.

## Carousels and swipers

- Native scroll with `scroll-snap-type: x mandatory` beats a JS carousel for most cases: momentum, accessibility and performance for free.
- Visible next/previous buttons on pointer devices; peek the next item (10-15% visible) so people know there is more.
- Never auto-advance without a pause control; stop on hover, focus and reduced motion.

## Pull-to-refresh, swipe actions

- Swipe actions on rows (archive, delete) reveal colour and an icon under the row, commit past ~40% width or on a fast flick, and always have an equivalent in a menu.
- Custom pull-to-refresh only in installed or native-feeling apps; set `overscroll-behavior-y: contain` to stop the browser's own when you replace it.

## Testing

- Real device for anything touch. Emulated touch in DevTools misses velocity, multi-touch and scroll conflicts.
- Try: second finger mid-drag, scroll across the control, release outside the element, switch apps mid-drag, drag again afterwards.
- Slow the settle animation to check it starts from the release velocity, not from zero.

## Sources

Emil Kowalski, *emil-design-eng* (MIT): velocity dismissal at ~0.11, damping and friction, pointer capture, multi-touch guard, setting transform directly. Impeccable (Apache-2.0), *harden*: interrupted gestures and cleanup events, testing on hardware. UI UX Pro Max (MIT): dragging alternatives, no gesture-only actions, gesture conflicts. *animation-performance* skill (licence unclear, paraphrased): the inherited-variable trap during drag.
