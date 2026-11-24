# Swarm Mode: the director and the crew

Swarm Mode keeps the expensive model for decisions and gives the reading, typing and measuring to cheaper ones. The gates are unchanged:
the same studies, directions, critic and fit check are required, and the crew's work is recorded through the same tools.

## Who does what

| Role | Model | Does | Returns |
|---|---|---|---|
| Director (you) | the session's model | brief, thesis, picks references, writes direction and section specs, chooses, triages critic fixes, the final look | - |
| `drip:scout` (one per role, parallel) | Haiku | refs_site / refs_search / refs_gallery for ONE role, drops cookie, bot and error pages, studies the best | top 3, five lines each, and `refs_study` called with the role |
| `drip:builder` | Sonnet | builds ONE section from your spec, DESIGN.md and the kit | changed files and a one-section screenshot path |
| `drip:checker` | Haiku | `fitcheck_shot` with `numbersOnly`, per section | blockers and numbers only |
| `drip:critic` | Sonnet | independent review (as always) | verdict, scores, fixes |

## The order
1. `drip_start` as usual, then the brief. Intake is yours.
2. **Scouts:** `scout_prepare` for style, competitor and page (and before when redesigning), all launched in ONE message. Give each a `subject` (the thing, not the look) and, for style, the look words in `style`. If the studies have no competitor sharing the product type, add a same-product-type rival with another scout.
3. Read the three per role. Pick what you take and refuse. Moodboard, directions, critic on the directions, the user's choice: yours, as in the normal loop.
4. Lock the choice into DESIGN.md and the base kit (`drip_kit`).
5. **Build** by section: write each spec (real copy, columns, roles, colours), `build_prepare`, launch `drip:builder`. Independent sections that touch different files can run in parallel; the hero first, always alone.
6. **Measure** after each section: `checker_prepare`, launch `drip:checker`, fix its blockers, and only then the next section.
7. Whole page: `critic_prepare({ kind: "build" })`, `drip:critic`, `critic_record`, fixes by severity, `fitcheck_done`.

## Briefing well
- A scout's subject is the thing itself ("modular baby stroller"). Style words go in `style`; mixed queries return mush.
- A builder spec has: the section's job, the real copy, the layout by columns, which type roles and colour roles, what must not appear. Under two sentences is too little.
- Pass the prompt a `*_prepare` tool returns unchanged.

## When it goes wrong
- A scout returns fewer than three usable pages: run another with a different subject wording; do not pad with pages it dropped.
- A builder breaks the system (second accent, eighth size): that is a spec or a brief problem; fix the spec and rerun, do not patch around it.
- A checker's blocker is a measurement: fix it; do not argue it with the checker.

## Hosts without subagents
Codex, Cursor, OpenCode and the chat apps do not launch Drip's named subagents the same way (and Claude Desktop chat has none). There, `drip_start` says so, the `*_prepare` tools still return the same briefs, and you follow the single-agent loop: scout, build and check yourself, in the same order, with the same gates. Nothing is lost except the saving.
