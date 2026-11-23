# What a lazy run looks like (and what Drip does about it)

Same request: "/drip:design a portfolio for Claude".

| The lazy run does | What comes out | What Drip does |
|---|---|---|
| Skips intake, guesses "professional portfolio" | The corporate page nobody asked for | `drip_brief` is required before research; `drip_start` returns the INTAKE block |
| One `refs_search`, glances at the sheet, moves on | Ideas from thumbnails, i.e. the median shot | Gate needs 6+ `refs_study` from 3+ designers; studying needs `refs_view` first |
| `refs_study` with "clean layout, nice colours" | Notes nobody can build from | Rejected: vague fields, fewer than 3 concrete values |
| Three directions: same hero, three palettes | No real choice | The critic flags "same idea rendered twice → cut one" and can REJECT the set |
| Picks cream + terracotta + serif because it's "warm" | The tasteful-AI default (exactly what happened before 0.3) | `rules/ambition`: the critic caps Idea and Conviction at 4/10 for it |
| Shows the board before the critic | The user picks from weak options | `board_open` / `board_choose` refuse until the critic ranked the current directions |
| Writes code without a direction | Template layout | UI writes blocked (PreToolUse) until the brief, studies and chosen direction exist |
| Grades its own build "pass" and stops | Sloppy work ships | Ending the turn is blocked until the drip:critic subagent PASSES the build (max 3 rounds) |
| Records a critic verdict it never ran | A fake review | `critic_record` refuses unless a drip:critic subagent run was recorded after `critic_prepare` |
| Explains its process in a wall of text | User skims, misses the question | `rules/communication`: decisions first, show don't tell, one question with buttons |
