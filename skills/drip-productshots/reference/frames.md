# Product shots: frames, crops and satellites

How the screen sits in its space decides whether it reads as a product shot or a screenshot in a box. Decide the frame before building the screen: the crop sets what must exist past the edge and how big the type must be.

## The framing rules

1. **One hero object,** at most one or two satellites that carry the point (a receipt, a phone, a detail card, a notification).
2. **Keep what identifies the product:** a title, the real chrome, the rows that give the action a reason. Logo and full nav are optional; crop around the story.
3. **Crop 10 to 40% of the hero off the stage.** The window or phone fills at least two thirds of the stage width and runs off an edge. Shapes that read when cut (a list, a card, a slider track, a row of avatars) run off by a third or more.
4. **Crop only filler.** The payoff, the action, what the cursor touches and every real word stay whole. A list, diff or terminal may lose one line at a bled bottom edge. A placeholder button the crop would slice is removed, not sliced.
5. **The stage masks everything** (`overflow: hidden`), with the same corner radius as the page's other media.
6. **One gutter:** the hero's inset from the stage edge. Every other edge distance in the frame matches it or clearly exceeds it. Crossing an edge by under 24px, or stopping a few pixels short of it, is a mistake.
7. **Satellites straddle the hero's edge, about half outside.** Never fully inside, never floating apart. If one must sit fully outside, tie it back with a 1px leader ending in a small dot.
8. **A satellite covers chrome or margin, not content:** straddle where the window has a sidebar, header or empty margin.
9. **Two satellites are two kinds:** different size and type (a card and a notification at true size), never two same-width cards on one edge.
10. **Anchored UI is not a satellite.** A popover, menu or toast sits exactly where the product would put it.
11. **What the story opens stays in frame** with a gutter on every side, on every frame of an animation. Place the trigger so the overlay has room.
12. **A window keeps its shape:** whole, at 1.25:1 or wider; bled, what shows is at least square. Fix by crop or layout, never by squashing.
13. **No dead corners** at rest or anywhere in a loop. An empty corner, a void under a short list, rows spread out to fill a pane all read unfinished.
14. **Start flat and frontal.** Earn a tilt by comparing it with the straight version at final size. Depth comes from shadow, z-order and scale; perspective only when asked.
15. **Fades** are for moving tracks, stacks and charts, and for one crop: a window dissolving at its foot over filler, with a mask (not a colour overlay). Never fade a side, the focal content, or more than one window per scene.

## Frames

### Browser window
- Use it only when the browser matters: a website, a web app shown as a website, a browser extension, a URL being shared.
- Anatomy: ~38 to 44px bar, three traffic lights (12px circles, 8px apart, 12 to 16px from the left) on macOS, a centred rounded URL pill at ~40 to 50% width with the domain only (`app.northwind.co`), optionally back/forward glyphs. No fake tab strip unless tabs are part of the story.
- Quiet: the bar one step off the window surface, a 1px hairline under it.

### App window (desktop)
- The app's real chrome: macOS title bar (~38px, traffic lights, centred title) or a unified toolbar (~52px) when the real app has one; Windows title bar with min/max/close at right.
- Sidebars run the full height of the window; a column that stops short leaves a seam.
- Real structure in quiet greys: sidebar groups, a list, the open item. Real words on the story only.

### Phone
- Real proportions (e.g. ~19.5:9 for current iPhones), real corner radius, status bar with time, signal, battery; Dynamic Island or notch; home indicator. Draw these from a kit or platform resources, never from memory, and never shrink the clock.
- Nothing sits under the island; sheets and grabbers start below the status bar.
- A phone is lit from its first frame; never dimmed or faded up.
- **As a satellite:** at least 40% of the window's visible width and ≥ 220px wide; let it run off the bottom rather than shrink.
- **In a ~400px slot:** crop it: pinned a gutter from one edge, off the other, screen at 1:1. Never a whole tiny phone.
- **A phone cropped at the top** loses the status bar and the app's nav bar together; the crop falls inside content.
- The background has a job: a lock screen for notification stories, the app for app stories; never invented home-screen icon grids.

### Notification
- iOS banner: the app's real icon (~38pt), the app name and time on one line, one bold title over one or two lines of message; full width minus ~8pt margins; at true scale with the phone. Never enlarged to read; if it's unreadable the phone is too small.
- Android: Material notification anatomy with the small icon in the app's colour.
- On a desktop scene: the OS's notification at its real size and corner, with the system's shadow, not a card's.

### Terminal
- A character grid: one monospace face, ~13px, line-height ~1.5, 12 to 16px padding, the prompt (`$` or `❯`) in a muted colour.
- Few short real lines; the command typed, then its output. Colour only for status (green success, red error, yellow warning) and maybe one accent for paths.
- Spinners and ticks occupy one character cell and swap in place on their own line.
- A dark terminal on a light page is fine when it is the subject; otherwise use a light theme.

### Chat thread
- Messaging on a phone keeps the platform's conventions unless the brief gives a look: sent bubbles in the accent on the right, received in grey on the left, tails on the last bubble of a group, reactions on the bubble's corner, the composer with its real controls.
- Open on a real message, never on bars. Short history sits at the top under the header, not pinned to the bottom with a void above.

### Code
- Real syntax colours from one theme; 13 to 14px mono; line numbers muted; one highlighted line or range for the story; no more than ~15 visible lines.

## Satellites

| Satellite | Size | Placement |
|---|---|---|
| Detail card (receipt, record, comment) | 30 to 45% of the hero's visible width | Straddling a side over the hero's margin or sidebar |
| Phone | ≥ 40% of the window's visible width | Straddling the right edge, a third outside, top in the upper half |
| Notification / toast | True size | Where the system puts it |
| Corner chip ("12 online") | Small pill | Centred on the window's corner, half outside, over chrome only |

- Shadow: satellites use a tighter shadow than the hero; the shadow sits on the visible shape, never on a wrapper.
- The result of the story can live in a satellite; it must not cover the settings, trigger or payoff in the hero.
- On a narrow (compact) layout, drop the satellite or stack it; keep the action and payoff whole.

## Annotations

Use a line or label only when it removes ambiguity: what a chart point means, where an event went, which setting changed what.

- **Leader:** 1px (1.5px at hero scale) in a quiet ink, from the note's edge to 4 to 6px short of the object, ending in a 4px dot or a clean gap; straight or one bend; never through another surface.
- **Connector** between two objects: drawn on over ~1s after both ends are placed, ends on a small dot with a white rim; solid for a request, dashed for the reply; one colour per relationship.
- **Moving dots** along a route only while data is really flowing; static otherwise.
- **A small label** names the line itself (`POST`, `200 OK`) when it helps.
- Design the product first; a perfect line can't rescue weak hierarchy.

## Compact (phone column) versions

- Every shot that can land in a phone column ships a second composition at ~358px wide: crop closer, drop or stack the satellite, keep action and payoff whole, keep type at native size.
- A small format crops harder: a 400px card holds a third of a dashboard at full size, not all of it at a third.
- Switch compositions by container width (container queries) rather than viewport where the shot lives in a grid.

## Building the stage (React + Tailwind v4)

```tsx
<figure role="img" aria-label="Invoice list with March invoice selected and its payment detail open"
  className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2">
  <div aria-hidden className="absolute left-[10%] top-[10%] w-[115%] rounded-xl bg-surface shadow-hero ring-1 ring-black/5">
    {/* window chrome + screen */}
  </div>
  <div aria-hidden className="absolute bottom-[12%] left-[4%] w-[38%] rounded-lg bg-surface shadow-satellite ring-1 ring-black/5">
    {/* satellite: half outside the window's left edge */}
  </div>
</figure>
```

Measure positions from named elements in code (`getBoundingClientRect`) when anything points at or moves to them; never hard-code coordinates read off a screenshot.

## Check

- [ ] Is the hero's top-left visible, and is every bleed a deliberate crop, not a sliver?
- [ ] Is anything with words, the action or the payoff cut?
- [ ] Does each satellite straddle its hero with clear depth, and differ in kind from any other satellite?
- [ ] Is there one gutter, with no near-tangents and no dead corners?
- [ ] Is the phone readable at the host's real width, with real device geometry?
- [ ] Does a compact version exist and read at 358px?
