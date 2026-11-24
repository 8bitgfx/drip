# Reference sources, components and type (the "inspire" tools)

This page covers the tools that widen where Drip looks for references, and the type tools that go with them.
Code: `mcp/src/modules/inspire/` (sources), `mcp/src/modules/assets/typecompare.mjs` and `wordmark.mjs` (type).
Dribbble (`refs_search`, `refs_tag`, `refs_feed`, `refs_designer`) and shipped-site study (`refs_site`) are unchanged.

## Tools

| Tool | What it does |
|---|---|
| `refs_gallery({ query, source?, kind?, limit?, page?, sheet? })` | Searches one or several sources, mixes the results one by one, returns a numbered list and a contact sheet. Numbers (`L4-7`) go into `refs_pick`, `refs_view`, `refs_study`, `board_add`. |
| `refs_sources({})` | Lists every source: what it returns, whether it needs a key, whether it worked in this session, and the ones that cannot be used from a script. |
| `catalogue_rank({ stack, fit, category, limit })` | Ranks the curated component libraries by stack, design fit and quality. |
| `fonts_compare({ fonts, text, body, sizes, weights })` | Candidate faces on one sheet with your real copy, plus numbers read from the font files. |
| `wordmark_build({ font, text, weight, tracking, kerning, ligatures, ... })` | Outlined SVG wordmark with an editable spec and per-pair kerning. |

`kind` for `refs_gallery`: `site` (default), `section`, `component`, `motion`, `image`.

## Provider contract

A provider is a plain object (`mcp/src/modules/inspire/contract.mjs`, `providers/index.mjs`):

```js
{ id, label, kinds: ["site"], status: "works" | "feed" | "needs-key", needsKey?,
  search(query, { kind, limit, page, config }) -> Promise<Item[]> }
Item = { key: "<id>:<local id>", title, url, image, author, source, tags, kind, ...extra }
```

`live` (the site's own address), `copy` (hero text) and `feed` (not a text match) are optional extras. `refs_gallery`
turns each item into the shape the refs tools already use (`key`, `source`, `id`, `title`, `url`, `image`, `designer`,
`designerUrl`, `tags`, `from`) and files it with `rememberListing`, so the tagged numbers work everywhere a Dribbble number does.
`registerProvider(p)` adds or replaces a provider (tests use it for stubs); `status: "feed"` means the source has no
text search, so items are ranked by title match and the rest follow as "latest".

All page reads go through `core/http.mjs` (spaced per host, cached 6 hours, the configured user agent). A site that answers a
script with 403 or a check page raises a plain error; Drip does not work around it.

## What was tried (live, 2026-11-24)

| Source | Result | How it is read |
|---|---|---|
| Awwwards | works | `awwwards.com/websites/?text=` : each card carries its data as JSON in an HTML attribute |
| One Page Love | works | its own MCP endpoint `api.onepagelove.com/mcp` (free beta, no key): `search_inspiration` (sites with hero copy) and `search_sections` (pricing tables, FAQs, footers...) |
| Minimal Gallery | works | WordPress REST `wp-json/wp/v2/posts?search=`; the search needs every word to hit, so with no match the latest are shown (flagged) |
| 21st.dev | works | `21st.dev/s/<query>`: the listing JSON inside the page: component name, author, description, preview image. Items are kind `component`. No key used |
| Httpster | feed | latest sites; no text search |
| Dark Mode Design | feed | latest dark sites; no text search |
| Godly | feed | animated UI items (kind `motion`); the search endpoint returns a server error, so the feed is filtered by title |
| Are.na | needs a key | the API answers 401 without a token. Set `ARENA_TOKEN` (or `arena` in `~/.drip/keys.json`). Written against the documented v3/v2 shapes, **not verified live** |
| Land-book | not usable | HTTP 403 to scripted requests (a Cloudflare check). Open it in your own browser |
| Lapa Ninja | not usable | same |
| Siteinspire | not usable | HTTP 429 and a Vercel security check |
| Behance | not usable | HTTP 403 on public search; the API needs a client id |
| Mobbin | not usable | the screens load only after login in a script-rendered app |

What each is good for is in the refs guide (`drip_guide refs/sources`). The Awwwards MCP (`Gsta/awwwards-mcp`) was read for ideas
only: it needs its own index and Playwright, and Drip already has a browser, so Awwwards is a small adapter instead of a dependency.
21st's Magic MCP (`21st.dev/api/mcp`) needs an API key; the public pages give what a reference needs, so it is not used.

## The study loop for components

`refs_gallery({ kind: "component" })` finds components (21st.dev), `refs_view` and `refs_study` record what the behaviour and
structure teach, then you build your own version on the project's primitives (Radix, React Aria, Base UI) and tokens.
Items from a paid listing carry the tag `pro`; the preview image is what is studied.

## Type

### fonts_compare

Fonts are open font families (Fontsource, by name) or local `.ttf` / `.otf` / `.woff` files; they are embedded in the page as
data, so the sheet shows what the file draws. Numbers come from the files with opentype.js:

| Number | How |
|---|---|
| x-height, cap height | bounding boxes of `x` and `H`, as a fraction of the em |
| width per em | mean advance of `a-z` (under 0.47 narrow, over 0.56 wide) |
| stem | thickness of the `l` stem at mid height |
| stroke contrast | thick (the `o`'s side strokes) over thin (its top and bottom), scanned on the outline: under 1.15 monoline, over 2.5 high contrast |

`woff2` files cannot be read for metrics; use the `.ttf` or `.woff` of the same font. Fontsource static weights are used; the
nearest weight the family has is picked when yours is missing.

### wordmark_build

Writes `.drip/wordmarks/<name>/wordmark.svg` (one `<path data-char>` per letter, tight viewBox), `wordmark.json` (the editable spec,
`version: 1`) and `preview.png` (large, 64/32/18 px, reversed). Tune with `from: "<name>"` plus only what changes; kerning pairs merge.
Units: tracking and kerning are thousandths of an em (negative = closer). The gap report is bounding box to bounding box; it points at
pairs to look at, and round letters sit closer than straight ones by design, so judge by eye at small sizes.
Limits: kerning comes from the font's `kern`/GPOS data as opentype.js reads it; ligatures use `stringToGlyphs`; there is no full
OpenType shaping (contextual alternates, stylistic sets).

## Catalogue ranking

`data/catalogue.json` entries gained `fit` (design-fit tags such as `saas`, `dashboard`, `editorial`, `motion`, `accessible`) and
`quality` (1-5, Drip's own judgement). `components_find` ignores both. The `references` list gained the new sources with a `provider`
id. `rankEntries()` in `modules/inspire/rank.mjs` scores stack match, fit overlap and quality; `catalogue_rank` exposes it.

## For the coordinator

- `board_add` guesses a ref's kind from its first character: `3` and `#3` become a shot, but a tagged number like `L4-7` becomes a **font**
  unless `kind: "shot"` is passed (true for Dribbble listings too). A one-line fix in `modules/board/index.mjs`: treat `/^L\d+-\d+$/i` as a shot.
- `refs_view` of a non-Dribbble key asks Dribbble for a shot page, fails, and falls back to the listing image ("Details unavailable..."), which still counts as viewed. It works, but you see the listing-size picture only. `viewOne` in `modules/refs/index.mjs` should skip Dribbble when `known.source !== "dribbble"`, show `known.images` (One Page Love items carry a 1400 px version there) and the `live` / `copy` fields.
- Tests: `mcp/test/inspire.test.mjs` (offline); live checks with `DRIP_NET=1`.
