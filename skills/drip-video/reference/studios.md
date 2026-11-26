# Studios: what working motion designers actually do

This file is the result of watching eighteen film excerpts from ten studios and artists with `motion_study`
(measured cuts, rhythm and a timestamped contact sheet for each) and reading the sheets frame by frame. Everything
about easing is inferred from stills and the rhythm line; the cut counts and rhythm bars are measured.

Why study artists at all: a model that has only read about motion produces motion that is correct and generic.
A studio's work shows the decisions behind the polish: what they let rest, what they let collide, what carries
across a cut. Use a film for its **moves** (timing, transitions, what enters when) before its **look** (palette,
textures). Moves transfer to any subject; looks are the studio's and must not be copied. Credit what you took in
the hand-off, and never reuse a film's frames, characters or copy.

- The Kisto previews are 4-6 second excerpts, not whole films. Shot lengths here are teaser lengths; a full film
  will run longer between cuts. Use them to compare, not as absolute targets.
- The cut detector can read a fast zoom or a flare as many hard cuts (it did on the spiral in the Ordinary Folk
  EPIC clip: 13 "cuts" that are really two cuts and one continuous move). Always look at the sheet.
- A wipe, dissolve or morph between two scenes is often not flagged as a cut at all. Zero measured cuts does not
  mean one scene.

## The studies
### Ordinary Folk (3 films)

- **CryptoCubes** (kisto.app/i/cryptocubes-by-ordinary-folk): 6.0s, 2 shots, 1 cut at 5.0s, ASL 3.0s.
  Rhythm `▁▁▄█▄▆`. One small square sits alone for 0.8s, tilts, gains depth and becomes a cube; a flat plane
  wipes across at 2.8s and the cube is suddenly huge and fills the frame, then a chain of scaled copies recedes.
- **Stephen McCaskell - EPIC** (kisto.app/i/stephen-mccaskell-epic-by-ordinary-folk): 6.0s, detector says
  14 shots (ASL 0.4s) but the sheet shows 2 real cuts and a continuous spiral zoom. Rhythm `▂▄▂█▇█`. A busy
  page of paper textures cuts to a closed-in book on black, then to an ink spiral that tunnels toward a tiny
  figure; torn paper colour chips ride the spiral.
- **Lark - Magic Share** (kisto.app/i/lark-magic-share-director-s-cut-by-ordinary-folk): 6.0s, 5 shots, 4 cuts
  at 3.0-4.0s, ASL 1.2s. Rhythm `▂▄▂█▅▄`. A blue desk scene changes to pink by a soft morph, then a ribbon
  sweeps and the screen becomes a phone in a saturated purple world; a hand reaches in at the end.

Signature: a single simple object that changes *scale and context* rather than being replaced; the camera or the
object grows until the frame is made of it. Colour changes as a whole-frame event (grey to pale pink, blue to
pink) and always lands on a beat of the rhythm line (the `█`).

Take:
1. **Scale as the transition.** In CryptoCubes the next scene is the same cube at 20x size. Build it with a
   single element whose `scale` runs from 1 to about 20 with `power3.in` over 0.5s while the background colour
   flips on the peak frame; the next scene is that element at its final size with a smaller copy appearing inside.
2. **Echo chain.** One shape repeated at ratios of about 0.5 (each copy half the previous, offset along one axis),
   revealed outwards with a 3-frame stagger. Easy with a loop of cloned divs or an instanced three.js mesh.
3. **Quiet start, loud end.** The small square holds a calm 0.8s before it moves; the rhythm line climbs and the
   biggest moment is the last second. Place the hardest change at 80-90% of the clip.

### BUCK (2 films)

- **Builders Don't W8, brand film for n8n** (cdn.kisto.app/previews/v2/8026e6cf-358e-4d36-b81e-5e6a9db18de9.webm):
  4.0s, 4 shots, 3 cuts exactly 1.0s apart, ASL 1.0s. Rhythm `▁▆█▆`. Hand-cut paper type fills the frame, cuts to
  a close character, a collage of vintage figures on a biplane, then a glossy vector scene with a looping strand.
  Each scene is a different material (cardboard, collage, gloss); the cuts are on a strict 1s grid.
- **Spotify Mix Tools film** (cdn.kisto.app/previews/v2/b67a4d28-600a-477e-9b00-c449423d8068.webm): the preview
  shows a glowing bud that opens into a lotus over 2s while orbs float up. 4.0s, 1 shot, 0 cuts, rhythm `██▅▄`
  (a decaying burst, opposite to most of the other films).

Signature: material changes are the cut. A scene switches from one tactile world to another on a fixed pulse, and
inside a scene the thing that moves is a single character-like form. The film feels hand-made even when it is 3D.

Take:
1. **Cuts on a fixed grid.** Lock cut points to a 1.0s (or beat) grid and let content vary; the viewer feels
   order in a collage. In code: an array of scene start times at 0, 1, 2, 3s with `gsap.set` hard swaps, no fades.
2. **Texture as identity.** Overlay one paper/grain texture (canvas noise or a multiply-blended PNG at 8-12%)
   and change the *typeface treatment* per scene (cut-out letters, then clean) instead of changing the layout.
3. **Open and settle.** The lotus is a one-shot reveal: anticipation (bud glows and holds), a fast open
   (about 6-8 frames, inferred), then slow secondary drift of the orbs. Build with an SVG with petals rotating
   from -80 to 0 degrees on a spring, and slow-drifting particles as the rest state.

### ManvsMachine (2 films)

- **Robinhood - Future Trading** (cdn.kisto.app/previews/v2/fce1eee7-bb93-47e0-afb9-17339fadc7a4.webm): 4.0s, 3 shots,
  2 cuts at 0.8s and 1.8s, ASL 1.3s. Rhythm `█▆▂▂`. A dotted grid ripples in black, cuts to a lone figure on a
  reflective flat, cuts to a profile with candlesticks drifting by, then a silhouette walks over a chart-shaped hill.
- **Nike - Air Max Day '18** (cdn.kisto.app/previews/6a550f73-0a12-41e0-bcd0-9dc9f7debf69.webm): 4.0s, 11 shots, 10 cuts, ASL 0.4s.
  Rhythm `█▅▆▇`. Cut-up photography in framed rectangles over flat colour, then neon-lit portraits with small
  graphic cards layered on top, ending on a flat black-and-white illustrated scene.

Signature: the same studio runs two speeds. Robinhood is slow and measured (1.3s shots, a hold on each image,
the graphics living *inside* the photograph); Nike is staccato (0.4s). In both, graphics are anchored to the
subject: the chart is the landscape, the data points are the candlesticks the person walks across.

Take:
1. **Data as scenery.** Drive a chart's series with the figure's path so the line is the ground. In canvas, draw
   the series as a polyline; place the figure sprite at `y = f(x)` and move it with `x` linear, 0.9 s per step.
2. **Frames inside the frame.** Layer 2-4 rectangular windows (clip-path insets) that each hold a different crop;
   animate the windows' `inset()` values with a 2-frame stagger on cut. Flat colour behind, photographs inside.
3. **Hold then slam.** Robinhood's rhythm starts high and drops (`█▆▂▂`): the dots do the action, then the
   scene rests. For a 4s clip give the hero element the first 0.8s and then leave 2s of slow drift.

### Giant Ant (2 films)

- **Rule** (cdn.kisto.app/previews/v2/ece5296d-b530-4dbc-822e-a6e40fa29273.webm): 4.0s, 2 shots, 1 cut at 1.3s, ASL 2.0s. Rhythm `█▇▂▁`. A clay-like
  triangle character in a kitchen lifts a pot, comes close to camera (face fills the frame), then the scene
  drops to white and a paint-like script draws itself letter by letter.
- **WIRED What's Inside: Play-Doh** (cdn.kisto.app/previews/v2/7d4ff802-8acf-4c4a-a98e-e023ef6173f5.webm):
  6.0s, 3 shots, 2 cuts at 5.0s and 5.3s, ASL 2.0s. Rhythm `▂▂▂▄▂█`. Toys tumble in free fall and sort into a
  tub; a diagonal wipe turns the field from blue to yellow while a blob of dough with floating labels forms;
  at 5.0s a dark circular iris opens on a rock-like texture. Detector missed the 2.8s wipe: it is a transition.

Signature: tactile, soft materials, shapes with a small readable mood (eyes, a smile), and infographic labels
that sit in the space like items on a shelf. Transitions are shape wipes (a diagonal band, a circle iris) that
repaint the whole ground colour at once.

Take:
1. **Draw-on lettering.** A single stroke grows through a path with variable width and a slight overshoot at
   joins; fill is added at 70% progress. SVG `stroke-dashoffset` 1 to 0 over 1.2s with `power2.out`, then a fill fade.
2. **Diagonal wipe that changes the ground.** One rotated band (about 25 degrees) crosses the frame in 0.4s
   and leaves the new colour behind; scene objects keep their position and only the ground changes.
3. **Labels that float.** Small captioned boxes orbit a hero object with 1-2 px drift (sine, 3-4s period,
   different phase each), so a still hold stays alive. No individual labels fade in; they pop in with a 6-frame
   `back.out(1.4)` scale from 0.6.

### Tendril (2 films)

- **LEIA Brand Film** (cdn.kisto.app/previews/v2/b8f8b539-9323-4af0-a2d3-7788e82e73f3.webm): 6.0s, 1 shot, 0 cuts, rhythm `▁▂▂▂▄█`.
  Black frame, a thin horizontal flare ignites at the centre and spreads sideways, brightens over 5s and ends in
  an expanding bright orb with a blue wash.
- **Elevation Pictures Logo Animation** (cdn.kisto.app/previews/v2/9461f020-3ce5-437f-9d4f-f4c9697bb948.webm): 4.0s, 1 shot,
  0 cuts, rhythm `▅▇▇█`. A tunnel of streaks rushes outward from the centre; a small constellation draws itself
  line by line between stars while the camera keeps flying.

Signature: patient single shots. Light and particles do all the work; the logo or the idea arrives as a
*construction* (lines connecting stars) not as a pop. Rhythm is built from continuous acceleration, not cuts.

Take:
1. **One-shot acceleration.** Ramp a single parameter (flare width, tunnel speed) with an exponential curve
   (`power4.in` over 5s) so most of the clip is quiet and the final second is the payoff. Rhythm `▁▂▂▂▄█`.
2. **Line-by-line construction.** Add one line per 0.3-0.5s between nodes, each extending from the previous
   node at a different angle, while the field behind keeps moving. Canvas 2D polylines, 12 nodes, seeded.

### Oddfellows (1 film)

- **Google for Startups - Two Desperados** (cdn.kisto.app/previews/9d1da01a-8638-4c3d-a798-0419a7805456.webm, search "oddfellows"): 4.0s, 1 shot (the soft dissolve at 3.0s is not flagged), rhythm `▂▁▄█`.
  A pale illustrated shopfront holds still for 2s with a tiny drift and a gentle push-in toward the doorway,
  then dissolves into a warm room of people around a table.

Signature: flat illustration that stays very still, a push-in that is nearly invisible, and a reveal that
happens late. Calm is the style.

Take:
1. **Slow push-in at 2-4% scale per second** on a flat illustration, with one extra parallax layer moving 1.5x;
   the doorway as the vanishing target.
2. **Dissolve through a bright shape.** The doorway fills the frame in warm yellow and the next scene is
   revealed by fading *from that colour*, never from black.

### Animade (2 films)

- **The Complete Olympops** (cdn.kisto.app/previews/v2/67ca9d10-332f-4fc9-8a03-3660bca419b5.webm): 6.0s, 3 shots, 2 cuts at 3.0s and 4.5s,
  ASL 2.0s, rhythm `▆▂▄█▇▁`. Balloon-animal rings rest for 2s, then the rings fly apart in 0.5s, then a macro close-up
  of two balloon animals wrestling (a still-holding detail frame, with small face marks changing).
- **Sketchycles** (cdn.kisto.app/previews/v2/556743c7-d7e7-477a-8955-bdb7e8afe249.webm): 6.0s, 4 shots, 3 cuts, rhythm `▁▁▅▁▆█`. A logo card, then
  a screen-recording of a rig being drawn. Little to take beyond showing process on screen.

Signature: comedic timing from rest. A stable emblem holds long enough to read, then breaks apart with a sharp
action line burst. The face marks are tiny acting changes on otherwise static shapes.

Take:
1. **Hold, snap, scatter.** 2s of stillness, then a 6-frame snap (anticipation: shrink 4% for 4 frames) and rings
   fly out on different arcs with 2-frame stagger. GSAP: `to` with `ease:"back.in(2)"` then `power3.out` outward.
2. **Impact lines.** 6-8 short lines radiate at 10-12 frames lifetime from the impact point, scaling from 0 to 1
   on the first 3 frames. Cheap, readable, funny.

### Gunner (1 film)

- **Fender Pedals** (cdn.kisto.app/previews/v2/1412fcce-f728-4d4a-9f00-00e41b6c1788.webm): 6.0s, 7 shots, 6 cuts all in the last 3s
  (3.0, 3.3, 4.5, 4.8, 5.0, 5.3), ASL 0.9s overall but 0.5s after the opening. Rhythm `▁▁▁█▆▇`. A parchment
  map holds still for 3s with tiny line drawing, then four to five quick illustration shots: a head surfaces, a
  wide landscape, a flexed arm, a silhouette creature.

Signature: a long, quiet opening card followed by a burst of short, graphic shots. Every shot is a flat-shape
poster in a limited palette.

Take:
1. **Two-speed structure.** First half of the clip at one slow state, second half at 0.3-0.5s shots on a grid.
   Measured here: 0 cuts in the first 3.0s, 6 in the next 3.0s.
2. **Map as a world.** A single illustrated environment plus small drawn-in changes (line segments that extend)
   reads as story even when nothing travels. Use SVG paths with `stroke-dashoffset`.

### Jorge R. Canedo E. (1 film)

- **Memorial Sloan Kettering: Immunotherapy** (cdn.kisto.app/previews/v2/aa963289-4485-465b-b7b1-05ad2c9cfecb.webm):
  6.0s, 2 shots, 1 cut at 3.5s, ASL 3.0s. Rhythm `▁▁▁█▁▁`. A green field with small geometric dots drifting, text
  swapping every ~0.5s at the centre; the scene changes to a blue grid of shapes, a white flare covers the frame and
  clears to a flat end card of stacked text blocks, then a logo card.

Signature: an explainer made from shapes as characters. Dots, triangles and rings are cells, ideas and people
at once; the screen is mostly empty and each line of copy appears in the same centre spot.

Take:
1. **Same-position text swap.** Lines replace each other in the same box with a 3-frame crossfade and a 4px slide
   up; this keeps reading fast with no layout motion.
2. **Flare as punctuation.** A white radial flash (opacity 0 to 1 to 0 in 0.5s, peak on the cut) hides the cut between
   explanation and conclusion.

### 24fps.dev films made in code (2 films)

None of the launch films returned a playable preview (see Gaps). The two playable pieces are UI and generative
studies in GSAP and Canvas:

- **Anticipation** (24fps.dev/media/w04257.mp4, by @gongnyang, GSAP): 2.7s, 1 shot, rhythm `▇▃▁`. Two dots on
  two tracks; the grey one starts moving first, the red one squashes into a thin ellipse on the left edge, then
  slides across and settles to a circle at the right. Back-ease-in is visible: the dot goes backward before moving.
- **Particle Burst** (24fps.dev/media/w04761.mp4, by @gongnyang, Canvas): 3.5s, 1 shot, rhythm `▆█▆▁`. A single red
  dot swells into a ring of black particles that scatter outward and fade over 1.5s, and a headline appears where
  the dot was.

Take:
1. **Squash-and-travel**: scale `x` 1.4 / `y` 0.7 for 3 frames before the move; `back.in(1.7)` for 0.15s; the rest
   `power3.out`. A flat shape squashes about 20% on landing, then its trailing edge settles about 3 frames after
   the leading edge.
2. **A dot becomes a burst becomes the title.** One 20px circle is the one persistent object that hands over to the next scene.
   In canvas: 60 seeded particles on a circle of radius 40, outward velocity 1, friction 0.97, alpha 1 to 0 over 1.5s.

## Cross-studio synthesis

Measured over the 18 excerpts (88s total, 4-6s each): 48 flagged cuts, or 37 after removing the false positives in
the spiral clip. Median average shot length 2.0s. Spread: 6 clips have 0 cuts (all single-shot), 8 have 1-3 cuts, 4 have
4 or more (Lark, Gunner, Nike, and the spiral clip's false positives). The fastest real shot length is 0.4s (Nike).

Patterns the best work shares:

1. **Two ways to move: continuity or a rhythmic grid, never mush.** Continuous films (Tendril, Oddfellows,
   Ordinary Folk cube) have 0-1 cuts per excerpt and change one thing at a time. Cut-based films (BUCK n8n,
   Nike, Gunner) cut on a grid: BUCK exactly every 1.0s, Gunner four cuts in 3 seconds at 0.3-0.5s intervals. The AI-slop pattern sits in
   between: dissolve every 3s and everything moving at once.
2. **The big move is late.** In 6 of 18 clips the highest bar of the rhythm line is in the last second. Rest
   openings are common: Gunner holds a still map for 3s, Oddfellows a still door for 2s, Ordinary Folk a single square for 0.8s.
   Their rhythm lines are low-low-high, not high-high-high.
3. **One object does the carrying.** The cube, the dot, the flare, the ring: a single form is present before and
   after each change. Scenes connect by scale, colour flood, or a shape wipe, not by a cut to something unrelated.
4. **Hooks open on a question the eye has to answer.** Black with a thin line, one small square, a lone dot, a dotted
   grid: the first frame has one thing to look at. Nike and Robinhood open at full density but with one clear
   subject per frame.
5. **A different material per scene, one grain over all.** BUCK and Giant Ant change material (cut paper, gloss, clay)
   but keep colour and grain consistent per scene, so the film reads as a set.
6. **Backgrounds are alive during rests.** Orbs drift, labels float, particles slow down; holds are never frozen.

What separates it from AI and template motion: fewer things at a time, motion that starts from a held pose (an
anticipation, a hold, a long take), a single recurring object, cuts that land on an exact grid, grounds that
change colour as an event, and an ending that is the most active frame rather than a fade-out. Template motion
fades every element in with the same 0.6s ease and the same stagger, has no rest and no rhythm contrast, and reads
as many unrelated slides.

## Film type to studios to study first

| Film type | Study first | What to take |
|---|---|---|
| Launch film (product) | Tendril, ManvsMachine, Ordinary Folk | One-shot acceleration, graphics anchored in the scene, scale as transition |
| Explainer | Jorge R. Canedo E., Giant Ant, Ordinary Folk | Shapes as characters, same-position text, draw-on and label floats |
| Brand film | BUCK, ManvsMachine, Gunner | Material per scene, cuts on a grid, two-speed structure |
| Logo animation | Tendril, Animade, Giant Ant | Light over black, hold-snap-scatter, draw-on lettering |
| Data story | ManvsMachine, Ordinary Folk | Data as scenery, echo chain, scale reveals |
| UI demo | 24fps GSAP/Canvas pieces, Oddfellows | Squash-and-travel, quiet furniture, slow push-in |
## Gaps in this study

- 24fps.dev product-launch posts (muda. Inference, Opus launch promo, motion-design launch, SaaS launch) returned
  "no playable preview", so no launch film from code could be measured; only two short GSAP/Canvas pieces played.
- All timings are from 4-6s excerpts; easing is inferred.
