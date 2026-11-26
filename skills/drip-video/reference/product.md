# Product demos in a film

A product film shows the product doing something that matters. The picture is real: real screens, real flows.
Everything else (cursor, camera, framing) exists to make the real thing legible and good looking.

## Real screens only

- Freeze the running product with `motion_ui_freeze` (a dev server or the live site) and animate its real
  elements (`drip_guide video/ui`). Screenshots or recordings (taken at 2x) are the fallback when the product
  can't be opened: ask the user or read the project for them (`public/`, `docs/`, `assets/`).
- Never invent a dashboard, a chart, a metric, a user, or a feature. A made-up screen is a lie, and the critic
  and the user will find it.
- If real data is private, replace it with clearly labelled example data ("Example data" on screen), and say so
  in the storyboard.
- If there is no real UI at all, do not fake one; choose a metaphor film instead (`drip_guide video/direction`).
- Rebuilding a screen in HTML from a screenshot is acceptable when the result matches pixel for pixel and the
  elements must animate separately. State that you rebuilt it.

## UI assembling from components

Instead of showing a finished screen, build it from its parts in the order a person would understand it.

1. Layout frame first (the window and its sidebar), 0.5s.
2. The main content block arrives (the one thing the film is about), 0.5s.
3. Secondary blocks stagger in, 0.06s each, from the main block outward.
4. Details (labels, avatars, numbers) last, quickly.

The parts arrive from where they belong (the sidebar from the left edge), not from random places. Keep their final
positions exact so the assembled screen matches the product.

## Cursor

The cursor is a character. It shows intent.

| Rule | Value |
|---|---|
| Path | an arc, never a straight line; a slight overshoot and return of 6-12px |
| Speed | fast start, slow end: `power3.out`, 0.5-0.9s for a long move |
| Before a click | a small settle: 0.08-0.15s hover on the target |
| Click | scale down 0.9 over 0.08s, back over 0.15s; a ripple or press state on the target |
| After a click | the UI responds within 2-4 frames (0.07-0.13s) |
| Hold | the cursor can rest; do not wiggle it |
| Size | about 28-40px on a 1080p frame, so it reads |
| Hidden | when typing, the cursor can rest to the side or hide |

```js
// Cursor moves along an arc to the button, then clicks.
const c = { t: 0 };
const A = { x: 400, y: 800 }, B = { x: 1180, y: 520 }, bend = -140;
const pos = (u) => ({ x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u + bend * Math.sin(Math.PI * u) });
tl.to(c, { t: 1, duration: 0.8, ease: "power3.out", onUpdate: () => gsap.set("#cursor", pos(c.t)) }, "go")
  .to("#cursor", { scale: 0.88, duration: 0.08 }, "go+=0.95")           // press
  .to("#cursor", { scale: 1, duration: 0.15, ease: "power2.out" }, "go+=1.03")
  .to("#btn", { scale: 0.96, duration: 0.08 }, "go+=0.95")
  .to("#btn", { scale: 1, backgroundColor: "#22a06b", duration: 0.25 }, "go+=1.03") // the click causes a visible change
  .from("#toast", { y: 20, opacity: 0, duration: 0.4, ease: "power3.out" }, "go+=1.1");
```

## Clicks that cause change

A click with no result is a lie. Each interaction has a cause and a visible effect:

- The button changes state (colour, label, pressed).
- Something moves because of it (a card is added, a panel opens, a list reorders).
- The change is the thing the film is about: if the film says "one click to publish", the viewer sees the
  published state.

Show the consequence at the right size: bring it up (zoom or highlight) if it is small.

## Focus and magnification

- Zoom into the element that matters (scale the whole screen group 1.0 to 1.6 on `power3.inOut`, with the
  transform-origin at the element), then back out at the next beat.
- Dim the rest to 40-60% brightness while a part is in focus.
- Crop to the interesting area; a full screen at 1080p has text at 12-14px which no one can read. Show the screen
  at a scale where the smallest text that matters is 28px or more.
- A highlight ring or a mask that opens around the target tells the eye where to look.

## Device frames

- A frame adds context but also costs attention. Use one only if the device is part of the story.
- Keep the frame simple: a rounded rectangle with a thin bezel, not a stock mockup image.
- Screens inside frames should be at least 40% of the picture width; smaller and nothing is readable.
- Phones in 9:16 films can fill the frame; the bezel can be cropped.

## Readable at size

At 1080p on a laptop and at 360px wide on a phone:

- Text that must be read: 28px+ at 1080p.
- Show one panel at a time rather than the whole app.
- Keep contrast of the interface; do not apply grain or blur over text.
- Hold a screen for 1.0-2.0s after its change settles.

## Keep the motif

A product film still needs one persistent object. A card dragged from the list becomes the detail view; a
button press expands into the next screen. See `drip_guide video/continuity`.

## Checks

- [ ] Every screen is real or labelled as example data.
- [ ] Every click has a visible effect within 0.13s.
- [ ] The cursor moves on arcs and settles before clicking.
- [ ] The text that matters is readable on a phone-width view.
- [ ] No fake numbers or logos.
- [ ] Zoom and highlight direct the eye to one thing at a time.
