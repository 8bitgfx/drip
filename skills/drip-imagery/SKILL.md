---
name: drip-imagery
description: Use when a page or screen needs pictures (hero images, photos, illustrations, 3D renders, textures, image prompts, alt text, image licences, srcset, lazy loading, AVIF/WebP), or when a layout shows empty image boxes, gradient placeholders, stock-looking art or drawn SVG scenes. Part of Drip.
user-invocable: false
---

# Imagery (Drip)

**Before you do anything: call `drip_guide` with topic `imagery`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Pick the source in this order: the user's own assets, a capture of the real product, a found photo with a known licence, a generated image, type alone. Never an empty box or a gradient where a picture belongs.
2. When the brief names a real business or product, ask the user for their photos, logo and screenshots before searching or generating.
3. Every found image goes through `images_save` so its source, licence and credit are logged. Never hotlink, never write an image URL from memory.
4. Know the licence before it ships: CC0, public domain, Unsplash and Pexels are free to use; CC BY and CC BY-SA need a visible credit; "unknown" never ships.
5. A generated image gets an art-directed prompt (subject, composition, light, palette from the direction, room for text, exclusions). Never a one-line prompt. Look at every result full size before using it.
6. One visual world per page: one light, one grade, one treatment across every image.
7. Big or not at all: a photo spans at least half the content width or stands 400px tall. A thumbnail of a mood reads as clip art.
8. Text on an image keeps 4.5:1 against the pixels under it: a calm area or a scrim, never centred white type over a busy frame.
9. No drawn SVG scenes (people, plants, buildings), no unDraw/Humaaans-style packs, no floating 3D blobs, no stock faces posing as customers.
10. Hero image: eager, `fetchpriority="high"`, under 400 KB. Every other image: `loading="lazy"`, `width` and `height` set, AVIF or WebP through `srcset` at no more than 2x the shown width.
11. Alt text says what the picture tells the reader; `alt=""` for pure decoration. Never bake text into an image.

## Tools
- `images_search` — find photos (Wikimedia Commons, Unsplash, Pexels, Openverse); each result carries its licence.
- `images_save` — download a pick into the project and log source, licence and credit line.
- `keys_status` / `gen_providers` — check whether image generation is set up before you plan on it.
- `keys_open` — open the local page where the user pastes an image provider key.
- `gen_image` — generate hero art, illustrations, textures or renders from an art-directed prompt.
- `palette_from_image` — pull the palette out of a chosen image so page and picture agree.
- `gradient_mesh` — a mesh gradient with grain for a ground or band, never in place of a picture of a thing.
- `fitcheck_shot` — see the images at phone and desktop size; also captures a running product for real screenshots.

## Read deeper when
| Situation | Call |
|---|---|
| Writing a `gen_image` prompt, or a set of images that must match | `drip_guide imagery/prompting` |
| Searching photos, judging candidates, licences and credits | `drip_guide imagery/sourcing` |
| Cropping, scrims, duotone, grain, frames, responsive images in code | `drip_guide imagery/treatment` |
| Faux product UI, app screenshots, bento shots | `drip_guide productshots` |
