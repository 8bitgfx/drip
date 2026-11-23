# Dark mode done right

Dark mode is a second, equally designed rendering of the same system. Same roles, same hue, same contrast targets,
different lightness logic. It is never `filter: invert(1)`, never "swap black and white", never a light design
with the greys flipped. Wiring (selectors, toggle, no-flash script) is in `drip_guide system/theming`.

## Decide first

- **Dark-first, light-first or both?** Choose from the use scene: a video editor, a trading desk, a music app or a night-time tool can be dark-first. Reading-heavy, form-heavy and most marketing pages are light-first. "Developer tool, so dark" is a category habit, not a reason.
- **Both themes:** design them together. Pick each semantic token's dark value by recipe (below) and check it, instead of eyeballing at the end.
- **Only one theme:** do not add a half-finished second one.

## Re-derive every token

Start from the light value of each semantic role. The hue never moves.

| Token | Dark recipe |
|---|---|
| `bg` | L 12-18%, chroma 0.005-0.015 toward the anchor hue. Never `#000` (smears on OLED when scrolling, maximises halation). |
| `surface` | bg + 3-4% L |
| `surface-raised` (menus, popovers) | surface + 3-4% L again |
| Modal / sheet | the highest step; plus a ring |
| `text` | L 92-96%, faint tint. Never `#fff` (glare, halation on dark ground). |
| `text-muted` | L 65-72%; check 4.5:1 on the *raised* surface, not only on bg |
| `border` | L 26-34%; check it is visible on `surface-raised` too |
| `accent` | L +5 to +10%, chroma -0.02 to -0.04 vs. light (saturated accents vibrate on dark) |
| `on-accent` | re-check; a lighter accent usually wants near-black text |
| `accent-subtle` | L 25-32%, chroma 0.03-0.06 (a dark tint, not a light pastel) |
| `focus` | follows the accent; 3:1 against dark surfaces |
| State colours | same hue, L +8-12%, chroma slightly lower; subtle backgrounds at L 22-28% |
| `overlay` (scrim) | `oklch(8% 0.01 hue / 0.6-0.7)` |

Example (warm neutral, hue 60, rust accent):

```css
[data-theme="dark"] {
  --bg:             oklch(16% 0.010 60);
  --surface:        oklch(20% 0.011 60);
  --surface-raised: oklch(24% 0.012 60);
  --text:           oklch(95% 0.008 60);
  --text-muted:     oklch(70% 0.012 60);
  --border:         oklch(30% 0.012 60);
  --accent:         oklch(68% 0.14 40);
  --accent-hover:   oklch(74% 0.12 40);
  --accent-subtle:  oklch(28% 0.05 40);
  --on-accent:      oklch(18% 0.01 60);
  --focus:          oklch(72% 0.14 40);
}
```

Then `palette_check` every pair (convert to hex first; `palette_generate` already prints dark hex values for its
own tokens).

## Elevation is lightness

- **Higher = lighter.** A card is lighter than the page; a menu lighter than the card. A card darker than its ground reads as a hole.
- **Shadows mostly disappear.** Replace resting shadows with a 1px ring: `box-shadow: 0 0 0 1px oklch(100% 0 0 / 0.08)` (0.12-0.14 on hover). Overlays (menus, dialogs) keep a deep, dark, wide shadow plus the ring, so they separate from busy content.
- **Inset highlight** (optional, for raised controls): `inset 0 1px 0 oklch(100% 0 0 / 0.05)` on the top edge. Subtle; skip it on flat directions.
- **No glows.** Coloured outer glows and neon halos on dark are the cheapest-looking effect in UI. Allowed only when the direction is explicitly atmospheric, and then once, as art, not on controls.

## Type on dark

- Light text on dark reads heavier and blooms. On a variable font drop body weight by about 30-50 units (400 to 350-370) or use the font's dark/grade axis if it has one (`GRAD`).
- Add a touch of line-height (+0.05) and tracking (+0.005em) to long body text.
- Keep headings one colour (`text`). Coloured headings that looked fine on light fragment on dark.
- Avoid pure white long-form text; L 90-94% for paragraphs, L 95-96% for headings.

## Images, logos, illustration

- Never apply CSS `invert()` or `brightness()` to photos.
- Logos: ship a dark variant (or a monochrome `currentColor` SVG). A dark logo on a dark ground disappears.
- Light screenshots and photos with white backgrounds: set them in a well one step lighter than the surface with a 1px ring, or provide dark screenshots.
- Product screenshots in a dark marketing page: use the product's dark theme if it has one.
- Illustrations: provide a dark palette or place them on a light plate on purpose.
- Image outline: `outline: 1px solid oklch(100% 0 0 / 0.1); outline-offset: -1px` (pure white at low alpha, not a palette tint).

## Charts on dark

- Re-derive series colours like the accent: lighter, a little less chroma.
- Gridlines from the dark border token; axis labels from `text-muted`.
- Check that each series is 3:1 against the chart ground and series are distinguishable from each other in lightness.

## Common failures

| Failure | Fix |
|---|---|
| Inverted light theme: pure black ground, pure white text, same saturated accent | Recipe above |
| Muted text passes on bg but fails on cards and menus | Check on the lightest surface it can sit on |
| Borders vanish on raised surfaces | Border L 26-34% and check on `surface-raised` |
| Cards darker than the page | Flip: cards lighter |
| Drop shadows that look like smudges | Rings and lightness steps |
| Accent buttons glare | Lower chroma, raise L, dark text on them |
| Brand red error = brand red accent | Separate the hues or lightness so error never looks like a primary action |
| White flash on navigation or load | The no-flash script (`drip_guide system/theming`) and `color-scheme: dark` |
| Form fields and scrollbars still light | `color-scheme: dark` on the dark theme selector |
| Dark mode only tested on one page | Test a dense page: table, form, menu open, toast, empty state |

## Checklist

- [ ] Ground L 12-18%, text L 92-96%, no pure black or white.
- [ ] Each elevation step is lighter; cards lighter than the page.
- [ ] Shadows replaced by rings except on overlays.
- [ ] Accent re-derived (L up, C down) and text on it re-checked.
- [ ] `palette_check` passes for every pair in dark, including muted text on the raised surface.
- [ ] Logos, screenshots and charts have dark-appropriate versions.
- [ ] `color-scheme: dark` set; no flash on load.
