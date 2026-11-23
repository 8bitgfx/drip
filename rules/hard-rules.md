# Hard rules

These apply to every Drip task, full or quick. Breaking one is a failed fit check.

## Process
1. **`drip_start` before any UI work.** Read every guide it lists through `drip_guide`.
2. **References before new UI.** 4+ studied, most of them shipped examples of the same surface (`refs_site`, or `refs_view` for shots), each with measured values. Study, never copy one-to-one.
3. **A chosen direction before building new UI**, from a board with 2-3 genuinely different directions.
4. **Write the system down** (DESIGN.md + tokens) before components use it. Extend an existing system; replace it only in a redesign, and say so.
5. **Fit check on real screenshots** (phone 390px and desktop 1440px) before you finish. Score honestly; fix anything under 4.
6. **`drip_skip` only when the user explicitly says to skip**, quoting them.

## Visual discipline
7. **Colour by surface.** App UI: neutrals carry ~90%, one accent for actions and selection. Landing pages, portfolios and showcases: commit at page scale (one colour on 30-60% of the surface, or a drenched ground); the accent still marks the action. A second accent needs a reason in DESIGN.md.
8. **One type pairing** (display + text). Pages use the 7 roles of `kit/base.css` and no eighth size; app UI uses at most 5. Mono only inside code, measurements and tables, never labels, nav or body.
9. **One icon family**, one stroke weight, sized to the text it sits with.
10. **One spacing scale** (4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128). No off-scale values.
11. **One radius scale** (2-3 values). Nested radius = outer radius − padding.
12. **Tokens, not raw values**: colours, radii, shadows, durations come from variables/theme.

## Content
13. **Real copy**: say what the product does, in the product's voice. No lorem, no "Unlock/Elevate/Seamless".
14. **No made-up numbers**: no fake stats, logos, testimonials or user counts. Ask, or leave the section out.
15. **Real imagery**: photography with a logged licence, generated art directed from the board, the user's assets, or real product UI. Never grey boxes or random stock.

## Quality floor
16. **Contrast**: body text ≥ 4.5:1, large text and UI parts ≥ 3:1 (`palette_check`).
17. **Every interactive element has hover, active (press), focus-visible and disabled states.** Focus is never removed without a visible replacement.
18. **Touch targets ≥ 44×44px** on touch screens; inputs ≥ 16px font on mobile.
19. **Every data view has empty, loading and error states.**
20. **Motion has a purpose**, animates only transform/opacity (and colour), 150-300ms for UI, and respects `prefers-reduced-motion`.
21. **Works at 390px wide** with no horizontal scroll, and at 1440px without a stretched, empty layout.
22. **Library components are restyled to the tokens.** Shipping a component library's default look is a fail on fidelity.
