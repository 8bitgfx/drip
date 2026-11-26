# Styles: a vocabulary to mix

These are not presets. A style is a set of decisions about shape, colour, type, texture and motion. Pick two or three
ingredients, decide how they meet, and write the result into the storyboard's `look` and `moves`. A film that is
a pure copy of one family reads as a template.

## Style vocabulary

| Style | What it is | Motion behaviour | Fits | Cliché to avoid |
|---|---|---|---|---|
| Abstract geometric | Circles, bars, lines, grids as the actors | Exact, rhythmic, snaps and morphs, grid-locked | Brands without a literal product picture, platforms, tools | Random shapes bouncing with no meaning |
| Product-led | Real screens and devices carry the story | Cursor paths, focus magnification, UI assembling | SaaS, apps, dev tools | A fake dashboard; a floating laptop |
| Kinetic typography | Words are the objects | Per-word and per-letter timing, scale jumps, masks | Manifestos, launches, lyric-like films | Every word animated the same way |
| Sculptural 3D | Solid forms, light and material | Slow camera, orbit, weight, soft shadows | Hardware, premium brands, abstract hero shots | A chrome blob with no idea |
| Playful illustration | Hand-drawn or flat characters and objects | Squash and stretch, bounces, overlaps | Consumer, kids, education, fintech with personality | Stock flat people with big hands |
| Procedural / generative | Rules produce the picture (noise, flocking, grids) | Evolving, organic, never repeating | AI, data, science, music | Particles that mean nothing |
| Editorial and mixed media | Photos, cut-outs, type, paper, tape | Snappy cuts, stop-motion feel (12 fps steps), texture | Culture, fashion, media, events | A collage with no hierarchy |
| Data storytelling | Real data as the picture | Counting, drawing lines, highlights, comparison | Reports, finance, health, science | Bars that rise just because |

Mixing example: geometric motif (a circle) + kinetic type for the headlines + a short product-led beat at the
middle, in the Swiss family. Decide which ingredient leads (one), which supports (one), and which appears once.

## Aesthetic families

Each: palette, type, texture, motion, when it fits, its cliché.

**Swiss / International.** Palette: white or off-white, black, one saturated red or blue. Type: grotesque (Helvetica-like, Inter
Tight, Neue Haas), tight tracking, flush left. Texture: none. Motion: grid-locked, exact, linear or `power3`
moves, no bounce. Fits: tools, infrastructure, anything that wants to feel precise. Cliché: a red dot and a
sans headline on white with every film a copy.

**Bauhaus.** Palette: primaries on cream (red, blue, yellow) and black. Type: geometric sans, uppercase, rotated lines.
Texture: flat, slight paper. Motion: shapes rotating, sliding and locking, diagonal compositions. Fits: design,
education, culture. Cliché: circle, square, triangle in primaries because "Bauhaus".

**Brutalist.** Palette: raw grey, black, white, one acid colour. Type: heavy mono or oversized grotesque, system fonts. Texture:
hard borders, no rounding. Motion: abrupt cuts, scale jumps, blunt steps (low frame-rate feel), no easing flourishes.
Fits: developer tools, indie, anti-corporate. Cliché: giant monospace text on grey with a glitch.

**Editorial collage.** Palette: warm paper, black ink, a highlighter colour. Type: a high-contrast serif for headlines and a
small sans or mono for captions. Texture: torn paper, halftone, tape. Motion: stepped at 8-12 fps, cut-outs sliding
in with a slight rotation, stop-motion jitter. Fits: media, culture, fashion. Cliché: ransom-note lettering.

**Risograph / print.** Palette: two or three spot inks (fluorescent pink, teal, yellow) overprinting on off-white. Type:
chunky serif or rounded sans. Texture: grain, misregistration of 2-4px, halftone dots. Motion: loose, hand-feel,
layers landing slightly offset. Fits: creative tools, events, community, kids. Cliché: pink and teal on every
indie project.

**Y2K chrome.** Palette: silver, cyan, hot pink, deep blue. Type: stretched, extended or bubble faces. Texture: gloss,
reflections, lens flares. Motion: spins, glints sweeping across metal, springy popping. Fits: music, gaming, fashion.
Cliché: chrome text with a star flare on everything.

**Frosted glass.** Palette: soft gradients behind translucent panels, white text. Type: clean sans, light weights. Texture:
blur, thin highlights, soft shadows. Motion: slow, smooth, `power3.inOut`, panels sliding with parallax. Fits: OS and
app launches, calm premium products. Cliché: purple-blue blobs behind glass cards. Blur is expensive to render;
keep blur radii under 40px and count layers.

**Memphis.** Palette: pastel with black squiggles, pink, teal, yellow. Type: chunky, playful, sometimes outlined. Texture:
confetti, terrazzo, patterns. Motion: bouncy, spinning, shapes entering with overshoot. Fits: consumer, kids,
food, fun launches. Cliché: confetti everywhere and no hierarchy.

**Noir.** Palette: black, off-white, one warm light or a muted red. Type: condensed sans or elegant serif, small and rare.
Texture: grain, vignette, hard light and shadow. Motion: slow, controlled reveals, long holds, light moving across.
Fits: security, luxury, premium hardware, drama. Cliché: dark mode with a purple glow and "unlock" copy.

**Analog film.** Palette: warm, slightly faded colour, halation on highlights. Type: a clean serif or a light sans, sparse. Texture:
grain, gate weave of 1-2px, dust (seeded), light leaks. Motion: slight handheld drift, 24 fps feel, dissolves.
Fits: brand and story films, nostalgia, craft. Cliché: a sepia filter on a tech product.

## Brand studies

These are research directions: what to look for, not styles to copy. Study with `motion_refs` and `motion_study`,
and write down the technique, not the look.

| Brand | Look for |
|---|---|
| Linear | Restraint: dark ground, thin lines, exact easing, one accent; how slow and precise motion reads as quality |
| Apple | Camera and light on real objects; type that arrives with the voice; the hold before the reveal; scale contrast |
| Stripe | Gradients as material, depth, motion in diagrams that explain; how complex ideas are staged |
| Notion | Hand-made charm against a clean ground; illustration and UI mixing; calm pacing |
| Figma | Shapes as characters; cursor and collaboration as story; colour and geometry from the product itself |
| Vercel | Black and white discipline, geometric type, triangles and grids, fast cuts to code |

## Professional references to search

Studios whose film and brand work is worth looking at for craft: BUCK, Ordinary Folk, ManvsMachine, Giant Ant,
Tendril, Found Studio. Publications and galleries: Motionographer, Stash. `motion_refs` searches Kisto (curated
studio motion design) and 24fps.dev (films made in code); search studio names and techniques as words. Credit what
you learn; never copy frames, characters or copy.

## Choosing

1. Write three words for the brand and one word it is not.
2. Pick the lead ingredient from the vocabulary (it decides what moves).
3. Pick one family for palette and type, and one different family for one detail (a texture, a type voice).
4. Write the look as exact values: hex colours, font names, grain amount, radius, line weight.
5. Build style frames and check them at about 360px wide before animating (`motion_frames` with `times`).
6. If the frame could be any brand's, it is not decided yet.
