---
name: drip-fitcheck
description: Use after building or changing any UI, and whenever asked to critique, review, QA or judge a design ("does this look good", "review my page", "why does this look AI-made", /drip:critic). Self-critique first (screenshots at phone and desktop, compare with the chosen direction, slop lint, breaks_if check, 8 scores), then the independent drip:critic subagent until it PASSES (max 3 rounds), fixes by severity, the critic's words shown to the user, and the hand-off. Part of Drip.
user-invocable: false
---

# Fit check (Drip)

**Before you do anything: call `drip_guide` with topic `fitcheck`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`; load the fit check and critic tools with ToolSearch `+drip fitcheck` and `+drip critic`.

Two reviews, in order. **Yours** (cheap, fast, catches the obvious), then **the critic's**: a Sonnet subagent
with no history that sees only the brief, the direction and the screenshots. On full loops you cannot end
your turn until the critic passes the latest build, or 3 rounds have run.

## Rules you must not break
1. Never judge from code. `fitcheck_shot` (phone and desktop) and look at every screenshot before saying anything about the design.
2. Self-critique first: `fitcheck_compare` against the chosen direction, `fitcheck_lint`, the genre's `breaks_if` list against the CSS, the visual slop list, 8 honest scores 1-5. Fix what you find before calling the critic.
3. Then the critic: `critic_prepare({ kind: "build", targets: ["<url>"] })` → `Agent({ subagent_type: "drip:critic", description: "Critic review", prompt })` with the prompt **unchanged** → `critic_record` with its numbers and words.
4. Never defend the work to the critic. `context` holds facts it can't see ("this is the settings screen"), never effort, intent or excuses.
5. Fix by severity: every S0 and S1 before the next round; S2 when cheap; S3 at polish. Never fix by adding decoration.
6. Re-shoot the same sizes after fixes, then the next critic round. **Max 3 rounds**; after round 3, stop and list what's left.
7. PASS = the critic's verdict. Your own scores never override a REVISE or REJECT.
8. Show the user the critic's words, unsoftened: verdict, score, its one-line summary, and the worst problem if not passed.
9. If you disagree with a finding, say so to the user in one line next to the critic's quote; don't silently skip it.
10. `fitcheck_done` with your 8 scores, the verdict and the fixes. Never claim a pass nobody scored from a screenshot.
11. The chosen direction is locked: fixes stay inside it. A finding that needs a different direction goes to the user as a question.
12. Never invent a weakness to look rigorous, and never hide one to look finished.

## Tools
- `fitcheck_shot` — phone (390) and desktop (1440) screenshots; first, and after every fix round. `dark: true` for dark mode.
- `fitcheck_compare` — the build next to the chosen direction.
- `fitcheck_lint` — static slop and polish checks on the changed files.
- `critic_prepare` (kind `build`, or `any` for a URL/file/image outside a loop) → Agent `drip:critic` → `critic_record`.
- `fitcheck_done` — your 8 scores, verdict and fixes; required before the turn ends after UI changes.
- `board_read`, `palette_check` — reread the direction; confirm a contrast problem.
- `drip_end` — after the hand-off.

## Read deeper when
| Situation | Call |
|---|---|
| Scoring an axis yourself and deciding between two scores | `drip_guide fitcheck/rubric` |
| Spotting AI-made tells in a screenshot, with the fix for each | `drip_guide fitcheck/slop-tells-visual` |
| Fixing copy problems | `drip_guide copy` |
| Fixing focus, contrast or target problems | `drip_guide a11y` |
| Fixing details (shadows, radii, states, numerals) | `drip_guide polish` |
| Fixing missing or generic pictures | `drip_guide imagery` |
| A `breaks_if` hit or drift from the genre | `drip_guide direction/genres` |
