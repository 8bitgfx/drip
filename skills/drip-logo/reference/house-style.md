# House style: the flat mark and the one-image brand board

This is Drip Logo's default for logos and their presentation. It comes from a real logo job (Nimbus, an AI SaaS
named after the rain cloud and the saint's halo) that went through eight rounds with a user who rejected each miss by
name, and from the single-image brand boards it was finally measured against: Sinline and Roamify by Ashfuq Hridoy,
Seture by Visvibe, Session by Lucas Fields. `drip_kit({ template: "logo-board" })` writes the board as a working
page; you re-skin it, you don't start blank.

The brief, the brand's own rules (BRAND.md, DESIGN.md) and the project's identity override any of it.

## 1. What the user asked for, in their words, and what it means

| They said | It means | The rule |
|---|---|---|
| "they aren't clever, just ugly; a croissant and a basic cloud with a line. The older one was better" | three critic rounds pushed the mark into layered cuts and a separate favicon cut; each round made it busier | the mark is one bold silhouette. Show the user the finalists after the FIRST critic round on them, never after rework rounds they didn't ask for. The user's pick beats the critic's score |
| "logos are flat white or black... be a proper brand" | the mark only ever appeared as a white or navy silhouette | show the mark in its brand colours: body in the main colour, the idea's part (the ring, the door) in the accent. Mono versions exist, they are not the presentation |
| "I'm asking for the logo to be flat and good. You keep adding textures and gradients" | the answer to "brand colour" was gradient foil, glows and lit edges | flat = solid fills from the palette. No gradient, foil, bevel, gloss, glow, inner shadow or texture on or behind the mark, anywhere |
| "ugly and unreadable", "looks like AI slop" | white type and logos on a busy watercolour sky; 12-14px labels | the mark and every word sit on a solid colour. Imagery never sits behind the logo or a sentence |
| "unreadable, look random, aren't made like real brands. Stop guessing and try properly" | tiles in six different grounds, mixed styles, a page of small things | study 3-4 real brand boards first, then follow their system exactly: one brand-colour ground, palette-only tiles, one grid, big type |
| "one sheet / image per logo I can post on Twitter" | a long scrolling case study is not postable | the deliverable is ONE board image per logo (1600x1200, exported at 2x). A long sheet is optional, after it |
| "geometric, complex, artist-looking" | not more detail: precise construction | complexity comes from the idea and from showing the construction (circles, nodes) on its own tile. The mark itself stays simple |

## 2. The mark

- **One idea, one silhouette.** It must read as the same thing at 16px and at 600px, so there is one master. A
  "small-size cut" that looks different is a second logo; fix the master instead.
- **Simple wins over layered.** Layer cuts, inner contour lines, halftone dots and seed-of-life petals read as
  clutter at feed size and turned into "a croissant". If a detail needs a gap under 16/256, it goes.
- **Colour versions, all flat:**
  - Primary on light: body in the main brand colour, the idea's part in the accent, wordmark in ink.
  - On dark (ink or the brand's dark): body in a light tint of the main colour (or white), accent unchanged,
    wordmark white.
  - On the brand colour: body white, accent unchanged.
  - Mono black and mono white for the cases that need them.
  Two colours in the mark at most. Each is a palette hex, solid.
- **Wordmark** from a face chosen for the brand (the product site's display face when it has one), outlined to
  paths, mark height about 1.0x the wordmark's cap-to-baseline, gap about 0.34x.

## 3. The board (measured from the references)

```
canvas      1600 x 1200 (4:3), exported at 2x (3200 x 2400) for X / Dribbble
ground      a light tint of the main brand colour (the whole board)
grid        80 margin, 40 gap, radius 32, 7 tiles; left column 520 wide, right 880
tiles       only palette colours: the dark brand colour, white, the tint, the main colour. No photo or texture
            behind a logo or a sentence. Photos and renders live inside their own tile.
type        tagline 80px in the display face, everything else 19-26px; nothing under 19px
```

| Tile | Size | Job |
|---|---|---|
| Construction | 520 x 590 | the mark on the tint, white body + accent, its circles and path nodes as 1px lines and small squares, one caption line ("Four circles, one baseline, one ring.") |
| Device | 520 x 410 | a phone render with the flat launch screen (brand colour + the white mark), tilted -8°, bleeding off the tile |
| Primary lockup | 606 x 282 | flat colour mark + white wordmark on the dark brand colour |
| Palette | 234 x 282 | three circles (accent, main, dark) with their hex at 19px |
| App icon | 420 x 358 | the icon on white: the main colour square (radius 0.23), white mark, accent part; one soft shadow |
| Print | 420 x 358 | business cards (a 3D render of flat card art) on a palette-colour tile |
| Tagline | 880 x 320 | the dark colour, the line at 80px (one word in the accent), the URL at 26px, a solid-colour crop of the mark bleeding off the right edge |

## 4. The order that worked

1. References first: `refs_tag` "brand guidelines", "brand book", "logo presentation"; `refs_view` the 3-4 best
   single-image boards and write down their system (ground, grid, tile jobs, type sizes) before building.
2. Concepts → `logo_sheet` → the critic ranks once → build the top 3 → `logo_test` → the critic once on the
   finalists → **the user picks**. Rework only what the user names.
3. Colour the picked mark flat (section 2), then `drip_kit({ template: "logo-board" })`, fill it, render it with
   `render_html` at scale 2. Renders for the device and print tiles: `mockup_render` (phone) and `blender_render`
   (cards) from flat art; transparent backgrounds, placed on a palette tile.
4. Look at the board at 600px wide (how a feed shows it). Every word readable? Mark recognisable? Then show it.

## 5. DEFAULTS (applied unless the brief or the brand says otherwise)

```
mark:       one bold silhouette, one master for every size; simple over layered
colour:     flat palette fills; main colour + one accent in the mark; ink or white wordmark
never:      gradients, foil, glow, gloss, bevel, lit edges, textures, watercolour or photos behind the mark,
            inner layer cuts that collapse at 16px, a separate small-size logo, mono-only presentation
process:    the user sees finalists after one critic round; critic rounds never override the user's taste
board:      drip_kit({ template: "logo-board" }); 1600x1200 at 2x; brand-tint ground; 7 palette-colour tiles
type:       tagline 80px; labels 19-26px; nothing smaller
deliver:    one board PNG per logo, then (only if asked) the long case study and the file set
```

Check every board against section 1 before showing it.
