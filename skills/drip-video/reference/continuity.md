# Continuity: one film, not a deck of slides

Continuous storytelling means the viewer is never dropped into a new scene. Something from the old frame is in the
new one, in the same place, at the same speed. The most common failure of AI films is a sequence of separate
compositions, each built from nothing and faded in. Continuity is the cure.

## The rule

The end of one move starts the next. Before writing a transition, answer: what is shared across the boundary?
It can be:

| Shared | Example |
|---|---|
| The motif | A dot becomes a cursor becomes a card |
| A position | The headline's last word sits where the next scene's first element begins |
| A shape | A circle in scene A is the iris that opens scene B |
| A colour | The accent floods the frame and becomes the next ground |
| A direction and speed | A push to the left continues as the next scene slides in from the right at the same speed |
| A line | A horizontal rule becomes the edge of a panel |
| A sound | A riser carries across a hard cut |

If nothing is shared, it is a cut, and a cut needs a reason (the beat, a surprise, a scale jump).

## A motif that changes meaning

Keep one object on screen and change what it is. The viewer follows it, so they never feel a gap.

- Same element in the DOM. Do not remove it and add another. Animate size, radius, colour, position and content.
- Content inside it changes with a short blur or a mask, 0.2-0.3s, with the old content exiting at about 70% of the
  entrance's length.
- Each state is a designed still. The meaning changes at the pause, not in the middle of the move.

```js
// The motif is a rounded square. It becomes a window, then a button, then the logo mark.
tl.addLabel("toWindow", 3.0)
  .to("#motif", { width: 1100, height: 620, borderRadius: 24, x: 410, y: 230, duration: 1.0, ease: "expo.inOut" }, "toWindow")
  .to("#motif-fill", { backgroundColor: "#111318", duration: 0.6 }, "toWindow+=0.2")
  .to("#dot", { opacity: 0, scale: 0.6, duration: 0.25 }, "toWindow")                       // old content leaves early
  .from("#window-ui", { opacity: 0, y: 16, duration: 0.5, ease: "power3.out" }, "toWindow+=0.7"); // new content after the shape
```

## Transform instead of delete and introduce

- Do not fade an element out and fade a different one in at the same place. Morph one into the other.
- Do not introduce an element from nowhere. It comes from an edge, from the motif, from behind something, or grows
  from a point that already holds attention.
- When something must go, it goes somewhere (off the edge it came from, into the motif, behind a panel).

## Match cuts

A cut that works because the two frames rhyme.

- Position: the last element of frame A and the first of frame B occupy the same screen area.
- Shape: a circle (a wheel, a sun, a button) becomes another circle at the same size and place.
- Motion: the cut is hidden inside a fast move; the move continues in the same direction at the same speed.
- Scale: a close-up of something small cuts to a wide shot of something big with the same shape in the middle.

Check with `motion_frames` and `around: [t]`: frames at -0.1 and +0.1 must look like one continuous picture.

## Shared-element morphs

Two scenes share an element and the element changes frame size.

```js
// A card in scene A grows to become the full-screen background of scene B.
tl.to("#card", { x: 0, y: 0, width: W, height: H, borderRadius: 0, duration: 0.9, ease: "expo.inOut" }, "swap")
  .to("#sceneA .rest", { opacity: 0, duration: 0.3, ease: "power2.in" }, "swap")             // others leave quickly
  .from("#sceneB .title", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, "swap+=0.6");
```

Order matters: the shared element moves first, the others leave early (65-75% of an entrance), the new content arrives
after the shape is nearly in place.

## Masks, iris, portals

- **Iris:** a circular `clip-path` grows from the motif's centre. `clip-path: circle(0px at 960px 540px)` to
  `circle(1300px at 960px 540px)`, `expo.inOut`, 0.8-1.2s. The new scene lives inside the circle.
- **Portal:** the shape's border stays visible as a ring while the inside shows the next scene.
- **Mask wipe:** a bar, a diagonal or a letter shape moves across and reveals the next scene. Use a shape from
  the film, not a generic wipe.
- **Reveal by shape:** the next scene is clipped to the letter or icon, which then grows to fill the frame.

```js
tl.set("#sceneB", { clipPath: "circle(0px at 50% 50%)" }, 0)
  .to("#sceneB", { clipPath: "circle(110% at 50% 50%)", duration: 1.0, ease: "expo.inOut" }, "iris");
```

## Camera transitions

- **Push in:** scale the whole scene group 1 to 1.6 with `power3.in` while the focal element grows past the frame;
  start the next scene at the same scale, easing out. The scale never resets.
- **Pull back:** begin on a detail (a button, a letter), pull back to reveal it was part of something bigger.
  Reveals scale. See `drip_guide video/camera`.
- **Seamless zoom:** zoom into an element until its inside fills the frame; the next scene is what is inside.
  The two scenes are both scaled by the same factor at the handover.
- **Occlusion wipe:** an object in the foreground crosses the frame and covers the lens; the next scene starts
  from behind it. The object must fill the frame for 2-3 frames at least.

## Preserve position and velocity

When move B follows move A, B starts where A ended with A's speed (see `drip_guide video/craft`). Practical rules:

- Do not return to rest between joined moves unless you want a beat.
- Keep direction: if A moves up and right, B continues up and right or turns on an arc, not a sharp reverse.
- When a transition begins before the last scene settles, start it at 60-80% of the settle, with matching velocity.

## When a hard cut is right

A hard cut is a tool. Use it when:

- The cut lands on a strong beat (a drop, a kick) and something visible shares across it.
- The scale jumps (a macro cut to a wide shot) and the change is the point.
- You need a reset after a long, dense move: a cut gives the eye a fresh start.
- The surprise is the idea (a calm frame cut to chaos).

Do not cut because you ran out of time to build the transition. If every transition in a film is a cut or a fade,
`motion_storyboard` will say so.

## Shape morphing in code

| Route | When | Notes |
|---|---|---|
| CSS `border-radius`, `width`, `height`, `clip-path` | boxes, circles, pills, simple polygons | cheap, exact, easy to seek |
| SVG path `d` interpolation | arbitrary outlines | both paths must have the same number of points and the same command order |
| Flubber (MIT) | outlines with different point counts | optional library; `flubber.interpolate(from, to)` returns a function of 0-1; drive it with `onUpdate` |
| Canvas, point arrays | many points, custom shapes | store two arrays of points; draw lerp(a, b, p) |
| Clip-path polygon | shapes cut from an image | same number of polygon points in both states |

Interpolating paths with an equal number of points:

```js
const A = [[0,0],[200,0],[200,200],[0,200]];           // a square
const B = [[100,0],[200,200],[0,200],[100,0.01]];       // a triangle (one point collapsed)
const morph = { p: 0 };
const path = S("#shape path");
const draw = () => path.setAttribute("d", "M" + A.map((a, i) => a.map((v, k) => v + (B[i][k] - v) * morph.p).join(",")).join("L") + "Z");
tl.to(morph, { p: 1, duration: 0.9, ease: "power3.inOut", onUpdate: draw }, "morph");
```

When using Flubber, load a local copy of the file for the final render (see `drip_guide video/render`) and call it in
`onUpdate` from the timeline, never from its own animation loop.

## Inspect the whole morph, not its ends

The first and last frame of a morph almost always look fine. The middle is where it breaks: shapes pass through
each other, text overlaps, paths twist into a bow tie.

- `motion_frames` with `from`, `to` and `step: 0.033` across the full transition.
- Or `around: [t]` for -0.25 / -0.1 / 0 / +0.1 / +0.25 s.
- Check: is there one dominant thing in each frame? Does the identity of the motif survive the middle? Is any text
  half-drawn or colliding? Does a path cross itself? Fix the cause (point order, delays between layers), not the
  symptom.

## Checklist

- [ ] Every transition has a named shared element (motif, position, shape, colour, direction, line, sound).
- [ ] No element is deleted and replaced by a lookalike; it is morphed.
- [ ] Old content exits at 65-75% of the entrance length and earlier than the new content arrives.
- [ ] Joined moves keep position and velocity; there is no accidental stop.
- [ ] Every hard cut has a reason.
- [ ] Each morph was checked mid-way with `motion_frames`.
