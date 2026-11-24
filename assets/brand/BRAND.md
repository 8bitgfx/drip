# Drip brand

## Idea: Out of bounds
A design tool's selection box around a block of ultramarine paint that won't stay inside it. The paint bulges over the bottom edge of the frame and runs off in drips.

It says what Drip does: agents left alone produce work that fits the template box; Drip gets them to break out of it. "Drip" is also slang for style, and the paint is literal: real material, made by hand, slightly out of control.

Refuses: blood-red drops, water droplets, gradient AI orbs, sparkles, terminal glyphs.

## Mark
- **Frame**: hairline selection box with seven white handles (corners, top and side midpoints). The bottom-middle handle is left out because the paint covers that edge.
- **Paint**: flat ultramarine, no highlights. It fills the frame and runs out of the bottom edge in three drips of different weights. Each drip leaves the box through a concave fillet, its neck swells slightly into a round tip, and every join is tangent: smooth liquid, not sticks or blobs.
- **Lockup**: the frame's top sits on the ascender of "drip", its bottom on the baseline; the drips hang below like a descender.

## Colours
| Role | Hex | Use |
|---|---|---|
| Ultramarine | `#2340FF` | the paint, handle borders, the frame on light grounds, badges |
| Ink | `#0D0E12` (`#1B1D26` at the top of the icon gradient) | icon ground, wordmark on light |
| Paper | `#F5F2EC` | wordmark on dark, light panels |
| Frame on dark | `#93A2FF` | the selection box on dark grounds |

Ink on paper ≈ 17:1. Paper on ultramarine ≈ 5.8:1 and white on ultramarine ≈ 6.5:1, so text on the paint passes AA at any size.

## Type
**Bricolage Grotesque** Bold (SIL OFL 1.1) for the wordmark, outlined to paths in `src/glyphs.json` so it renders without the font. The same family for the social card's line.

## Files (`assets/brand/`)
| File | Use |
|---|---|
| `icon.png` (1024²), `icon.svg` | plugin icon (also `.claude-plugin/icon.png`), avatars, favicons |
| `mark.svg` / `mark-dark.svg` | the mark alone, transparent, for light / dark grounds |
| `wordmark-light.*` / `wordmark-dark.*` | README header and docs, light / dark themes (PNG at 2×) |
| `social-preview.png` (1280×640) | GitHub social preview (repo Settings → Social preview) |

Everything is generated: `src/brand.mjs` holds the geometry; `src/render.mjs` writes the icon, mark and wordmarks, and `src/social.mjs` writes the social preview (both shoot with headless Chrome or Edge).

```
node assets/brand/src/render.mjs
node assets/brand/src/social.mjs
```

## Rules
- Clear space: half the frame's width on every side of the mark and the lockup.
- Minimum sizes: icon 16 px, lockup 120 px wide. Below 24 px the handles blur into the frame; that's fine.
- Keep the paint flat ultramarine. No gradients, no recolouring, no extra drips, no drips on the type.
- The handles stay white with ultramarine borders, on every ground.
- Never set "drip" in another face, stretch the mark, or put the paint outside a frame.
