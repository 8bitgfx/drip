# Product shots

A good product shot is a miniature of the real product, framed like a photograph. The viewer recognises the screen at a glance and sees one thing happen in it. It is full and structured, but only the words the story is about are real; the rest is quiet placeholder. It is cropped with intent, so the eye lands on the action and the result, and it sits on the page's own ground instead of floating in a box. Five ways it fails: **too much** (real text and numbers everywhere, which reads as generated), **wireframe** (two grey blobs and a button), **boxed** (a whole window shrunk into a card with even margins), **flat** (every object the same weight, nowhere for the eye to land), and **bland** (a grey window with a cursor, whatever the brief's look was). The bar is the product imagery on Linear, Stripe, Vercel, Raycast and Apple feature pages.

## The procedure

1. **Plan in five lines:** where it sits and at what width (hero beside copy, full-width hero, feature card, bento tile, docs hero); still or animation (loop, plays once in view, on hover); the focal object; the one thing that happens and its payoff; what is left out. If there is no Drip task, call `drip_start`.
2. **References.** `refs_search` "product screenshot hero", "feature card ui", the category's leaders; `refs_view` 6 to 10 shots. Note crop, scale, how much is real text, what the satellites are.
3. **Pick the layout** from the table below before building the screen; the crop decides how big type must be and what must exist past the edge.
4. **Choose the look and fidelity.** Map the product's real tokens (colours, radius, type, icons) when you have them. Fidelity: *minimal* (all bars), *standard* (real words where they carry meaning, bars elsewhere; the default), *realistic* (real content everywhere; for full-width heroes and named real products).
5. **Build the screen** at real size from real parts: the project's own components first, then `components_find`. Count the real strings: usually 3 to 7. Fit every control's text before anything moves.
6. **On a device, use real hardware:** `mockup_render` puts the screen you built (an .html file or its screenshot) on a real iPhone or Studio Display model, or a clean slab, with studio light and a look; never draw a device frame from boxes in HTML or 3D primitives.
7. **Frame it:** crop, gutter, satellite, shadow, ground. Screenshot the still with `fitcheck_shot` at the shown width and at the phone width; compare with the references (`fitcheck_compare`). Fix framing before motion.
8. **Animate** only if the brief wants motion (`productshots/animated-demos`): set the poster first, then the beats.
9. **Verify** with the checklist below, then `fitcheck_done`.

## The craft

### Sizes

| Placement | Design size (shown 1:1) | Notes |
|---|---|---|
| Hero beside copy | ~720 x 340 to 640 x 480 | Corner bleed layout |
| Full-width hero | 900 to 1100 wide | Realistic fidelity, inset top, off the bottom |
| Feature card | ~400 x 300 | Pinned, bottom bleed |
| Lone card in a 680px article column | 500 to 560 wide | So its text reads at 15 to 20px |
| Bento tile | The tile's slot width | One component, not a window |
| Phone column | 358 wide (in a 390 viewport) | A recomposed `compact` version |

Never scale a 1440 screenshot down into a 400px card: the type becomes 6px and the shot becomes texture.

### Layouts

| Layout | Hero position | Satellite | Use for |
|---|---|---|---|
| **Corner bleed** | Inset ~10% top and left, 15 to 35% past right and bottom | Straddling the left or bottom edge | Heroes beside copy |
| **Pinned, bottom bleed** | Inset 8 to 12% left, right and top; 15 to 35% past the bottom | Optional, straddling a side | Feature cards, bento tiles |
| **Wide hero** | 900 to 1100px window, inset top, off the bottom (and often the sides) | A card or thread on its lower edge | Full-width homepage heroes |
| **Stage with gutters** | Inset 8 to 20% each side on a coloured ground, off the bottom | One side | Brand moments |
| **Satellite focus** | Cropped hard, mostly context | Large (30 to 40% of hero width), carries the story | One small thing: a notification, a receipt, a diff |
| **Close-up** | The whole window at 1.3 to 1.6x, chrome included, off the bottom | None | A card about one control or setting |
| **Device pair** | Desktop window ~75 to 80% wide, off the bottom | Phone straddling the right edge, a third outside | One event on two devices |
| **Fade crop** | Window inset top and sides, fading out over its last third | Optional | When any hard crop line would look arbitrary |
| **Many of one** | A grid of one small thing, off every edge, one in focus | None | Templates, deploys, sessions: scale by repetition |

### Restraint

- **Word budget, not element budget.** A calendar needs a populated week; a search needs results. Keep the structure, spend real words only on the title, the thing acted on, what is typed and the result.
- **Placeholder bars** sit in the same line box as the text they replace, at varied widths (60, 45, 70, 52%), never where the eye lands.
- **Where the story touches a list:** two or three real rows, at most as many bars.
- **One big number;** the rest are lines.
- **Keep the domain's signature content:** album art in a music app, thumbnails in a file browser, avatars in chat. Swapping it for bars makes a generic list.
- **No fake masthead.** A fictional product doesn't need a logo, a nav and a sidebar in every crop; crop to the story.
- **The heaviest marks sit on the story;** never a heavy underline under a grey bar.

Do: an inbox with nine rows where the selected one has a real sender, subject and time, the rest bars, and the reply pane open with a real draft. Don't: nine fully written rows with timestamps, labels, avatars and badges on every one.

### Fidelity and content that sounds real

| Fidelity | Real words | Use for |
|---|---|---|
| Minimal | None; all bars and shapes | Tiny tiles, diagrams of structure, loading states |
| Standard | The 3 to 7 strings the story is about | Most heroes and feature cards |
| Realistic | Plausible content everywhere, still with room to breathe | Full-width heroes, a named real product, a still whose subject is a list or page |

- **Choose names, emails and values whose length fits the layout:** no truncated chips, wrapped names or ragged labels unless the brief fixes the copy.
- **Plausible, not decorative:** totals that add up, dates in sequence, prices in the market's currency with real-looking endings (3.60, not 4.00), names that fit the product's market.
- **Demo data is design material, not a claim.** It may be invented inside the product picture; it never becomes a figure the page claims about the business (customer counts, revenue, ratings).
- **The product's own words:** use its real labels, statuses and menu items when you have them; read the real app or its docs first.

### Spacing and type inside the shot

| Rule | Value |
|---|---|
| Words inset from any window, card or row edge | 12px (never under 8) |
| Row padding | 12px, 8px dense |
| Title over subtitle | 4 to 6px of ink between lines |
| Button from the field or line above | 8 to 12px |
| Gap between text and a neighbouring box | 8 to 12px, fixed `gap`, never leftover `space-between` |
| Edges that nearly meet | Align exactly or part by ≥ 8px; 1 to 3px apart reads as a mistake |
| UI text | 11 to 15px, line-height ≥ 1.3; sentence case; one family |
| Nested radius | Outer = inner + padding |

- Centre labels on the letters (`text-box: trim-both cap alphabetic` where supported) so text beside icons and inside pills doesn't sit low.
- A centred amount centres its digits; the currency sign hangs outside.
- Faux app titles are `div`s, never `h1` to `h6`: the shot lives inside someone else's page outline.

### Colour, depth and grounds

- One neutral family for window, sidebar and cards; five inks and one accent to start; status colours only for status.
- **The page is the ground.** On a white or dark page there is no plate or tinted box behind the window; it bleeds or fills. A coloured stage is a deliberate brand moment with the window inset 8 to 20% from the sides.
- **Shadows by role:** one hero shadow for every hero window on the page; a tighter satellite shadow (a wide blur smears on a white window); a hairline plus a long faint fall for a lone card on the ground. On dark themes, depth comes from a lighter surface, not shadow.
- **Nothing translucent overlaps** (stacked avatars and chips are opaque).
- Don't outline the hero object with an accent ring and halo to point at it; lift it with its own surface and the raised shadow.
- A gradient or glow serves the story or goes. Use `gradient_mesh` only for a brand-moment ground.

### Icons, logos, people

- The product's own icon set first; otherwise one chosen set (Phosphor, Radix, Tabler, Heroicons, Lucide deliberately; SF-style glyphs for Apple chrome, Material Symbols for Android), one size (14 to 16px) and stroke. Small icons (≤ 14px) filled.
- Other companies' logos are their real marks in real proportions and colours (`icons_search`); never a look-alike.
- No invented logo for a fictional product: a plain text wordmark.
- Avatars: real photos with licences (`images_search`) or coloured initials; names from the brief or plausible for the product's market, never the default cast every model reaches for.

### Frames (summary; depth in `productshots/frames`)

- Browser chrome only when the browser is part of the story (a website, an extension); otherwise the app's own chrome.
- Window chrome bar ~38px with traffic lights on macOS; a tall toolbar (~52 to 64px) only when the real app has one.
- Phones keep their real status bar, island and home indicator, never drawn by hand; notifications at true size, never enlarged.
- Terminals are a character grid: monospace, few short real lines, colour only for status.

### Accessibility and performance

- The shot is one image to assistive tech: wrapper `role="img"` and an `aria-label` that says what it shows ("Inbox with a reply being drafted to Ana about the March invoice"); inner content `aria-hidden="true"`; nothing focusable inside.
- Animated shots pause when off screen (`IntersectionObserver`) and when the tab is hidden; respect `prefers-reduced-motion` with the poster frame.
- Scope the CSS under the shot's root class so the host page's styles don't leak in and the shot's don't leak out.
- Live HTML over images where possible (crisp at any DPR, themeable); if you use captured screenshots, export at 2x, WebP/AVIF, with width and height set.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Whole dashboard shrunk into a card with even padding | Crop to the panel the story happens in; bleed off an edge |
| Window floating on a tinted plate on a white page | Remove the plate; the page is the ground |
| Every row fully written, numbers everywhere | 3 to 7 real strings; bars elsewhere |
| Two grey bars and a button | Keep the product's structure and signature content |
| Two same-width cards stacked on one edge as satellites | One satellite, or two of different kinds and sizes |
| Purple gradient ground, gradient text, glowing card | Product neutrals, one accent where the story is |
| Sparkle icon on every AI feature | Show what the AI produces |
| Letter-in-a-coloured-square logo | A text wordmark, or the real mark |
| Mixed icon sets, emoji as icons | One family, one stroke |
| 9px text to fit more rows | 13 to 14px names, fewer rows |
| Hand-drawn status bar and notch | Real device geometry from a kit or the platform |
| Tracked caps labels and buttons | Sentence case unless the real product uses caps |
| Tilted 3D perspective by default | Flat and frontal; tilt only when it beats the straight version at final size |

## Done when

- [ ] The plan exists: placement, focal object, action, payoff, cuts.
- [ ] The hero object fills ≥ 2/3 of the stage and bleeds 10 to 40% off an edge (or the brief asked for unframed).
- [ ] Nothing with words, the action or the payoff is cut by the crop; no empty corners or voids under lists.
- [ ] One gutter throughout; no near-tangent edges.
- [ ] 3 to 7 real strings; placeholders only at the edges; UI text 11px+ at the shown size.
- [ ] One icon family; real logos only; no AI sparkles or purple shorthand.
- [ ] A compact version exists for the phone column if the shot can land there.
- [ ] `role="img"` + label; reduced motion shows the poster; off-screen animation pauses.
- [ ] `fitcheck_shot` at both widths looks as good as the closest reference; `fitcheck_done` returns its verdict.

## Reference guides

- `productshots/frames` — browser, app, phone, notification, terminal and chat frames; crops, masks, satellites, annotations.
- `productshots/bento` — composing a grid of feature tiles as one picture.
- `productshots/animated-demos` — story shapes, beats, cursor, loops, easing, text and number changes.

## Sources

Adapted and rewritten from Stageshow by Benji Taylor (MIT): the framing rules, layouts, restraint, craft and motion principles, here paraphrased in Drip's voice with no code copied. Taste Skill (MIT): the app frame, cards with cropped real fragments, two boxes deep. Impeccable (Apache-2.0): "prove, don't claim" and demonstration data as design material.
