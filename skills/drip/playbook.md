# Drip playbook

Build from this. It covers Persuade (landing pages, product sites) and Experience (portfolios, showcases). Numbers are at 1440×900 and 390×844, and `kit/base.css` holds them (`drip_kit` copies it into the project). Everything else in Drip is a reference: read a guide only when the step needs it (`drip_guide <topic>`).

## The bar
In `taste.md` (it comes with this playbook): the job, the bar, what leads the page for each kind of business, the house rules, copy and the Never list. This playbook is the order of work for the full loop.

## Material and job
4. Read the project first: package.json, tokens, fonts, DESIGN.md, nearby pages. Never ask what you can look up.
5. Ask only what the request and the project leave open: `drip_start` lists those questions and the cap (often 0-2, never padded to 4). Material comes first when it is open: what can the page show (screens, photos, the work, real numbers, a named quote)? Then `drip_brief`.
6. Write four lines: what it is, who it's for, the one action, and the material (real / pictures / absent). Never invent a customer, quote, logo or user count: that section is left out. Prices, plans, product data and sample outputs you write yourself, realistic for the market, and list as assumptions at hand-off. No placeholders.
7. Name the mode:
   - **Persuade**: the offer and the action are clear in the first viewport.
   - **Experience**: the work itself leads from the first viewport, and the interface recedes.

## Look (fast)
8. References in two passes. **Taste** (the ideas): search by what the product IS, in 1-2 words, never the task sentence or the client's domain: `refs_search("<subject> landing page")` and `refs_gallery({ query: "<subject>" })`; for a redesign, `refs_site` the current site first to name the subject. `refs_tag` "landing page" adds well-made work from other subjects for craft. Pick the 3-4 strongest that fit the brief, `refs_view`, `refs_study`. **Reality** (the sizes): `refs_site` on 2 shipped sites known for their design; it measures h1, h2 and body px. Take the idea from taste, the numbers from reality. Never docs, wikis or GitHub pages: they show the default, not the bar. Studies must BE what you are building.

If `drip_start` printed PROJECT MEMORY, the project already has a master board and maybe an approved direction and rules. Fidelity mode (default): extend that system, research only what is new, `board_attach({ adopt: true, carry: true })`; the brief, the references gate, the critic and the fit check are still this task's own. Redesign mode: propose, never replace. Write what the user says about taste with `feedback_record` (scope page, feature or brand), not into chat memory. Details: `drip_guide moodboard`.

## Direction
9. Write the thesis: one sentence naming the idea this page owns and the category default it refuses. Add one sentence of physical scene (who, where, what light), and let it decide light or dark.
10. Refuse these defaults unless the brief pinned one:
    - a cream ground with a serif and a terracotta or rust accent;
    - effects with nothing real under them (dark, glow and blur are great; the tell is that nothing is on screen);
    - Tailwind's default indigo or purple-to-pink, untouched (gradients in the direction's own colours are welcome);
    - Inter, Geist or Space Grotesk as the voice;
    - a hero plus three cards.
    Not a default to refuse: a well-made SaaS page (generous white space, the real product UI, real photography, crisp type, blur, glow and motion from the libraries). Judge the execution, not the genre.

    Mirror test: would a neighbouring brief get this exact combination? If so, change one major decision.
11. Colour comes from the picture. The default is a calm ground (white, near-black, or a soft tint) with the colour carried by the imagery, a soft light or glow behind the hero picture, and one accent on the action. Committed or drenched grounds (one colour on 30-60% of the surface) are for briefs that ask for loud or playful. A flat page with nothing to look at and one coloured button is the real default to avoid; fix it with a picture, not a colour field.
12. Pick refined faces (`fonts_pair`): a display face with good details (a crisp grotesk, an elegant serif, a friendly rounded sans to suit the subject) and a text face. Calm and well set beats quirky. Use one family when its range is wide.
    - Mono only inside code, a measurement or a tabular figure.
    - Never mono for labels, nav, buttons, body or headings.
    - Never more than 10% of the page's text in mono.
13. Name the signature: the subject's strongest real thing, shown at its best on the first screen. Then name how the thesis shows in each section below, in a different form each time. An idea that lives only in the hero is a sticker.

## The kind of business decides the pictures
See "What leads the page" in `taste.md`. `layout_deal` deals the set for the kind; `parts_list` and `components_find` have the pieces.

## House rules
In `taste.md`.

## Compose in pixels before CSS
14. References first, then `board_create` → `board_directions` with 3 directions that are different IDEAS (not one idea in three colours). Read the gold page closest to yours first (`drip_guide examples/gold`). Each direction needs:
    - its `idea` in one line, and what it `takes` from which studied references (a decision, never only colours);
    - a thesis (`manifesto`);
    - a palette in role order;
    - two faces;
    - a real `headline` (8 words or fewer);
    - a concrete `picture`;
    - a `layout`.

    It renders each as a first-viewport comp at real size. Rank the comps yourself (the critic is a reality check on the final build, not on directions; ask it here only when the user wants it). Drop the weak ones; show the user the two strongest comps as images and let them pick (AskUserQuestion → `board_choose`). No moodboard page unless they ask for one (`board_open`). After the pick comes the design system: DESIGN.md and tokens, and on a big project (several pages, an app, many components) a living system page (`drip_kit template "system"`).
15. Redo a comp before showing it if any of these is true:
    - it could be any brand's hero;
    - the picture isn't the subject's real thing;
    - the headline wraps to 4+ lines.

## System (`kit/base.css`; never add a role)
16. Use exactly seven type roles (desktop / phone):

| Role | 1440 | 390 | Line height | Tracking |
|---|---|---|---|---|
| Display (hero h1) | `--t-display`, about 72px (up to ~120px when type alone is the picture) | about 40px | 1.0-1.1 | -0.02 to -0.035em |
| Statement | 72px | 40px | 1.05 | -0.03em |
| Section (h2) | 56px | 34px | 1.1 | -0.02em |
| Item (h3) | 26px | 22px | 1.25 | -0.01em |
| Lead | 21px | 19px | 1.45 | 0 |
| Body | 18px | 17px | 1.6 | 0 |
| Small | 14px | 14px | 1.45 | 0 |

    No eighth size, and nothing under 14px except the legal line. The hero is clearly bigger than the section head, and the section head about 2× the item title.
    Display size follows the job: when a picture carries the hero (the usual case: a product mockup, a fan of cards, a render), the h1 is calm, about 48-72px; only a hero made of type alone goes bigger. Never shout by reflex.
17. Display text uses one weight, one style and one colour, with no accented word. It gets its weight from size and tracking. Use three weights at most, picked as extremes (400 with 700, or 300 with 800).
18. Labels, nav, captions, meta and tags use the text face at Small or Body size, in sentence case and untracked. No eyebrows.
19. Container: `min(100% - 2 gutters, 1312px)`, with gutters of 64 / 48 / 24. Use 12 columns with a 32px gap. Every block starts on a column line, and the left text edge is the same from the nav to the footer.
20. Spacing follows the scale 4 8 12 16 24 32 48 64 96 128 144 176. Section gaps are 96-176, mixed and earned by mass. A heading sits 16-24px above its line, and the head block sits 48-64px above its content.
21. Measure: 45-70ch on paragraphs, and a `max-width` in ch on each heading. Use `text-wrap: balance` on heads, `pretty` on body, and `tabular-nums` on figures that compare.
22. Run `drip_kit` and fill in the faces and colours in the page's own tokens. Then `drip_mark system`. No DESIGN.md yet: the design system is written only when the user asks for it, after they have approved the design (`drip_end` offers it).

## Plan the page
23. Plan 6-9 sections with `board_plan`, hero and footer included. One line per section: its id, its one idea, the reference move it borrows (which studied page, which decision), its picture (what kind and which tool or file makes it), its mass, and how the thesis shows there. No two neighbouring sections share a layout; three sections on one layout is a template.
    - **Eye candy, planned:** two or three moments people will screenshot, each taken from a reference: a visualisation built in code from real data, a bento of live product UI, an interactive demo, a scroll or hover reveal with a reason, a big footer (wordmark, sitemap, a last call to action). Not every section is text beside a picture: vary the form.
    - **Where the parts come from:** `components_find` for the interactive and eye-candy pieces (galleries, bentos, prompt boxes, pricing, footers, charts) and build on the best one; a picture source for each picture (`images_search` with Imageory first, `art_generate`, `shader_hero`, `mockup_render` for screens, the user's own files). A gate asks for both before UI is written.
24. Every section has mass. A heading plus a paragraph is not a section: merge it or give it a picture. Mass is one of:
    - a visual 360px or taller;
    - a set of 3-4 across the width;
    - a list or table of 3+ rows across 10+ columns;
    - a working control;
    - a statement at Section size or larger.
25. Height follows content. Never pad a section toward 100vh. No screen holds more than about 160px of nothing. When a page looks empty, make the content bigger, never the gaps.
26. Aim for about 80 words per screen. The hero holds a headline of 8 words or fewer, one sentence, and one or two actions. Fullness comes from scale and pictures, never from more words.
27. Fill the pictures in this order:
    1. The user's material.
    2. Screenshots of the real product.
    3. The product or the work built in HTML at full fidelity, with realistic content labelled as synthetic. Mark it `data-visual`. For software, AI and portfolios this is the default: the work, big.
    4. `gen_image` from the direction, when there's a key.
    5. Licensed photos (`images_search`), credited in one footer line.
    6. Type at full scale, when the subject is words.

    Every section below the hero shows something, and no two picture-less sections touch.
28. Rhythm:
    - Alternate dense and calm sections.
    - Put one contrasting band (`.band`) in the second half, holding the strongest picture.
    - Calm the last third, and end on a real close that repeats the action.
29. Motion:
    - One entrance on load (`.enter`).
    - One signature moment in its own section (two on 8+ sections).
    - Nothing else moves because the page scrolled.
    - Every moving thing has a reduced-motion final state.

## Build: hero first
30. Build the nav and hero only, then `fitcheck_shot({ url, hero: true })`. It measures these, and every one must pass before any section is written:
    - the h1 is at the Display token;
    - the picture is at least 6 columns wide and at least 60% of the screen tall, or, with no picture, the h1 spans 8 or more columns;
    - an action is visible;
    - there are at most 160px of nothing under the content.
30b. Centre by eye, not by maths. The centre of a thing is where a viewer puts it: a box with drips hanging off it is centred on the box, a play triangle on its mass, a mark with a tail or sparkle on its body. Bounding boxes lie. Run `optical_center` on any mark, icon, cut-out or illustration you centre in a container, align in a lockup, or rotate/scale/swing; use the body centre it returns for the offset and for `transform-origin` (a hanging or swinging thing pivots where it attaches). Then nudge by eye: centred shapes read low, so lift them 1-3%.
31. Then build the sections in plan order. Commit every atom: buttons, links, inputs, nav and footer all speak the direction's language. Restyle library components to the tokens.
32. Floor (the kit has it; keep it):
    - Every colour and font comes from a token.
    - Every control has `:focus-visible` plus hover, press and disabled states.
    - Reduced motion is handled.
    - Touch targets are 44px.
    - Body text meets 4.5:1 contrast (`palette_check`).
    - Nothing scrolls sideways at 320px.
    - Never `transition: all`.

## Never
33. The Never list is in `taste.md`; the slop lint and the critic check it.

## Finish
37. Re-checks while fixing: `fitcheck_shot({ numbersOnly: true })` or `section: "#id"` (no screenshots, a fraction of the time and context). The full shot is for the page gate: `fitcheck_shot({ url })` shoots the whole page at 1440 and 390 and runs the page gate. It blocks on any of these:
    - text covered by a shape drawn over it;
    - more than 7 sizes or 2 families;
    - more than 10% mono;
    - body under 17px on desktop or 16px on phone;
    - an h1 under the Display token;
    - a median h2 under 40px;
    - a screen more than half empty;
    - two picture-less sections touching;
    - sideways scroll.

    Read each screen: is something on it big enough to be its reason? Squint: does each section have a shape, and does the page have a rhythm of heavy and light? Fix every miss.
37b. `drip_check({ changed: true })`: the project's own lint, types and tests, the slop lint and the reuse audit on what changed. Fix every fail.
38. The critic runs once on the full page in fresh context (`critic_prepare kind "build"`). Fix every S0 and S1, then do one confirming round. Then `fitcheck_done`.
39. Hand off (`drip_end`):
    - desktop and phone screenshots;
    - the critic's verdict in its own words;
    - what's left;
    - every assumed fact;
    - every slot, with what the user's own material should show.

## Talk
40. Lead with decisions, in 3-6 short lines per message. Show the board link and screenshots instead of describing them. Ask one question at a time with buttons. Never paste tool output.
