# Drip playbook

Build from this. It covers Persuade (landing pages, product sites) and Experience (portfolios, showcases). Numbers are at 1440×900 and 390×844, and `kit/base.css` holds them (`drip_kit` copies it into the project). Everything else in Drip is a reference: read a guide only when the step needs it (`drip_guide <topic>`).

## The bar
1. Build the page a strong studio would ship this year for this subject. It says plainly what it is, shows the real thing on every screen, and sets it big. Aim at the best of the galleries; check the numbers against shipped sites (`refs_site`).
2. The failure to fear is not clutter. It is a page of small things on a wide canvas. When torn, go bigger: bigger type, a bigger picture, fewer words.
3. Finish the job: every section built and every state styled. Only material the user must supply is left as a labelled slot.

## Material and job
4. Read the project first: package.json, tokens, fonts, DESIGN.md, nearby pages. Never ask what you can look up.
5. Ask one round of at most 4 questions (AskUserQuestion). The first is always about material: what can the page show (screens, photos, the work, real numbers, a named quote)? Then `drip_brief`.
6. Write four lines: what it is, who it's for, the one action, and the material (real / pictures / absent). Never invent a number, quote, logo or customer. Anything absent is left out or becomes a labelled slot.
7. Name the mode:
   - **Persuade**: the offer and the action are clear in the first viewport.
   - **Experience**: the work itself leads from the first viewport, and the interface recedes.

## Look (fast)
8. References in two passes. **Taste** (the ideas): `refs_gallery` (Awwwards, Godly, One Page Love, Minimal Gallery…) and `refs_tag` on Dribbble's popular shots; pick the 3-4 most ambitious that fit the brief, `refs_view`, `refs_study`. **Reality** (the sizes): `refs_site` on 2 shipped sites known for their design; it measures h1, h2 and body px. Take the idea from taste, the numbers from reality. Never docs, wikis or GitHub pages: they show the default, not the bar. Studies must BE what you are building.

If `drip_start` printed PROJECT MEMORY, the project already has a master board and maybe an approved direction and rules. Fidelity mode (default): extend that system, research only what is new, `board_attach({ adopt: true, carry: true })`; the brief, the references gate, the critic and the fit check are still this task's own. Redesign mode: propose, never replace. Write what the user says about taste with `feedback_record` (scope page, feature or brand), not into chat memory. Details: `drip_guide moodboard`.

## Direction
9. Write the thesis: one sentence naming the idea this page owns and the category default it refuses. Add one sentence of physical scene (who, where, what light), and let it decide light or dark.
10. Refuse these defaults unless the brief pinned one:
    - a cream ground with a serif and a terracotta or rust accent;
    - near-black with one neon;
    - purple or blue gradients and glass;
    - Inter, Geist or Space Grotesk as the voice;
    - a hero plus three cards.

    Mirror test: would a neighbouring brief get this exact combination? If so, change one major decision.
11. Colour commits at page scale. On Persuade and Experience, use Committed (one colour on 30-60% of the surface) or Drenched (the ground is the colour) unless the brief asks for quiet. The accent is a signal on the action. A grey page with one coloured button is not restraint; it is the default.
12. Pick two faces like objects from the subject's world: a display face with a point of view and a text face (`fonts_pair`). Use one family when its range is wide.
    - Mono only inside code, a measurement or a tabular figure.
    - Never mono for labels, nav, buttons, body or headings.
    - Never more than 10% of the page's text in mono.
13. Name the signature: the subject's strongest real thing, shown at its best on the first screen. Then name how the thesis shows in each section below, in a different form each time. An idea that lives only in the hero is a sticker.

## Compose in pixels before CSS
14. `board_create` → `board_directions` with 2 directions (3 only when the brief truly forks). Each direction needs:
    - a thesis (`manifesto`);
    - a palette in role order;
    - two faces;
    - a real `headline` (8 words or fewer);
    - a concrete `picture`;
    - a `layout`.

    It renders each as a first-viewport comp at real size. The critic ranks the comps (`critic_prepare kind "directions"` → Agent `drip:critic` → `critic_record`). The user picks (`board_open` → AskUserQuestion → `board_choose`).
15. Redo a comp before showing it if any of these is true:
    - it could be any brand's hero;
    - the picture isn't the subject's real thing;
    - the headline wraps to 4+ lines.

## System (`kit/base.css`; never add a role)
16. Use exactly seven type roles (desktop / phone):

| Role | 1440 | 390 | Line height | Tracking |
|---|---|---|---|---|
| Display (hero h1) | `--t-display`, about 127px | about 48px | 0.95-1.05 | -0.03 to -0.045em |
| Statement | 72px | 40px | 1.05 | -0.03em |
| Section (h2) | 56px | 34px | 1.1 | -0.02em |
| Item (h3) | 26px | 22px | 1.25 | -0.01em |
| Lead | 21px | 19px | 1.45 | 0 |
| Body | 18px | 17px | 1.6 | 0 |
| Small | 14px | 14px | 1.45 | 0 |

    No eighth size, and nothing under 14px except the legal line. The hero is about 2× the section head, and the section head about 2× the item title.
17. Display text uses one weight, one style and one colour, with no accented word. It gets its weight from size and tracking. Use three weights at most, picked as extremes (400 with 700, or 300 with 800).
18. Labels, nav, captions, meta and tags use the text face at Small or Body size, in sentence case and untracked. No eyebrows.
19. Container: `min(100% - 2 gutters, 1312px)`, with gutters of 64 / 48 / 24. Use 12 columns with a 32px gap. Every block starts on a column line, and the left text edge is the same from the nav to the footer.
20. Spacing follows the scale 4 8 12 16 24 32 48 64 96 128 144 176. Section gaps are 96-176, mixed and earned by mass. A heading sits 16-24px above its line, and the head block sits 48-64px above its content.
21. Measure: 45-70ch on paragraphs, and a `max-width` in ch on each heading. Use `text-wrap: balance` on heads, `pretty` on body, and `tabular-nums` on figures that compare.
22. Run `drip_kit`, fill in the faces and colours, and write a DESIGN.md of about 150 words: THESIS, WORLD, STORY, FIRST VIEWPORT (h1 px and columns, picture columns and px height, where the action sits), SIGNATURE, REFUSES. Then `drip_mark system`.

## Plan the page
23. Plan 6-9 sections, hero and footer included. Write one line per section: its id, its one idea, its picture (what kind and where it comes from), its mass, and how the thesis shows there.
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
33. Eyebrows or kickers; tracked-caps labels; 01/02/03 numbering unless it's a real sequence; middle-dot meta strings; arrows glued to link text; decorative status dots.
34. Gradient text; an accented word in a head; glass or glow as decoration; purple-blue gradients; a card inside a card; three equal icon cards; the big-number-small-label hero; emoji or unicode as icons.
35. Invented stats, logos, testimonials or user counts; "Unlock / Elevate / Seamless"; "Learn more" or "Get started" as the only label.
36. Fade-up on every section; parallax on text; scroll-jacking; a marquee by reflex.

## Finish
37. `fitcheck_shot({ url })` shoots the whole page at 1440 and 390 and runs the page gate. It blocks on any of these:
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
