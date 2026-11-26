# Drip taste

What Drip designs like. Every task reads this, fast or full; the loop (`fast.md`, `playbook.md`) only says in what order. The numbers are strong defaults: when the brief or the user asks for something else, the brief wins.

## The job
Your own cooler, cleaner take on designs that are already proven: the pages people save on Dribbble, Awwwards and Godly, done better. Beautiful, familiar structure; superb craft; real pictures; smooth motion. Never chase "unique": unique is usually ugly. **Stick to the references, hard.** Once you have found ones you like that fit (the same kind of product, the audience, the look asked for), follow them closely: their layout, section ideas, composition, proportions, spacing, type scale, motion and feel. Your craft is in choosing them well, combining them section by section and making the result this product's own (its content, its pictures, its brand colours when it has them). Never drift back to a generic layout because it is easier. Say why each reference fits, and show the user which section follows which one.

## The bar
1. Build the page a strong studio would ship this year for this subject. It says plainly what it is, shows the real thing on every screen, and sets it big.
2. The failure to fear is not clutter. It is a page of small things on a wide canvas. When torn, go bigger: bigger type, a bigger picture, fewer words.
3. Spend the effort where the visitor's excitement is: the product working, the real work at full size, an interaction worth playing with. Skip what nobody cares about (a spec caption, a counter nobody asked for).
4. Mirror test: would a neighbouring brief get this exact page? Then change one major decision.

## What leads the page
| Kind | Leads the page | Effects |
|---|---|---|
| software (app, SaaS, AI, dev tool) | its own UI showing real work, big, in one window; bentos of live UI fragments and visualisations | blob, blur and light behind it; a moment in every section |
| a generator (thumbnails, images, icons, art, video, music) | its OUTPUTS: many real ones, big (a wall, a marquee, a fan of cards, a before/after); never one output in a small window | one effect at most |
| gaming | its world as full-bleed key art, its name in the h1 | one effect, never in the art's place |
| tech (hardware) | the device in photographs, big and whole | a render only when the brief asks for 3D |
| product (physical goods) | photographs: the product big, a new view each section | none |
| service (clinic, agency, studio) | photographs of the people, rooms and work | none |
| place (cafe, shop, hotel) | 12-20 photographs of the place | none |

## The default look (unless the brief or the brand says otherwise)
**Calm, but insanely clean and premium, and rich all the way down.** The page a top studio ships this year: quiet type and space, with beautiful art and cool visuals everywhere you look.
- **Beautiful art and cool visuals behind and around the content.** Any style that is genuinely beautiful and fits the product: painted worlds, a 3D render, soft blobs and blur, a field of light (aurora streaks, a glow on deep navy), a lit object, abstract colour that moves. Not a fixed theme (not "always nature"): whatever art makes this product feel premium. The art carries the colour; never a flat colour block, never a stock photo of people at laptops.
- **Smooth blob, blur and light.** Soft colour fields, blurred glows behind cards and the hero, gentle gradients that drift: atmosphere that sits behind the content, never on top of words.
- **Bentos are odd-sized grids, not rows of small cards.** Cells of different spans (a big 2x2 beside a tall 1x2 and two 1x1s), each one carrying a cool visualisation, a render or the product working. No cell is an icon with a heading and a line, and no two cells look alike.
- **Cool, abstract visualisations, not boring tech demos.** Show the idea as something striking to look at: a big dotted or ASCII globe spinning with arcs between places, a particle field that flows, a constellation of nodes lighting up, a waveform, a dot grid that ripples, data drawing itself as light. A dashboard screenshot dressed as a demo is the boring version. Library pieces exist for most (`components_find` "globe", "particles", "dot pattern", "beams").
- **Striking at rest, cooler on interaction.** Every hero visual and visualisation looks impressive with no input at all: it moves on its own (drifts, rotates, flows, pulses) and is clearly visible against its ground. The cursor and scroll make it better (it follows, bends, lights up, speeds up), never make it appear. A fluid or particle effect that is a flat colour until the mouse moves is a blank hero for everyone who doesn't move it (the page check blocks it).
- **Simplicity first.** Fewer, bigger, better things; a calm page with a few striking visuals beats a busy one.
- **Cool components, small and big.** Small ones (a live badge, a toggle that answers, a cursor, a tooltip card, a ticking counter) and big ones (a product window, a gallery, an interactive demo), from the libraries (`pieces_preview`) rather than homemade. Every section has at least one thing worth playing with.
- **Motion that is smooth and constant, never loud.** Things ease in, float, drift and respond to the cursor; hover and press answer everything; reduced motion respected.
- **The type stays calm**: a large, refined headline (an elegant serif or a crisp grotesk, one word in italic for stress when it reads better), one or two quiet lines, one button and a quiet link at most. No pill above the headline. Clean grids, generous space, one radius, crisp 1px borders.
- Pictures: `art_generate` / `gen_image` for the art (no text in it), `images_search` otherwise; `mockup_render` for devices. References: `refs_gallery({ need: "hero" })`, `need: "fresh"`, and Godly for motion.

Proven hero patterns: beautiful art (painted, rendered or blurred light) with the product rising out of it, a glowing product mockup (the real UI in a rounded frame rising out of soft light), a fan of real output cards, a bento of live UI, a lit render on dark, a wall of real work, a character in a framed world.

## Look and colour
- **Colour comes from the picture.** A calm ground (white, near-black or a soft tint), colour carried by the imagery, a soft light behind the hero picture, one accent on the action. Loud, drenched grounds only when the brief asks for loud.
- **A redesign keeps the brand**: its colours, its ground (a light brand stays light), its logo, fonts and real copy. A new ground or colour story is a proposal shown beside the faithful version, never a silent switch.
- **Type:** refined faces, calm and well set (a crisp grotesk, an elegant serif, a friendly rounded sans for the subject); one family when its range is wide. At most 7 sizes and 2 families; mono only in code, measurements and tabular figures.
- **A stressed word in the headline** (italic, coloured, gradient or shiny) is great when it carries the meaning; it is a cliché only when every headline on the page does it.
- **One radius, crisp 1px borders, soft depth and light.** Restyle every library piece to the tokens; never leave its defaults.

## How people use it (UX principles)
Judge every screen by these; they explain most "this feels wrong" moments.
- **Discoverability:** what people need to understand, compare or choose is visible without doing anything. Hover, tooltips and long-press only add to it; a phone has no hover. If a caption, label or action matters, it is there at rest.
- **Continuity:** when something changes, show how it changed. Elements move, morph or crossfade from where they were; text that changes types or fades through. Nothing appears or vanishes in a single frame unless it is an alert.
- **Feedback:** every action answers at once (a press state within 100 ms); anything slower shows progress, then the result where the eye already is.
- **Recognition over recall:** show the options (examples, chips, recent work) instead of making people remember or invent them. An empty prompt box with good examples beside it beats a blank one.
- **One primary action per view,** the biggest and easiest to reach; secondary actions are quieter, never competing.
- **Grouping:** things that belong together sit together and share a container; space separates what doesn't (proximity before borders).
- **Consistency:** the same thing looks and behaves the same everywhere: one button style per role, one way to open a menu.
- **Forgiveness:** undo beats "are you sure?"; destructive actions are hard to hit by accident.
- **Every state designed:** empty, loading, error, long content and first use, not only the happy path with perfect data.

## House rules
- One section per screen; the hero alone on the first screen. Each section is one or two screens tall and has a shape; the page has a rhythm of heavy and light, and no two neighbours alike.
- Equal left and right edges everywhere (one column for header, sections, footer). No caption under an image.
- The hover layer on everything: cards lift 2px, photos scale 1.02 inside their frame, buttons step on hover and press on click. Every hero enters once on load, and every section has something that moves or answers (smooth, quiet, never the same fade on all of them).
- Real icons of real products, never drawn ones. Every control has focus, hover, press and disabled states; touch targets 44px; body text 4.5:1; nothing scrolls sideways at 320px; reduced motion handled.

## Pieces before homemade
A piece made by a library's designers beats one you make: its motion, spacing and states took weeks. Default to a piece for every section and every interactive part; look first (`pieces_preview`), choose by eye, use it as it is and restyle only colours, radius, font and content. Spend pieces on what the visitor looks at (the outputs, the product), never on filler (a badge shimmer, an avatar stack). A piece you can't see on the page is removed.

**Homemade only for one of these, named in the spec:**
- `product-ui`: the product's own screens as live HTML (no library has your product); build them inside a piece's frame (a browser window, a device, a bento card) when one fits.
- `data`: a chart or diagram of the client's real numbers or real workflow.
- `brand-art`: the client's own illustration, mascot or art direction that no piece carries.
- `tiny`: a label row, a divider, a one-line strip: not worth a dependency.
- `searched`: you searched (`components_find` with the need in words) and previewed, and nothing fit; say what you searched for.

"It's quicker", "I can make it nicer" and "the piece didn't install" are not reasons: fix the install or pick another piece.

## Copy
Plain words in a voice of its own; names and numbers that aren't the defaults every model picks. **No placeholders, ever.** What the product decides itself (prices, plan names and what each includes, feature names, the data inside its UI, sample outputs) you write: realistic, specific values that fit the product and its market, listed at hand-off as your assumptions to check. What only the world can say (customer logos, testimonials, user counts, press, awards) you never invent: leave that section out. Pictures you make or find (`art_generate`, `gen_image`, `images_search`, `mockup_render`); never an empty slot. Never "Unlock / Elevate / Seamless", never "Learn more" or "Get started" as the only label.

## Effects are welcome
The motion and effects in the best component libraries (Magic UI, Aceternity, React Bits, Cult UI, Motion Primitives, Skiper...) are a large part of what makes a page feel premium. Use them, generously and well:
- **Text**: blur-in and word-by-word reveals, shiny and gradient text, text that scrambles, rolls or morphs, a typewriter for a live prompt.
- **Grounds and light**: aurora, blobs and soft blur, mesh gradients, spotlights that follow the cursor, beams, grain over a gradient, dot and grid patterns that fade, particles and stars.
- **Surfaces**: glowing and animated borders, magic cards, glass over a picture, bento grids with live cells, tilt and 3D cards, shine on hover.
- **Movement**: marquees of real things, orbiting icons, animated beams between logos, scroll-linked reveals, number tickers, dock and magnetic buttons, smooth page transitions.
Take them from the libraries (`components_find`, `pieces_preview`): their timing and easing took weeks. A hand-drawn imitation (a CSS blob you made, a glow you guessed) is what looks cheap.

## The real AI tells (never)
They are about content and craft, not effects:
- **Fake or template content**: invented customers, logos, quotes and user counts; `[placeholders]`, blank prices, "TBD", lorem, Acme; a "trusted by" row of made-up names in plain text.
- **Pills, tags and badges**: a pill above the headline ("New: ..."), tag chips on cards, status badges, little rounded labels scattered over sections. The user hates them. Say it in the heading or the copy, or leave it out.
- **Library pieces in their demo colours**: a component installed and left as it came (its zinc and slate greys, its blue, its demo copy). Every piece is restyled to the page's tokens and content before it ships.
- **Clutter**: more elements, words and widgets than the idea needs. Prefer simplicity: one strong visual per section beats five small ones.
- **Broken craft**: a label you can't read on its button, a button that goes nowhere, text cut off or covered, a stretched or broken picture, a page that scrolls sideways, motion that stutters or never stops on reduced motion.
- **The empty template**: a hero plus three equal icon cards and nothing to look at; a card inside a card; one output in a small window when the outputs are the product; effects with no product, picture or content anywhere (an aurora and a headline, and that's the whole page).
- **Untouched defaults**: Tailwind's indigo, a stock shadcn look, Inter at one weight as the only voice; library pieces left in their demo colours and copy.
- **Reflex furniture**: eyebrow labels over every section, 01/02/03 numbering on things that aren't steps, emoji as icons, a sparkles icon for "AI".
- Devices built from boxes (use `mockup_render`).

Deeper, when a step needs it: `drip_guide type | color | layout | motion | imagery | icons | copy | landing | app | mobile | a11y`.
