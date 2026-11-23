# Palettes by mood and product

Starting points, not presets. The chosen board direction, the brand and the references always win. Use a row
to get a first seed for `palette_generate`, then move it until it belongs to this product: shift the hue a few
degrees toward something in the product's world (its material, its place, its packaging), adjust chroma to the
mood, and check contrast. If you could swap the logo for a competitor's and the palette still fits, keep going.

## How to choose

1. **Start from the subject, not the category.** A bakery's palette comes from crust, flour and the shop's paint, not from "food = orange". A climbing app's from chalk, rock and rope, not from "outdoors = green".
2. **Pick temperature and posture** (restrained, committed, full palette, drenched; see `drip_guide color`).
3. **Pick the accent hue and chroma** from the mood table. Chroma sets the voice more than hue: 0.06-0.10 reads calm and grown-up, 0.12-0.16 confident, 0.18-0.24 loud.
4. **Pick the neutral tint**: warm (hue 50-80, `neutralTint` ~0.010), cool (hue 220-260, ~0.008), or pure (0). Neutrals usually lean toward the accent's temperature.
5. **Run `palette_generate`** with the seed hex, then **`palette_check`**.
6. **Make it yours**: compare with 3 references from `refs_search`; if your palette matches one of them closely, move it.

## By mood

| Mood words | Ground | Accent (OKLCH) | Seed hex | Posture | Notes |
|---|---|---|---|---|---|
| Calm, trustworthy, quiet | cool off-white L 98, C 0.005 | deep blue `oklch(50% 0.12 250)` | `#2266A4` | restrained | Lower chroma than "corporate blue"; ink slightly blue |
| Warm, crafted, human | warm paper L 97, C 0.012 h 70 | rust `oklch(55% 0.17 40)` | `#BF4306` | restrained or committed | Avoid the cream + terracotta + serif default unless the direction chose it |
| Fresh, natural, grounded | neutral L 98 | moss `oklch(56% 0.12 135)` | `#548436` | restrained | Pure 120-140 at high chroma looks neon; keep C ≤ 0.13 |
| Deep, premium, serious | near-white or near-black | forest `oklch(40% 0.10 150)` or ink blue `oklch(30% 0.06 260)` | `#115629` / `#1B2E4C` | restrained | Premium is low chroma and lots of space, not gold |
| Energetic, bold, launch | white or a committed colour field | signal red-orange `oklch(60% 0.20 30)` | `#DE3E2D` | committed | One loud colour on a big area beats many small ones |
| Playful, friendly, young | light, slightly warm | marigold `oklch(75% 0.16 85)` + one support hue | `#DCA400` | full palette | Yellow cannot be text on white: use a dark amber tone for text |
| Editorial, literary | paper L 96-97, h 70-90 | oxblood `oklch(46% 0.14 20)` | `#962D36` | restrained | Colour mostly in images and one rule or link colour |
| Technical, precise | cool grey L 98 or dark L 15 | teal `oklch(48% 0.08 200)` | `#076B6F` | restrained | Not the near-black + acid green default |
| Clinical, care, health | white, very light cool | deep teal-green `oklch(38% 0.07 180)` | `#004E44` | restrained | Soft, high-contrast text; avoid sterile pure blue-white |
| Luxury, fashion | off-white or black | almost none: warm grey `oklch(45% 0.03 70)` | `#605343` | restrained | Photography carries colour; UI nearly monochrome |
| Nightlife, music, culture | dark L 14-18 | magenta `oklch(53% 0.20 350)` | `#B8217C` | committed | Lift L for dark mode; avoid purple-pink gradients |
| Earthy, outdoors, slow | warm sand L 95 | ochre `oklch(68% 0.16 55)` | `#E1791B` | committed | Pair with dark brown ink, not black |

The seed hex is what you pass to `palette_generate`; the tool builds the ramp around it.

## By product type: habit vs better angle

| Product | The habit (generic) | A better angle |
|---|---|---|
| SaaS / B2B tool | blue or indigo primary, slate greys | neutrals with one accent from the product's subject; colour reserved for actions and data |
| Developer tool | black ground, neon green or purple | light-first with code-editor-like ink; or dark at L 15 with a muted signal colour |
| Fintech / banking | navy + gold, or neon green on black | calm neutral ground, one confident accent, green/red reserved for money up/down with arrows |
| Health / wellness | mint, teal, lavender pastels | warm neutrals, one deep natural accent, high-contrast text for older eyes |
| Food / restaurant | orange-red, appetite clichés | colours from the room, the menu card, the produce; photos carry most of it |
| E-commerce | brand colour everywhere, red sale badges | product photos carry colour; UI neutral; one accent for "Add to cart" |
| Kids / education | rainbow | 2-3 named hues with jobs (one for action, one for progress), lots of white |
| Luxury / fashion | black and gold | near-monochrome UI, colour from photography |
| Climate / sustainability | green everything | sky, soil or material colours; green as one signal, not the whole palette |
| AI product | purple-blue gradient, glowing orb | whatever the product *does*: a writing tool can look like paper, a data tool like a lab notebook |
| Dashboard / analytics | many saturated series | neutral chrome, the accent for the key series, muted categorical palette |
| Government / civic | flag colours | high-contrast, plain neutrals, one accessible blue for links |

## Building a full-palette set

For full-palette directions (3-4 hues with jobs):

- Give each hue a role and a footprint in DESIGN.md: e.g. Field (large grounds, 40%), Signal (actions, 3%), Seal (badges and highlights, 2%), Ink.
- Keep them in a relationship: same chroma band, or same lightness band, or analogous hues with one complement. Random picks clash.
- Every hue still passes contrast in each place it is used; `palette_check` each role on its grounds.
- Run `palette_generate` once per hue to get ramps, then keep only the steps you use.

## From a reference or brand photo

1. `palette_from_image` on the image URL (6-8 colours).
2. Largest shares: ground and neutrals. Small, high-chroma share: the accent candidate.
3. Rebuild from the accent with `palette_generate`; keep the reference's *proportions* (how much ground vs accent), not its exact values.
4. If the photo is the product's own (shopfront, packaging, the actual object), it is the best source you will get. Prefer it over any table here.

## Worked example

Brief: a booking app for a small climbing gym. Direction words: "chalky, honest, energetic".

1. Subject first: chalk (warm off-white), rock (warm grey), rope and holds (a saturated orange-red).
2. Strategy: light-first (bright gym, phones in hand), restrained in the app, committed on the landing page hero.
3. Accent: hold orange, `oklch(62% 0.17 45)` = `#D55C13`. Not "outdoors green", not "fitness neon".
4. `palette_generate` with `#D55C13`, `neutralTint` 0.010 for warm chalky greys.
5. `palette_check`: white on the 600 step for the button; muted text (neutral 600) on the chalk ground; error red shifted to hue 25 and darker so it never reads as the brand orange.
6. DESIGN.md rule: **The Chalk Rule.** Screens are chalk and stone; orange only marks what you can book.

## Red flags in a finished palette

- You picked the hue because "that is what X companies use".
- The accent is violet or indigo and nobody asked for it.
- More than one saturated hue on a product screen with no job for the second.
- Neutrals are Tailwind's `gray` or `slate` while the brand is warm.
- The palette would fit any competitor unchanged.
