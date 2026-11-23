# Genres and styles: a working catalogue

A genre is a family of visual worlds with shared moves. A direction is one specific world inside a genre, named after the subject ("Departure board" is a Swiss/technical direction; "Chalk" is an editorial one). Use this catalogue to name the genre your chosen direction belongs to, borrow its signature moves with real values, and avoid the way it usually goes wrong. Every genre is legitimate somewhere; each has a slop version that models produce by reflex, and a `breaks_if` list: the tokens that, once they appear, mean the build has left the genre (or turned into a hybrid). Copy the chosen genre's `breaks_if` list into the direction contract and check the built CSS against it before the critic sees the page.

## Pick by mode and subject

| Mode / subject | Strong fits | Use with care | Usually wrong |
|---|---|---|---|
| Persuade: software, B2B | Product-minimal, Swiss, Editorial, Technical | Atmospheric, Bento | Glass, Skeuomorphic |
| Persuade: consumer app, community | Playful, Photographic, Retro print, Kinetic | Neubrutalist, Maximal | Luxury |
| Persuade: place (food, hotel, shop) | Photographic, Editorial, Organic, Retro print | Luxury | Technical, Terminal, Atmospheric glow |
| Persuade: AI / creative tool | Atmospheric, Editorial, Kinetic, Swiss | Technical | Glass, purple Aurora |
| Experience: portfolio, campaign, game | Kinetic, Brutalist, Maximal, Photographic, Atmospheric | anything, with craft | Product-minimal |
| Operate: dashboard, admin, tool | Data-dense, Product-minimal, Native platform, Swiss | Technical | Maximal, Glass, Neubrutalist |
| Read: docs, articles, changelog | Editorial, Swiss, Product-minimal | Technical | Atmospheric, Maximal, Kinetic |
| Kids, education | Playful, Retro print | Neubrutalist | Luxury, Data-dense |
| Public service, health, legal | Swiss, Product-minimal, Editorial (accessible) | Organic | Maximal, Atmospheric, Glass |

Each entry below: **what it is · signature moves · type · colour · motion · fits · slop risk → fix · breaks if.**

Ambition is bold by default (`drip_guide rules/ambition`): pick the genre that makes the subject memorable, not the one the category always wears. For the unexpected-pairing direction, read the "Usually wrong" and "Use with care" columns as candidates: a genre from another world, committed to fully, with one line on why it beats the safe pick.

---

### 0. The anti-genre: "Tasteful AI"
- **What:** the look every model produces when asked for "warm", "premium", "human" or "elegant" and given no other constraint. It is not a genre anyone chose; it is the absence of a decision. Drip names it so it can refuse it.
- **Tokens:** cream or beige ground (#F0-F8 range: #F4F1EA, #FAF7F2); terracotta, rust or clay accent; a polite high-contrast serif display (Fraunces, Playfair Display, Instrument Serif, Cormorant, Newsreader) with one italic word; tracked uppercase mono eyebrows; hairline rules; a centred hero with two buttons; three equal cards; soft grain.
- **Siblings, same status:** near-black + one neon + glow (the "AI startup" costume); purple-to-blue gradients with glass cards; Inter or Geist everywhere as the only voice.
- **When allowed:** only when the brief or brand literally pins it ("cream and serif, like our print catalogue"). Then push craft inside it and say so.
- **The critic:** caps Idea and Conviction at 4/10 for any of these when the brief didn't ask.
- **Breaks if (i.e. you are in it):** three or more of the tokens above appear together. Fix: a palette from the subject's own materials, a type voice with a point of view, a structure from the content's own form.

---

### 1. Editorial
- **What:** publication logic. Content leads; hierarchy and rhythm come from type and columns.
- **Moves:** asymmetric columns (5/7, 2:5, 3:7); 1px rules instead of boxes; display type large enough to hold a screen (clamp up to ~8-10vw); captions that carry facts; one drop cap or one pull quote at most; generous space above a heading, less below.
- **Type:** a serif or condensed display with a readable text face; old-style figures in prose; measure 60-75 characters.
- **Colour:** Restrained or Committed; an off-white or tinted ground, never pure #FFF with pure #000.
- **Motion:** one quiet entrance.
- **Fits:** publications, studios, culture, podcasts, considered consumer brands, Read surfaces.
- **Slop →** the broadsheet costume (cream, italic serif heads, tiny tracked mono labels, hairlines everywhere) **→** keep the content logic, drop the costume; labels in the body face, sentence case; ground from the subject.
- **Breaks if:** pure #FFF ground with #000 ink · card grids with shadows · radius over 4px · centred body text · icons in tinted squares · display under 3x body.

### 2. Swiss / International
- **What:** an objective grid made visible; type and flat colour fields do all the work.
- **Moves:** a strict 12-column grid with flush-left, ragged-right text; very large grotesk numbers and heads (10:1 over body is normal); asymmetric placement; flat colour fields (one red, one black) that own regions; no ornament, no shadows.
- **Type:** one neo-grotesk or grotesk family across weights; tabular figures.
- **Colour:** Committed or Full palette with 2-3 flat fields; or black, white and one red.
- **Motion:** none, or one precise slide.
- **Fits:** dev tools, infrastructure, institutions, transit, architecture, data products.
- **Slop →** "Helvetica on white" minimalism with nothing to say **→** let the grid show, set the key number or head huge, give one colour a whole field.
- **Breaks if:** warm paper or cream ground · serif display · grain or texture · centred type · drop shadows · radius over 4px · gradients · more than 3 colours.

### 3. Product-minimal (modern SaaS)
- **What:** the product interface is the hero, shown at true size, in a calm frame.
- **Moves:** real UI in the first viewport (live HTML, not a screenshot in a fake browser); 1px borders over shadows; one radius scale (6-10px); tight-set display (-1% to -3% tracking); declarative, specific copy.
- **Type:** a grotesk with character for display (not the UI face by default), a workhorse UI face for text.
- **Colour:** Restrained; one accent on the primary action and selection.
- **Motion:** minimal; the product's own interactions are the motion.
- **Fits:** SaaS, B2B, developer tools, fintech, productivity.
- **Slop →** the SaaS kit (centred headline, gradient blob, logo wall nobody supplied, three icon cards, Inter everywhere) **→** the product doing its job in the hero, sections built from the product's real objects, a display voice.
- **Breaks if:** a screenshot in a fake browser frame as the hero · gradient blobs or glass · shadow plus border on one surface · a second accent · an unsupplied logo wall · Inter as display with no reason.

### 4. Data-dense / instrument
- **What:** a working screen tuned for scanning and repeated use.
- **Moves:** tables before cards; controls 32-40px with 44px hit targets; tabular figures right-aligned on the decimal; filters as one row over what they scope; status colours only where they mean something; a headline number shows its recent history.
- **Type:** one UI family, type scale ratio 1.125-1.2; mono only for measured values or code.
- **Colour:** Restrained or a Committed shell (a coloured rail or header); data series and states have their own colours.
- **Motion:** state changes only, 120-200 ms.
- **Fits:** dashboards, admin, ops, trading, monitoring.
- **Slop →** four KPI cards with trend arrows nobody measured, donut charts for everything **→** lead with the object the tool is known by (the queue, the ledger, the timeline), with all four data states (loading, empty, error, full).
- **Breaks if:** KPI cards with unmeasured trend arrows · donuts for non-part-of-whole data · cards where a table belongs · decorative illustration · proportional figures in columns · motion over 250 ms.

### 5. Atmospheric / cinematic
- **What:** a dark canvas where light, image or generated output carries the mood.
- **Moves:** a dark ground in 2-3 lightness steps; the real output (generated images, audio waveforms, film stills) as the canvas; at most two soft colour blooms, never animated; display type up to ~6rem sitting on the canvas.
- **Type:** a refined grotesk or light serif display; quiet text face.
- **Colour:** one hue for the canvas treatment, focus and small tags; no third hue.
- **Motion:** fades only; the atmosphere does the work.
- **Fits:** generative AI tools, music, film, night products, games.
- **Slop →** near-black with neon glow, radial spotlight behind the hero, glass cards, gradient text **→** no glow shadows, solid surfaces by lightness step, show real output instead of an orb.
- **Breaks if:** coloured glow shadows · glass cards · gradient text · animated blooms · a third hue · a light ground.

### 6. Brutalist
- **What:** honesty of structure: the page shows how it is built.
- **Moves:** visible borders and cells; default-feeling or heavy grotesk type; zero radius; instant state changes; unexpected but legible layout; raw links that look like links.
- **Type:** system faces or one heavy grotesk; huge contrasts of size.
- **Colour:** black and white, plus one raw colour.
- **Motion:** none or instant.
- **Fits:** portfolios, art, counter-culture, editorial experiments, Experience surfaces.
- **Slop →** confusing it with the neubrutalist kit, or using "brutal" as an excuse for broken usability **→** structural honesty, still accessible: real contrast, focus states, a clear action.
- **Breaks if:** soft or blurred shadows · any radius · gradients · eased transitions over 150 ms · a pastel palette · removed focus states.

### 7. Neubrutalist
- **What:** loud, flat and friendly: saturated fills boxed in black.
- **Moves:** 2-3px black borders; hard offset shadows (4px 4px 0) on interactive things; flat saturated fills; heavy condensed or grotesk caps; slight press-down on click (translate 2px, shadow shrinks).
- **Type:** a heavy display face plus a plain sans.
- **Colour:** Full palette of 3-4 flat brand colours with black.
- **Motion:** snappy press feedback, 100-150 ms.
- **Fits:** consumer startups with a loud brand, creative tools, youth-facing products.
- **Slop →** one of the AI defaults, applied to anything **→** only when the brand is loud by nature; fills from the brand, shadows only on things you can press.
- **Breaks if:** blurred shadows · gradients · 1px grey borders · a muted, desaturated palette · radius over 12px · hard shadows on things you can't press.

### 8. Playful / toy
- **What:** alive and friendly; things feel touchable.
- **Moves:** radius 12-24px and pills; soft offset shadows; tinted alternating bands; 3-4 named colours each with a job (categories, progress, states); one character moment; a spring only on the primary action.
- **Type:** a rounded or geometric sans with personality at heavy weights; readable text face.
- **Colour:** Full palette, chroma kept in check so text still passes contrast.
- **Motion:** responds to the pointer; one entrance; springs on one or two moments only.
- **Fits:** kids, education, habit apps, games, community.
- **Slop →** claymorphism on every element, bounce everywhere, candy pastels with grey text **→** one character moment, everything else calm and legible.
- **Breaks if:** zero radius everywhere · hairline-only separation · a monochrome palette · a high-contrast serif display · bounce on every element · grey text on pastel failing contrast.

### 9. Technical / blueprint
- **What:** the language of engineering drawings and measurement.
- **Moves:** construction lines and dimension strings that carry real measurements; corner ticks on frames; a drenched blueprint blue or graph-paper ground; figures in mono with units; diagrams that explain the mechanism.
- **Type:** a squarish grotesk or technical sans for heads, a mono for measured values.
- **Colour:** Drenched blue with white line ink, or paper with one signal colour.
- **Motion:** lines draw once to explain a mechanism.
- **Fits:** hardware, engineering, infrastructure, scientific tools.
- **Slop →** HUD sci-fi ornament (scanlines, fake readouts) with no real data **→** every line and number is information.
- **Breaks if:** lines or numbers that measure nothing · scanlines, HUD frames, fake readouts · pill buttons · photography as the hero · warm paper with a serif.

### 10. Terminal / developer
- **What:** the world of people who live in a terminal, for marketing them a CLI or infra product.
- **Moves:** real commands with real output; a copyable install line as the primary action; mono for code and commands, a grotesk for reading; keyboard shortcuts shown where they exist.
- **Type:** a mono with character (not the default one) plus a readable sans.
- **Colour:** Restrained; ink on a dark or paper ground, one signal colour for success or "live".
- **Motion:** output appears as it would in a terminal, once.
- **Fits:** Persuade surfaces for CLIs and infra. Never as a costume on an Operate screen.
- **Slop →** neon green on black, fake typing animation, mono body text **→** real output, real commands, a sans for paragraphs.
- **Breaks if:** mono for paragraphs · fake typing animation · neon green on black · glow · commands that don't exist.

### 11. Luxury / quiet
- **What:** restraint as the signal of value.
- **Moves:** very generous space; photography carries almost everything; small, precise type; very few words; slow, soft transitions (600-900 ms); thin rules.
- **Type:** a high-contrast serif or refined sans at a light weight; wide tracking only on short display lines.
- **Colour:** monochrome plus one deep or mineral accent.
- **Motion:** slow fades, image crossfades.
- **Fits:** fashion, hospitality, jewellery, architecture, premium goods.
- **Slop →** gold gradients, script fonts, "timeless elegance" copy **→** let photography and space work; copy states facts.
- **Breaks if:** gold gradients · script fonts · a second accent · more than ~40 words a screen · snappy motion under 300 ms · badges, emoji, stickers.

### 12. Organic / natural
- **What:** materials and daylight from the product's real world.
- **Moves:** palette sampled from the actual product or place (soil, bottle glass, linen, leaves); daylight photography in true colour; soft or hand-cut shapes used sparingly; humanist type.
- **Type:** a humanist sans or a warm serif; readable text face.
- **Colour:** Committed, from real materials; not a muted beige default.
- **Motion:** gentle, ease-out.
- **Fits:** food, wellness, sustainability, craft, outdoor.
- **Slop →** the wellness rut (sage, beige, blobs, grain wash) **→** sample colour from the subject's real objects and commit to it.
- **Breaks if:** a cream #F0-F8 or sage-and-beige ground with no source in the subject · blobs on every section · grain on every surface · neon · mono type.

### 13. Retro print (riso, halftone, letterpress, poster)
- **What:** real print logic on screen.
- **Moves:** 2-3 inks that overprint into a third colour where they cross; photos pulled through one ink or a halftone screen; wood-type condensed capitals; heavy rules at fixed weights (1pt, 5pt); texture budgeted to one surface.
- **Type:** condensed or slab display, a plain text face.
- **Colour:** Committed or Full palette limited to the inks.
- **Motion:** little; a slight misregistration as the one moment.
- **Fits:** events, music, food, community, publishing.
- **Slop →** paper texture as wallpaper and fake distress **→** limited inks, real overprint, texture in one place.
- **Breaks if:** more than 3 inks · untreated full-colour photos · gradients · soft shadows · texture on every surface · glass.

### 14. Maximal / collage
- **What:** deliberate abundance: stickers, mixed media, clashing colour.
- **Moves:** layered elements on a hidden grid; marquees; mixed photo cut-outs; several type voices with clear roles; a reading order that still works.
- **Type:** 2-3 contrasting display faces with one plain text face.
- **Colour:** clashing brights, still with legible text pairs.
- **Motion:** lots, all pausable, all with reduced-motion fallbacks.
- **Fits:** fashion drops, music artists, youth culture, campaigns.
- **Slop →** random clutter that hides the action **→** chaos on a grid; the primary action unmistakable on every screen.
- **Breaks if:** a primary action not visible on every screen · text pairs failing contrast · motion with no reduced-motion fallback · a single type voice · no underlying grid.

### 15. Photographic
- **What:** the subject's real photographs lead the page.
- **Moves:** few, large photos with one treatment (true colour, mono, duotone); text small and precise around them; never two photo-led sections in a row without a type-led one between; every photo passes the deletion test (remove it and the page loses a fact).
- **Type:** a quiet, precise face; the photo is the display.
- **Colour:** taken from the photography.
- **Motion:** slow zoom or crossfade, used once.
- **Fits:** places, food, hotels, products, outdoor, architecture.
- **Slop →** stock mood photos of people laughing at laptops **→** the subject's own thing, or labelled stand-ins the user replaces (`drip_guide imagery`).
- **Breaks if:** stock photography · more than one photo treatment · drawn illustration · two photo-led sections in a row · text on a busy image with no scrim.

### 16. Kinetic / type-led
- **What:** type is the image, and it moves once.
- **Moves:** display at 10-20vw; variable-font weight or width shifts; one scroll-linked or load-time type moment; everything else still.
- **Type:** a variable display face with a wide range; a quiet text face.
- **Colour:** often two colours; Drenched works well.
- **Motion:** one orchestrated type moment, a static fallback under reduced motion.
- **Fits:** launches, agencies, events, Persuade pages with little imagery.
- **Slop →** split-letter animations on every heading **→** one moment, then stillness.
- **Breaks if:** split-letter animation on every heading · more than one motion moment · display under ~8vw · no static fallback · imagery competing with the type.

### 17. Native platform (Apple HIG, Material 3, Fluent)
- **What:** the platform's own language, so the app feels installed.
- **Moves:** system type roles (Large Title, Body; Material's display/headline/body scale); system controls and sheets; platform spacing (8pt on Apple, 4dp grid on Material); brand in the accent, icon and illustrations.
- **Type:** the system face, or one brand face mapped to the system roles.
- **Colour:** semantic system colours plus one brand accent; tonal surfaces on Material 3.
- **Motion:** platform transitions.
- **Fits:** native iOS, Android, Windows apps; settings and utilities.
- **Slop →** web-style custom controls in a native app, glass or blur as decoration **→** platform components first; deviate on purpose, one place.
- **Breaks if:** web-style custom controls replacing system ones · blur or glass as decoration · a non-platform spacing grid · a novelty face in body text.

### 18. Bento / showcase grid
- **What:** modular tiles of varied size that show several product facets at once.
- **Moves:** one lead tile at 2x the others; unequal spans; every tile shows a real piece of the product (a working control, a real chart, a real screen crop); used once per page.
- **Type:** the page's own system; tile heads one step below section heads.
- **Colour:** the page's posture; tiles differ by lightness step, not by random colours.
- **Motion:** each tile may loop one small real interaction (2.5-4 s), pausable.
- **Fits:** feature sections for products with several distinct capabilities.
- **Slop →** every section a bento of icon tiles with two-word labels **→** one bento, real content in each tile, the rest of the page built differently.
- **Breaks if:** more than one bento per page · icon-plus-two-words tiles · equal tile sizes · random tile colours · fake charts.

### 19. Glass / spatial / aurora (rarely)
- **What:** translucent layers over a vivid or photographic ground.
- **Moves:** one translucent element (a nav or a control bar) over media; backdrop blur 12-20px with a solid fallback; text always on a solid or near-solid surface.
- **Type:** the platform or a light grotesk.
- **Colour:** from the media behind it.
- **Motion:** depth on focus, subtle.
- **Fits:** spatial computing, Apple-platform chrome, media players.
- **Slop →** glass cards on a purple-blue gradient, low-contrast text on blur **→** at most one glass element; solid surfaces for reading; no aurora gradient as filler.
- **Breaks if:** more than one glass element · text on blur under 4.5:1 · an aurora gradient as filler · no solid fallback when blur is off.

---

## One genre, no hybrids

Commit to one genre. "Swiss with a Brutalist edge" or "editorial meets glass" is a hedge, and the critic marks it down under System ("no hybrid genre"). A direction may borrow **one named move** from another genre (a product-minimal page with one kinetic type moment) as long as the move doesn't break the lead genre's `breaks_if` list. Write the genre and the borrowed move in the contract's WORLD line.

## Checking the build against `breaks_if`

Before `critic_prepare({ kind: "build" })`:
1. Copy the chosen genre's list into `DESIGN.md` under `BREAKS IF`.
2. Search the built CSS and components for each token: radii (`rounded-`, `border-radius`), shadows (`shadow-`, `box-shadow`), gradients, fonts, grounds (`--background`, `bg-`), motion durations.
3. Every hit is either removed or justified in one line in `DESIGN.md`. More than two justified hits: the direction is drifting; say so to the user.

## Sources

Rewritten and condensed from: **UI UX Pro Max** (MIT: its styles catalogue, best-for and do-not-use-for data, used here with Drip's own opinions and values), **Hallmark** (MIT: the editorial, modern-minimal, atmospheric and playful genres and what each allows and refuses; print, technical and dark material worlds from its theme catalogue), **Impeccable** (Apache-2.0: Operate and Read limits, costumes of tools on working screens, the AI-look calibration), **Taste Skill** (MIT: effects and scenes only on technical subjects, photographs for places and products, one object never carries the page). Inspired by Anthropic's **frontend-design** (paraphrased): the generated defaults to avoid when an axis is free. New in 0.3: **Ilm-Alan/frontend-design** (MIT: a "breaks if" fence per aesthetic anchor, hybrid resistance, unexpected pairings), **Thecsiz/tastemaker** (MIT: grade down undecided work, never committed expressive work).
