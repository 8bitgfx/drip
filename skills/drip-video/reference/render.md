# Render: the contract and the renderers

Drip does not record a playing page. It seeks to each frame, takes a picture, and encodes the pictures. That makes
renders exact and repeatable, and it sets rules for the composition.

## The seek contract

`motion_frames` and `motion_export` look for a clock in this order:

| Clock | What the page offers |
|---|---|
| `window.__drip` | `{ width, height, fps, duration, seek(t) }`; the kit's contract |
| `window.seek(t)` | a global function that shows time `t` |
| `window.__tl` | a paused GSAP timeline; Drip seeks it |
| HyperFrames `__timelines` | the registry HyperFrames pages use |
| CSS animations | paused and set to a time through the Web Animations API |

The kit is HyperFrames-style so every renderer plays the same file: a root element with `data-composition-id="main"`,
`data-start="0"`, `data-duration`, `data-width` and `data-height` (equal to `FORMAT`), one paused GSAP timeline `tl`
registered as `window.__timelines["main"]`, and `window.__drip.seek(t)` for Drip's own tools. `seek(t)` may be async
(it waits for fonts) and must leave the page showing exactly time `t`. No timers, no `Math.random`, no network
fetches: data (narration word timings, numbers) comes in through `<script src>` files next to the composition.

## Determinism rules

The same `t` must always draw the same picture.

- No `Date.now()`, `performance.now()`, `setTimeout`, `setInterval` or `requestAnimationFrame` driving the film.
- No `Math.random()`. Seeded `rand()` only, and only at setup (`drip_guide video/procedural`).
- No CSS animations or transitions; they run on their own clock. Put everything on `tl`.
- No accumulated state that depends on previous frames, unless it is precomputed.
- Fonts loaded before frame 0 (`document.fonts.ready`); use the font's real file (local `@font-face` or a loaded web
  font), not a fallback.
- Images, video, models and textures decoded before the first seek.
- Libraries copied locally for the final render (below), so the network cannot change the result.
- No dependence on window size: lay out in stage pixels (the kit's `#stage` is sized to the film's format).

Test it: `motion_frames` at the same time twice gives identical frames; seeking to 8.0 and then to 5.0 matches a
forward sweep.

## Libraries that do not seek

GSAP, anime-style tweens and plain DOM do. Some libraries (Lottie, video elements, Rive, Three.js particle
systems, p5, Pixi tickers) run their own loop. Wrap them so the master clock drives them.

```js
// A Lottie animation driven from tl
const lottie = bodymovin.loadAnimation({ container: S("#logo"), renderer: "svg", loop: false, autoplay: false, path: "assets/logo.json" });
const lt = { f: 0 };
tl.to(lt, { f: lottie.totalFrames - 1, duration: 2.0, ease: "none", onUpdate: () => lottie.goToAndStop(lt.f, true) }, "logo");

// A <video> element: set currentTime from t, and wait for 'seeked' inside the async seek()
tl.to(lt, { f: 1, duration: 3, ease: "none", onUpdate: () => (S("#clip").currentTime = lt.f * 3) }, "clip");
```

Rule: the library draws, the timeline decides. Put `onUpdate` on a tween whose progress is the time, and set the
library's state from it. For video, also wait for the seek to finish before capture (the kit's async `seek` can
`await` a promise for it).

## motion_frames: the check

`motion_frames` opens the composition, seeks and returns sheets of real frames.

| Call | Use |
|---|---|
| no times | a 16-frame sweep of the whole film; a clean sweep on the current files lets the turn end |
| `times: [..]` | style frames; the exact moments you care about |
| `around: [t..]` | each transition at -0.25, -0.1, 0, +0.1, +0.25s |
| `from`, `to`, `step` | a dense run (step about 0.033) across a fast move or a morph |
| `count` | frames in a sweep (4-48) |

It reads the format from the recorded storyboard; edits after the last clean sweep need a new sweep.

## motion_export

| Param | Notes |
|---|---|
| `target` | the composition (`.html` or URL) |
| `out` | default `<composition folder>/out/<name>.mp4` (`.webm` with alpha) |
| `fps`, `width`, `height` | override the composition's own |
| `from`, `to` | render a slice; useful for checking one scene at full quality |
| `audio` | one sound or music file mixed under the picture |
| `alpha: true` | WebM with transparency; the page background must be transparent |
| `draft: true` | half size at 15 fps: fast sanity check |
| `engine` | `auto` (default), `kinetograph`, `framevelo`, `hyperframes`, `drip` |

Engines, set up by Drip itself (never ask the user to install anything):

- The first `/drip:motion` on a machine installs **Kinetograph** (>=0.4.0-rc.1, Apache-2.0: GPU via Metal, Vulkan
  or D3D12, CPU fallback, no browser, carries its own FFmpeg), **FrameVelo** (Chrome plus the hardware encoder) and
  **HyperFrames** into `~/.drip/vendor` in the background, test-renders a one-second clip with each and with Drip's
  own capture, and keeps the fastest that works in `~/.drip/motion-renderer.json`. It never asks again.
- `auto` renders with that choice and falls back through the others in measured order, Drip's capture last.
- Drafts, `from`/`to` slices and `alpha` always use Drip's own capture (it seeks frame by frame).
- Music, effects and narration are mixed on afterwards with ffmpeg (Kinetograph's own, if none is on PATH).
- A library a renderer can't run (check Kinetograph's compat list before choosing an exotic one): wrap it so it
  is driven from `tl` (below), or render with `engine: "drip"`.

After rendering, `motion_study` the output file: duration, cut count and rhythm should match the storyboard. The
final check is on the video itself, not on the page.

## Formats

| Format | Size | Notes |
|---|---|---|
| 16:9 | 1920x1080 | site hero, YouTube, presentations |
| 9:16 | 1080x1920 | Reels, Shorts, TikTok; keep important type inside the central safe area |
| 1:1 | 1080x1080 | feeds |
| 4:5 | 1080x1350 | feed posts |
| 4K | 3840x2160 | only when asked; render cost is 4x |

fps: 30 for most films, 24 for a filmic feel, 60 only for fast UI motion. Alpha WebM is for overlays and logo
stings that go over other video; not every player handles it.

Re-layout per format; do not crop a 16:9 film for 9:16. Change `FORMAT` in the composition, position elements in
stage pixels, and check with `motion_frames`.

## Draft, then final

1. Draft: `motion_export` with `draft: true` after every big change. Look for errors and the pace.
2. Final: copy libraries next to the file and point the script tags at them:

```html
<script src="./vendor/gsap.min.js"></script>   <!-- was the CDN url -->
```

3. Check fonts are local (`@font-face` with a `src` next to the file) for the same reason.
4. Render at full size, with `audio` if there is one.
5. `motion_study` the MP4.

## Performance

| Cost | Fix |
|---|---|
| Large blur filters | blur radius under 40px; blur fewer layers; pre-blur images |
| Many box shadows or backdrop filters | flatten them to images, or reduce count |
| Thousands of DOM nodes | canvas or WebGL |
| Big images | resize to the film's size at export |
| WebGL shaders at 4K | lower sample counts; render at the film's size, not more |
| Long films at 60 fps | the cost is frames x seconds per frame; draft first |

Estimate: frames = fps x duration. 30 fps x 30s = 900 frames; at 1.2s a frame that is 18 minutes. Time one frame
before committing to a long render.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Blank frames | the page was not ready: fonts, images or a WebGL canvas without `preserveDrawingBuffer` |
| Something moves in the render but not in `motion_frames` | an animation on its own clock (CSS or a library loop) |
| Different frames on each run | `Math.random()`, a timer, or a network resource |
| Fallback font | font not loaded before frame 0 |
| Flicker in the render | a library redrawing asynchronously; wrap it |
| Wrong size | layout used `vw` or `vh`; use stage pixels |
