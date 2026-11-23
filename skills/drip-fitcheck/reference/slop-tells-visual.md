# Fit check: visual slop tells

The 48 tells from the fit check guide, each with how it shows in a screenshot and the fix. Numbers match the guide. One tell is a smell; three or more is a pattern that caps the copy and polish scores at 3. Some tells are legitimate when the direction asked for them on purpose; the "Allowed when" column says when.

## Colour and surface

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 1 | Purple-blue or purple-pink gradient | Violet fading to blue/pink on hero, buttons or cards | The direction's palette; one accent, solid | Never as a default; only if the brand's own colours are those |
| 2 | Gradient text | Headline filled with a colour ramp | Solid ink; carry emphasis with size and weight | A single-hue tonal ramp the direction names, once |
| 3 | Glow blobs and auroras | Soft coloured clouds behind text or cards | A solid or grained surface (`gradient_mesh` in the palette, static, behind type only) | An atmospheric direction, two fixed blooms at most, never animated |
| 4 | Glass everywhere | Frosted translucent panels stacked on a busy background | Solid surfaces; keep blur for one layer such as a sticky nav over content | One functional layer |
| 5 | Neon glow shadows | Coloured halos with no offset around cards or buttons on dark | Elevation by lightness steps; shadows with offset and blur in a tinted neutral | Never |
| 6 | Accent on everything | Headings, icons, borders, badges and buttons all in the brand colour | Accent only on the primary action, active state, focus and one data series | A declared colour-led direction where the colour is the surface |
| 7 | Pure black on pure white, flat greys | Harsh contrast and lifeless greys beside a warm or cool brand | Ink and paper tinted toward the brand hue (chroma 0.005-0.015) | A stark monochrome direction chosen on the board |
| 8 | Framework default palette | Tailwind indigo-500 buttons, slate-900 text, violet accents | A palette generated for this direction (`palette_generate`) | The user's existing brand uses those exact values |
| 9 | The "tasteful AI" look | Cream background, big high-contrast serif, terracotta accent | Move one axis: change the accent first, then the paper, then the display face | The board's chosen direction is exactly this, with a reason |

## Layout and structure

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 10 | Template page | Hero, three features, testimonials, CTA band, four-column footer | Shape sections from the visitor's questions and the product's own material; cut or merge; vary compositions | Never as a default |
| 11 | Everything centred | Eyebrow, h1, subhead, two buttons, image all on the centre line | At most two centred elements; left-align the text block and set the visual beside it | A single-object hero built around one centred thing |
| 12 | Icon-tile feature cards | Three equal cards, each with a tinted rounded square icon above a heading | Lead each feature with its own visual (a product detail, a figure) or plain heading and text; vary card widths | Never |
| 13 | Nested cards | A bordered box inside a bordered box inside a shaded panel | One containment layer; use spacing and hairlines inside | Never |
| 14 | Same seam everywhere | Every section separated by the same gap and the same divider | Vary the seam: whitespace, a hairline, a tinted band, a change of paper | A long reading page with consistent rules |
| 15 | Equal stat cards | Row of 3-4 identical cards, big number over small label | Make the one figure that matters large and the rest quieter, or put figures in sentences | Real dashboards where all metrics truly share priority (still vary emphasis) |
| 16 | Random bento | Grid of mismatched tiles with no reading order | Order tiles by importance; one large lead tile; real content in each | A bento whose tiles are real product views |
| 17 | Thin section | At 1440, a heading and a line floating in a wide empty band | Add mass (bigger real visual, wider body, statement set large) or merge with a neighbour | A deliberate one-line band, once per page |
| 18 | Orphan on the last row | A grid with one lonely item on its final row | Change the column count or the item count | Never |
| 19 | Phone overflow | Sideways scroll, cut-off text, a table off-screen at 390 | `min-width: 0` on flex/grid children, wrap, stack, scroll tables inside a container | Never |
| 20 | Sticky header over content | Header covers a heading or the focused field | `scroll-padding-top` equal to the header height; shorter header on phone | Never |

## Type

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 21 | Inter for everything | One neutral sans for display and body, no character | A display face from the direction (`fonts_pair`), body face kept | App UI where the system font is the right, chosen voice |
| 22 | Eyebrows | Small uppercase letter-spaced labels above many headings | Delete; the heading names the section. Keep real labels (form labels, table heads, tabs) in sentence case | Never as section openers |
| 23 | Accented word | One word in a heading set in the accent, italic, or on a highlighter | Set the heading one way; stress with a line break or a second line at a second size | The direction names it as its signature, once, in the hero |
| 24 | Missing middle sizes | 72px hero beside 14px body with nothing between | A real scale: display, section (40px+ at 1440), title, body, small | Never |
| 25 | Heavy everything | Many headings at 800-900 weight | 500-700 for headings; let size and colour carry hierarchy | A poster direction with one heavy display face, used consistently |
| 26 | Full-width lines | Body lines running 100+ characters | `max-width: 65ch` on prose | Never for running text |
| 27 | Orphaned words | A heading or paragraph ending on one word | `text-wrap: balance` on headings, `pretty` on body; rewrite if it still breaks | Never |
| 28 | Mono costume | Monospace on labels, meta and captions that are not code or numbers | Labels in the body face, a step smaller, sentence case | Code, measurements, figures, or a direction whose material is mono |

## Imagery and icons

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 29 | Empty pictures | Grey boxes, gradient rectangles or "image here" frames | Fill from the user, a capture, a found or generated image (`drip_guide imagery`), or cut the slot | Never in a finished build |
| 30 | Drawn scenes | SVG people, plants, mountains, isometric offices, illustration-pack characters | A photograph of the real thing, the product, or type | The brand owns an illustration style |
| 31 | Abstract 3D hero art | Floating glass spheres, chrome blobs, extruded shapes | The product or a real subject at scale | A 3D product, or a direction built on material and depth with a specific object |
| 32 | Stock cliches | Laptop on a desk, team laughing at a whiteboard, handshake, lightbulb | A specific subject that adds a fact (`imagery/sourcing`) | Never |
| 33 | Emoji icons, sparkles | 🚀 ⚡ ✨ in features, buttons, headings; sparkles on AI features | The single icon family, or no icon | Never |
| 34 | Mixed icon sets or weights | Some icons filled, some outline, strokes of different widths | One family, one stroke per surface (`drip_guide icons`) | Brand logos beside interface icons |
| 35 | Fake product frame | Drawn browser bar with traffic lights or a phone bezel around styled divs | A real capture, or built faux UI without fake chrome (`drip_guide productshots`) | One frame with real content inside, when the device is the point |
| 36 | Invented logo wall | "Trusted by" row of famous or made-up logos | The user's real customers, or remove | Real customers the user named |

## Copy and chrome

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 37 | Eyebrow labels everywhere | "FEATURES", "HOW IT WORKS", "PRICING" above headings | Delete them | Never as a default opener |
| 38 | Decorative numbering | 01 / 02 / 03 on features or cards with no order | Delete the numbers, keep the text | Real sequences: install steps, checkout |
| 39 | Fake stats | "10x faster", "99.9%", "10,000+ teams", "4.9 stars" | The user's figures with a source, or nothing | Real, sourced figures from the user |
| 40 | Invented testimonials | Quotes with first-name-and-initial authors and stock faces | Remove; list for the user | Quotes the user supplied, verbatim |
| 41 | Slop words | unlock, seamless, elevate, supercharge, effortless in headlines | `drip_guide copy/slop-rewrites` | A literal use (a seamless knit) |
| 42 | Arrow suffixes | "Learn more →", "Get started" with an arrow icon | Name the destination; drop the arrow | External link mark, real next/previous controls |
| 43 | Fake badges and dots | "NEW", "LIVE", "AI", pulsing green dots fixed in the markup | Remove, or bind to real state with `role="status"` | Rendered from real data |
| 44 | Middle-dot strings | "Fast · Secure · Reliable" or meta chained with dots | One fact, or line breaks and columns | One dot in a byline, a live state |

## Polish and interaction

| # | Tell | In the screenshot | Fix | Allowed when |
|---|---|---|---|---|
| 45 | Edge accent stripe | Thick coloured left or top border on cards, callouts, list items | A 1px neutral border all round, a tint, or nothing | A real alert or error callout with `role="alert"`, or an established state marker |
| 46 | No focus ring | Tabbing shows nothing; outline removed | 2px `focus-visible` ring at 3:1, instant (`drip_guide a11y`) | Never |
| 47 | Depth soup and radius drift | Shadow, border and tint on one card; 4px, 12px and 24px radii side by side | One depth recipe (border or shadow); one radius scale, nested radius = outer minus padding | Never |
| 48 | Motion on everything | Every card lifts and scales, springy bounces, every section fades in on scroll | One signal per element on hover; ease-out, no overshoot; one entrance per page; content visible by default (`drip_guide motion`) | A play-led direction with a declared spring on the primary action only |

## Using the list

1. Walk the desktop screenshot top to bottom, then the phone one. Mark each tell with its number and where it is ("12: features section", "22: 5 sections").
2. Check `fitcheck_lint` output: it confirms several of these from the code (gradients, gradient text, emoji, eyebrows, fake stats, slop words, outline removal, glass, transition-all).
3. Fix in cost order. The tells that change the first impression most: 10, 11, 29, 1, 3, 12, 31, 32. Then copy tells (37-44), then polish (45-48).
4. After fixing, re-shoot and re-walk the list. A fix that adds a new tell (replacing eyebrows with icon tiles, say) is not a fix.

## Sources

Adapted and rewritten from Hallmark (MIT) gates (colour, layout, type, chrome, motion and asset tells with their fixes and legal exceptions), unslop-ui (MIT) decoration and surface rules (eyebrows, numbering, badges, status dots, edge stripes, decorative motion, gradients), Impeccable (Apache-2.0) craft floor (refused page scaffolds and surface habits), and Taste Skill (MIT) checklist and never-list.
