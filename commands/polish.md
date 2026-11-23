---
description: Polish pass on existing UI (quick Drip loop)
argument-hint: <file, component or page to polish>
---
Polish: $ARGUMENTS

Call `drip_start` with size "quick" for this polish pass, then `drip_guide polish` and `drip_guide interaction`. Fix the details on the target, run `fitcheck_lint` (and `fitcheck_shot` if the page runs), and record `fitcheck_done`.
