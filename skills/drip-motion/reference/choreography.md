# Motion: choreography of groups

When two or more things move because of one event, the decisions are about relationships: what moves, in what order, how much they overlap, and what holds still. Good choreography is mostly subtraction. Agents choreograph by adding a `delay: i * 0.1` to everything; the result is a queue the user waits through. The goal is one gesture: a wave, not a line of people.

## Step 1: cast every moving element

List everything that moves on the event, then give each one a part.

| Part | What it is | Treatment |
|---|---|---|
| **Lead** | The one thing the user must notice: the headline, the new view, the item acted on | Starts first, travels furthest (8-16px), longest duration |
| **Follow** | Content that belongs to the lead: subtitle, actions, the rest of the list | Starts during the lead, travels less (4-8px), shorter |
| **Accent** | Badges, pills, dividers, background shapes | Fades in place, no travel. Or nothing |
| **Still** | Everything else, including any container whose content moves | Does not animate |

If two elements both want to lead, the layout has a hierarchy problem. Motion will not fix it; say so and fix the hierarchy (`drip_guide layout`).

Most groups shrink here. A side panel with eight nav items becomes one move: the panel slides, the items are simply inside it.

## Step 2: choose a relationship for each pair

Ask in order:

1. **Same object or same moment?** (a drawer and its content; a removed chip and the siblings closing the gap) -> **Together**: same start, same duration family.
2. **Does order carry meaning?** (reading order, cause then effect, one arrives before the other) No -> **Together**. Order without meaning is only delay.
3. **Would both on screen at once look broken?** (two dense views overlapping in a container that resizes both ways; one thing passing through another) Yes -> **Sequence**, with the second starting just before the first ends. No -> **Overlap** (a stagger).
4. **Can't control the child's path?** (shared-element / `layoutId` moves) -> **Carry**: animate the parent and let the children ride along.

### Together

- **A removed element leaves the layout immediately**, so siblings close the gap while it fades, not after. In Motion: `AnimatePresence mode="popLayout"` with `layout` on the siblings. Without a library: pin the leaving element with `position: absolute` at its current offset, then animate it out.
- **A view swap in one container is a crossfade**: old exits while new enters (`mode="popLayout"`, not the default `sync`, which stacks both until the exit ends).
- **One component, one timing family.** A drawer that opens in 450ms and then resizes in 200ms reads as two objects. Share duration and curve family; inner content may use a gentler curve of the same family, never a different family.

### Overlap (stagger)

| Context | Step between items | Item duration | Whole group |
|---|---|---|---|
| Product UI (list loads, results) | 30-50ms | 200-250ms | under 300ms |
| Dashboard first load (cards) | 40-60ms | 250-300ms | under 400ms |
| Marketing hero, first visit | 80-120ms | 500-700ms | under 1100ms |

- **Never uniform.** Equal delays, distances and durations read as a metronome, the group equivalent of `linear`. Shrink the gaps as the group goes on (e.g. 0, 60, 100, 130, 150ms) or ease the delays (`stagger(0.05, { ease: "easeOut" })` in Motion).
- **Cap long lists.** Items after the 5th or 6th share the last delay. Item 20 never waits 20 steps.
- **Order by importance, not DOM order.** Usually they match; check. A title and its first line can share beat 0.
- **Direction follows reading or cause.** Top to bottom for content; outward from the click for things the user triggered (`stagger(0.04, { from: clickedIndex })`).
- **Vary the treatment by part**: lead travels 12px, follows 6px, accents only fade.

### Sequence

Only when overlap would look wrong:

- Morphing between two rich states in a container that changes width and height: the old content leaves before the new starts (`mode="wait"`), or use the double-render crossfade trick if you need overlap.
- One element would visibly pass through another: delay the occluding face until the moving items have nearly landed.
- Cause then effect in drawing: a checkbox square draws, the tick starts ~100ms before the square finishes. Both hold their end state (`animation-fill-mode: forwards`/`both`).

Always overlap the handoff by 50-100ms. A clean gap turns a gesture into a queue.

## Step 3: sync secondary motion to a moment

Each supporting motion hooks onto the lead's start, impact or settle, not onto a delay that looked about right.

- Effects belong to their cause: a press ripple fires on the click, not on the hover before it.
- Accents land with the lead: sparkle lines around an icon finish in the last ~20% of the icon's move (keyframe `times: [0.7, 0.9]`), the most important line first, the rest 30-40ms behind.
- A repeat action skips the build-up: the second click plays the same proportions, earlier.

## Step 4: direction and exits

- **Forward moves content left** (new enters from the right); back moves it right. Next and Back sliding the same way contradicts the action.
- In `AnimatePresence`, pass direction through `custom` on both the presence and the child; an exiting child otherwise animates with the direction it mounted with.
- **Exits are simultaneous, shorter and simpler.** No reverse stagger on close; everything leaves together at ~75% of the enter duration.
- An exit mirrors its entry path when space matters (slid in from the right, leaves to the right).

## Hard rules

1. **One entrance per container.** Never animate a parent in and also stagger its children.
2. **No stagger on high-frequency or keyboard surfaces**: menus, command palettes, select options, tab panels, table rows a user opens many times a day appear together, instantly or with one fade.
3. **Choreography never blocks.** Everything visible is clickable; a late item never holds back a button.
4. **Survives interruption.** Re-trigger mid-sequence (click Next twice, hover out halfway): running animations stop before new ones start. Rapid view switching must never leave two children mounted; every child has a stable unique `key`.
5. **Idle attention loops** wait ~2.5s before the first run, repeat rarely (~6s apart), stop while the user interacts, resume only after the reset finishes.

## Reduced motion

Collapse, don't shorten: remove delays and travel, keep opacity, let the group appear together. If the sequence is the explanation (a step-by-step demo), jump between its frames instead.

## Implementation

**CSS one-shot entrance** with a per-item delay and shrinking gaps:

```tsx
<section className="enter">
  <h1 style={{ "--d": "0ms" } as React.CSSProperties}>Title</h1>
  <p style={{ "--d": "0ms" } as React.CSSProperties}>Lead line, same beat</p>
  <p style={{ "--d": "90ms" } as React.CSSProperties}>Support</p>
  <div style={{ "--d": "150ms" } as React.CSSProperties}>Actions</div>
</section>
```

```css
.enter > * { animation: rise 560ms var(--ease-enter) both; animation-delay: var(--d, 0ms); }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } }
@media (prefers-reduced-motion: reduce) {
  .enter > * { animation-name: fade; animation-delay: 0ms; }
  @keyframes fade { from { opacity: 0; } }
}
```

`both` keeps delayed items at their first frame during the delay (no flash of the final state).

**Motion variants** with parts and a non-uniform stagger:

```tsx
import { motion, stagger } from "motion/react";
const ease = [0.23, 1, 0.32, 1] as const;
const group = { hidden: {}, show: { transition: { delayChildren: stagger(0.05, { ease: "easeOut" }) } } };
const lead = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } } };
const follow = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } };
const accent = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.25 } } };
```

Older Motion versions use `staggerChildren: 0.05` instead of `delayChildren: stagger(...)`.

**Removal that closes the gap together:**

```tsx
<AnimatePresence mode="popLayout" initial={false}>
  {items.map((it) => (
    <motion.li key={it.id} layout exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>{it.label}</motion.li>
  ))}
</AnimatePresence>
```

**Imperative (`useAnimate`)** only when several elements coordinate across several events and you must await completion; keep a list of running animations and `.stop()` them before starting the next set.

## Write the timeline before the code

| Element | Part | Starts | Duration | Motion | Relationship |
|---|---|---|---|---|---|
| Title | Lead | 0ms | 450ms | fade + 12px rise | - |
| Subtitle | Follow | 60ms | 350ms | fade + 6px rise | overlaps title |
| Actions | Follow | 100ms | 350ms | fade + 6px rise | overlaps subtitle |
| Badge | Accent | 0ms | 250ms | fade | together with title |
| Card frame | Still | - | - | - | carries its content |

Then list what you removed motion from and why. If you cannot fill a row's purpose, cut the row.

## Sources

*choreograph* skill (licence unclear; concepts paraphrased, no text or code reused): parts, relationships, sync-to-moment, interruption. Emil Kowalski, *emil-design-eng* (MIT): stagger bands, transitions over keyframes. *Make Interfaces Feel Better* (MIT): split-and-stagger for infrequent entrances. Impeccable (Apache-2.0): cap total stagger, never treat every section as a list.
