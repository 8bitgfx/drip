---
name: drip-imagery
description: Picture rules - hero images, photos, illustrations, renders, textures, image prompts, alt text, licences and performance. Use when a page or screen needs pictures, or shows empty image boxes, gradient placeholders, stock-looking art or drawn SVG scenes.
user-invocable: false
---

# Imagery (Drip)

Applies to every picture on a page. Call `drip_guide imagery` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Source order: the user's own assets, a capture of the real product, a found photo with a known licence, a generated image, type alone. Never an empty box or a gradient where a picture belongs.
- Every found image goes through `images_save`; never hotlink; an "unknown" licence never ships.
- Big or not at all; one visual world per page; text on an image keeps 4.5:1.
- A generated image gets an art-directed prompt; look at it full size before using it.
