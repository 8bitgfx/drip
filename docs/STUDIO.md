# Studio: original artwork, shaders, 3D mockups, Blender, motion, MCP Apps

Code: `mcp/src/modules/studio/` (tools), `mcp/src/core/apps.mjs` (MCP Apps helpers). Agent guide: `skills/drip-studio/`.
Tests: `mcp/test/studio.test.mjs` (offline; pieces that need a CDN or a third-party API run with `DRIP_NET=1`).

Everything renders on the user's machine, in the shared headless Chrome (`core/browser.mjs` `withTab`) or in a Blender they already have.
No service, account, key or hosted anything is involved.

## Tools

| Tool | Purpose |
|---|---|
| `art_generate` | Seeded procedural SVG artwork from a layer stack (flow, contours, blobs, truchet, halftone, dither, isometric, grain); `.svg` + `.webp`/`.png` + `.art.json` spec |
| `shader_hero` | Paper Shaders preset in headless Chrome: still WebP, frame loop, animated WebP, React / vanilla snippet |
| `scene_render` | three.js mockups and product scenes (decal from your image, PBR, HDRI, turntable); PNG/WebP + `.scene.json` |
| `assets_3d_search`, `assets_3d_save` | Poly Haven and ambientCG HDRIs, PBR sets, models; saved with provenance |
| `blender_render` | The same scene JSON through Blender (Cycles), when Blender is installed |
| `motion_render` | Record a page's CSS / Web Animations / script motion: timings, frame strip, animated WebP |

## What existed already (audit) and what was reused

| Existing | Used how |
|---|---|
| `gradient_mesh` (`assets/gradient.mjs`) | unchanged; its `meshGradient()` is the `grain` layer of `art_generate`, so there is one grain-gradient implementation |
| `core/render.mjs` (`renderHtml`), `core/imaging.mjs` (`processImage`, `sheetInBrowser`), `core/images.mjs` (`contactSheet`, `toJpeg`) | rasterising SVG, WebP encoding to a size budget, contact sheets |
| `core/browser.mjs` (`withTab`, `openPage`) | every studio render; no second browser stack |
| `images_save` credits log (`.drip/assets.json`) | `assets_3d_save` appends the same entry shape |
| `core/seen.mjs` | `assets_3d_search` numbers work in `assets_3d_save` |
| `core/jsonstore.mjs` (`withLock`, `writeJsonAtomic`) | the shared credits log |
| `core/serve.mjs` (`toUrl`) | `motion_render` opens local `.html` files |
| logo module / `opentype.js` | not duplicated; wordmark work stays in the logo and type tools |

## Decisions on the candidate projects

| Candidate | Decision |
|---|---|
| Paper Shaders (`@paper-design/shaders` 0.0.80, Apache-2.0) | used, loaded in the rendered page from a pinned jsDelivr URL (no install, no bundle weight). 16 presets with the react defaults and uniform mapping; `shaders-react` is only named in the code we hand back |
| three.js (0.170.0, MIT) | used the same way: pinned jsDelivr import map; addons: RoomEnvironment, RGBELoader, RoundedBoxGeometry |
| Poly Haven API, ambientCG API (CC0) | used: search, download, provenance |
| Blender | optional: found, never installed; `blender -b --python` through `execFile` with an argument array; the scene is a JSON file the script reads as data |
| SVGO 4.1.0 | **optional**: used when installed (`~/.drip/vendor/node_modules/svgo` or normal resolution); about 1.5 MB unpacked and our own path output is already compact (decimals, simplification), so it is not bundled |
| resvg-js 2.6.2 | **optional** vendor rasteriser (`rasterizer: "resvg"`); a clear message says how to install it when missing. Chrome is the default |
| Paper.js | not used: its job (path maths) is covered by about 120 lines in `rng.mjs`, and it is a browser library |
| svg-techo (MIT) | read; not adopted: Drip's generators are written for its layer-stack and palette model |
| MockStudio, OpenMockup, jokull's Blender skill, Motion Canvas, Drei | read for the mockup ideas (decal on screen / label, studio light, turntable); not dependencies |
| MCP Apps (`@modelcontextprotocol/ext-apps` 2.0.4, spec 2026-01-26) | implemented directly against the spec (about 120 lines, no SDK); see below |

Installing the optional pieces: `cd ~/.drip/vendor && npm i svgo @resvg/resvg-js` (create the folder first). The cli workstream's `drip doctor --install` is the intended front end.
Bundle size: the committed `mcp/dist` grew from 3,636,740 to 3,881,090 bytes (+244 KB) with these modules (measured with the existing esbuild build).

## art_generate

`kind` is a layer type or `composition` (default) with a `mood`: calm, warm, bold, editorial, technical, playful, dark, mono (each also supplies a default palette).
`palette`: hex colours, first = background. Layers pick inks by index.

The result contains the **layer stack**: every layer with its seed and every parameter. Pass it back as `layers`, or `from: "<name>.art.json"`.
A new `seed` re-seeds layers that came from a spec (a layer keeps its own seed only when no `seed` argument is given). Same inputs give the same SVG on every machine.

Layer parameters (defaults in `art.mjs` `DEFAULTS`): grain (`calm`, `grain`, `softness`, `style`, `blobs`, `colors`), flow (`sep`, `steps`, `step`, `scale`, `octaves`, `curl`, `strokeWidth`), contours (`levels`, `res`, `scale`, `octaves`, `falloff`, `indexEvery`), blobs (`count`, `size`, `wobble`, `blur`), truchet (`cells`, `style`, `strokeWidth`), halftone (`size`, `angle`, `field`, `gamma`, `maxRadius`), dither (`cell`, `field`, `bias`), isometric (`cols`, `rows`, `tile`, `maxHeight`, `gap`). Every layer also has `opacity`, `colors`, `blend`.

Output sizes at 1600x900 are 5 to 150 KB of SVG. Rendering a 1600x900 raster takes about 0.2 s once the browser is warm.

## shader_hero

The page (`shaderPage()`) imports `@paper-design/shaders@0.0.80/+esm`, builds the uniforms from the preset's parameters (colours through `getShaderColorFromString`, enum names through the library's tables, a noise texture where the shader needs one) and mounts a `ShaderMount` with `speed: 0`; `window.__seek(ms)` sets the frame, so stills and loops are deterministic. Unknown parameter names are rejected with the list of valid ones. Software WebGL works (here: ANGLE/WARP); a 1200x675 still plus a 6-frame loop took about 6 s including the browser start.

## scene_render

The scene is plain JSON (`sceneSchema` in `scene.mjs`, zod). Objects: phone, laptop, box, cylinder, bottle, sphere, card, plane. Images (decals, maps) and the HDRI are inlined by Node (`prepareScene`), so the page needs no file access; project paths outside the project are refused.
`material.pbrFolder` picks the colour, OpenGL normal, roughness and AO maps from a folder saved by `assets_3d_save`. Lights: `studio`, `soft`, `dramatic` or a list. `environment.hdri`: a Poly Haven id or a project `.hdr`.
Mockups cover the common shots (`mockupScene()`); the tool returns the full scene so one value can be changed and re-rendered.
Measured here: a 1200x800 phone mockup renders in about 3 s.

## assets_3d_*

Poly Haven (`api.polyhaven.com`: assets, files, info) and ambientCG (`ambientcg.com/api/v2/full_json`). Saved to `assets/3d/<source>/<id>/` (override with `dest`), plus `provenance.json` (source page, authors, the licence the source states, files, time) and entries in `.drip/assets.json`. ambientCG downloads are zips; a small reader (`unzip`, stored and deflate) extracts them and refuses entries that would leave the folder. Downloads are cached in `~/.drip/cache` for 30 days.

## blender_render

`findBlender()` looks at `DRIP_BLENDER`, `.drip/config.json` `blender.path`, PATH, `Program Files\Blender Foundation\Blender *` (newest first), `%LOCALAPPDATA%\Programs`, Steam, `/Applications/Blender.app`, `/usr/bin`, `/snap/bin`, `/opt/blender*`. Without it the tool says where to get Blender; nothing is installed.
It writes `spec.json` and `render.py` to a temp folder and runs `blender -b --factory-startup -noaudio --python render.py -- spec.json out.png` (Cycles, CPU, denoised, transparent film, shadow catcher; the background colour is composited in Node). Verified here against Blender 5.1: a 640x640, 16-sample bottle took 11 s.
Differences from `scene_render`: labels wrap the full cylinder; bottles and phones are simpler shapes (a screw-lathe bottle, a bevelled slab).

## motion_render

`seek` mode pauses every animation returned by `document.getAnimations()`, sets each `currentTime`, and captures a WebP per frame: exact and independent of machine speed. It reports kind, property, target, duration, delay, easing and iterations of every animation. `before` (hover or click on a selector) starts transitions before recording. If no animation is found (script or canvas motion) it records `live` and reports the achieved fps. Output: a contact strip image (up to 8 frames), an animated WebP (`out`), optional frames.
Animated WebP is built without ffmpeg (`webp.mjs`: VP8X + ANIM + ANMF around Chrome's still WebP frames) and is checked in the tests by decoding it in Chrome.

## MCP Apps (`core/apps.mjs`)

Follows the 2026-01-26 spec: a `ui://` resource with mime `text/html;profile=mcp-app`, tool `_meta.ui.resourceUri` (plus the deprecated flat key), `structuredContent` and the `io.modelcontextprotocol/ui` capability.

- `registerAppResource(server, { uri, name, html })`: once per server and URI; the CLI and registry sinks have no `registerResource` (the registry sink gained a no-op) and ignore it.
- `appToolMeta(uri)`: the tool's `_meta`.
- `hostSupportsApps(server)`: reads the client capabilities after connect. `withApp(server, result, uri, structured)` adds `structuredContent` and the resource link **only** for such hosts, so other hosts spend no tokens on UI data. Tools always return normal content: image blocks, text, files.
- `appShell({ body, script })`: a complete View document with the postMessage JSON-RPC handshake (`ui/initialize`, `ui/notifications/initialized`), `app.onResult`, `app.callTool`, `app.size`, host theme variables. No SDK, no network, no external files.

The studio View (`viewer.mjs`, `ui://drip/studio-preview`) shows the picture and parameter controls (seed, layer knobs, camera, exposure, time). A control change calls the same tool again through the host without `out` (nothing is written); Save repeats the call with the original `out`.
The tests run a real host simulation in Chrome: handshake, tool-result rendering, a control change producing a `tools/call` with the new value and no `out`.

How `board_open` and fitcheck can adopt it: build their HTML with `appShell()` (the board page's controls become the View script), `registerAppResource` it at registration, add `_meta: appToolMeta(uri)` to the tool, and return `withApp(server, result, uri, { ...data })` from the handler. The View receives the data as the tool result and can call the board tools (`tools/call`) for feedback. Hosts without Apps keep the current local-browser preview.

## What was not verified

- No MCP Apps **host** was available: the View is tested against a simulated host that follows the spec, not Claude Desktop, ChatGPT, Cursor or VS Code.
- Software WebGL was verified on this Windows machine (ANGLE / WARP). Linux CI without a GPU may need `--use-angle=swiftshader`-style flags in `core/browser.mjs`, which this workstream did not change; scene and shader tests that need WebGL and a CDN are behind `DRIP_NET=1`.
- Blender was exercised with 5.1 only. Older versions may differ in Principled BSDF input names (`Coat Weight`, `Emission Color`).
- `@resvg/resvg-js` and SVGO are optional and not installed here; their "installed" paths are not exercised, only the "missing" message and the pure fallback.
- Poly Haven model downloads (glTF) are saved but not yet loaded into `scene_render` (no glTF object type).

## Bundling note

Do not `await import("./x.mjs")` a module that is also imported statically somewhere in the bundle. esbuild turns the dynamic target into a lazily initialised module and the initialisation order of the whole graph shifts: the bundled server crashed at startup (`Class2 is not a constructor` inside the MCP SDK's zod schemas) although every unit test passed. `startup.test.mjs` (bundled server starts and lists tools) is the guard; run `npm run build` before `npm test`. Dynamic `import(name)` of optional packages (`loadOptional`) is fine because the name is not resolvable at build time.
