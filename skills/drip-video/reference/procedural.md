# Procedural and generative visuals

Rules make the picture: noise, grids, spirals, cells, flocks. Done well, it gives films a living, specific look that
no stock footage has. Done badly, it is floating dust. The test: every element is there for a reason the film can
state.

## The one hard constraint

Drip seeks. It jumps to any time, in any order, many times. So every frame must be a pure function of `t`.

- No `Math.random()`. Use the kit's seeded `rand()`, and use it only while setting up, never per frame.
- No accumulated state (a position updated by `+= velocity` each tick). If you must simulate, precompute the
  whole simulation into an array of frames at load, then `seek(t)` indexes the array.
- No `Date.now()`, `performance.now()`, `requestAnimationFrame` loops or timers for the film.

### Seeded randomness

```js
// Different seeds per purpose, so changing one thing does not reshuffle another.
const rng = (seed) => mulberry32(seed);   // the kit's mulberry32
const rPos = rng(11), rSize = rng(23), rDelay = rng(37);
const dots = Array.from({ length: 180 }, () => ({ x: rPos() * W, y: rPos() * H, r: 4 + rSize() * 14, d: rDelay() * 0.8 }));
```

Generate everything at load, in a fixed order. Never draw random numbers inside `onUpdate`.

## Precompute a simulation

Run the simulation for the whole film at a fixed step, store the states, and play them back.

```js
// 1. simulate at 60 steps a second for the whole duration
const STEP = 1 / 60, N = Math.ceil(FORMAT.duration / STEP) + 1;
const bodies = dots.map((d) => ({ x: d.x, y: d.y, vx: 0, vy: 0 }));
const frames = [];                                   // frames[i] = Float32Array of x,y per body
for (let i = 0; i < N; i++) {
  const t = i * STEP;
  for (const b of bodies) {
    const target = targetAt(b, t);                   // a pure function of time and body
    b.vx += (target.x - b.x) * 12 * STEP; b.vy += (target.y - b.y) * 12 * STEP;   // spring toward target
    b.vx *= 0.9; b.vy *= 0.9;                        // damping
    b.x += b.vx; b.y += b.vy;
  }
  frames.push(Float32Array.from(bodies.flatMap((b) => [b.x, b.y])));
}
// 2. seek(t) only reads
function drawAt(t) {
  const f = frames[Math.min(N - 1, Math.round(t / STEP))];
  ctx.clearRect(0, 0, W, H);
  for (let k = 0; k < bodies.length; k++) { ctx.beginPath(); ctx.arc(f[2 * k], f[2 * k + 1], dots[k].r, 0, 6.2832); ctx.fill(); }
}
tl.to(clock, { t: FORMAT.duration, duration: FORMAT.duration, ease: "none", onUpdate: () => drawAt(clock.t) }, 0);
```

`clock` is a plain object `{ t: 0 }`. Because `onUpdate` runs on every seek, drawing is a function of time.
Keep the array small: 180 bodies x 2 floats x 60 steps x 30s is about 2.6MB; fine. For 10000 particles, cut the
step to 30 and interpolate.

## Building blocks

| Tool | What it gives | Use for |
|---|---|---|
| Noise (simplex, Perlin) | smooth randomness over space and time | organic drift, flow fields, terrain, liquid edges |
| Fibonacci / phyllotaxis | even spirals: `angle = i * 137.508deg`, `r = c * sqrt(i)` | flowers, galaxies, dense radial reveals, loading rhythms |
| Voronoi | cells around seed points | cracks, tiles, territory, a shattering effect |
| Flocking (boids) | groups that move together | crowds, data points finding a shape, swarm morphing into a logo |
| Attractors | points pulled to a centre or curve | gathering fragments into the motif |
| Metaballs | soft blobs that merge | liquid, organic UI, a logo made of drops |
| Springs and forces | physical motion | gathering, bouncing, elastic networks |
| Grids and tilings | order from rules | the geometric style; a grid that shifts and settles |
| Cellular automata | rules over a grid | evolving patterns, "growth" |
| Lissajous, parametric curves | smooth rhythmic lines | audio-like waves, abstract headers |

Phyllotaxis in a few lines:

```js
const seeds = Array.from({ length: 400 }, (_, i) => ({ a: i * 2.39996323, r: 14 * Math.sqrt(i) }));
// position: x = cx + r cos(a), y = cy + r sin(a); animate r with a stagger of i * 0.002 for a bloom
```

## Particles with meaning

A particle should carry something: data, the shape's mass, energy released by an action, a trail that records a path.

| Floating dust (slop) | With meaning |
|---|---|
| Random dots drifting | Dots that are the pieces of the motif and gather into it |
| Sparkles around the logo | Sparks released on the beat, travelling from where the impact happened |
| Background particles | A field that bends around the cursor or the motif (displacement) |
| Confetti | A burst on the one celebratory beat, then gone |

If you cannot say why a particle is there, delete it.

## Choosing the renderer

Pick the simplest that does the job.

| Need | Use |
|---|---|
| Boxes, text, a few hundred shapes | DOM and GSAP |
| Hundreds to thousands of shapes, a few effects | Canvas 2D, redrawn per seek |
| Tens of thousands of sprites, filters | PixiJS (WebGL) |
| Real 3D, lighting, depth | three.js, camera on the master clock (`drip_guide video/camera`) |
| Per-pixel effects (noise fields, liquid, distortions) | A shader (a full-screen quad in three.js or raw WebGL) with `time` as a uniform set from `tl` |
| A lot of SVG paths | SVG; mind the render cost per frame |

Shader resources: The Book of Shaders (teaching) and LYGIA (a shader function library). Check each library's licence
before copying and keep a local copy for the final render. A shader reads `u_time` from the seek, never from the
clock:

```js
const u = { t: 0 };
tl.to(u, { t: FORMAT.duration, duration: FORMAT.duration, ease: "none", onUpdate: () => { material.uniforms.u_time.value = u.t; renderer.render(scene, camera); } }, 0);
```

WebGL canvases: set `preserveDrawingBuffer: true` or render inside `onUpdate`, otherwise the capture can return a
blank frame.

## Make it art-directed

- Limit the palette to the film's colours; map noise values to a ramp from `palette_generate`.
- Control the scale: large forms and a few small ones beat even texture everywhere.
- Fix the seed that looks good and write it down in the file (`const rand = mulberry32(20261126)`), so a re-render
  matches the approved look.
- Rest: a procedural field that moves every frame at the same speed becomes wallpaper. Give it a rhythm (a pulse on
  the beat, a calm moment).

## Checks

- `motion_frames` at the same time twice returns the same picture. If not, something is not a pure function of `t`.
- Seek backward (to 5.0 after 8.0): the picture must match a forward sweep. If not, there is accumulated state.
- Count the cost: a render at 30 fps for 30s is 900 frames; if each takes 2s, that is half an hour. Lower
  counts, simplify filters, draft first.
