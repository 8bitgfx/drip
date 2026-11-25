# Drip fast loop

The order of work for a page in about ten minutes. What good looks like is in `taste.md` (it comes with this): read both.

## Roles
- **You direct** (the session's model; Opus is best): look, decide, choose the pieces, write the specs, judge the shots, fix small things (under 40 lines) yourself. A bigger write by you is refused with a pointer to a builder.
- **drip:builder** (Sonnet) writes the code of one section on its piece. Several run at once, launched in ONE message.
- **drip:helper** (Haiku) does one small job from a one-paragraph brief: save pictures, swap copy, an install, a numbers-only check.
- **drip:critic** (Sonnet) reviews the final version, or when the user asks. It is slow: what you can see, fix yourself.

## The words
- **piece**: a finished component from a proven library. Find with `components_find({ need })` (~3,300, landing and app), look with `pieces_preview` (one sheet), install with `pieces_install`. taste-skill's plain-HTML pieces use `parts_list` / `parts_preview` / `parts_get`.
- **the deal**: `layout_deal` picks the hero layout, palette, type and a shortlist of pieces per section, and writes the page. React + Tailwind for software, gaming and tech (so React pieces install as they are), one static page otherwise; `stack` overrides, `surface: "app"` deals app pieces.
- **the turn**: the whole page is built in one turn and shown finished. The hero gets its own check before the sections (an inner checkpoint, not a stop). Only when the user asks to see the hero first ("hero first", "step by step") do you stop after it.

## The hero
1. **Look (one message).** `refs_site` on 3-4 shipped sites people compare this with, or the best in the category (plus the client's current site with `before: true` for a redesign), and `refs_gallery` for the pattern. Write down two or three decisions you take, and from which site.
2. **Deal (same message).** `layout_deal({ kind, trade, has, out: "<new folder>" })`.
3. **Choose by eye.** `pieces_preview` the candidates for the hero and nav (the shortlist, or better ones from `components_find`). Pick what shows the product best (see "What leads the page" in taste.md).
4. **Build.** `pieces_install` the chosen pieces in one call, then ONE `build_prepare({ sections: [{ section: "hero", spec, piece, from }, { section: "nav", ... }] })` and launch its builders. `from` says what the hero takes from which reference. The tool refuses until you have looked at 4 references and previewed pieces.
5. **Check once.** `drip_serve`, then `fitcheck_shot({ url, hero: true })`. Anything it calls BROKEN is fixed before going on; numbers get one edit, not a round. Then straight on to the sections (unless the user asked to see the hero first).

## The sections
6. A one-line spec per section: its idea, its piece, its picture, its motion; no two neighbours alike. **Each section shows a different real picture.** The client's site rarely has enough: `images_search`, make them (`art_generate`, `gen_image`, `mockup_render`), or ask the user for their own work. One picture repeated across the page is blocked by the page check. `pieces_install` once, ONE `build_prepare` with every section, every builder in ONE message.
7. `page_stitch` once when they finish (later shots re-stitch by themselves). `fitcheck_shot({ url })` once; fix what matters in one pass (a 1-2% number is not worth a round). Show the page, `drip_end`: it closes the film and opens the montage for the user.

## Rules the tools enforce
- No UI before a look and a deal. No builder before 4 references and a pieces preview. Every section names its piece; homemade only as `custom: product-ui | data | brand-art | tiny | searched <what>` (see "Pieces before homemade" in taste.md). A builder never swaps its piece for a homemade one.
- A turn can't end with UI changed after the last `fitcheck_shot`.
- Nothing invented: unknown numbers and quotes are `[brackets]`.

## Talk and memory
Short: one line of assumptions at the start, the finished page at the end. When the user reacts ("love the cards", "too dark"), `feedback_record` it: the project and any niche pack in use remember it.
