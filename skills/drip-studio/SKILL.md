---
name: drip-studio
description: Use when a page, section or brand needs original artwork or visual production instead of stock - a hero background, generated pattern or motif, shader or gradient backdrop, product or device mockup with the user's real screenshot, packaging render, 3D scene with HDRI lighting, Blender still, or a recording of an animation as frames or animated WebP. Covers art_generate, shader_hero, scene_render, assets_3d_search / assets_3d_save, blender_render, motion_render. Part of Drip.
user-invocable: false
---

# Studio: original artwork, shaders, mockups, motion (Drip)

**Before you do anything: call `drip_guide` with topic `studio`.** It returns the full guide and records the read.
If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

Everything here renders on the user's machine in the shared headless Chrome (or their Blender). Nothing is uploaded.

## Rules you must not break
1. Make the artwork belong to the direction: pass the chosen palette (first colour = background) and mood. A default-palette render is a draft, not a deliverable.
2. Artwork and shaders are material, not the idea. Keep the zone behind text calm (low opacity, sparse layers, `calm` on grain gradients) and check contrast on the final page with `fitcheck_shot`.
3. Mockups show the user's real screenshot or approved artwork (`fitcheck_shot` output, a project image). Never an invented UI on a device.
4. One signature visual per page. A hero shader plus art plus a 3D scene is three competing ideas.
5. Ship small: SVG for line and pattern art, WebP for raster, a still as the poster under any shader or loop, `prefers-reduced-motion` honoured. Never a 4 MB hero.
6. Keep the spec: `art_generate` writes `<name>.art.json`, `scene_render` writes `<name>.scene.json`. Change one value and re-render instead of starting over.
7. Software WebGL is fine for stills and loops; do not promise 60 fps live shaders from a render. Say what it costs on a low-end phone and give the static fallback.
8. Downloaded 3D assets (`assets_3d_save`) carry their source in `provenance.json` and `.drip/assets.json`; leave both in place.
9. A render is a candidate: look at it (the tool returns it), compare against the direction, then run the critic like any other visual.

## Tools
- `art_generate` - seeded SVG artwork from layers (flow, contours, blobs, truchet, halftone, dither, isometric, grain); returns an editable layer stack
- `shader_hero` - Paper Shaders presets as WebP stills, loops and the React / vanilla code to ship them live
- `scene_render` - three.js mockups and product scenes (phone, laptop, box, can, bottle, card, poster) with your image as the decal; HDRI, PBR, turntable
- `assets_3d_search` / `assets_3d_save` - Poly Haven and ambientCG HDRIs, PBR texture sets and models, saved with provenance
- `blender_render` - the same scene through Blender's path tracer, when Blender is installed
- `motion_render` - record any page's animation: exact timings, a frame strip and an animated WebP

## Read deeper when
| Situation | Call |
|---|---|
| Choosing between art, shader, 3D and photography for a hero | `drip_guide studio` |
| Pairing these visuals with images, product shots and motion | `drip_guide imagery`, `drip_guide productshots`, `drip_guide motion` |
