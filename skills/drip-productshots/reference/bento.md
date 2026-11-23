# Product shots: bento grids

A bento grid is one picture made of tiles, not five demos side by side. Most of its quality is decided before any tile is built: which tiles show UI at all, which one leads, and what sits next to what. A grid where every tile is a cropped window reads as generated however well each window is made.

## The rules

1. **Not every tile is UI.** About a third to a half of the tiles show product UI; the rest are other kinds (table below). UI is what a bento breaks up, not what it repeats.
2. **One hero tile.** One tile is bigger (two columns or two rows) and carries the main idea; the rest support it. Equal tiles only when every neighbour differs clearly in kind and weight.
3. **A UI tile shows one component, not a window.** Crop to the single thing the tile is about (the command row, the status stepper, the fee picker) at real size or larger. Window chrome appears at most once in a grid, on the hero.
4. **Neighbours contrast,** across and down like a checkerboard: picture next to number, dense next to calm, photo next to icon. Two window crops never touch.
5. **Big type is a tile.** A stat tile is one real number at 48 to 72px, a short lead ("Up to"), a one-line label, at most one coloured glyph. A short statement in large type is a tile too. Real figures only, never "10x".
6. **A stat is one line.** Number and unit never wrap apart (`white-space: nowrap`, size the number to fit, or move the unit into the lead).
7. **Copy is short and outside the picture.** A 1 to 4 word title or one sentence, at most one supporting sentence; page type at 17 to 24px, never the 12px of the UI inside. Two patterns: a run-in ("**Stay in sync.** Your files update everywhere.") or a large title alone.
8. **One frame, varied contents.** Tiles share radius, gap, padding and where the copy sits (all top or all bottom). Gap equals the tile padding or a clear fraction of it. Pick one family: rounded tiles on a gap, or a ruled grid (one container, 1px rules, no gaps).
9. **Say each thing once across the set.** No real string, avatar, colour mark or chrome repeats from tile to tile. One conversation threaded through five tiles is one signal repeated.
10. **Compose the grounds together.** A quiet grid shares one surface with one photo, accent or inverted tile as punctuation; an expressive grid can use several grounds if their lightness and temperature make a rhythm. Never the same gradient in every tile.
11. **Motion has one place to lead.** In a feature grid a tile does one small thing once as the grid enters (a number ticks, a bar fills, a toggle settles), staggered 80 to 120ms in reading order, or on hover for that tile alone. A hero grid may give its lead tile a short cursor story while the rest hold still.
12. **Each tile's picture is designed at its own width,** shown 1:1. Never one scaled canvas for the whole grid: it shrinks every tile's type with it.
13. **Narrow, it recomposes.** Two columns only while each tile stays readable; a phone column stacks, hero first. Each UI picture gets a compact composition; important text stays ≥ 10px at a 320px viewport.

## Kinds of tile

| Kind | Holds | Example |
|---|---|---|
| **Hero UI** | The one real screen, cropped per `productshots/frames` | Checkout, a conversation, the editor |
| **One component** | A single control or panel at real size or larger, cut by the tile | A command row, a keycap set, a locale picker |
| **Stat** | One big number, a lead, a label, maybe one glyph | "Up to 18 hrs" battery, "14m" left on SLA |
| **Statement** | One sentence in large type, an icon in colour | "Works offline." |
| **Object** | A product, a card, a chip, a keycap, lit from one side | A payment card, a device |
| **Diagram** | An abstract picture of what the feature does | Nodes and lines, a heatmap, a sync fan-out |
| **Collection** | Many small marks bleeding off an edge | Integration logos, file thumbnails |
| **Photo** | A real, licensed photo with type over its quiet part | The product in use |

A grid of five usually wants: one hero UI, one or two components, one stat or statement, and one object, diagram or collection.

- **Objects:** one light source, a real material (matte falloff, glass rim), a shadow that agrees with neighbouring tiles. A payment card keeps real anatomy: the chip about an eighth of the card's width, a third of the way down; number and name along the bottom; network mark bottom-right.
- **Diagrams:** one stroke weight in the grid's own ink; hold still or pulse slowly along lines while "live".
- **Photos:** real and licensed (`images_search`), never a scene drawn in CSS or SVG pretending to be a photograph. A landscape photo rarely suits a tall tile with copy on top.

## Layouts

| Layout | Shape | Use for |
|---|---|---|
| **Hero and strip** | A row of 2/3 + 1/3, then three equal tiles | The default for five or six features |
| **Big square** | Four columns, a 2x2 hero, small tiles round it | Many features, one flagship |
| **Staggered pair** | Two columns, tall and short tiles alternating, offset | Four to six claims with photos |
| **Even grid** | 3 x 2 equal tiles | Only when every neighbour is a different kind |
| **Ruled** | One rounded container, 1px rules, no gaps, mixed spans | Technical and developer pages |

Every width is its own design. At each width each picture lines up with its tile's copy: left edge on the copy's gutter and either a matching gutter on the right or a clear crop off the right or bottom. Never centre a picture that is nearly as wide as the tile.

## Plan the grid before building

| Tile | Span | Kind | The one thing | Words |
|---|---|---|---|---|
| Inbox | 2 x 1 | Hero UI | One conversation arriving, selected | "Shared inbox" + one sentence |
| SLAs | 1 x 1 | Stat | "14m" left, in the warning colour | "Never miss a reply." |
| Assign | 1 x 1 | Component | The assignee menu, one person checked | "Assignments" |
| Drafts | 1 x 2 | Component | A draft reply and its Send button | "Drafts in your voice." |
| Integrations | 1 x 1 | Collection | Real app marks bleeding off the right | "Works with your tools." |

Then check the plan: how many tiles are UI (a third to a half)? Which is the hero? Does any tile touch the same kind? Does any real string appear twice? Then build, and inspect each tile at the widest and narrowest host widths.

## Building it (React + Tailwind v4)

```tsx
<section className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
  <article className="col-span-2 row-span-1 overflow-hidden rounded-3xl bg-surface p-8 max-md:col-span-1">
    <h3 className="text-xl"><b>Shared inbox.</b> <span className="text-ink-2">Every customer thread in one place.</span></h3>
    <div className="relative mt-6 h-72">{/* hero UI picture, its own design width, bleeding off right and bottom */}</div>
  </article>
  <article className="rounded-3xl bg-surface p-8">
    <p className="text-sm text-ink-2">Time left on SLA</p>
    <p className="mt-2 whitespace-nowrap text-6xl tabular-nums tracking-tight text-warning">14m</p>
    <h3 className="mt-6 text-xl">Never miss a reply.</h3>
  </article>
  {/* … */}
</section>
```

Copy is page HTML beside the picture, never inside the picture's image role. Each picture measures its slot and composes for it (container queries work well).

## Bento slop tells

| Tell | Fix |
|---|---|
| Six tiles, each a tiny window with traffic lights | One hero window; the rest components, stats, objects |
| Every tile: icon in a tinted square + title + two grey lines | Each tile shows a specific moment of the product |
| Same purple-blue gradient behind every tile | One shared surface with one punctuation tile |
| "10x faster" stat tile | A real, measured figure with its unit |
| Stat pinned to the bottom of a tall tile with a void above | Number close under its copy, or filling the tile |
| Copy at the top in some tiles, bottom in others | One position for every tile |
| Every tile animates in a loop | One lead motion; the rest still or on hover |
| Whole grid scaled as one image to fit the column | Each tile designed at its own width |

## Check

- [ ] A third to a half of tiles are UI; one hero; no neighbouring windows.
- [ ] No string, avatar or chrome repeats across tiles.
- [ ] Shared radius, gap, padding and copy position; one tile family.
- [ ] Stats are real and on one line; tile titles 17 to 24px.
- [ ] One place leads motion; reduced motion holds every tile still.
- [ ] Each tile reads at the narrowest host width.
