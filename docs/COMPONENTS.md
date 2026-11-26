# Components: project index, reuse, audit and `drip_check`

Code: `mcp/src/core/indexer/` (walk, extract, index), `mcp/src/modules/components/{local,audit,drylint}.mjs`, `mcp/src/core/check.mjs`. The existing tools (`components_find`, `components_get`, `components_registries`, `components_catalogue`) are unchanged; they search the outside world, the new ones look at THIS project first.

## Pieces (0.8.2, 0.8.3)

**Search by need is the main path.** `components_find({ need })` searches ~3,300 free components live across 14 registries (shadcn and its blocks, coss, Kibo, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI, Smooth UI, Eldora, efferd's free blocks, bencho, sakuga-vfx; light stemming, so "comparison" finds "compare"). Every result has an install URL and a page to see it. `pieces_preview({ items: [{ library, item }] })` shoots up to 8 pieces onto one numbered sheet, each cropped to the piece itself (the docs page's Preview panel, or a page that is the piece alone: shadcn, efferd and Eldora `/view/`), with promos, cookie banners and floating widgets hidden, images, fonts and canvases loaded first, and a blank shot retried once. The page patterns are the `preview` field in `content/data/catalogue.json`. efferd's standalone `/view/<block>` page is used, and React Bits' category paths come from its llms.txt. Not shown as previews: Animate UI and coss (no per-item page). Paid kits (Breeze UI, a private registry) are recorded with `drip_kits` and never searched without access.

**App screens:** `layout_deal({ surface: "app" })` deals app pieces (59 so far): shadcn's dashboard-01, sidebars, logins and charts; Kibo's kanban, gantt, calendar, dropzone, editor and media; bencho's inputs, media, feedback and status pieces. bencho blocks read `--bencho-` tokens (`bencho-tokens` installs with them): map them to the page's tokens.

`content/data/pieces.json` holds about 210 free, finished pieces from proven libraries (Magic UI, React Bits, Cult UI, Smooth UI, Eldora, Aceternity, Animate UI, efferd's free blocks, sakuga-vfx), each with a role (nav, ground, headline, showcase, features, logos, numbers, proof, pricing, faq, cta, footer, button, scroll). They were checked against each library's live registry index on 2026-11-25. `layout_deal` deals one or two per section with a history so pages differ (`mcp/src/modules/parts/pieces.mjs`); WebGL grounds go only to software, gaming and tech pages. Every fast-loop `build_prepare` section names its piece or says why it is custom.

- **The stack follows the pieces.** Software, gaming and tech pages are scaffolded as Vite + React + Tailwind v4 (`parts/react.mjs`). The dealt palette and type are mapped to the token names shadcn-style pieces expect (`bg-background`, `text-muted-foreground`, `bg-primary`...), and `components.json` knows the registries. Products, services and places stay one static page with taste-skill's kit. `stack` overrides it.
- `pieces_install({ page, urls })` runs one shadcn CLI install (parallel builders would fight over npm). `drip_serve` runs Vite for a React page.
- `drip_kits({ owned })` records the paid kits the user owns (asked once per machine, `~/.drip/kits.json`); deals then mention them.
- Aceternity's registry items leave out their keyframes; builders add them to `src/index.css` from the library's page.
- Keep the list current: rerun the check against the registries before adding names (each library's `r/registry.json`; efferd's `llms.txt` marks free blocks).

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

## Patterns: study, extract, implement, render, compare, save

Module: `mcp/src/modules/patterns/`. Skill: `skills/drip-patterns/`. Everything runs in the user's own Chrome/Edge through the shared browser (`core/browser.mjs`); no hosted service.

### Tools

| Tool | What it does |
|---|---|
| `refs_extract({ url \| file, selector?, states?, sizes? })` | Measures a live page, a local .html or a screenshot. Returns a readable spec plus a contact sheet and writes the full JSON to `.drip/cache/extract-<time>.json`. Saves nothing else. |
| `pattern_study({ name, url \| file, selector?, kind?, states?, sizes?, tags?, title?, author?, notes? })` | Extract plus evidence: `.drip/patterns/<id>/spec.json`, `spec.md`, `reference/base-<w>.png` and `reference/state-<n>-<w>.png`, and an index entry with status `proposed`. |
| `pattern_spec({ id, notes?, patch?, url? \| file? })` | Adds notes, sets fields by dotted path, or re-measures. Rewrites spec.json and spec.md. |
| `pattern_preview({ id?, url \| file \| html+css+js, selector?, states?, sizes? })` | Renders an implementation at sizes and states. Plain HTML/CSS/JS gets a generated neutral test page. React: pass the user's dev server, Storybook or Ladle URL. Saves shots and `impl-spec.json` in `.drip/patterns/<id>/preview/`. |
| `pattern_compare({ id, url \| file \| html..., selector?, threshold?, axe? })` | Reference \| implementation \| diff heatmap per size and state, pixel-difference percentages, measured spec deltas, axe-core, keyboard checks. |
| `pattern_save`, `pattern_list`, `pattern_get` | The project's pattern library (`.drip/patterns/index.json`). |

Without `states`, `pattern_preview` and `pattern_compare` reuse the reference's own steps, so every state is compared.

### What the spec holds

`schema: 1`, `kind` (`live`, `local`, `screenshot`), `inferred`, `source { url, file, selector, title, author, capturedAt }`, then:

- `root`, `structure` (up to 40 nodes: geometry relative to the root, layout mode, type, colours, radius, border, shadow, padding)
- `type { families, scale }`, `hierarchy`, `colors { roles, palette }` (roles: background, surface, text, muted, border, accent), `spacing { unit, padding, gaps }`, `radii`, `shadows`
- `states[]`: per step, which tracked elements changed which properties (computed style, size, position, `aria-*`, `data-state`), what appeared or disappeared. Popups rendered in portals (`role=menu`, `listbox`, `dialog`, `tooltip`, Radix poppers) are tracked too.
- `motion { declared, keyframes, reducedMotionRules, observed }`: declared transitions and animations (duration, easing, delay) and, for every step, the animations running right after the input (`getAnimations()` plus transition and animation events), with sampled opacity, transform and size over time and the time it took to settle.
- `responsive { 375, 768, 1440 }`: root size, layout mode, visible and hidden children, text size range, horizontal overflow, smallest interactive target.
- `keyboard`: tab order with focus visibility, and for the first popup trigger whether Enter or ArrowDown opens it, ArrowDown moves focus, Escape closes it and where focus goes.
- `aria`: roles, `aria-*` attributes, interactive and tabbable counts, issues (unnamed controls, dangling `aria-controls`, small targets).

A screenshot has no DOM: its spec has `inferred: true`, colours (quantised palette), size, layout bands and content column, and says everything else is unknown.

### Compare

- Pixel metric: pixelmatch's YIQ perceptual delta (threshold 0.1 by default), computed in the browser. Images are aligned at the top-left on the larger canvas; a size difference is reported as such.
- Deltas (`compareSpecs` in `spec.mjs`), each `high`, `medium` or `low`: root size per breakpoint, layout mode, overflow, type sizes, main font, colour roles (RGB distance), radii, shadows, padding values, longest transition or animation duration and easing, states that change nothing, popup trigger, tab stops, focus ring, opens from the keyboard, Escape closes, ARIA roles and attributes.
- axe-core 4.10.2: read from `DRIP_AXE_PATH` if set; otherwise downloaded once from jsDelivr (pinned) into `~/.drip/vendor/` and injected through CDP. If neither works, the output says "axe: not run" and why. axe is not bundled.

### Index schema (read by the components module)

`.drip/patterns/index.json`, written through `core/jsonstore.mjs` (lock, atomic write, revision):

```json
{ "revision": 7, "patterns": [{
  "id": "actions-menu", "name": "Actions menu",
  "kind": "component | section | page | motion | style",
  "files": ["src/components/actions-menu.tsx"],
  "spec": ".drip/patterns/actions-menu/spec.json",
  "previews": [".drip/patterns/actions-menu/reference/base-1440.png"],
  "source": { "url": "https://...", "file": "...", "title": "...", "author": "...", "capturedAt": "..." },
  "status": "proposed | approved", "tags": ["menu"], "notes": "...", "updatedAt": "..." }] }
```

All paths are project-relative. `store.mjs` exports `listPatterns({ status, kind, tag })`, `getPattern(id)` and `upsertPattern(entry)` for other modules.

### Additions to shared code

- `core/cdp.mjs`: `runStep(s, step)` (one real-input step; adds `press`, `release` and `focus` to the kinds `captureStates` knows) and `STEP_KINDS`. `captureStates` itself is unchanged and could call `runStep` later.
- `core/browser.mjs`: `evalJson(s, expression)`.

### Limits

- Hover, focus, active and open states are measured by real input. A permanently `disabled` element only shows up in `structure` and ARIA, not as a state step.
- Closed Shadow DOM and cross-origin iframes are not measured. Cross-origin stylesheets cannot be read for `@keyframes` (the running animation is still observed).
- Pixel comparison is only meaningful when both renders share fonts; with different fonts read the deltas.
- Verified here on Windows with Edge. Not run on macOS or Linux.
