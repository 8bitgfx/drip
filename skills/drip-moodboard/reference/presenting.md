# Presenting the board and reading what the user thinks

The board only works if the user looks at it. Make it one click to open, one line per direction to understand, and one question to answer. Then read their reactions as data about which axes they care about, not only which card they clicked.

## Publishing

`board_open` returns three things:
1. a **live link** (`http://localhost:4567/b/<id>`) where the user can star, remove and annotate items; `board_read` picks those up,
2. a **self-contained `board.html`** with images inlined, safe to share,
3. a **preview screenshot** (when Chrome or Edge is available), so you can check the board looks right before sending it.

Choose how to share:

| You have | Do |
|---|---|
| An Artifact or publish tool (for example in Claude Code desktop or claude.ai) | Publish the `board.html` file as an artifact and give the user that link. It works on any device and can be passed to a teammate. Mention the live link too if they want to star and annotate. |
| No publish tool, user on the same machine | Give the live localhost link. |
| No publish tool, user elsewhere (remote session) | Give the path to `board.html` and say it opens in any browser; ask them to paste their reactions back. |

Look at the preview screenshot before sending. If a direction's items are missing, a palette chip is wrong or the board is empty, fix it first.

## The message

Short. The link, the directions, your pick, one question.

```
Here's the board: <link>

Three directions:
- **Chalk**: big condensed type on chalk-white, routes listed like a setter's sheet. Bright, square, quiet.
- **Route card**: the gym's grade colours become the system, rounded like holds. Colourful, playful.
- **Door counter**: the live crowd number is the hero, dark and exact like an instrument. Dense, live.

I'd build **Door counter**: the job is "how busy is it, then book", and only this one leads with that. Risk: it may feel more tool than community; Route card is the answer if community matters more.

Which one, or what would you change? You can also star or remove items on the board.
```

- Do: one line per direction that names what leads and the world, then the adjectives.
- Do: state your recommendation and its honest risk.
- Don't: write a pros and cons table, describe every item, or ask more than one question.
- Don't: present before the board has 8+ items and saved directions.

## Recommending

- Recommend from the brief: the scene and the job decide, not your taste.
- Give the risk in one clause. A recommendation without a risk reads as a sales pitch.
- If the canon option (the category standard done well) is on the board, describe it plainly ("the familiar route, done at the standard of the category's best"). Do not recommend it by default; do not hide it.

## Reading reactions

`board_read` returns new reactions since the last read and the current list (★ for starred items, user notes in brackets). If the user used the static `board.html`, they paste their feedback lines; pass them as `pasted`.

Read reactions as signals about axes:

| Pattern | Interpretation | Next |
|---|---|---|
| All stars inside one direction | direction chosen | confirm, `board_choose` |
| Stars across directions share one axis value (all light, all condensed type) | that axis is decided | rebuild directions around it; keep them different on other axes |
| An item removed | the move it represents is rejected | remove that move from every direction, not only that card |
| A note on an item | a requirement | carry it into the winner, write it into the reason |
| No reactions, a plain "looks good" | not a choice | ask once: "Which one should I build?" |
| "Mix A and B" | a merge | write the merged card, check contrast and difference, confirm before choosing |
| "None of these" | wrong axes | ask which came closest and on what axis, then search again from a new angle |

## Revising

- **Round 1:** re-cluster with what you learned, add or remove items, `board_directions` again (it replaces the set), `board_open`, short message naming what changed.
- **Round 2:** same, narrower.
- **After two rounds without a choice:** stop iterating. Ask what quality is missing ("more serious? warmer? more like a tool?") and search references for that quality before forming new directions.
- Never re-roll on your own for taste. Change directions without being asked only when one cannot carry the product's truth or task (it hides the action, it cannot hold the real data).

## Choosing

- The user chose: `board_choose(direction, reason)`; put the user's words in the reason ("user: 'Door counter, but warmer'").
- The user said "you decide": choose and give the reason from the brief, in one sentence, in your next message.
- No one can answer (headless, batch): choose from the brief, record the reason, and say in the final report that the direction was chosen without the user and can be changed.
- After choosing: `drip_guide direction`, then `drip_guide system` (palette and tokens from the chosen card).

## Standalone boards

When the user only wants a moodboard (no build):
- Still run `drip_start`, a three-line brief, references and directions; the gates help quality even without code.
- End with the board link, the directions, your pick, and an offer for the next step in one line ("Want me to turn Door counter into a design system and a first screen?").
- Do not write UI files for a standalone board.

## Done when

- [ ] The preview was checked before sending.
- [ ] The board was shared as an artifact or a link the user can open.
- [ ] The message has one line per direction, a recommendation with a risk, and one question.
- [ ] Reactions were read with `board_read` and interpreted by axis.
- [ ] The choice is locked with `board_choose` and a reason, or the board is handed over (standalone).

## Sources

Built for Drip around `board_open`, `board_read` and `board_choose`. Ideas adapted from **Impeccable** (Apache-2.0: one committed recommendation with its honest risk and full alternates beside it; the familiar option offered plainly but never recommended by reflex; re-roll only on factual grounds; ask what quality is missing after repeated rejections; unattended runs proceed and disclose) and **Hallmark** (MIT: one approval point, show options side by side with one line on what differs, two rounds as the ceiling).
