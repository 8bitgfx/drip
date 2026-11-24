# README art: a hero banner and bento grids

Some projects have no screen worth showing: plugins, toolkits, design systems, anything whose output varies. For those, the README's pictures are designed art: one hero banner and one or two bento grids that say what the project does in shapes, numbers and short captions. Done well it looks like a product page. Done badly it looks like a poster made by a generator. This guide is the recipe, and `drip_kit({ template: "readme-art" })` writes a starter script that renders the art to PNG.

The starter is a template on purpose. It is all greys, every word is in [brackets], and every picture is a dashed slot. Nothing in it is meant to ship. Replace all of it with the project's brand, words and objects.

## When to use it

| Project | Use |
|---|---|
| App with a good-looking UI | A real screenshot or GIF first (`drip_guide readme/visuals`); bento only as a second picture |
| Plugin, toolkit, CLI with many parts, design system | Hero banner + 1 or 2 bento grids |
| Library | Code next to its output first; a bento for the feature list if it is long |

## The procedure

1. **Read the project.** Read what it does, the current README, its logo, colours and fonts. Decide the 5 or 6 things a visitor must learn. Those become tiles.
2. **Ask once.** Ask about the feel, which features earn a tile, and whether the logo or brand is locked. Record the answers with `drip_brief`.
3. **Write the copy first.** Write a headline of five words or fewer, one small line, and one run-in caption per tile. If a caption needs a second sentence, the tile is about two things: split it or cut it.
4. **Write the starter:** `drip_kit({ template: "readme-art" })`, which creates `assets/readme/src/readme-art.mjs`. Set the tokens marked `CHANGE ME` (accent, ground, fonts). Pick the brand faces with `fonts_pair` if there are none yet, and check the accent against its text with `palette_check`.
5. **Build the hero**, then the bento tiles (below). Replace every `slot(...)` with a real object.
6. **Render** with `node assets/readme/src/readme-art.mjs`. Open every PNG and look at it before showing anyone (checklist below).
7. **Wire it in** with `<picture>` for the light and dark pair. The hero is one image.
8. **Check it rendered.** Push a branch and open the README on github.com in both colour schemes (`fitcheck_shot` on the branch URL). Then `critic_prepare({ kind: "any" })` with the PNGs, the `drip:critic` agent, and `critic_record`.
9. **Show the user the images,** not the code. Change only the part they name.

## The hero banner

| Rule | Value |
|---|---|
| Size | 830 wide, 300 to 360 tall, rendered at 2x |
| Ground | Dark or the brand colour, so one image works on GitHub's light and dark themes |
| Words | A headline of at most five words, plus at most one small line. No paragraph |
| Art | The logo idea at banner size, or the brand's one signature shape. Show the whole mark |
| Type | 64 to 80px display, tight tracking (-0.04em), 0.92 to 0.95 line height |

- Do: make the hero the logo's idea, scaled up. For example, the headline sits inside the mark's shape and the mark's detail runs off the banner edge.
- Don't: crop the mark so it reads as a plain box, put a paragraph under the headline, or add a row of chips.

## The bento grid

| Rule | Value |
|---|---|
| Columns | 3, with a 12px gap |
| Tile | 22px radius, 24px padding, a 1px inner hairline in the tile ground's tone |
| Tiles per grid | 5 or 6: one hero tile (2 columns) and one accent-coloured tile |
| Caption | Run-in style: "**Bold claim.** grey rest", 17px, at most 30 characters per line, always at the top |
| Picture | Sits at the bottom of the tile or bleeds off its edge; never centred with even air all round |
| Themes | Two renders, light and dark, from the same tokens |

What can fill a tile, and what not:

| Kind | Example | Never |
|---|---|---|
| Stat | One real number at 64 to 84px | "10x", invented counts |
| Chips | Options, libraries, tags; the selected one in the accent colour | Chips with full sentences |
| Specimen | Type in 3 faces, a row of swatches with their contrast grade | Lorem ipsum |
| Object | Two stacked cards, devices drawn as outlines, the icon at three sizes | A window with traffic lights in every tile |
| Diagram | Steps with checks and one locked step; a before and after score | A mermaid chart pasted as an image |

- Neighbouring tiles differ in kind: chips next to a big number, a specimen next to an object.
- Each grid has one accent tile. Never use the same gradient in every tile.
- A real string appears once across the whole set.
- Icons come from one set at one size. The template uses Phosphor (MIT) through the Iconify API.

## Copy around the art

The images carry the story, so the Markdown stays short:
- the name, or the wordmark, and 3 to 5 badges
- the hero
- one sentence on what it does and why
- "How it works" with a bento
- "What's in the box" with a bento
- Install, in 2 to 4 lines per platform
- a commands table
- docs links on one line

Plain and professional: no slang, no hype words, no emoji bullets.

## Slop tells

| Tell | Fix |
|---|---|
| Faux app windows in every tile | One kind of picture per tile, and objects rather than windows |
| A slogan poster ("Give X superpowers") | A headline that says what it is |
| The logo cropped into a coloured block | Show the whole mark, or design the hero around it |
| Captions that wrap to one word on the last line | Shorten the caption or widen the tile |
| A tile with only a caption | Add its object, or merge it into another tile |
| Dark tiles on GitHub's white page with no light version | Render both themes and use `<picture>` |
| Text under 11px in the PNG | Design at 830 wide, 1:1, and render at 2x |

## Done when

- [ ] The hero is one PNG that reads on both themes: a headline of five words or fewer, the whole mark, no paragraph.
- [ ] Each bento has a light and a dark PNG, 5 or 6 tiles, one hero tile, one accent tile, and neighbours of different kinds.
- [ ] No `[bracket]`, `CHANGE ME` token or dashed slot is left in any image.
- [ ] Every number is real. Every caption is one line or two short ones.
- [ ] It was checked on github.com in both colour schemes, and the critic passed it.
- [ ] The social preview (1280×640) is rendered, and the user was told to upload it under Settings.

## Sources

Drip's own README redo (what the user accepted and rejected), `drip_guide productshots/bento` for the grid rules, and `drip_guide readme/visuals` for sizes, `<picture>` and rendering text.
