# Project memory

A project's design memory lives in `<project>/.drip/`, as local files. It survives tasks, sessions, hosts and moving the folder. No chat history, no model memory, no service.

## What is stored

| File | What |
|---|---|
| `boards/index.json` | Pointer file: `masters` (per brand, `default` for the whole project), `boards` (scope, parent, status), `approved` (per brand: board, direction, snapshot, style revision, critic verdict) |
| `boards/<id>/board.json` | A board, schema 2. `scope` master / feature / concept; `revision`; items with `status` (current, inspiration, proposed, approved, rejected, archived), `provenance` (source, project-relative path or URL, who added it, when), `hash`; directions; chosen; approved; feedback |
| `boards/<id>/history.jsonl` | The board's revision log (who, what, when) |
| `memory/feedback.jsonl` | Append-only events: id, task, session, board + revision, artifact revision, scope (page / feature / brand), source, kind, text, rule, status |
| `memory/decisions.json` | Versioned rules, exceptions, rejected items, style revisions, imports |
| `memory/style.json` | Measured tokens (`style_extract`) with their sources |
| `skills/project-design/SKILL.md` | Agent Skills entry point, generated into a marked block; `.history/` keeps versions |
| `packs/project-style/` | The project's own pack (`type: "project"`) |
| `snapshots/<task>.json` | UI file hashes at `drip_start` (workspace diff) |

All JSON files that several sessions write go through `core/jsonstore.mjs`: lock, read, change, `revision + 1`, atomic write. A caller that passes `expect` with a stale revision gets a conflict, not a lost update.

## Boards

- **v0.4 boards** migrate in memory on every read (items, directions, chosen, stars, notes, feedback intact) and are written as schema 2 by the next update. A project that has boards but no index gets the index from them: the latest board with a chosen direction becomes the master, and its chosen direction is carried as the approved one, marked `migrated`.
- The first board a project creates is its **master**. `board_create` never replaces one (scope master when one exists is refused). Later boards are `feature` (inherit, never change the master) or `concept`.
- Active board for a tool call: explicit id, then the task's board, then the project master, then the latest board. Tools say when they fell back.
- Items are deduplicated by stable key and by content hash. A refresh keeps stars, notes and status and records a changed hash.
- Archive, fork and reset need `approved: true` (the user's yes) and never delete: reset saves the old content to `boards/<id>/history/`.
- Paths are stored project-relative (also direction tiles), so a moved project keeps working. A missing local file is shown as unavailable, never removed.
- The board page marks current / proposed / approved / rejected items, the revision, the scope and related boards, and serves local images from inside the project only.

## Approval, fidelity and redesign

`board_choose` on the master approves the project's identity (style revision `sr1`) unless `approved: false`. When one is approved:

- **fidelity** (default for a task): choosing another direction on the master is refused;
- **redesign** (`drip_start({ memory: "redesign" })`, or "redesign/rework/rebrand" in the task): the choice is stored as a *proposed* style revision. The approved direction stays in force. Brand feedback in a redesign is part of the proposal. `board_update({ style: { promote }, approved: true })` makes it approved (the old one is kept as `superseded`); `style: { rollback: true }` returns to the previous one (promoted rules become `rolled-back`, superseded rules approved again); `style: { reject }` rejects it.
- **fresh**: ignore the project's memory (a new brand in the same repo).

## What a task inherits, and what it still has to do

`drip_start` (design, logo, board and polish tasks only) stores `task.memory` (mode, master revision, style revision, inherited, still needed) and prints the compact context. Nothing is passed automatically:

- the brief, new research, the build critic and the fit check are the task's own;
- `board_attach({ adopt: true })` counts the approved direction as the task's direction (skipping the directions ranking) **only if the critic's pass on it is on record**, or the project does not require the critic, or the user accepts it unreviewed (`acceptUnreviewed`). If the approved direction changes later the task's adoption is stale;
- `board_attach({ carry: true })` counts studies from the master toward the reference gate if complete, newer than `memory.freshDays` (90), and made for the same surface (shipped `site:` studies count anywhere). Each is marked `inherited` with the board revision.

## Feedback and authority

`feedback_record` / `recordFeedback()`. Authority, highest first: the user's latest explicit instruction, approved decisions, the user's selections (stars, choices), the critic, the agent's inference.

- Board star / remove / note, `board_choose` and `critic_record` write events automatically (a note is `user-explicit`, a star `user-selection`, the critic `critic`).
- A rule `{ topic, value, avoid[] }` on explicit brand feedback with no contradiction is approved. Everything else is proposed.
- Page and feature feedback is scoped: it never changes a brand rule; against one it becomes an exception.
- A contradiction with an approved rule is not applied. The result carries the question for the user: replace (`supersede: true`, the old rule is kept as `superseded`), make an exception, or drop it.
- `critic_prepare` includes the approved direction and rules; a critic fix that contains an `avoid` phrase of an approved rule is stored as `[OFF-DIRECTION: ...]`.

## Evidence bound to the artifact

`artifactRev(task)` = hash of the files the task wrote + DESIGN.md + the chosen direction + the approved style revision. `fitcheck_shot` stores `shotRev`, `fitcheck_done` stores `doneRev`, `critic_prepare` stores the revision on the pending review and `critic_record` copies it. If the revision differs, `needsFitcheck` / `needsCritic` are true again, `fitcheck_done` refuses ("shoot it again"), and `drip_status` lists the stale items.

**Workspace diff.** `drip_start` snapshots the hashes of every UI file. The write hooks mark each edit they see. At `drip_status`, `fitcheck_done`, the Stop hook and `drip_end`, files that differ from the snapshot and were never seen are folded into the task as UI writes (`unseen: true`, time = file mtime), so the normal gates apply: a fit check *after* those edits covers them. `drip_end` refuses while the fit check or critic is stale or unseen edits are uncovered, unless the user accepts the open points (`acceptOpen`, their words, kept in the history). Closing a task never deletes boards or memory; it refreshes the project skill.

## Sharing (opt-in)

Default: only `config.json`, `slop.json`, `catalogue.json`, `assets.json` are tracked. `board_project({ share: true })` (or `"share": { "boards": true }` in `.drip/config.json`) tracks `boards/index.json`, `boards/*/board.json`, `memory/decisions.json`, `memory/style.json`, `skills/project-design/SKILL.md`, `packs/**` (md and json), `patterns/index.json` and `patterns/*/spec.json|spec.md`. Always untracked: rendered boards, tiles, screenshots, `renders/`, caches, `state.json`, snapshots, board history, personal feedback (`shareFeedback: true` opts in) and board assets (`shareAssets: true`). `.drip/.gitignore` has one marked Drip block; your lines outside it are kept; the pre-0.5 generated file is migrated. A fresh clone discovers the same master and approved direction (tested with `git clone`).

## Tools

`board_project` (discover / bootstrap / share), `board_import`, `board_attach`, `board_update`, `board_history`, `project_context`, `feedback_record`, `project_learn`, `style_extract`, `style_update`, `style_export`, `style_import`. Existing board tools keep their arguments; new optional arguments: `board_create` scope/parent, `board_add` status, `board_choose` approved, `drip_start` memory, `drip_end` acceptOpen, `pack_create` type/workflow.

- `board_import` and `board_project` read only relevant files (README, DESIGN.md, token and CSS files, fonts, logos, images in asset folders, pages, `package.json`), skip `node_modules`, builds, caches, `.env`, key and credential files, and never run anything from the repo. Screenshots (desktop 1440, phone 375) need a running URL or local `.html`.
- `style_extract` merges static CSS/token values and what the browser computed (colour roles, type scale, spacing, radii, shadows, motion timings and easing, grid).
- Style packs (`style_export` / `style_import`): manifest with a SHA-1 per file, relative paths, project-owned files only (references from other sites stay metadata), secret-looking files left out and listed, no feedback or page-private rules. Import verifies hashes, never overwrites, never leaves its folder; a project without identity takes it as master, otherwise it gets a concept board and rule proposals.

## For the CLI and other hosts

Call `projectContext({ cwd, task, maxChars })` and `sessionPointer(cwd)` (`mcp/src/core/project.mjs`), `recordFeedback`, `approveDirection`, `writeProjectSkill` (`core/memory.mjs`), `takeSnapshot`, `artifactRev`, `workspaceDiff` (`core/evidence.mjs`), `syncGitignore` (`core/paths.mjs`). Hosts without a write hook still get the workspace diff at `drip_status` / `fitcheck_done` / `drip_end`.

## Tests

`mcp/test/memory.test.mjs` (plan section 5 tests 1-5, 7, 8; section 6 tests 1, 3 (data level), 5, 6) and `mcp/test/evidence.test.mjs`. Fixture: `mcp/test/fixtures/board-v04/board.json`, a board written by the v0.4 bundle.
