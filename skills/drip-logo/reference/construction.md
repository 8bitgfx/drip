# Logo construction: drawing the mark

Amateur marks look amateur in their curves before anything else: too many nodes, wobbles where a hand placed
points, joints that clot, circles that look small next to squares. This file is how to draw so the critic's
"craft" axis has nothing to say.

## The grid

- **viewBox `0 0 256 256`** for symbols; wordmarks use the outlined type's own units, scaled so cap height is a
  round number (e.g. 100 or 128).
- At 16px, **16 units = 1 pixel**. So: strokes, gaps and counters ≥ 16 units for anything meant to read at 16px;
  ≥ 24 units for strokes that must stay crisp at 24px. Details under ~1/48 of the mark (≈ 5 units) are noise.
- Live area: keep the mark inside 16-240 (a 16-unit margin) so it doesn't touch the icon edge after rounding.
- Angles: 0, 15, 30, 45, 60, 75, 90° only. A 44° line is a mistake that reads as a mistake. Compute endpoints:
  at 30°, dx = len·0.866, dy = len·0.5; at 60° swap them; at 45° both are len·0.7071.
- Snap coordinates to whole units, or halves when an optical correction needs it. Never more than 2 decimals
  (`logo_test` flags more: it's a sign of traced or noisy geometry).

## Béziers that look drawn by a professional

1. **Nodes on extremes.** Put a node wherever the curve is furthest left, right, up or down, and make its handles
   exactly horizontal or vertical there. Most good shapes need nothing else.
2. **Few nodes.** A circle is 4. A drop or leaf is 3-4. A whole letterform rarely needs more than 12. If a closed
   shape has more than 8 nodes, find which ones are compensating for badly set handles.
3. **Smooth nodes are collinear.** At a smooth node, the incoming and outgoing handles lie on one straight line
   (G1 continuity). A kink at a node is visible at 512px even if it hides at 64px.
4. **Handle length.** About 1/3 of the segment's span is a calm curve; a circle quadrant uses 0.552 × radius.
   Handles longer than ~0.6 of the span make bulges; crossing handles make loops.
5. **Tension matches.** Two curves meeting at a smooth node should have similar handle lengths on both sides, or
   the curvature jumps (the "flat spot then sudden bend" look).
6. **Arcs for true circles** (`A rx ry 0 large sweep x y`), cubic curves for everything else.
7. **Corners on purpose.** A corner is either sharp or rounded with a stated radius used everywhere (e.g. 8 units
   on all outer corners, 0 inside). Mixed radii look accidental.

## Liquid and organic shapes: one path, continuous tangents

Drops, drips, leaves, flames and blobs are where AI-drawn marks fail hardest. Rules learned on a real Drip job:

- **One path.** Never a rect plus a circle joined with a goo/blur filter: it looks cheap, it isn't a vector, and
  it renders differently everywhere.
- **Continuous (vertical) tangents at every join.** A drip hanging from an edge is: shoulder fillet (tangent
  turns from horizontal to vertical) → neck S-curve that pinches (vertical tangent at the pinch) → bulb arc
  (vertical tangent where the neck meets it).
- **No straight tapers into a round.** A straight tapered neck meeting a bulb whose tangent is vertical kinks
  visibly at large sizes. The neck must be curves.
- **Clamp shoulders inside corners.** A shoulder fillet that starts beyond the end of a straight edge sticks out
  past the frame as a "lip". Start it inside the straight run.
- **Neighbouring drips: overlap, don't clamp.** When two shoulders would collide, let them overlap as separate
  subpaths under `fill-rule="nonzero"` (they union). Shrinking each to avoid its neighbour gives a crenellated
  "battlements" edge. Use `evenodd` only where you want an actual hole.
- **Thin drips read as legs.** Three or more thin parallel drips turn a mark into an octopus or a jellyfish. Use
  fewer, fuller drips with clearly different lengths.

Worked example: a bar with one drip, 256 grid, symmetric about x = 128, nine smooth joins and no kinks.
```
M 40 64 H 216 V 96 H 162
C 152 96 146 102 146 112        right shoulder: horizontal → vertical
C 146 124 138 128 138 140       neck pinches in (vertical at 138,140)
C 138 152 148 156 148 170       neck opens to the bulb (vertical at 148,170)
A 20 20 0 0 1 108 170           bulb: true arc, vertical tangents at both ends
C 108 156 118 152 118 140       left neck, mirrored
C 118 128 110 124 110 112
C 110 102 104 96 94 96          left shoulder
H 40 Z
```
Bar 32 units, pinch 20, bulb 40: all above the 16-unit floor. Vary the bulb radius and neck length to tune.

## Optical corrections

| Correction | Value | Why |
|---|---|---|
| Overshoot, round shapes | 1-3% of height above cap/top and below baseline/bottom | A circle as tall as a square looks smaller |
| Overshoot, pointed apexes (A, V, triangles) | 3-6% past the line, or blunt the point | Points look short |
| Horizontal vs vertical strokes | Horizontals 5-10% thinner | Equal strokes make horizontals look heavier |
| Circle next to square | Circle diameter ≈ 1.05-1.1× square side | Equal sizes read as a small circle |
| Optical centre in a frame | Content 2-3% above geometric centre | Geometric centre looks low |
| Bottom-heavy marks (drips, tails) | Centre the full bounding box, then nudge by eye, check at 32px | The heavy edge drags the visual centre |
| Reversed (light on dark) | Strokes 3-6% thinner | Irradiation makes light shapes look bolder |

## Stroke contrast and weight

- Decide one weight system: **monoline** (all strokes equal, optically corrected) or **contrast** (thick and thin
  with a consistent axis, like a pen). Never both in one mark.
- In a monoline mark, measure: every stroke within ±4% of the base width after optical corrections.
- With contrast, keep the ratio fixed (e.g. thin = 0.45 × thick) and the stress angle fixed (vertical, or 30° for
  a broad-nib feel).
- Weight must match the wordmark in a combination mark: the symbol's main stroke ≈ the wordmark's stem width, or
  a clearly chosen multiple (1.5× or 2×).

## Junctions

Where strokes meet or a curve joins a stem, ink pools.
- **Thin at joins.** Narrow both strokes by 10-20% approaching a junction (the shoulder of an n, where a bowl meets
  a stem). Without it, joints clot into dark lumps at small sizes.
- **Ink traps** for marks that must hold at 16-24px: a small notch (≈ 4-8 units) cut into acute inside corners.
- **No slivers.** Two shapes either overlap clearly (≥ 16 units) or are separated clearly (≥ 16 units). Near
  touches ("tangent kisses") look like errors and fill in at small sizes.
- **No notches by accident.** Zoom to 800% on every join; a 1-unit step where two paths meet is visible on a
  billboard and on retina screens.

## SVG hygiene for masters

- Solid fills only, `fill="#000"` in the black master; no `stroke` in finals (expand strokes to outlines).
- No `<text>`, `<filter>`, `<image>`, `<mask>` unless essential, `<clipPath>` only when unavoidable; no transforms
  left on paths (apply them).
- `fill-rule="evenodd"` for intentional holes; `nonzero` when overlapping subpaths should union.
- Named groups: `<g id="icon">`, `<g id="wordmark">`, so "make the icon bigger" is a precise edit.
- A tight viewBox for the master; padded variants are exports, not the source.
- Commands `M L H V C A Z`, absolute coordinates, ≤ 2 decimals. Run `logo_test` and clear every hint.

## Done when
- [ ] Every closed shape ≤ 8 nodes (letters ≤ 12), nodes on extremes, handles axis-aligned there.
- [ ] No kinks at 800% zoom; organic shapes are one path with continuous tangents.
- [ ] Overshoot, stroke and reversed corrections applied and noted in BRAND.md.
- [ ] Nothing under 16 units; no near touches; joins thinned.
- [ ] `logo_test` returns "no obvious path problems".
