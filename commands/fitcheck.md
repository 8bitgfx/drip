---
description: Fit check a page: screenshots, comparison with the direction, slop checks and honest scores
argument-hint: <page URL, e.g. http://localhost:3000>
---
Fit check: $ARGUMENTS

Call `drip_guide` with topic `fitcheck` first. Then `fitcheck_shot` on the URL, `fitcheck_compare` against the chosen direction (if there is one), `fitcheck_lint` on the changed files. Score honestly 1-5 on every criterion as a design director who did not build it, list the problems by impact, fix them, shoot again, and record the result with `fitcheck_done`.
