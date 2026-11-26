# Visuals: something worth looking at in every beat

A launch film fails quietly when it is clean but empty: flat shapes on a flat ground, one move per beat, mostly
black frames. Premium motion layers light, depth and a rich object in every frame, and starts something new about
every second. `motion-visuals.js` (copied next to every composition by `drip_kit({ template: "motion" })`) gives
you those layers as seekable pieces. `drip_kit({ template: "motion-visuals" })` writes a 12 s demo that uses them
all: open it, `motion_frames` it, copy what you need.

## How they work

Every visual is a pure function of time: `const v = DripVisuals.<name>(container, opts)` builds its DOM once and
returns `{ el, at(t) }`; `at(t)` sets the whole state for time t, so any renderer can seek it. Drive them all from
the film's clock with one line:

```js
const V = DripVisuals;
const light = V.lightField(world, { seed: 4, intensity: 0.85 });
const grain = V.grain(stage, { opacity: 0.07, seed: 3 });
const drift = V.cameraDrift(stage, { target: world, rx: 1.6, ry: 2.6, period: 9 });
V.drive(tl, [light, grain, drift /*, every other visual */]);
```

Colours default to the film's CSS variables (`--accent`, `--ground`, `--ink`, `--glow`). Randomness comes from
`seed` only. `show` / `hide` (seconds) and `fade` bring a visual in and out.

## The layers a frame needs

| Layer | Always? | Visuals |
|---|---|---|
| Ground that lives | yes | `lightField` (slow mesh-gradient light), `grain` (film grain, 24 fps cadence) |
| Camera | yes | `cameraDrift` (2-4 degree drift and a slight push over the whole film) |
| Light on the subject | most beats | `glow` (bloom behind a target, optional pulse), `lightSweep` (specular pass across a target) |
| Depth | most beats | `plane3d` (UI or a card on a tilted plane with shadow, glass edge, sheen), `depthStack` (layered panels with parallax and depth of field), `orbitCards` (chips orbiting in depth, back ones blurred) |
| The rich object | every beat has one | `particlesToShape` (particles converge into text, a path or an image, and disperse), `dotGlobe`, `liquidBlob` (goo morphs: drop, ring, pill, cluster, split, drip), `lineDraw` (paths with a glowing pen tip) |
| Data moments | when there are real numbers | `countUp` (odometer roll), `barGrow` (bars and area chart) |
| Type | when there is copy | `typeReveal` (word by word, mask and blur rise; `*word*` marks the accent) |

## Options (the useful ones)

| Visual | Key options |
|---|---|
| `lightField` | `blobs` 4, `intensity` 1, `speed` 1, `colors`, `vignette` .6, `seed` |
| `glow` | `target` or `x,y`, `size` or `scale` (x the target), `intensity` .9, `pulse: { period, amount }` |
| `grain` | `opacity` .07, `fps` 24, `blend` "overlay" |
| `plane3d` | `target`, `from`/`to` `{ rx, ry, rz, x, y, z, s }` or `keys: [{ t, ... }]`, `start`, `dur`, `enter`, `hide` |
| `cameraDrift` | `target`, `rx` 2.2, `ry` 3, `rz` .35 (degrees), `period` 9, `scale` 1.03 |
| `lightSweep` | `target`, `start` or `times: [...]`, `dur` 1.1, `angle` 18, `width` .34 |
| `particlesToShape` | `text` + `size`, or `path` + `viewBox`, or `image`; `x, y`, `n` 1800, `start`, `dur`, `disperse: { start, dur }`, `seed` |
| `dotGlobe` | `x, y, r`, `dots` 2400, `speed` (turns/s), `tilt`, `arcs` |
| `orbitCards` | `x, y, rx, ry`, `items`, `w, h`, `speed`, `start`, `dur` |
| `liquidBlob` | `x, y, size`, `keys: [{ t, shape }]` |
| `lineDraw` | `paths`, `viewBox`, `start`, `dur`, `stagger`, `width`, `tip` |
| `countUp` | `value`, `from`, `prefix`/`suffix`, `start`, `dur`, `size`, `mode` "odometer" |
| `barGrow` | `data`, `labels`, `type` bars/area/both, `start`, `dur`, `highlight` |
| `depthStack` | `layers` or `n`, `gap`, `spread`, `focus` (index or `[{ t, i }]`), `dof` |
| `typeReveal` | `text`, `x, y, w`, `size`, `align`, `start`, `stagger`, `out: { start }` |

## Making a beat rich

Name the beat's visual in `motion_storyboard` (`visual`) and the smaller moments inside it (`moments`). A product
beat, for example: the screen on a `plane3d` that eases from 15 to 9 degrees, a `glow` behind it pulsing on the
music, a `lightSweep` as the headline lands, a `countUp` on the real number, chips arriving one by one on an
`orbitCards` ring. Five things start in three seconds, and one of them leads.

- **One leads.** Layers are not all equal: the subject is sharp and lit; the rest is dimmer, blurred or smaller.
- **Light follows meaning.** The glow sits behind whatever the viewer must look at now and moves when that changes.
- **Brand first.** A flat-colour brand keeps its flat colours on the subject; light and depth live around it
  (the ground, the glow, the plane's shadow), never as gradients painted on the logo.
- **Real data only.** `countUp` and `barGrow` show the product's real numbers, or say "Example data" on screen.
- **Particles with meaning.** They form the name, the product shape or a number, then leave. Floating dust for its
  own sake is a template tell.

## Checks

- `motion_frames` flags mostly empty frames (under 12% of the picture has anything on it) and reports how full the
  frames are on average.
- `motion_trace` flags stretches longer than 2.2 s where nothing new starts, and reports new moves per second
  (aim for about 0.7-1.2 in a launch film).
- Each `at(t)` should take under about 6 ms at 1080p; if a frame sweep gets slow, cut particle counts first.
