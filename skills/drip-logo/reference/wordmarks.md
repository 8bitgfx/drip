# Wordmarks and lettermarks

A wordmark is the name made into an object. It starts from a typeface chosen for its structure, and ends as
outlines that no font install can reproduce: kerned by eye, tightened for display, with one or two deliberate
interventions that make it this name and no other. "Stock text" (a font at default spacing, maybe in bold) is
the most common amateur tell in AI-made logos, and the critic names it every time.

## 1. Choose the register before the font

Choose what the brand rejects, not what the category defaults to. Pick inside the category default only on
purpose.

| Register | Reads as | Categories that default to it | Pitfall |
|---|---|---|---|
| Geometric sans | Rational, modern, engineered | Tech, SaaS, fintech | Everything in tech looks like this; Futura-likes are dated by ubiquity |
| Humanist sans | Warm, readable, human | Health, education, public services | Can look like signage with no voice |
| Neo-grotesque | Neutral, confident, corporate | Fashion, consulting, agencies | Helvetica-neutral = no identity unless customised |
| Grotesk with quirks | Contemporary, editorial | Startups, studios, culture | Cabinet/Clash/General-style faces code as 2022-23 startup |
| Transitional serif | Established, trustworthy | Law, finance, publishing | Reads stuffy; "tasteful AI" if paired with cream |
| Old-style serif | Literary, crafted, warm | Food, books, craft | Soft-serif "Fraunces" look is everywhere in AI output |
| Slab serif | Sturdy, mechanical, friendly | Tools, outdoors, games | Western/retro by default |
| Display / custom | Specific, loud | Games, music, entertainment | Novelty faces age in a year |
| Script / lettering | Personal, handmade | Food, beauty, events | Hard to read at small sizes; needs real lettering skill |

## 2. Shortlist and preview with the real name

- `fonts_pair` with the 3 brand attributes, `fonts_search` for 4-6 candidates (variable fonts give weight
  control). Skip the overused list in `drip_guide type/pairing` unless you can argue for one.
- `fonts_preview` with the actual name, at display size, in lowercase, Title and caps. The name decides:
  "Mill" needs a face whose i and l are distinct; "Ovo" lives on its O; "Waves" on its W and v.
- Judge the letters the name actually contains. A beautiful g is worthless for "Drip".
- Pick 2 faces for two different finalists if the wordmark is the mark. Pick 1 if the symbol leads.

## 3. Outline with `logo_outline`

Outline the name as early as the second sketch: `logo_outline` turns text in a font into SVG path data and
returns the metrics (ascender, cap height, x-height, baseline, advance widths per glyph). Use it because:
- an SVG with `<text>` shown through `<img>` can't load fonts (GitHub READMEs, most CMSs, email), so it renders in
  a fallback face;
- path data stored in the repo (in the concept module) makes every render identical, on every machine;
- the metrics let lockups align to the type's real lines (see `logo/deliverables`).
Keep one glyph per subpath group so you can kern and modify letters individually.

## 4. Kern and track by eye, at display size

Default kerning is made for text sizes. At logo size it's always too loose and uneven.
- **Tracking**: lowercase wordmarks usually tighten 1-3% of the em; caps need positive tracking (+4 to +10%) and
  then individual kerning. Never track lowercase loosely "for elegance".
- **Spacing by area, not distance.** Aim for equal white *area* between each pair. Rule of thumb for spacing
  between sidebearings: straight-straight (n|n) widest, straight-round (n|o) ~ 70-80% of that, round-round
  (o|o) ~ 50-60%. Diagonals (v, w, y, A, V) tuck closer.
- **Problem pairs** to check in every name: `Tr Ty Te Yo Wa Av LT AV rn ri fi ly` and any round next to a
  diagonal. "rn" must never read as "m"; "cl" never as "d"; "vv" never as "w".
- **Blur test**: blur the wordmark (or view at 32px). Dark clumps and pale gaps show the uneven pairs.
- **Flip test**: view upside down; you see shapes and spaces instead of words, and bad pairs jump out.

## 5. Customise: one or two deliberate moves

Pick from this menu. One move that carries the concept beats four that decorate.

| Move | Example | Watch for |
|---|---|---|
| A unique letter | A single-storey a, a flat-topped t, an e with a slanted bar matching the symbol's angle | Letter test: still reads as itself |
| A cut | A slice through the stems at the symbol's angle; a missing crossbar | The cut must be ≥ 16 units at the master size or it vanishes small |
| A ligature | Two letters sharing a stroke (the D's stem as the p's stem) | Must not create a new letter ("rn" → m) |
| A shared stroke / connector | One baseline line running under or through letters | Weight must match stems, not hairline |
| Altered proportion | Taller ascenders, smaller x-height, a wider O | Consistency across all letters touched |
| Terminal treatment | All terminals cut at 30°, or all rounded with one radius | Apply to every terminal, not just one |
| Integrated symbol | The dot of the i, the counter of the o, the tail of the y carries the mark | Must survive without colour |

Then **re-harmonise**: when one letter changes, check its weight, width and spacing against its neighbours.
Optically adjust stems after modifications so all strokes still feel equal.

## 6. Lettermarks and monograms

- Initials are rarely ownable on their own. They need an idea: a shared stroke, a negative-space second letter,
  a construction from the brand's grid.
- Draw them, don't set them. An unmodified stock-font "AB" in a circle is the flagged red flag.
- Balance optical weight between letters: an M and an I need different widths and stem treatments to feel even.
- Test as a 16px favicon from the start; monograms almost always end up there.

## 7. Letter and legibility tests (wordmarks)

- **Letter test**: cover all letters but the modified one. Does it still read as that letter alone?
- **Name test**: show the wordmark for 1 second to someone (or the critic). Do they say the right name?
- **Small**: at 80px wide and at 24px tall, every letter distinct, no counter filled in.
- **Reversed**: thin stems by 3-6% on dark, since light type looks bolder.

## 8. Licences

- OFL fonts (most of Fontsource/Google Fonts) allow outlined logos. Note the font and its licence in BRAND.md.
- Commercial fonts: check the EULA for logo use; many allow it, some need a specific licence. If unknown, ask.
- Outlining a font is fine; redistributing the font file is not. Never commit a commercial font file to the repo.

## Done when
- [ ] Register chosen against what the brand rejects; 2-3 faces previewed with the real name.
- [ ] Outlined with `logo_outline`, path data in the repo, metrics noted.
- [ ] Kerned at display size; blur and flip tests show even colour; no problem pair misreads.
- [ ] One or two deliberate customisations tied to the concept; the letter test passes.
- [ ] Reversed version thinned; font and licence recorded in BRAND.md.
