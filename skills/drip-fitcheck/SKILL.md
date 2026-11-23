---
name: drip-fitcheck
description: Use after building or changing any UI, and whenever asked to critique, review, QA, polish-check or judge a design ("does this look good", "review my page", "why does this look AI-made"). Screenshots at phone and desktop, compares with the chosen direction, lints for slop, scores 8 axes 1-5 and fixes until every score is 4+. Part of Drip.
---

# Fit check (Drip)

**Before you do anything: call `drip_guide` with topic `fitcheck`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Never judge from code. Call `fitcheck_shot` (phone and desktop) and look at every screenshot before you say anything about the design.
2. Review as a design director who did not build it: read the page, not your intentions. You are its harshest fair critic, not its defender.
3. `fitcheck_compare` against the chosen direction and name the largest divergence in one line, or say why the build is right and the direction was wrong.
4. `fitcheck_lint`: fix every error, answer every warning (fix it, or say why it stays).
5. Score all eight axes 1-5: hierarchy, layout, type, color, imagery, polish, copy, fidelity. A 3 is the honest default; a 5 must name what makes it exceptional. Never round up.
6. Walk the visual slop list (in the guide) over the screenshots and count the tells you find.
7. Rank problems by cost to the page, fix the top three first, then re-shoot the same sizes and re-score. Never fix by adding decoration.
8. Pass needs every axis at 4 or more and zero lint errors. One 3 is a fail.
9. At most three fix rounds. After that, stop and report what is still open with its score.
10. Call `fitcheck_done` with the scores, the verdict and the fixes made. Never claim a pass you did not score from a screenshot.
11. Never invent a weakness to look rigorous, and never hide one to look finished.

## Tools
- `fitcheck_shot` — phone (390) and desktop (1440) screenshots of the page; take them first and after every fix round.
- `fitcheck_compare` — the build next to the chosen board direction, for fidelity.
- `fitcheck_lint` — static slop and polish checks on the changed files (contrast utilities, focus, gradients, emoji, slop words, fake stats).
- `fitcheck_done` — record the eight scores, the verdict and the fix list; required before the turn ends after UI changes.
- `board_read` — reread the chosen direction and the user's reactions when fidelity is in doubt.
- `palette_check` — confirm a contrast problem you see in a screenshot.

## Read deeper when
| Situation | Call |
|---|---|
| Scoring an axis and deciding between two scores | `drip_guide fitcheck/rubric` |
| Spotting AI-made tells in a screenshot, with the fix for each | `drip_guide fitcheck/slop-tells-visual` |
| Fixing copy problems the check found | `drip_guide copy` |
| Fixing focus, contrast or target problems | `drip_guide a11y` |
| Fixing details (shadows, radii, states, numerals) | `drip_guide polish` |
| Fixing missing or generic pictures | `drip_guide imagery` |
