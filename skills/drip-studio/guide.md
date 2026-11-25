# Studio: original artwork, shaders, mockups and motion

Good studio work looks like it was made for this brand and nobody else: the palette is the direction's palette, the form
follows the idea (terrain for a hiking brand, halftone for an editorial one, isometric blocks for infrastructure), it sits quietly
behind the type, and it loads fast. Bad studio work is a default gradient, a spinning 3D blob and a stock phone with an invented UI.

## The procedure

1. **Decide what the visual is for.** Name the job in one sentence: "makes the hero feel like a cartographer's desk", "shows the real product on a phone". If you cannot, you do not need a visual here.
2. **Pick the tool by the job.**

   | Job | Tool | Why |
   |---|---|---|
   | Pattern, texture, motif, section background, brand artwork | `art_generate` | vector, tiny, editable, seeded: change density or colours without redoing it |
   | A background that moves or glows (gradients, grain, metaballs, dithering, god rays) | `shader_hero` | GPU shader; ship the still as the poster and the shader behind it |
   | The product on a phone or a display | `mockup_render` | real device models (MockStudio), the screenshot fitted to the real screen, studio HDRI, curated looks and camera moves; stills or clips |
   | A physical product: packaging, a tin, a bottle, merch | `scene_render` with a real glTF model (`type: "model"`, the user's model or a CC0 one) and the artwork on one part (`label`) | real geometry and materials, not a cylinder with a sticker |
   | Blender's path tracer for a scene | `blender_render`, only when the user asks for it | built-in shapes only; no glTF |
   | Real-world light or a material (wood, concrete, paper, metal) | `assets_3d_search` then `assets_3d_save` | CC0 HDRIs and PBR sets as lighting and `pbrFolder` materials |
   | How an animation actually behaves (timing, easing, what moves) | `motion_render` | exact frames and the numbers to put in code |

3. **Start from the direction.** Palette: first colour is the background, the rest are inks. Mood: calm, warm, bold, editorial, technical, playful, dark, mono. Keep contrast with the text zone in mind before you render.
4. **Render once, look, change one thing.** Every tool returns the image and its spec. Read the picture before touching a parameter: is it the right density, the right scale of form, a clear empty zone for the headline? Then change one parameter or the seed and render again.
5. **Check it in place.** Put it in the page and `fitcheck_shot`. Text over art must still pass contrast at 375 and 1440 px; art must not carry the information.
6. **Ship it light.** SVG for line art (run SVGO if it is installed), WebP for raster under about 300 KB for a hero, a poster still under every shader, `loading="lazy"` below the fold, reduced motion honoured.

- Software WebGL is fine for stills and loops; do not promise 60 fps live shaders from a render. Say what it costs on a low-end phone and give the static fallback.
- Never a 4 MB hero: SVG for line and pattern art, WebP for raster, a still as the poster under any shader or loop.
- Downloaded 3D assets (`assets_3d_save`) carry their source in `provenance.json` and `.drip/assets.json`; leave both in place.

## art_generate

Layers (stack them; later layers sit on top of earlier ones):

| Layer | Looks like | Main knobs |
|---|---|---|
| `grain` | soft colour field with film grain (the base of most heroes) | `calm` (keep a zone quiet), `grain`, `colors` |
| `flow` | flow-field lines, evenly spaced | `sep` (spacing px), `scale` (field size), `strokeWidth`, `opacity` |
| `contours` | topographic lines from a height field | `levels`, `scale`, `falloff`, `indexEvery` (thicker every n-th) |
| `blobs` | organic shapes, soft or hard | `count`, `size`, `wobble`, `blur` |
| `truchet` | tiles that connect into curves | `cells`, `style` arcs / diagonals / fills |
| `halftone` | dot grid sized by a field | `size`, `angle`, `field` radial / linear / noise, `gamma` |
| `dither` | ordered pixel dither of a field | `cell`, `field`, `bias` |
| `isometric` | a field of isometric blocks | `cols`, `rows`, `maxHeight` |

Compositions by mood stack two or three of these. Use the returned layer stack: change `colors` indexes, `opacity`, a `seed` for a new arrangement, then pass `layers` back. `from: "<name>.art.json"` replays a saved spec.
Colours index the palette (0 = background, 1.. = inks) or are hex strings.

Tells to avoid: all layers at full opacity (it shouts), five layer types at once, the same palette as the template, art busy exactly where the headline sits.

## shader_hero

Presets: mesh-gradient, grain-gradient, static-mesh-gradient, static-radial-gradient, dithering, metaballs, voronoi, warp, simplex-noise, neuro-noise, smoke-ring, god-rays, swirl, waves, perlin-noise, dot-grid. Pass the direction's colours; try `time` to pick the moment; `frames` + `duration` give a loop.
The result includes the React code (`@paper-design/shaders-react`). Shipping rules: render the shader inside the hero only, pause it off-screen, pass `speed={0}` for reduced motion, and show the saved WebP as the poster so the first paint is instant.

## mockup_render

- Devices always go through `mockup_render`: `mockup_render({ image: "<real screenshot or .html>", device: "iphone-17-pro" | "studio-display" | "slab", look, camera, aspect, background, out })`. An `.html` screen is rendered at the device's size first.
- Looks: `studio` (neutral, colour-true), `clean`, `hero` (bloom), `cinematic`, `retro`, `noir`. Cameras: `head-on`, `three-quarter`, `hero` (close, dramatic), `top-down`, `wide`. Motion (`orbit`, `dolly-in`, `reveal`, `drift`) with an .mp4/.webm out makes a clip.
- `finish: "flat"` shows the pixels exactly; `glass` reflects the studio. `patch` reaches every MockStudio setting (bloom, grain, vignette, camera tilt) as a JSON merge patch; the render saves its scene as .mock.json next to the image.
- The device models are CC-BY: the credit is written to `<out>.credits.txt`; keep it with the image (a caption, the footer, the README).
- One-time setup: `drip doctor --install mockstudio`.

## scene_render, assets_3d_*, blender_render

- Real objects: `{ type: "model", src: "polyhaven:<id>" | "<your .glb>" | "<folder from assets_3d_save>", size: [height], label: { mesh: "<part>", image: "<artwork>" } }`. The first render lists the model's parts; put the artwork on the one that is the label, the lid or the screen. Poly Haven's models are real scans: weathered props, good as scene dressing, rarely clean brand packaging; for a clean pack use the user's model or a CC0 one they choose.
- The built-in shapes (`mockup: "phone" | "laptop" | "box" | "can" | "bottle" | "card" | "poster"`) are blocking placeholders for composition, never the final picture.
- Full control: a `scene` (objects, materials, camera `azimuth` / `elevation` / `fov`, lights `studio` / `soft` / `dramatic`, `environment.hdri`, `render.exposure`). The result returns the scene JSON; edit it and render again.
- Lighting: a Poly Haven studio HDRI (`assets_3d_search type hdri query studio`) makes reflections believable; 1k is enough for lighting.
- Materials: `material: { pbrFolder: "assets/3d/ambientcg/Wood099" }` picks colour, normal, roughness and AO maps by name.
- Labels and screens use the decal as a texture: supply the real image at the right aspect (screens 9:19.5 phone, 16:10 laptop). `fit: "cover"` crops, `"contain"` letterboxes.
- `blender_render` takes the same JSON but draws only the built-in shapes (no glTF models). Use it only when the user asks for Blender.

## motion_render

Use it to see what an animation really does, before you tune or copy it: it lists every CSS / Web Animations animation with duration, delay, easing and the properties it changes, and shows frames across the run.
Seek mode is exact; `before: [{ action: "hover", selector: ".card" }]` records a hover transition. Script-driven motion (canvas, requestAnimationFrame) is recorded live and the achieved fps is reported.
Defaults worth checking against what you find: UI feedback 100-200 ms, entrances 200-400 ms, nothing over 500 ms except a deliberate set piece; ease-out for entering, ease-in-out for moving on screen; animate transform and opacity only.

## MCP Apps

On hosts that render MCP Apps, `art_generate`, `shader_hero` and `scene_render` show the image with sliders and a seed button; changing a control re-renders without writing files, and Save writes to the original `out`. Everywhere else the tools return the image, the spec and the files as usual.

## Slop tells for this craft

| Tell | Fix |
|---|---|
| Purple-to-pink mesh behind everything | the direction's palette, a calm zone, one layer type |
| Floating 3D blob with no connection to the product | `scene_render` of the real product, or no 3D |
| Phone mockup with an invented dashboard | the user's actual screenshot |
| A device or tin built from boxes and cylinders | `mockup_render` for devices, a real model in `scene_render` for objects |
| Decoration pasted over content (paint, stickers, shapes over words) | it goes behind the content, the content makes room, or it carries real depth (shadow, highlight, an edge it wraps); `fitcheck_shot` blocks a shape over text |
| A hero image over 500 KB | WebP, smaller `width`, fewer grain layers; poster + shader |
| Loop that cannot be paused | `prefers-reduced-motion`, pause off-screen, a Pause control for long loops |
| Texture that fights the text | lower opacity, `calm` zone, scrim only if nothing else works |

## Done when

- [ ] The visual uses the direction's palette and mood, and the spec (`*.art.json` / `*.scene.json`) is saved next to it.
- [ ] Text over it passes contrast in a real `fitcheck_shot` at 375 and 1440.
- [ ] Sizes are within budget; a poster or still exists for any shader or loop; reduced motion is handled.
- [ ] Any mockup shows a real screenshot; any 3D asset has its `provenance.json`.
- [ ] The critic has seen the page with the visual in place.

## Sources

Built for Drip around its studio tools. Techniques: flow fields and marching squares (standard computational-art methods), Truchet tiles, ordered (Bayer) dithering, halftone. Paper Shaders (Apache-2.0, paper-design/shaders), three.js (MIT), Poly Haven and ambientCG assets (CC0), MCP Apps (modelcontextprotocol/ext-apps).
