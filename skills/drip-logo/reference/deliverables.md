# Colour, lockups and deliverables

Everything here happens **after** the user picked a mark. The picked mark is locked: lockups, colour and exports
may not redraw it. If you see a flaw while exporting, stop and ask ("The Q's tail fills in at 16px. Fix it
before export?"). Never fix silently.

## Colour

1. Start from the locked black master. Choose **one brand colour** from the brief's world (`palette_generate`
   with the attributes, or `palette_from_image` from a real source image), plus black and white.
2. A second colour needs a job (the symbol vs the wordmark, or a highlight). Three colours need a system.
3. **Flat fills.** Gradient plus sheen reads as a "cheap button"; flat won on the real Drip job. One tiny
   highlight at most, and only if the mark survives without it. Gradients live in brand imagery, not the master.
4. Check meaning in context: red near liquid reads as blood; green in finance as profit; purple-blue gradients
   as "AI startup"; gold on black as cheap luxury unless the craft carries it.
5. `palette_check` the colour on white and on the dark ground. For marks, aim for 3:1 against the background at
   minimum; the wordmark at small sizes wants 4.5:1.
6. Define: primary (colour on light), reversed (white or tint on dark), mono black, mono white. A colour on dark
   may need a lighter step of the ramp to keep the same perceived weight.

## Lockups

| Lockup | Use |
|---|---|
| Horizontal (symbol left, wordmark right) | Site headers, docs, email signatures |
| Stacked (symbol above, wordmark below, centred) | Square spaces, splash screens, merch |
| Wordmark only | Where the name must be read and space is wide |
| Symbol only | App icon, favicon, avatar, social |

**Align to the font's metrics, measured, not by eye.** `logo_outline` returns ascender, cap height, x-height,
baseline and advance widths. Snap the symbol to them:
- the symbol's height = cap height, or ascender to baseline, or x-height × 2: pick one and state it;
- the symbol's top on the ascender (or cap line), its bottom on the baseline;
- elements that hang (drips, tails) go below the baseline like a descender, ending at the descender line;
- then apply overshoot: round symbols extend 1-3% past those lines.

**Gap** between symbol and wordmark: a measured unit, e.g. the width of the wordmark's stem × 3, or the cap
height × 0.5. Write it down. **Optical centring** in a stacked lockup or an icon frame: centre the full bounding
box, then nudge by eye (bottom-heavy marks go up a little) and check at 32px.

## Clear space and minimum size

- Clear space: a named unit from the mark itself, e.g. "the height of the O" or "x = cap height; keep 1x free on
  all sides". Draw it in BRAND.md as a diagram.
- Minimum sizes: symbol 16px (with a favicon variant if needed), horizontal lockup ~ 80-100px wide on screen,
  ~ 20-25mm in print. Below that, use the symbol alone.

## The file set

```
brand/
  logo/
    master/           the locked black masters (symbol.svg, wordmark.svg) + concepts.mjs + versions
    svg/
      logo-horizontal.svg  logo-horizontal-reversed.svg  logo-horizontal-mono-black.svg  logo-horizontal-mono-white.svg
      logo-stacked.svg     (same four variants)
      wordmark.svg         (same four variants)
      symbol.svg           (same four variants)
    png/              every SVG at 512, 1024 and 2048px wide, transparent background
  icons/
    favicon.ico       16, 32 and 48px inside one file
    icon.svg          SVG favicon (with a dark-mode media query if the mark needs a different colour)
    apple-touch-icon.png   180×180, solid background, no transparency
    icon-192.png  icon-512.png
    icon-maskable-512.png  mark inside the central 80% safe zone, full-bleed background
  social/
    og-image.png      1200×630, mark or lockup on the brand ground
    avatar.png        800×800, symbol centred with clear space (works as a circle crop)
  BRAND.md
```

SVG rules for exports: outlined text only, no filters, no embedded raster, `viewBox` set, no fixed `width`/
`height` (or both set to match), ids `icon` and `wordmark` kept, ≤ 2 decimals. Render PNGs from the SVGs, never
from screenshots.

### Favicon and app icon

- The 16px favicon is often a **separate drawing**: fewer elements, thicker strokes (≥ 2px at 16 = 32 units),
  sometimes just the initial. Test it in a real tab on light and dark browser chrome.
- App icons: the symbol at ~ 60-70% of the icon square, on a solid brand or neutral ground; check the platform's
  corner mask (iOS squircle, Android adaptive circle/squircle) doesn't clip it.
- `icon.svg` can carry `@media (prefers-color-scheme: dark)` inside a `<style>` to switch colours.
- Wire them up in the project (`<link rel="icon">`, `apple-touch-icon`, web manifest icons) if it's a web app.

## BRAND.md

Write it at the project root (or `brand/BRAND.md`). Keep it short and factual:

```markdown
# <Name> brand

## The mark
<one sentence concept> · type: <combination / wordmark / …> · picked <date> from 3 finalists (critic <score>).

## Construction
Grid 256 · angles 0/30/90 · stroke 32 units · overshoot 2% · horizontals −6% · reversed variant −4% stroke.
Wordmark: <font> <weight> (licence: <OFL…>), tracking −2%, custom: <the moves>. Outlined with logo_outline.
Lockup: symbol height = ascender–baseline; gap = 0.5 cap height.

## Colour
Primary <hex> · on dark <hex> · black <hex> · white <hex>. Contrast: <results from palette_check>.

## Use
Clear space: 1 × cap height on every side. Minimum: symbol 16px, horizontal 96px wide.
Don't: stretch, rotate, recolour outside the palette, add effects, set the name in the font, put on busy photos
without the plate.

## Files
<the tree above, with what each is for>

## History
Concepts considered and why they lost (one line each), so they aren't re-proposed.
```

## Hand-off

```
Done: <Name> logo, "<concept sentence>".
<image: lockup light + dark + favicon at 16/32>
Critic: PASS 78/100: "<its own words>"
Left: trademark search not done; print colours (CMYK/Pantone) not specified.
Files: BRAND.md · brand/logo/svg · brand/icons
```
Then `drip_end`.

## Done when
- [ ] Colour chosen after the black mark; flat fills; contrast checked on light and dark.
- [ ] Lockups snapped to measured font metrics; gap and clear space defined as units.
- [ ] Full SVG + PNG set, mono, reversed, favicon set, app icons, social images exported from SVG.
- [ ] Favicon tested at real size in light and dark tabs.
- [ ] BRAND.md written, including what was rejected and why.
- [ ] The locked mark was not redrawn; any fix was asked about first.
