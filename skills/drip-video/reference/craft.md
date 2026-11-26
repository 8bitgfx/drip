# Craft: principles, easing, materials, choreography

All code assumes the kit's composition: one paused `tl`, `spring({ bounce })`, seeded `rand()`, absolute times.

## The principles, for film

| Principle | Do | Don't |
|---|---|---|
| Timing | Give weight time: a hero move 0.8-1.4s, a small one 0.4-0.7s | Use UI timing (0.2s) for everything; it reads as a twitch on a big screen |
| Spacing | Bunch frames at the start or end of a move (ease) so the eye sees where it settles | Move at constant speed unless it is a machine |
| Anticipation | Pull back 10-20% of the distance for 0.08-0.2s before a big move | Anticipate small moves or text; it looks twitchy |
| Follow-through | Let the trailing parts (a tail, a label, a shadow) settle 0.05-0.15s after the lead | Stop everything on the same frame |
| Overlapping action | Start the next move at 60-80% of the last | Wait for each move to finish like a slideshow |
| Squash and stretch | 10-25% on a falling or bouncing object, volume kept (scaleX 1.15, scaleY 0.85) | Squash text or UI, or squash without keeping volume |
| Arcs | Move objects along curves (x and y on different eases) | Straight lines between points for anything alive |
| Staging | One focal point per frame, supported by one secondary | Four things competing at the busiest moment |
| Exaggeration | Push the key move 20% past what feels natural; film is seen once | Exaggerate everything; the contrast disappears |
| Object permanence | The thing that left is findable (it went off an edge, it shrank into the motif) | Make things vanish without a place to go |
| Visual continuity | The end of a move is the start of the next (position, direction, speed) | Cut to a new scene with no shared element |
| Rhythm | A repeating pulse (a beat grid) that the moves ride, with deliberate breaks | Random timings with no pulse |
| Appeal | Clear silhouettes, strong shapes, a readable pose at every pause | Clutter that only reads while moving |
| Contrast | A fast move after a hold, a big thing next to a small one, colour against neutral | Motion everywhere, so nothing stands out |
| Secondary action | A small second motion supporting the main one (a drifting highlight, a cursor blink) | Secondary motion that is louder than the lead |

## Easing is a velocity curve

Ease names hide what you are choosing: how fast the thing moves at each instant. Think in speed.

| Curve | Speed over the move | Use for |
|---|---|---|
| `none` (linear) | constant | loops, rotating machines, scrubbing, progress bars |
| `power2.out`, `power3.out` | fast start, long soft landing | things arriving; most entrances |
| `expo.out` | very fast start, very long tail | snaps into place, a punchy reveal |
| `power2.in` | slow start, fast end | things leaving or falling; the first half of an anticipation-less exit |
| `power3.inOut`, `expo.inOut` | slow, fast, slow | a big morph or camera move between two states |
| `back.out(1.4)` | overshoots and returns | cheap bounce; prefer a spring |
| `spring({ bounce })` | overshoot with physical settling | objects with weight; the hero |
| anticipate (a small move the wrong way, then go) | dips back, then launches | big jumps and pops |

Rules of thumb:

- Arrivals use out-curves, departures use in-curves. Never `ease-in` on an arrival: the thing crawls in and the
  viewer waits.
- A morph between two held states uses in-out so it leaves and arrives softly.
- Linear for a held beat is fine only when the speed is the point.

### Springs: damping, stiffness, mass

A spring is described by how fast it pulls (stiffness), how quickly it stops bouncing (damping) and how heavy the
thing is (mass). The kit's `spring({ bounce })` hides those in one number and is exact at any time (closed form), so
seeking is safe.

| bounce | Feel | Overshoot of the distance | Use |
|---|---|---|---|
| 0 | Critically damped: arrives with no overshoot, soft tail | 0% | type, UI, big calm elements |
| 0.08 | Barely there | about 2% | cards, windows |
| 0.15 | Light bounce | about 8% | buttons, small objects |
| 0.25 | Playful | about 20% | hero object, stickers, logos |
| above 0.3 | Wobbly | 30%+ | only for a joke |

Heavier things: longer duration (1.0-1.4s), lower bounce, more anticipation. Lighter things: shorter duration
(0.5-0.7s), higher bounce. Do not use one spring for everything.

### Velocity continuity across joined tweens

When tween B starts as tween A ends, B should start at the speed A ended with. An out-curve ends at zero speed,
so a following tween that starts fast produces a visible stop-start.

- Join an out-curve to an in-curve only with a deliberate hold.
- To pass through a point without stopping, use ONE tween with a path, or end A on a linear or `power1.out` curve
  and start B on `power1.in`, overlapped by 0.1s.
- A spring that overshoots then hands over to a second move: start the second move on the overshoot's peak
  (about 35% into the spring), not after the settle.

## Materials

The same distance can read as glass, paper, rubber or lead depending on curve and timing. Choose a material for each
kind of object and keep it consistent.

| Material | Easing and timing | Extras |
|---|---|---|
| Glass, frosted panel | slow, smooth, `power3.inOut`, 0.9-1.3s, no bounce | blur and opacity change with speed; a highlight sweeps across after the move |
| Paper, card | `power2.out`, 0.5-0.8s, tiny bounce 0.05; slight rotation (1-3 degrees) | a small drift after landing (follow-through) |
| Type | bounce 0, `power3.out` or `expo.out`, 0.5-0.9s | clip or mask reveals rather than bounce |
| Elastic, rubber | `spring` bounce 0.25-0.35, squash and stretch 15-25% | settle takes 0.6-0.9s |
| Heavy metal | slow start (`power2.in`), a hard stop, a 3-6px shake, no bounce | camera nudges on impact; low sound with a long tail |
| Liquid | arcs, stretching leading edge, trailing edge lags 0.1s | metaballs or blobby morphs |
| Light, glow | fast, eased in and out, opacity not position | reads as a pulse, not a movement |
| Mechanical (UI, cursor) | exact, fast, `power2.out` 0.25-0.5s | no wobble; settle only before a click |

## Choreography

Choreography is who moves first, who follows, who waits, and who stays still.

- **Hierarchy.** One lead. The lead moves first and furthest. Followers move 0.05-0.15s later and less far.
  Background elements move last, least, or not at all.
- **Lead and follow.** The cause arrives before the effect: a cursor reaches the card, then the card moves. The delay
  carries meaning.
- **Counter-motion.** When the lead goes right, the background goes left 5-10% as far. The scene gets depth.
- **Shared origins.** Elements that appear together come from one point (the motif, one edge); do not scatter them
  from random sides.
- **Stagger patterns.** Index order (0.06s each) for lists; from the centre outward for a radial reveal; from the
  motif outward for something the motif causes; reversed for exits; never random for important items.
- **Rest.** Everything that is not the lead can hold. Moving everything dilutes attention.

| Stagger | Delay per item | Total limit |
|---|---|---|
| Letters | 0.02-0.04s | 0.6s for a line |
| Words | 0.06-0.12s | 0.8s |
| Cards or rows | 0.06-0.1s | 0.8s (1.2s for 10+) |
| Radial, from centre | 0.03-0.05s per ring | 1.0s |

### Leading and trailing edges on different springs

A shape that moves as a whole looks stiff. Stretch it: its leading edge springs fast and its trailing edge follows
softer, later. Here a pill travels from a small dot to a wide bar. The right edge leads; the left edge trails.

```js
// A pill from x=160 (80px wide) to x=160..1120 (960px wide). Right edge leads, left edge follows.
const pill = S("#pill");
const L0 = 160, R0 = 240, L1 = 160, R1 = 1120;     // left and right edges, start and end
const state = { l: L0, r: R0 };
const apply = () => gsap.set(pill, { x: state.l, width: state.r - state.l });
apply();

tl.addLabel("stretch", 2.0)
  // Leading edge: quick, small overshoot
  .to(state, { r: R1, duration: 0.7, ease: spring({ bounce: 0.18 }), onUpdate: apply }, "stretch")
  // Trailing edge: starts 0.08s later, softer (no overshoot), lands later
  .to(state, { l: L1, duration: 0.9, ease: spring({ bounce: 0 }), onUpdate: apply }, "stretch+=0.08");
```

`onUpdate` runs on every seek, so the result is a pure function of time. The same method works with a
vertical edge for a growing card, or with corner radius that lags the size:

```js
tl.to("#card", { width: 900, height: 520, duration: 0.8, ease: spring({ bounce: 0.1 }) }, "t")
  .to("#card", { borderRadius: 28, duration: 1.0, ease: "power3.out" }, "t+=0.1"); // radius follows later
```

### Overlap and follow-through in code

```js
// Lead lands at t+0.8. Its label starts at 60% of the move and settles after it.
tl.to("#hero", { y: 0, duration: 0.8, ease: spring({ bounce: 0.15 }) }, "t")
  .from("#label", { y: 24, opacity: 0, duration: 0.55, ease: "power3.out" }, "t+=0.48")
  .to("#hero", { rotation: -2, duration: 0.5, ease: "power2.out" }, "t+=0.8")  // a small drift after landing
  .to("#hero", { rotation: 0, duration: 0.7, ease: spring({ bounce: 0 }) }, "t+=1.3");
```

### Anticipation and squash

```js
tl.to("#ball", { y: "+=30", scaleX: 1.12, scaleY: 0.88, duration: 0.14, ease: "power2.out" }, "j")   // crouch
  .to("#ball", { y: -420, scaleX: 0.9, scaleY: 1.14, duration: 0.45, ease: "power2.out" }, "j+=0.14") // launch, stretch
  .to("#ball", { y: 0, scaleX: 1.2, scaleY: 0.8, duration: 0.4, ease: "power2.in" }, "j+=0.59")      // fall, hit
  .to("#ball", { scaleX: 1, scaleY: 1, duration: 0.5, ease: spring({ bounce: 0.25 }) }, "j+=0.99");  // recover
```

Volume is kept: scaleX times scaleY stays near 1.

## Check

After building a move, `motion_frames` with `from`, `to`, `step: 0.033` across it. The sheet must show: a
clear anticipation, the lead arriving before the follow, a visible overshoot (if any) and a settle, no frame where
two things collide, and one frame that is a good still. If the strip looks like a straight line of identical
copies, the easing is linear and the move has no life.
