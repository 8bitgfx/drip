# Presenting the board, asking with buttons, and locking the choice

The user should be able to choose in under a minute: one link that opens, one line per direction that says the idea, the critic's verdict in its own words, Drip's pick with its honest risk, and one question with buttons. Then their reactions are read as data about which axes they care about, and the choice is locked so nothing quietly drifts away from it.

## Before you present

- The critic ranked **this** set (`critic_record` after the last `board_directions`), and didn't reject it. Otherwise `board_open` refuses.
- Every direction has a tile at equal fidelity.
- You know your own pick and its risk, and where you disagree with the critic.

## Publishing

`board_open` returns:
1. a **live link** (`http://localhost:4567/b/<id>`) where the user can star, remove and annotate; `board_read` picks those up,
2. a **self-contained `board.html`** with images inlined, safe to share: brief, tiles side by side, the references behind each, the critic's ranking,
3. a **preview screenshot**: check it before sending (missing tiles, empty directions, wrong chips).

| You have | Do |
|---|---|
| An Artifact or publish tool | Publish `board.html` as an artifact and give that link; mention the live link for starring |
| No publish tool, same machine | The live localhost link |
| Remote session | The path to `board.html`; ask them to paste reactions back |

## The message

Decisions first, 3-6 lines, the critic quoted, no tables of pros and cons (`drip_guide rules/communication`).

```
Moodboard: <link>
1. Door Counter: the live crowd number as an instrument at the door. Critic 8/10, "the only one that does the job in two seconds".
2. Setter's Sheet: the week's routes as a printed topo sheet. Critic 7/10, "the most ownable; the booking is buried".
3. Grade Fields: the grade colours become the system. Critic 5/10, "friendly, but every gym app looks like this".
I'd build Door Counter. Risk: dark and dense may feel more tool than community.
```

If you and the critic disagree, say so in one line: "The critic ranks Setter's Sheet first for ownability; I'd still build Door Counter because the job is 'how busy, then book'." Show both; never hide its ranking.

## The question (AskUserQuestion)

One question, right after the message:

```
Which direction should I build?
- Door Counter (Recommended): leads with the live number; risk: feels like a tool
- Setter's Sheet: the routes as a printed sheet; critic's most ownable
- Grade Fields: colour system from the grades
- (Other: mix, change, or none of these)
```

- Your pick first, labelled "(Recommended)", with a few words of reason.
- Every option one line: the idea, not the palette.
- Don't ask a second question in the same message.

## Reading reactions

`board_read` returns new stars (★), removals and notes, or pass `pasted` for feedback from the static board. Read them as signals about axes and ideas:

| Pattern | Means | Next |
|---|---|---|
| A button click on one direction | chosen | `board_choose` with their words |
| Stars cluster in one direction | chosen | confirm in one line, `board_choose` |
| Stars across directions share one look value (all light, all condensed) | that axis is decided, the idea isn't | rebuild around it; keep the ideas different |
| An item removed | the move is rejected | drop it from every direction |
| A note ("love this type") | a requirement | carry it into the winner; quote it in the reason |
| "Mix A and B" | a merge | build the merged card, check contrast and difference, re-tile, re-run the critic, confirm |
| "None of these" | wrong ideas, not wrong colours | ask which came closest and why, then new references from a new angle |
| "You decide" | delegated | choose from the criteria; record it as your pick, not their taste |

## Locking the choice

- `board_choose(direction, reason)`. Put the user's words and the criteria in the reason: *"User picked Door Counter ('the number is what I check'). Passes all thresholds; strongest on the 2-second read."*
- **Chosen = locked.** The system, the build and the fit check follow it. Never "improve" it (a new accent, a different face, a softer layout) without asking. If the build shows the direction needs a change, ask once, with the reason.
- **"Do everything" is not consent** for expensive or irreversible steps that follow (paid image generation, replacing a brand). Ask once when you get there.
- **Record the losers** in `DESIGN.md` under the direction:

```
## Directions not chosen
- Setter's Sheet: tested routes-first. Lost on the 2-second crowd read. Comes back if the gym wants a route-news page.
- Grade Fields: tested the grade colours as a system. Lost on ownability (critic 5/10). Its grade colours may return as data colours only if asked.
```

Never graft a loser's best move onto the winner without asking.

## Revising

- **Round 1:** re-cluster with what you learned, `board_directions` (replaces the set), `board_tile`, critic again, `board_open`, a short message naming what changed.
- **Round 2:** narrower.
- **After two user rounds without a choice:** stop. Ask what quality is missing ("more serious? warmer? more like a tool?") and search references for it.

## Unattended runs

No one to ask (headless, batch): choose from the criteria and the critic's ranking, record the reason, and say in the final report that the direction was chosen without the user and can be changed.

## Done when

- [ ] The critic ranked the current set and didn't reject it; its words are in the message.
- [ ] The board was shared as an artifact or a link the user can open; the preview was checked.
- [ ] One line per direction, your pick and its risk, one AskUserQuestion with your pick first.
- [ ] Reactions were read with `board_read`; the choice is locked with `board_choose` and a reason.
- [ ] The losers' reasons are in `DESIGN.md`.

## Sources

Built for Drip around `board_open`, `board_read`, `board_choose` and the critic. Adapted from **Impeccable** (Apache-2.0: one committed recommendation with its honest risk; unattended runs proceed and disclose) and **Hallmark** (MIT: one approval point, two rounds as the ceiling). New in 0.3: **Anthropic theme-factory** (Apache-2.0: show the options visually, ask, wait for an explicit pick), **Owl-Listener/designer-skills concept-selection** (MIT: record why each option lost and what would bring it back; never graft the losers), **buttonsprite/visual-direction-moodboard** (MIT: delegated picks are not the user's taste; nothing is final until the user reacts). Ideas only (no licence, paraphrased): **ziguishian/brand-design-skill** (no simulated consent; the chosen option becomes the locked source of truth).
