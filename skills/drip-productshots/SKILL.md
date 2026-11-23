---
name: drip-productshots
description: Use when making faux or mocked product UI as an illustration: hero product shots, feature-card and bento-tile pictures, docs heroes, browser/app/phone frames, notifications, terminals, chat threads, cropped and masked screenshots, and animated product demos with a moving cursor. Triggers on "mockup", "product shot", "fake UI", "demo animation", "walkthrough", "bento", "browser frame", "phone frame", "cursor animation", even when nobody says "faux UI". Part of Drip.
---

# Product shots (Drip)

**Before you do anything: call `drip_guide` with topic `productshots`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Write the plan before code: where it sits (width, ground), the one focal object, the one thing that happens, the payoff, what is left out.
2. It reads as a real product, simplified: full structure in quiet greys, real words only on the 3 to 7 strings the story is about, placeholder bars for the rest. Simplify the words, never the context.
3. One hero object, at most one or two satellites of different kinds (a card and a notification, never two cards of one width). Satellites straddle the hero's edge about half outside.
4. Crop with intent: the hero fills at least two thirds of the stage and runs 10 to 40% off an edge. Never a whole window shrunk into a card with even air on four sides.
5. Crop only filler. Every real word, the action, what the cursor touches and the payoff stay whole; nothing labelled is sliced by the stage edge.
6. One gutter: the hero's inset from the stage edge, and every other edge distance in the frame matches it, or is clearly past it. No near-misses of 1 to 20px.
7. Design at the size it is shown, 1:1: UI text 11 to 15px, never under 10px. A phone-column version (about 358px wide) is a redesign, not a squeeze.
8. Real chrome, real geometry: browser chrome only when the browser matters; app windows get their platform's chrome; phones keep true status bar, notification and island proportions. Never draw device chrome from memory.
9. Icons from one set at one size and stroke; real logos only (in their real colours); no invented letter-in-a-square logos; no sparkles, wands or purple as shorthand for AI.
10. Animated demos: 3 to 5 beats, 10 to 16s loop, every cursor move explained, the cursor never covers the words it clicks, nothing pops in or out, the payoff holds 2s, the loop resets with a visible cause.
11. A poster frame that tells the story on its own (thumbnail, reduced motion, screenshot); under `prefers-reduced-motion` show it still. Pause off screen.
12. Faux UI is a picture: `role="img"` with an `aria-label` describing what it shows, no real headings inside, not focusable. Check with `fitcheck_shot` at both widths and end with `fitcheck_done`.

## Tools
- `refs_search`, `refs_tag`, `refs_view` — study product shots on real marketing sites ("feature card ui", "bento grid", "hero product screenshot") before framing.
- `components_find`, `components_get` — real UI primitives (table rows, menus, toasts, avatars) to build the screen from; the project's own components first.
- `icons_search`, `icons_get` — one icon family for the whole scene.
- `images_search`, `images_save` — licensed photos and avatars when the scene needs them; `gen_image` for artwork inside a scene (album art, thumbnails) only.
- `gradient_mesh` — a colored ground behind a brand-moment shot, never as filler.
- `fitcheck_shot`, `fitcheck_compare`, `fitcheck_done` — the still at both widths, side by side with references, final verdict.

## Read deeper when
| Situation | Call |
|---|---|
| Browser, app, phone, notification and terminal frames; crops, masks, satellites, layouts | `drip_guide productshots/frames` |
| A grid of feature tiles (bento) | `drip_guide productshots/bento` |
| Any animation: cursor walkthroughs, loops, typing, drags, rolling numbers | `drip_guide productshots/animated-demos` |
| Where the shot goes on the page | `drip_guide landing` |
| Easing and choreography in general | `drip_guide motion` |
