# Components: project index, reuse, audit and `drip_check`

Code: `mcp/src/core/indexer/` (walk, extract, index), `mcp/src/modules/components/{local,audit,drylint}.mjs`, `mcp/src/core/check.mjs`. The existing tools (`components_find`, `components_get`, `components_registries`, `components_catalogue`) are unchanged; they search the outside world, the new ones look at THIS project first.

## Tools

| Tool | Purpose |
|---|---|
| `components_index({ changed?, full? })` | Build / refresh `.drip/index/components.json`. Incremental. `changed: true` lists what changed. |
| `components_local_find({ query, limit? })` | The project's own components (name, props, variants, usage count, file:line, tokens, story, test) and approved patterns from `.drip/patterns/`. |
| `components_plan({ page, sections })` | A page as sections, product components, primitives: REUSE / SIMILAR / NEW per component, an accessible primitive for overlays, warnings for a card-grid page and for new components used once. |
| `components_preview({ url \| component \| html+css+js, states?, sizes?, variants? })` | One component alone: 375 / 768 / 1440, states by real input, a Tab walk, and for plain HTML a stress sheet (default, narrow, long text, RTL, dark, zoom 200%, your variants). React/Vue/Svelte use the user's Storybook or Ladle (a story `url`, or a `component` name found in a running Storybook). Drip does not run the user's build. |
| `components_audit({ changed?, judge?, limit? })` | Near-duplicate components / helpers, repeated CSS blocks, token drift, same-named components, import cycles, primitives that import product code. |
| `components_save({ name, file, status?, previews?, notes?, tags? })` | A `component` entry in `.drip/patterns/index.json` with spec (read from the index) and previews. `proposed` until the user accepts. |
| `drip_check({ changed?, full?, only?, strict? })` | The project's lint / typecheck / test scripts, `fitcheck_lint`, `components_audit`, dry-lint. Structured result with receipts. |

## The index

`.drip/index/components.json` (jsonstore: lock, atomic write, revision). Per file, keyed by mtime + size, then content hash. A re-run parses only changed files; on this repo (88 files) a full index takes about 200 ms and a warm one about 25 ms.

- Walks the filesystem, not git, so untracked files are included and git's index is never touched. Honours `.gitignore` at every level; always skips `node_modules`, `.git`, `.drip`, `dist`, `build`, `.next`, `.nuxt`, `.svelte-kit`, `.turbo`, caches, `coverage`, `out`, secrets (`.env*`, keys, credentials) and files over 1.5 MB.
- Extensions: `.tsx .jsx .ts .js .mjs .cjs .vue .svelte .astro .css .scss`.
- Per file: exports (function / const / class / re-export, line range), components (PascalCase that returns JSX, plus whole `.vue` / `.svelte` / `.astro` files), props (from `interface XProps`, `type XProps`, the parameter's own type, `React.FC<>` / `forwardRef<>` generics, destructured names, Vue `defineProps`, Svelte `export let` / `$props()`, Astro `Astro.props`), prop unions (`size?: "sm" | "md"`), variants from `cva(...)` and `tv(...)` (groups, values, default variants), imports, JSX tags used, CSS variables used and defined, raw colour / radius / shadow literals with lines, CSS blocks, a story's component, and a bottom-k token-shingle sketch of each function / component for duplicate detection.
- A scanner and regular expressions, no parser. Comments and regular-expression literals are blanked so quotes and brackets inside them do not confuse bracket matching. Props from complex generics, spread types and re-exported types can be missed. ts-morph is not used (not built); the extractor is deliberately dependency-free.
- Usage counts resolve JSX tags through imports (relative paths and `@/`, `~/`, `#/` aliases); stories and tests are linked by their imports and `component:`.

## The audit

All findings carry file:line for every side, a reuse candidate and a fix. Severity: `high` (a verified token-drift value, or near-identical copies of 80+ tokens at 85%+), `medium`, `low`.

- **duplicate-markup / duplicate-logic**: unit sketches are compared through an inverted index of shingles; pairs at 62%+ similarity (bottom-k Jaccard) with comparable size (45+ tokens, within 2.2x) are reported. Names and literals are normalised, so renamed copies match. Same classes (70%+) means "markup and styling", otherwise "code structure". Clusters are one finding ("5 near-identical copies").
  Not flagged: thin wrappers around one imported component (`PrimaryButton` / `GhostButton` over `Button`), a wrapper next to the component it renders, units under 45 tokens, tests and stories.
- **duplicate-css**: rule blocks with 5+ declarations and 85%+ the same declarations under different selectors.
- **token-drift**: a raw colour / radius / box-shadow in a UI file (`.css .scss .tsx .jsx .vue .svelte .astro`) equal to a defined CSS variable (`high`, `low` for plain white and black); a colour within colour distance 12 of a token (`medium`).
- **ambiguous-component**, **import-cycle**, **boundary** (a `ui/` primitive importing a product component, a component importing a page, imports climbing 3+ folders).
- No file-length limits. Exceptions go in `.drip/check/exceptions.json`: `{ "audit": [{ "kind": "duplicate-markup", "files": ["a.tsx", "b.tsx"], "reason": "..." }] }`.

On Drip's own `mcp/src` it found the `esc()` helper copied five times (board render, board tile, fit-check compare, key page, logo) and the three-folder imports in the generation providers, and nothing in the rest: 268 units, 843 pairs compared, 46 ms.

## dry-lint, the judge, and what dry-lint cannot read

[dry-lint](https://github.com/gigaverse-app/dry-lint) 1.12.0 is run through `uvx --no-config --python 3.13 dry-lint ...` (`execFile` with an argument array), warn-only, only when `uvx` exists. What it reads:

- **git-tracked files only**, and **only Python, TypeScript/TSX and Luau** (checked in its source: `.ts .tsx .mts .cts`, `.py`, `.luau`). It does **not** read `.js`, `.mjs`, `.jsx`, `.vue`, `.svelte`, `.astro` or CSS. On Drip's own `mcp/src` (`.mjs`) it finds 0 functions. Untracked files are never read.
- So Drip's own detector (`components_audit`) is the one that covers `.mjs/.js/.jsx/.vue/...` and every untracked file. dry-lint adds TS/TSX/Python pairs on tracked files with its own comparer; `drip_check` reports "skipped: no git-tracked Python, TypeScript/TSX or Luau files" when there is nothing for it.
- Its default comparer is calibrated on a large Python codebase: on a small TypeScript fixture it found 1 candidate pair out of 16 functions and missed an obvious renamed copy. Treat its output as a second opinion, not a gate. A scan with no judge takes about 2 s warm.
- `detect --all --out` lists candidate pairs without judging (the "judge none" mode). `scan --judge command --judge-command ...` judges them. Verdicts are stored by dry-lint in `.drip/check/dry-store`. Accepted pairs go in `.drip/check/dry-baseline.json`.

### The judge

The user's own local AI CLI judges candidate pairs: their subscription, no API key, no source upload to a service Drip chose. `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` are removed from the environment of the judge so it cannot bill an API key by accident.

| `check.dryLint.judge` in `.drip/config.json` | Runs |
|---|---|
| `auto` (default) | `claude` on PATH, else `codex` on PATH, else `none` |
| `claude-code` | `claude -p --model <model> --tools "" --no-session-persistence --disable-slash-commands --strict-mcp-config --system-prompt ...` (model default `haiku`) |
| `codex` | `codex exec --sandbox read-only --skip-git-repo-check -` (not verified: Codex is not installed here) |
| `command` | `check.dryLint.command`, a string or an array; reads the prompt on stdin, prints one JSON object `{ "label": "duplicate" \| "drifted" \| "separate", "score": 0-1, "why": "..." }` |
| `none` | no judge: pairs are listed for the host agent or the critic to read |

Other options: `check.dryLint.model`, `enabled` (false turns dry-lint off), `limit` (pairs, default 30), `maxJudgeCalls` (native pairs judged per run, default 8), `judgeAudit` (false: do not judge the audit's pairs), `python` (default `3.13`), `check.strict` (audit `high` findings fail instead of warn).

dry-lint's CLI has no model option for its built-in `claude-code` judge (the model is set in its settings file), so Drip passes `claude -p --model haiku` as a `command` judge. The pairs from Drip's own detector are judged by the same CLI with a short prompt (`drip-pair-v1`). Verdicts are cached in `.drip/check/verdicts.json` by a hash of both sources + judge + model + prompt version, so an unchanged pair is never judged twice; a `separate` verdict at 0.6+ lowers the finding to low. A failing judge (not logged in, no network, timeout) never fails a check: the pairs are listed unjudged and the reason is in the summary. Always warn-only.

A `.cmd` / `.bat` judge on Windows (an npm-installed `claude.cmd`) is run through `cmd.exe /d /s /c` with a quoted argument list; `.exe` files and POSIX scripts run directly.

## `drip_check`

Checks, in order: the project's `lint`, `typecheck` (`typecheck`, `type-check`, `check-types`, `tsc`), `test` scripts from `package.json` (package manager from the lockfile; script names validated; `execFile` argument arrays; 180 / 240 / 300 s timeouts; output trimmed to the last 30 lines, `file:line` locations parsed), `fitcheck-lint` (the same rules as `fitcheck_lint`, called directly on the UI files: going through the tool registry would make an import cycle that breaks the esbuild bundle), `components-audit`, `dry-lint`.

Result per check: `name`, `status` (`pass` / `warn` / `fail` / `skipped`), `durationMs`, `findings` (`file`, `line`, `severity`, `message`, `fix`), `summary`, `fix`, `reused`. `runCheck(...)` returns `exitCode` 0, or 1 when a check failed; warnings never fail it. The tool marks the result as an error on exit code 1.

**Receipts** (`.drip/check/receipts.json`): a check's result is reused only when the hash of its inputs is identical: the indexed file hashes, design tokens (CSS), an assets fingerprint (names and sizes under the project), the relevant config, tool versions (Node, check version), the slop rules and DESIGN.md for the lint, the exceptions file for the audit, the judge and model for judged checks. Anything else, or `full: true`, runs the check. `changed: true` scopes the audit and the lint to files whose hash differs from the last run's snapshot. A receipt never replaces looking at the rendered design.

## Evidence for the workflow (for the coordinator)

`core/check.mjs` exports:

- `componentEvidence(task, root?)` returns `{ searched, searches, planned, audited, auditHigh, auditTotal, auditStale, previews, indexedAt }` for `task.id`. It refreshes the index first (milliseconds when nothing changed) and writes nothing else. `auditStale` is true when the code changed after the last audit.
- `recordComponentEvidence(taskId, kind, data)` is called by the tools (`search`, `plan`, `audit`, `preview`) into `.drip/index/evidence.json`.

Where to call `componentEvidence`: `drip_start` (a line: "components: N indexed, M searched this task"), `missingBeforeUi` (require `searched >= 1` before UI writes on a component-first task; block only that, since a verified search is a verifiable fact), `fitcheck_done` (reject a pass while `auditHigh > 0` or `auditStale`, under the configured policy; recorded exceptions stay possible), `drip_end` / the Stop hook (list `auditStale`). Nothing in `state.mjs` or `workflow.mjs` was touched.

## Limits

- `components_preview` for React/Vue/Svelte needs the user's Storybook or Ladle; the tool says so and detects a running Storybook on :6006 / :6007 (`/index.json`). Not tested against a live Storybook here.
- The extractor can miss props behind complex generics, HOCs and re-exports; usage is resolved by import binding and name, not by type.
- Not tested on macOS or Linux (the Windows-only code paths are the `.cmd` judge and the `cmd.exe` script runner).
