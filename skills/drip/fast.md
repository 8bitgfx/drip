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
2b. **Ask once** (see "The questions"), then `drip_brief` with the answers. Building waits for them, unless the user said not to ask.
3. **Choose by eye.** Search for every section's need in ONE `drip_execute` (see Code Mode below), then ONE `pieces_preview` with the best candidates for the hero and nav (and the sections, if you build them in this turn). Pick what shows the product best (see "What leads the page" in taste.md).
4. **Build.** `pieces_install` the chosen pieces in one call, then ONE `build_prepare({ sections: [{ section: "hero", spec, piece, from }, { section: "nav", ... }] })` and launch its builders. `from` says what the hero takes from which reference. The tool refuses until you have looked at 4 references and previewed pieces.
5. **Check once.** `drip_serve`, then `fitcheck_shot({ url, hero: true })`. Anything it calls BROKEN is fixed before going on; numbers get one edit, not a round. Then straight on to the sections (unless the user asked to see the hero first).

## The sections
6. A one-line spec per section: its idea, its piece, its picture, its motion; no two neighbours alike. **Each section shows a different real picture.** The client's site rarely has enough: `images_search`, make them (`art_generate`, `gen_image`, `mockup_render`), or ask the user for their own work. One picture repeated across the page is blocked by the page check. `pieces_install` once, ONE `build_prepare` with every section, every builder in ONE message.
7. `page_stitch` once when they finish (later shots re-stitch by themselves). `fitcheck_shot({ url })` once; fix what matters in one pass (a 1-2% number is not worth a round). Show the page, `drip_end`: it closes the film and opens the montage for the user.

## A new round
When the user asks for a big change to the finished page ("make it 10x better", "it's boring", "redo it"), that is a new round, not a touch-up: look again at sites that are clearly better at what's asked, search and preview pieces for each upgrade, and build them through builders. "Better" means bigger real pictures, a stronger composition and finished pieces, never stacked effects (glow, grain, shine sweeps, tilt on everything, a coloured word in the headline). The write gate holds until the look and the search are done. UI is never written from the shell while a task is open.

## The questions
One `AskUserQuestion` round, after the look and the deal (so the options come from real work), before anything is built. Two to four questions, only what the request leaves open, each with clickable options and your recommendation first:
- **Direction:** two or three looks you could build, each named after what it takes from a studied site ("a calm gallery like Krea", "bold outputs like Recraft"), with a one-line preview of the hero.
- **What stays:** for a redesign, what they love and hate about the current one (brand, layout, a section).
- **Material:** what real outputs, screens or photos they can give, or whether you should find or make them.
- **Scope:** which sections or screens, when the request is vague.
The answers steer everything after; without them the page lands on the safe default.

## Code Mode: many calls, one round trip
Whenever you'd make three or more similar calls, write them as one `drip_execute` script: it calls Drip tools as `await drip.<tool>(args)`, loops, and returns only what you need, so the results don't flood your context and you don't wait for each round trip. `drip_search({ query })` gives exact argument names. Each call returns `{ text, data?, images }` and throws on errors (wrap in try/catch to carry on).

Use it for:
- **A component search per section** (step 3 and step 6):
  ```js
  const needs = { hero: "fan of image cards", features: "bento of live product UI", proof: "testimonial wall", pricing: "pricing with monthly/yearly toggle" };
  const out = {};
  for (const [s, need] of Object.entries(needs)) {
    const r = await drip.components_find({ need, limit: 4 });
    out[s] = r.text.split("\n").filter((l) => l.startsWith("- [")).slice(0, 3);
  }
  return out; // then ONE pieces_preview with the best of each
  ```
- **Pictures for every section:** one script that runs `images_search` per section and `images_save` for the best of each.
- **References:** `refs_site` on several sites, then `refs_study` on what came back, in one script.
- **Re-checks:** `fitcheck_shot({ url, numbersOnly: true, section })` for several sections, returning only the blockers.

Not in a script: anything you need to look at as a picture (`pieces_preview`, a full `fitcheck_shot`): call those directly, once.

## Rules the tools enforce
- No UI before a look, a deal and the user's answers (unless they said not to ask). No builder before 4 references and a pieces preview. Every section names its piece; homemade only as `custom: product-ui | data | brand-art | tiny | searched <what>` (see "Pieces before homemade" in taste.md). A builder never swaps its piece for a homemade one.
- A turn can't end with UI changed after the last `fitcheck_shot`.
- Nothing invented: unknown numbers and quotes are `[brackets]`.

## Talk and memory
Short: one line of assumptions at the start, the finished page at the end. When the user reacts ("love the cards", "too dark"), `feedback_record` it: the project and any niche pack in use remember it.
