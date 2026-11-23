# Choosing and pairing fonts

A face is chosen for the product, not for its reputation. The test is always the same: set the product's real
headline and a real paragraph in it, next to one or two alternatives, and look. The one that makes the words feel
like *this* product wins. Everything below narrows the shortlist so that comparison is quick.

## The method

1. **Read the direction.** Three adjectives and the surface mode. "Precise, calm, technical" on an app wants a different face than "warm, crafted, local" on a landing page.
2. **Pick a class for the display role** (table below). The class does most of the work; the specific face is fine-tuning.
3. **Shortlist 3 display faces and 2-3 text faces.** `fonts_pair` with the mood words; `fonts_search` by category with `variable: true`. Skip the overused list unless you have a reason.
4. **Check the practical things** for each candidate: weights you need (and italics), a variable version, language support (Latin Extended at least; Cyrillic/Greek/Vietnamese if the product needs it), lining and tabular figures, licence.
5. **Preview** with `fonts_preview`: the real headline, a real paragraph, a line with numbers and prices. Run it for 2-3 pairings.
6. **Decide by eye.** Shape, rhythm and texture on the page. Write one line in DESIGN.md on why it fits ("A narrow grotesk headline because the product names are long; a humanist text face for warmth in dense settings").

## Display classes and what they say

| Class | Says | Use for | Watch |
|---|---|---|---|
| Humanist sans | friendly, clear, human | consumer apps, health, education | can look generic; pick one with character |
| Neo-grotesk / grotesk | neutral, modern, efficient | product UI, tools, fintech | the most overused class; needs strong spacing and scale to have a voice |
| Geometric sans | clean, constructed, optimistic | brands, tech, architecture | round "o" and single-storey "a" look childish in body text |
| Condensed / narrow sans | urgent, editorial, sporty | headlines with long words, posters, sports, news | never for body |
| Old-style / Garalde serif | literary, warm, trusted | publishing, culture, food, craft | needs size and air; poor below 16px on screens if delicate |
| Transitional / modern serif | precise, elegant, fashion | luxury, editorial heroes | high contrast breaks at small sizes; display only |
| Slab serif | sturdy, honest, mechanical | outdoor, tools, education | heavy; give it room |
| Mono as display | technical, raw, coded | developer products, data, terminals | costume if the product is not technical |
| Rounded sans | soft, playful, approachable | kids, games, community | childish if overused; one role only |
| Script / handwritten | personal, informal | one accent at most (a signature, a note) | never for UI text |

## Pairing logic

- **Contrast in structure, harmony in proportion.** Serif + sans, wide + narrow, grotesk + mono. Similar x-heights and similar overall weight on the line.
- **One family is a valid pairing.** A family with a wide weight range, an `opsz` axis or a matching serif/sans superfamily (IBM Plex Sans + Serif + Mono, Source Serif 4 + Source Sans 3, Literata + its sans partner) gives harmony for free.
- **Never two faces from the same class** (two geometric sans, two transitional serifs). They look like a mistake.
- **The text face does all UI**: body, labels, buttons, inputs, tables, h3 and smaller. The display face is for h1-h2 (and maybe a stat number).
- **A mono face** only for code, IDs, measurements and tabular data; pick one whose figures match the text face's size.
- **A wordmark face** may be a third face if it is used only for the logo.

## Overused: avoid as the default

Every model reaches for these first, so they read as unchosen. Use one when the project already does, the user
asks, or it wins a side-by-side preview against fresher options for a reason you can state.

- **Sans:** Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Nunito, Raleway, Work Sans, DM Sans, Plus Jakarta Sans, Source Sans, Space Grotesk, system-ui / Arial / Helvetica as a brand face.
- **Serif:** Playfair Display, Merriweather, Lora, Georgia as body.
- **Saturated (fine, but need an argument):** Fraunces, Instrument Serif, Cormorant Garamond, DM Serif Display, Geist, Instrument Sans, Mona Sans, Hubot Sans, Bebas Neue, Unbounded, Recoleta.
- **Product UI exception:** a neutral grotesk (including Inter or the system stack) is legitimate in dense operational UI where familiarity is the point. Make the brand show elsewhere: a display face for page titles or marketing, colour, spacing.

`fonts_pair` often returns Inter as the text face because it is safe. Keep its display suggestion if you like it,
then try two of the text faces below in `fonts_preview`; keep Inter only if it wins on screen.

## Fresher options by role (all free)

| Role | Google Fonts / Fontsource | Fontshare (free commercial) |
|---|---|---|
| Text sans, neutral | Hanken Grotesk, Public Sans, Onest, Golos Text, Albert Sans, Rethink Sans | Switzer, General Sans |
| Text sans, warm/humanist | Figtree, Karla, Sofia Sans, Archivo, Reddit Sans, Instrument Sans (saturated) | Satoshi |
| Text sans, technical | IBM Plex Sans, Chivo, Manrope | |
| Text serif | Newsreader, Source Serif 4, Literata, Spectral, Crimson Pro, Piazzolla | Sentient |
| Display serif, classic | EB Garamond, Cardo, Castoro, Alegreya, Marcellus | Gambetta, Recia |
| Display serif, high contrast | Gloock, Libre Bodoni, Besley, Rozha One | Erode, Melodrama |
| Slab | Hepta Slab, Arvo, Domine, Solway | Bespoke Slab |
| Grotesk display | Rethink Sans, Albert Sans, Reddit Sans | Clash Grotesk, Supreme |
| Geometric display | Lexend, League Spartan, Afacad | Satoshi, Technor |
| Condensed / heavy | Antonio, Teko, Tektur | Clash Display, Panchang |
| Rounded | Varela Round, Inclusive Sans | Chubbo |
| Mono | JetBrains Mono, IBM Plex Mono, Geist Mono, DM Mono, Azeret Mono, Fragment Mono, Chivo Mono | |

Starting pairings to preview (then make your own):

| Direction | Display | Text | Mono |
|---|---|---|---|
| Calm product, precise | Hanken Grotesk 600 (one family) | Hanken Grotesk | JetBrains Mono |
| Editorial, literary | Newsreader (display opsz) | Newsreader or Switzer | |
| Warm, crafted, local | Gambetta | Figtree | |
| Technical, developer | Chivo 600 | Chivo | Chivo Mono |
| Fashion, luxury | Libre Bodoni | Public Sans | |
| Bold launch, sporty | Antonio or Clash Display | Albert Sans | |
| Friendly consumer, playful | Lexend | Onest | |
| Scholarly, docs-heavy | Source Serif 4 | Source Serif 4 / IBM Plex Sans | IBM Plex Mono |

## Licences and sources

- **Google Fonts / Fontsource:** SIL Open Font License, free for commercial use, self-hostable. `fonts_search` shows the licence and the npm package (`@fontsource-variable/<id>` when a variable build exists).
- **Fontshare:** free for commercial use under its own licence; self-host or use its CSS API.
- **Commercial foundries** (Klim, Pangram Pangram, Grilli Type, Commercial Type): only when the user confirms they hold a licence. Never ship a paid face from a random CDN.
- **Brand fonts** the project already has: use them. Ask for the files if they are missing; stand in with a free face of the same class and say so.

## Pairing checklist

- [ ] Display and text are different classes (or one superfamily), never two similar sans.
- [ ] Each face has a fixed set of roles written in DESIGN.md.
- [ ] Previewed with `fonts_preview` using the product's real headline and numbers, against at least one alternative.
- [ ] Not on the overused list, or the reason is written down.
- [ ] Weights, italics, languages and figures cover what the product needs.
- [ ] Licence allows commercial web use.
