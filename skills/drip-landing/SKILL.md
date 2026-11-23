---
name: drip-landing
description: Use when building, redesigning, restyling or reviewing a landing page, marketing site, company or product homepage, launch or waitlist page, pricing page, or any page whose job is to make a stranger understand an offer and act (hero, features, how it works, social proof, pricing, FAQ, CTA, footer). Also use when someone says a site looks generic, templated or "AI-made". Part of Drip.
user-invocable: false
---

# Landing pages (Drip)

**Before you do anything: call `drip_guide` with topic `landing`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Write the copy and a page plan first: one line per section with its one idea, its picture and its height in screens. No markup before the plan.
2. The h1 names what is sold and for whom in 2 to 8 plain words. The first screen holds one hard fact: a price, a number, a date or a place. No slogans or riddles.
3. The hero owns the first viewport (`min-height: 100svh` at most), holds at most two actions, and its picture is the product, place or work itself. No gradient blobs, abstract 3D or mood stock.
4. One idea and one h2 per section. Every section shows something real (product UI, a photograph, a diagram); two picture-less sections never sit next to each other.
5. Software shows its real UI big, once, as an app window across the content width, within the first three sections. Feature cards show cropped fragments of that UI.
6. Proof comes only from real material: named quotes with faces, customer logos you may show, sourced figures. Never invent testimonials, stats, logos, ratings or user counts.
7. The main action has one wording everywhere (nav, hero, close, phone bar), is a verb plus an object, and is the only filled button on its screen. Never "Learn more".
8. One container (max 1200 to 1280px), one 12-column grid, equal left and right edges. Text blocks start on the left line; nothing centred wider than half the container except a centred hero.
9. A card layout appears at most twice per page and never twice in a row. Three equal icon cards is not a feature section.
10. No dark patterns: no fake countdowns or scarcity, no pre-ticked consent, no confirmshaming, no hidden prices, cancelling as easy as joining.
11. Motion: the hero enters once, one signature moment per page (two on a long page), every link answers hover and press. No fade-in on every section; everything rests under `prefers-reduced-motion`.
12. Check at 1440, 1024, 768, 390 and 320 wide with `fitcheck_shot`, run `fitcheck_lint`, and end with `fitcheck_done`.

## Tools
- `refs_search`, `refs_feed`, `refs_view` — study 8+ real landing pages in the same category before planning; note what each hero and section does.
- `board_create`, `board_add`, `board_directions` — cluster the picks into 2 to 3 directions before choosing a look.
- `images_search`, `images_save` — real photography with licences; `gen_image` only for art direction the brief asks for.
- `components_find`, `components_get` — nav, pricing, FAQ and footer primitives to restyle instead of hand-rolling.
- `fonts_pair`, `palette_generate`, `palette_check` — the type pairing and accent with contrast checked.
- `fitcheck_shot`, `fitcheck_compare`, `fitcheck_lint`, `fitcheck_done` — screenshots at real widths, side by side with the chosen direction, slop lint, final verdict.

## Read deeper when
| Situation | Call |
|---|---|
| Choosing, writing or building the hero | `drip_guide landing/heroes` |
| Building any section below the hero (features, how it works, proof, FAQ, close, footer) | `drip_guide landing/sections` |
| Pricing, plans, comparison tables, forms and conversion without dark patterns | `drip_guide landing/pricing` |
| Product UI pictures in the hero or feature cards | `drip_guide productshots` |
| Headlines, buttons and microcopy | `drip_guide copy` |
| Photographs and illustration | `drip_guide imagery` |
