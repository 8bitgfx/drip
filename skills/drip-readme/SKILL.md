---
name: drip-readme
description: Use when writing, redesigning or reviewing a GitHub README or a repo's public presence ("write a README", "make the repo look good", "our README is a wall of text", "add screenshots / a demo GIF / badges", social preview, repo description and topics). Visual-first: the product working above the fold, a length budget, light/dark images, restrained badges, diagrams and tables over prose, then a rendered fit check and the critic. Part of Drip.
user-invocable: false
---

# README (Drip)

**Before you do anything: call `drip_guide` with topic `readme`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

A README is a landing page that people skim in eight seconds on a narrow column. It shows the thing
working first, says what it is in one line, and gets someone to a working install in two. Everything
else is depth for the few who scroll.

## Rules you must not break
1. **The first screen** holds: name + one-line "what it is", one visual of the product working (image or GIF), and a 2-line install or try-it. Nothing else above it but 3-5 badges.
2. **Show, don't tell.** A screenshot, GIF or diagram replaces any paragraph that describes what the product looks like or does. Prose paragraphs are at most 3 lines.
3. **Light and dark.** Every image with a background ships as a `<picture>` with a `prefers-color-scheme: dark` source, or works on both themes.
4. **Badges: 3-5**, only ones that answer a question (version, CI, licence, downloads). No badge walls.
5. **Alerts sparingly**: at most 2 `> [!NOTE]` / `[!TIP]` / `[!WARNING]` per README, for things that really bite.
6. **Depth goes in `<details>`** or linked docs, not on the main path.
7. **Diagrams are mermaid `flowchart TD`**, never `LR` (it renders tiny in the README column). Comparisons are tables.
8. **Text in images**: anything that needs a webfont is a pre-rendered PNG at 2x. An SVG inside `<img>` can't load fonts: outline the text to paths.
9. **GIFs ≤ 8 s, cropped to the action, ≤ 5 MB**, with a still poster for the first frame.
10. **No slop**: no emoji bullets, no "🚀 Features", no fake stats, no generic tagline ("A blazing-fast, modern…"). Real copy per `drip_guide copy`.
11. **Repo presence**: description, topics and homepage via `gh repo edit`; the 1280×640 social preview is a manual upload in Settings (no API). Say so to the user.
12. **Look at it rendered**: `fitcheck_shot` on the GitHub page (a pushed branch) at desktop and phone, then `critic_prepare({ kind: "any" })` → `drip:critic` → `critic_record`. Never judge from the Markdown source.

## Tools
- `fitcheck_shot` — the rendered README on github.com (branch URL) at desktop and phone widths.
- `critic_prepare` (kind `any`) → Agent `drip:critic` → `critic_record` — the independent review.
- `fitcheck_lint` — slop words and fake stats in the README text.
- `fonts_search`, `palette_check` — when a hero banner uses the brand's type and colours.
- `icons_search`, `icons_get` — one icon family if a feature table needs icons (rarely).
- `gen_image` — only for a banner background the user approved; never as a stand-in for the product.

## Read deeper when
| Situation | Call |
|---|---|
| Structure, length budget, sections, badges, alerts, `<details>`, TOC, repo settings | `drip_guide readme/anatomy` |
| Hero images, GIFs, light/dark `<picture>`, mermaid, rendering text, social preview | `drip_guide readme/visuals` |
| Capturing or staging screenshots and demo animations of the product | `drip_guide productshots` |
| The one-liner, headings and every sentence | `drip_guide copy` |
