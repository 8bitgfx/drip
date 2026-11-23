# Drip brand

## Direction: Paint Drop
THESIS: The name is the idea: one drop of paint. Lowercase serif "drip" whose i-dot is a single vermilion drop; the icon is that drop alone. Refuses gradient AI orbs, sparkles and terminal glyphs.
WORLD: Warm chalk ground, warm ink, one vermilion accent used only for the drop. Instrument Serif for the wordmark, Geist for UI text. No gradients except the drop's own soft shading.
SIGNATURE: The drop over the i.

## Colours
| Role | Hex | Use |
|---|---|---|
| Chalk | `#F4F1EA` | light ground |
| Ink | `#16140F` | wordmark on light, icon ground |
| Bone | `#F4F1EA` | wordmark on dark |
| Vermilion | `#E8452C` | the drop only (shaded `#FF7A5C` → `#E8452C` → `#B8301B`) |

Ink on chalk ≈ 17:1. The drop never carries text.

## Files (`assets/brand/`)
| File | Use |
|---|---|
| `icon.png` (1024²) | plugin icon, GitHub social card source, favicons |
| `icon.svg` | the icon as vector |
| `drop.svg` | the drop alone, transparent |
| `wordmark-light.png` / `wordmark-dark.png` | README header (light / dark GitHub themes) |

Sources in `assets/brand/src/` (render with `node assets/brand/src/render.mjs`).

## Rules
- Clear space around the wordmark: the drop's height on every side.
- Minimum sizes: icon 16px, wordmark 80px wide.
- Never recolour the drop, stretch it, add a gradient behind it, or set the wordmark in another face.
