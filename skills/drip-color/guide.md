# Colour

Good colour is mostly neutral and completely intentional. The ground, surfaces, ink and lines do 90% of the work
and are tuned so text reads easily and groups separate without boxes. One accent marks what you can act on and
where you are; because it is rare, the eye finds it at once. States (error, success, warning) mean the same thing
everywhere and never rely on hue alone. Dark mode is its own composed rendering of the same roles. Nothing is
coloured "to add interest": every colour has a role, and you could say what it is.

## The procedure

1. **Read what exists.** Brand colours, the token file, `DESIGN.md`, logos. A confirmed brand colour is a constraint, not a suggestion. Never replace a brand palette under the name of "improving" it.
2. **Name the strategy before picking a hue.** Write one line: temperature (warm / cool / neutral), dosage (restrained / committed / full palette / drenched, see below), light or dark first, and why the use scene asks for it (an office monitor all day, a phone in sunlight, a dark studio).
3. **Find the accent.** From the chosen board direction, the brand, or a reference: `palette_from_image` on the reference the user liked most (the largest shares are usually ground and neutrals; the accent is often a small share with high chroma). Choose the hue from the product's world (its material, its place, its subject), never from a category habit (blue for finance, green for health).
4. **Generate the system.** `palette_generate` with the accent hex. Set `neutralTint` 0 for pure greys, 0.008-0.015 to tint them toward the accent. You get 11-step ramps (50-950) for accent, neutral, success, warning and danger, light and dark semantic tokens and a contrast report.
5. **Assign roles.** Map ramp steps to semantic tokens (table below). Use the ramps you need; a token per step is not a palette.
6. **Check every pair.** `palette_check` on: text, muted text, link and placeholder on each surface; text on accent; text on each state fill; focus ring on surface; input border on surface. Both themes. Fix by moving lightness, never by lowering the requirement.
7. **Apply with dosage.** Build one real screen. Squint at it: the accent should land on the primary action and the current location, nowhere else.
8. **Hand the tokens to the system step** (`drip_guide system`) and record the palette in DESIGN.md with named rules.

## The craft

### OKLCH in one table

`oklch(L C H)`: L lightness 0-100%, C chroma (colourfulness) 0-~0.37, H hue angle 0-360.

| Hue range | Reads as |
|---|---|
| 20-40 | red, rust, coral |
| 50-80 | orange, amber, ochre |
| 85-110 | yellow, olive |
| 130-160 | green |
| 170-200 | teal, cyan |
| 220-260 | blue |
| 270-320 | violet, purple (the AI default; avoid unless asked) |
| 330-360 | magenta, rose, crimson |

| Role | L | C |
|---|---|---|
| Light ground | 96-99% | 0-0.012 |
| Light surface (cards) | 98-100% | 0-0.008 |
| Hairline on light | 88-93% | 0.005-0.015 |
| Muted text on light | 42-52% | 0.01-0.02 |
| Ink on light | 15-24% | 0.005-0.02 |
| Accent fill (light theme) | 45-65% | 0.12-0.22 |
| Accent subtle background | 93-97% | 0.02-0.05 |
| Dark ground | 12-18% | 0.005-0.015 |
| Ink on dark | 92-96% | 0.005-0.015 |

- **Do** keep hue fixed and move L to make a ramp, lowering C near white and near black (high chroma at L 97% or L 15% looks fluorescent or muddy).
- **Don't** build ramps in HSL. HSL "50% lightness" yellow and blue differ wildly in perceived brightness; OKLCH L does not.
- **Do** expect some hues to clip: very saturated cyan, green and yellow at mid L may fall outside sRGB. Browsers map them, but check the hex `palette_generate` prints.

### The four layers

1. **Ground.** The page. Near white or near black, faintly tinted.
2. **Surfaces.** Cards, panels, inputs, menus. In light themes, white or 1-3% L from the ground; in dark themes, each level 3-4% L lighter.
3. **Ink and lines.** Text in 2-3 tones (text, muted, subtle) and borders in 2 (border, border-strong).
4. **Signal.** One accent, plus state colours. These are the only saturated colours in the interface.

- **Do** separate surfaces with a small L step or a hairline, not both plus a shadow.
- **Don't** put pure white cards on a cream page (looks like paper scraps) or pure grey `#f3f4f6` panels on a warm page (looks dirty). Tint everything from the same hue.

### Dosage: pick one posture

| Posture | What carries colour | Accent share | Good for |
|---|---|---|---|
| Restrained (default) | neutrals; accent only on action, selection, focus | under 5% | product UI, docs, most sites |
| Committed | one colour fills 30-60% of the surface (a hero ground, a band, the sidebar) | accent stays a signal | brand-led landing pages |
| Full palette | 3-4 named roles, each with a job and a footprint | per role | editorial, playful, kids, events |
| Drenched | the surface *is* the colour; ink and lines derive from it | n/a | posters, one-section moments |

- **Do** declare the posture in DESIGN.md. A committed brand ground is not accent overuse.
- **Don't** spray small accents everywhere (coloured icons, tags, borders, headings). Five small accents read as noise; one region of strong colour reads as a decision.

### Semantic roles from the ramps

| Token | Light | Dark |
|---|---|---|
| `bg` | neutral 50 | neutral 950 |
| `surface` | white or neutral 50 | neutral 900 |
| `surface-raised` | neutral 100 | neutral 800 |
| `text` | neutral 900-950 | neutral 50 |
| `text-muted` | neutral 600 | neutral 400 |
| `border` | neutral 200 | neutral 800 (or L ~28-32%) |
| `accent` | accent 600 (700 if the seed is light) | accent 400 |
| `accent-hover` | accent 700 | accent 300 |
| `accent-subtle` | accent 50-100 | accent 900-950 |
| `on-accent` | white | neutral 950 |
| `focus` | accent 500-600 | accent 400 |

Always confirm with `palette_check`; ramps from very light seeds (yellow, lime) need darker steps for text.

### Contrast numbers

| Pair | WCAG AA | Target |
|---|---|---|
| Body text (under 24px regular, under 18.66px bold) | 4.5:1 | 7:1 for long reading |
| Large text (24px+, or 18.66px+ bold) | 3:1 | 4.5:1 |
| Muted text, placeholders, captions | 4.5:1 | 4.5:1 |
| Icons that carry meaning, input borders, focus ring, chart marks | 3:1 against what touches them | |
| Disabled controls | exempt | still legible, about 3:1 |
| Text on a photo | 4.5:1 on the actual pixels under it | use a solid plate or a calm dark area, not a gradient scrim over a busy image |

- **Do** check against the real surface the text sits on (a card, a hover row, a selected row), not only the page ground.
- **Don't** fix a failing grey by making the font bigger. Fix the colour.
- APCA (Lc 60 for body, Lc 45 for large/UI) is a better model for dark themes; use it as a second opinion, ship to WCAG.

### State colours

| State | Typical hue | Light fill / text | Note |
|---|---|---|---|
| Danger / error | 25-30 | L ~55% C 0.19 / L ~45% for text | never the same as a red brand accent: shift hue or lightness |
| Warning | 70-85 | fill L ~78% with dark text; text tone L ~45% C 0.12 | yellow fails on white as text; use the dark amber tone |
| Success | 145-160 | L ~55% C 0.13 / L ~42% for text | avoid pure 120 green, it reads as neon |
| Info | 230-250 | L ~55% C 0.12 | often just the neutral or the accent; add only if needed |

- Each state has three tones: fill (badge, banner icon), subtle background (banner), text (inline message). Check each.
- **Do** pair every state colour with an icon or word ("Payment failed", a warning triangle).
- **Don't** use red and green as the only difference between two things (8% of men cannot separate them).
- **Don't** colour body copy in state colours; colour the icon and the label.

### Interaction states

| State | Rule of thumb in OKLCH |
|---|---|
| Hover on accent fill | L -4 to -6% in light theme, +4 to +6% in dark |
| Pressed | L -8 to -10% (light), or the hover colour plus a 0.97-0.98 scale |
| Hover on neutral row/button | the `surface-raised` tone, or accent-subtle for selected-ish |
| Selected | accent-subtle background + accent text or a 2px accent indicator |
| Focus | 2px ring in `focus`, 2px offset, 3:1 against both the control and the ground |
| Disabled | 50-55% opacity plus `cursor: not-allowed` plus the real `disabled` attribute |
| Visited link | only on content sites; a quieter tone of the link colour |

- **Do** make hover one step of change (a colour step or a background), not colour + shadow + scale + underline at once.
- **Don't** use opacity to make "lighter" versions of colours for text or borders. Alpha makes contrast depend on what is behind; use explicit tokens. Alpha is for overlays, scrims and shadows.

### Links

Body links: accent colour or text colour with an underline (`text-underline-offset: 0.2em`, thickness 1px, 2px on hover). An underline beats colour alone for links in running text. Navigation links do not need underlines; their position says they are links.

### Browser surfaces

Theme what the browser draws, or the page looks assembled: `::selection` (accent-subtle background, text colour), `caret-color: var(--accent)`, `accent-color: var(--accent)` for native checkboxes, radios and ranges, `scrollbar-color` in dark themes, the focus ring. These are cheap and almost always forgotten.

### Colour from references

1. Study the shot with `refs_view`: where is the colour, and how much of it? Write it down ("one coral accent on CTAs only, warm paper ground, ink not black").
2. `palette_from_image` to read the actual values and shares.
3. Take the *relationship* (warm ground + one hot accent, cool greys + muted teal), then rebuild it with `palette_generate` from your chosen accent. Never copy a reference's palette one-to-one.
4. Check that your accent is not the reference brand's signature colour (Stripe's blurple, Spotify's green) unless you are that brand.

### Data colours

- Categorical series: 5-8 at most, distinct in lightness as well as hue, so they survive greyscale and colour-blindness. Beyond 8, group or use direct labels.
- Sequential: one hue, lightness steps (light = low, dark = high on a light ground).
- Diverging: two hues around a meaningful middle (zero, average), neutral in the centre.
- The one series the chart argues from gets the accent; the rest go neutral.
- Gridlines at the border token, data marks 3:1 against the ground, labels 4.5:1.

## Slop tells (and the fix)

| Tell | Fix |
|---|---|
| Purple-to-blue or purple-to-pink gradient hero, indigo-500 buttons | Accent from the product's world; gradients in one hue family, or none |
| Violet/lavender accent with no reason | Rotate toward blue (~250) or rose (~345), or pick from the brand |
| Rainbow: every card, icon and tag a different colour | Neutrals + one accent; categories get labels, not hues |
| Grey text on a coloured band or button | Text tinted from the surface hue, or the surface's `on-` token |
| Grey-on-grey: `#9ca3af` text on `#f3f4f6` | Muted text at L 42-52% on light grounds; check 4.5:1 |
| Pure `#000` on `#fff`, or `#000` dark mode | Tinted ink L 15-24%; dark ground L 12-18% |
| Cream `#F4F1EA` + terracotta `#D97757` + serif, unasked | A ground and accent chosen for this subject, not the generated "tasteful" default |
| Near-black page with one acid-green or neon accent, unasked | Only when the subject is genuinely nocturnal or technical and the direction chose it |
| Gradient text on headlines | Solid ink; emphasis from size or weight |
| Neon glow shadows / coloured halos on dark | Elevation by lightness and a 1px ring |
| Accent on every heading, icon and border | Accent on action, selection, focus; headings in ink |
| Tailwind default `blue-500` / `gray-*` as the whole palette | `palette_generate` from the direction's accent |
| Semi-transparent white panels stacked on a gradient (glass everywhere) | Solid surfaces; blur only for overlays that float over content |
| Red error border with no message or icon | Icon + message under the field + border |
| Status shown by a coloured dot alone | Dot + word ("Live", "Paused") |
| Dark mode made by inverting colours | Re-derived dark tokens (`drip_guide color/dark-mode`) |

## Done when
- [ ] Palette is in OKLCH tokens; no raw colours in components.
- [ ] One accent; on a screenshot it appears on the primary action, the current location and focus, and covers under 10% (restrained: under 5%).
- [ ] Neutrals share one tint (or none); no pure #000 or #fff as ground or text in dark mode.
- [ ] `palette_check` passes for every text/surface pair, muted text, text on accent, state tones, focus ring and input borders, in every shipped theme.
- [ ] Every state colour is paired with an icon or text.
- [ ] No gradient text, no purple-blue/purple-pink default gradient, no glow shadows.
- [ ] `::selection`, caret, native control `accent-color` and focus ring use the palette.
- [ ] DESIGN.md records the posture, the roles and at least one named colour rule.

## Reference files
- `drip_guide color/dark-mode` — re-deriving every token for dark, elevation, images, charts, testing
- `drip_guide color/gradients` — gradients, mesh gradients, grain, glows and backgrounds that do not look generated
- `drip_guide color/palettes-by-mood` — starting points by mood and product type, and how to make them your own

## Sources
- Impeccable (Apache-2.0): colour as roles not swatches, strategy before hue, OKLCH ramps with chroma falling near the extremes, explicit colours over alpha chains, contrast table.
- Hallmark (MIT): the four layers with L/C ranges, colour postures, accent footprint, dark re-derivation, gradient and glow bans.
- Taste Skill (MIT): the 90-95% neutral interface, one accent with its share, the violet rule, highlight by contrast not colour.
- UI UX Pro Max (MIT): product-type palettes, semantic colour tokens, colour-not-only, data colour guidance, state contrast.
- Make Interfaces Feel Better (MIT): neutral image outlines, shadow rings in dark mode.
- Anthropic frontend-design: inspiration only (the list of generated-design defaults), paraphrased.
