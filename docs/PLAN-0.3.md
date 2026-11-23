# Drip 0.3 plan: make it feel designed, not bolted on

What's wrong today (from real use):

| Problem | Seen as |
|---|---|
| The `/drip` menu is a list of 7 cryptic verbs (keys first, start buried) | "confusing to users" |
| No real intake: Claude guesses the brief, rarely asks what the user wants | directions don't fit the person |
| References are scanned on sheets but rarely studied; notes are thin | "puts a lot of references on sheets but doesn't pick specific ones" |
| Moodboards are a grid of shots; a direction is just a name + palette | hard to choose between directions |
| Claude grades its own work, kindly | sloppy logo shipped with a "pass" |
| No logo craft at all | the drop looked like blood, the type was generic |
| Updates to the user are walls of text | "badly made and stupid sometimes" |

## 1. Entry: one obvious command

Plugin commands are always namespaced (`/drip:<name>`), and the menu is alphabetical. So:

| Command | Does |
|---|---|
| `/drip:design <anything>` | The only one most people need. New page, logo, redesign, polish, "just references", "just a moodboard": Drip works out which from the words |
| `/drip:critic <url, file or image>` | An independent, harsh review of any design (see 4) |
| `/drip:settings` | Status, keys, skip/stop, config, in one menu (asks with buttons) |

`refs`, `board`, `fitcheck`, `status`, `keys` and `skip` stop being commands; they become modes of `design` and options in `settings`.

## 2. Intake: ask like a designer, with buttons

Before anything else, a short interview using Claude Code's question UI (clickable options, "Other" free text):

1. **What is it?** (inferred options: "Landing page", "Logo + wordmark", "Dashboard"…)
2. **Who is it for, and what should they do?**
3. **Feel**: 4 option pairs built from the brief ("Quiet & precise" vs "Loud & playful", "Editorial" vs "Technical"…)
4. **Anything you love / hate?** (links, brands, "no dark mode")

Max 4 questions, one round, skippable ("decide for me"). The answers become the brief and the board's header. A `drip_brief` tool stores the brief, and the gate requires it.

## 3. References that are actually studied

- **Pick before view.** `refs_pick(numbers, why)` records a shortlist from a sheet with a one-line reason each. `refs_view` only counts for shots that were picked.
- **Structured study.** `refs_study(shot, layout, type, color, density, detail, take, leave)`, with required fields and values. This replaces free-text board notes, and vague answers are rejected by the tool.
- **Close-ups.** `refs_zoom(shot, region)` crops part of a shot full size (nav, pricing card, type detail), so Claude analyses details instead of thumbnails.
- **Gate**: full loop needs 8+ *studied* shots from 3+ queries and 4+ designers (not just views).

## 4. The Critic: a harsh, independent reviewer

- Ships as a **plugin subagent** (`agents/critic.md`, model **Sonnet 5.5**, no conversation history, read-only tools). It runs in the user's own Claude Code, with no extra login or keys.
- It sees **only** the brief, the direction contract and the images (screenshots, logo renders, style tiles). It never sees Claude's reasoning or excuses.
- Voice: blunt, specific, unimpressed. "The drip is a wobbly blob that reads as blood; the serif is a default pick with nothing to say. Concept: 2/10. Here's why…" It ranks options, scores them 1-10 per axis, names the single worst problem, and gives concrete fixes.
- **Used automatically, never asked about:**
  - on moodboard directions / logo concepts *before* the user sees them (it ranks them; weak ones are cut or reworked);
  - on the build before Claude may finish (`fitcheck_done` needs a critic verdict for full loops).
- Claude also self-critiques first (cheap); the critic is the independent second opinion.
- If the critic and Claude disagree, the critic's ranking is shown to the user next to Claude's.

## 5. Moodboards you can choose from

- Every direction gets a **style tile** (`board_tile`): a rendered card with its palette, type specimen, a button, a card, a nav and a sample headline, so the user sees the direction applied, not just references.
- The board artifact shows: brief, 2-3 tiles side by side, the 3-4 references that define each, the critic's ranking with one-line reasons, Claude's pick and its risk.
- The choice is asked with buttons (the tiles are in the board link).

## 6. Logo craft (new skill `drip-logo` + tools)

- **Process**: brand attributes → 12-20 rough concepts as quick SVG sketches (`logo_sheet` renders them numbered on one sheet) → critic ranks → top 3 refined → `logo_test` (16/32/64/512px, one colour, inverse, on photo) → wordmark pairing → lockups → brand file.
- **Guides**: construction (grids, optical overshoot, stroke contrast, curve quality: smooth Béziers with few points, no wobbly nodes), meaning (one idea, avoid literal clichés), small-size survival, typography for wordmarks (custom adjustments rather than a stock font), what reads as amateur.
- **Checks**: path smoothness (node count, curvature spikes), contrast at 16px, silhouette test.

## 7. Talking to the user

- A **message style**: decisions first, 3-6 short lines, a picture or a link instead of prose, one question at a time with buttons.
- Fixed formats for the 4 moments: brief confirmation, directions to choose, progress at milestones, final hand-off (screenshots, scores, critic quote, what's left).

## 8. Examples that teach the tools

- Every tool description gets a 1-2 line example call.
- `examples/` holds 3 full worked runs (landing page, dashboard, logo): the good path, plus "what a lazy run looks like and why it's rejected". Skills link to them.

## 9. Quality checks for Drip itself

- `evals/`: 5 fixed briefs run headless (`claude -p`), with outputs scored by the critic and tracked per release, so changes to skills are measured, not guessed.
- This needs the `claude` CLI to be logged in on the machine that runs the evals.

## 10. Adapt: Drip clones itself into a niche specialist

`/drip:adapt <niche>`, e.g. "Roblox UI", "fintech dashboards", "album covers", "Shopify stores". Drip researches the niche deeply and writes a **niche pack**: a specialised Drip that every later task in that niche uses automatically.

**Research, in this order:**
1. **Intake (buttons):** what in the niche (game HUDs, shop menus, lobby screens…), whose work they admire, platforms and constraints, sources they can give access to.
2. **Standards:** the niche's official rules and hard constraints. For Roblox: screen safe areas, touch, gamepad and console, text scaling, UI behaviour in the engine, store rules.
3. **References:** Dribbble tags and designers for the niche, real shipped products (screenshots via the browser), plus sources only the user can open. For X/Twitter, Pinterest, Behance or Discord, Drip asks the user to sign in through Claude in Chrome or to paste links. It never asks for passwords and never scrapes behind their back.
4. **Artists & studios:** the 10-20 people whose work defines the niche's best end. What each does that others don't, with notes and links.
5. **Existing skills to fuse:** searches public agent skills for the niche (skills.sh, GitHub), checks each licence, and studies only permissively licensed ones; their ideas are rewritten into the pack with credit.
6. **Critic review of the pack itself:** does it describe the actual best work, or generic advice? It's reworked until the critic stops calling it generic.

**What a pack contains** (`~/.drip/packs/<niche>/`, or `.drip/packs/` to share it with a team):
- `guide.md`: style rules, industry standards, layout/type/colour norms, what "premium" means here;
- `genres.md`: the niche's own directions;
- `artists.md`: the people and studios to learn from;
- `refs.json`: curated references with study notes;
- `queries.md`: search terms that work for this niche;
- `slop.json`: the niche's own amateur tells, linted automatically;
- `critic.md`: extra rubric for the Critic;
- `catalogue.json`: niche libraries and kits.

**How it's used:** `drip_start` detects the niche from the request (or the user names it) and makes the pack's guides required reading. The Critic judges with the pack's rubric. Packs can be listed, updated (`/drip:adapt <niche> --refresh`), exported, and shared as files or a small repo.

## Decisions made

- Commands: `/drip:design`, `/drip:critic`, `/drip:settings`, `/drip:adapt` (4).
- Critic: plugin subagent on Sonnet 5.5, fresh context, used automatically.
- Critic power: **gatekeeper** (default; the question wasn't answered explicitly). Concepts and directions it ranks badly are reworked before the user sees them, and builds can't finish until it passes, with at most 3 rounds and the user able to override.
- Intake: up to 4 clickable questions, one round, skippable.

## Build order

1. Commands + intake + message style (the "feels bad" part).
2. Critic subagent + gates (the quality part).
3. References: pick/study/zoom.
4. Style tiles + new board.
5. Logo skill + tools.
6. Adapt + niche packs.
7. Examples + evals.
