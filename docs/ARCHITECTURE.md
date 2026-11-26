# Architecture

```
drip/
  .agents/plugins/   marketplace.json (Codex install source)
  plugin.json        portable manifest for the native Codex plugin
  mcp.json           launches the shared Drip bundle for Codex
  .claude-plugin/      plugin.json (manifest), marketplace.json (install source)
  (plugin.json → mcpServers)  starts the MCP server: node mcp/dist/drip-mcp.mjs (inline, so no project .mcp.json is created)
  skills/              22 skills: drip (director) + drip-<craft>; each SKILL.md + guide.md + reference/
  rules/               shared rules served as drip_guide rules/<x>
  commands/            /drip:design, /drip:critic, /drip:adapt, /drip:settings
  hooks/               hooks.json + Node scripts (gate, recorder + lint, stop guard, prompt nudge)
  data/                catalogue.json, font-pairs.json, slop.json
  mcp/
    src/index.mjs      server: instructions + module registration
    src/core/          paths, config, state (+ gates, one task per session), guides, http (throttle + cache),
                       browser (ONE shared headless Chrome over CDP: tabs ~100 ms, closes after 10 idle min),
                       cdp (whole-page capture + audit + brand + interaction states), imaging (crop/resize/WebP,
                       contact sheets, optical centre, icon sizes: all in the browser), serve (static preview server),
                       skills (DESIGN.md + the workspace's own skills), images, keys, seen, preview, result helpers,
                       registry (ONE tool list for MCP, CLI, Code Mode and host adapters), jsonstore (lock + atomic
                       write + revision check), project + memory + evidence (design memory, artifact revisions),
                       check + indexer/ (component index, drip check), cli + doctor + vendor, codemode/ (QuickJS),
                       apps (MCP Apps views)
    src/hosts/         install / uninstall / doctor per host (Codex, Cursor, OpenCode, Claude Desktop, ChatGPT)
    src/modules/
      workflow.mjs     drip_start / guide / status / mark / skip / end
      refs/            dribbble.mjs (source adapter) + index.mjs (tools)
      board/           store, render (HTML), server (live board), index (tools)
      components/      catalogue + shadcn-style registries
      assets/          color (OKLCH maths), palette, gradient, icons (Iconify), fonts (Fontsource), images (photos)
      gen/             providers/ (openai, gemini, template) + keypage (local key form) + index
      fitcheck/        chrome (screenshot via the shared browser), lint (slop rules), drift (DESIGN.md vs CSS),
                       compare (drip_compare, board_brand), index (tools)
      project/         master board, project_context, feedback, learned rules, style extract/export/import
      patterns/        refs_extract, pattern study / spec / preview / compare / save
      inspire/         gallery sources (refs_gallery), catalogue ranking
      studio/          art_generate, shader_hero, scene_render, 3D assets, blender_render, motion_render
      codemode/        drip_search, drip_execute
    dist/drip-mcp.mjs  the bundle (committed)
    test/              unit + hooks + skills + browser.test.mjs (browser tools, offline, runs in CI);
                       smoke.mjs / smoke-03.mjs (end to end, hit Dribbble and other services)
  hooks/hosts/         hook adapters: translate Codex / Cursor / OpenCode payloads to the hooks above
  hosts/               generated per-host packages (npm run build:hosts)
  kit/                 base.css (7 type roles, grid, floor), DESIGN.template.md, comp.html, brand-board.html
  .github/workflows/   ci.yml: lint, build, stale-bundle check, tests on Linux + Windows; manifest versions agree
```

## How enforcement works

1. **State.** `<project>/.drip/state.json` holds one task PER SESSION (`tasks`, `sessions`): the loop size,
   required guides and which were read, references studied, the board and chosen direction, UI writes, fit-check
   results. The server (one per Claude session) remembers its task and its `CLAUDE_CODE_SESSION_ID`; hooks get
   `session_id` from Claude Code; `hooks/bind.mjs` binds a session to the task its `drip_start` created. A session
   never sees, gates on, records into or closes another live session's task; a task whose session is gone is
   picked up by the next one.
2. **Guides through a tool.** `drip_guide` returns a guide and records the read. Skill files hold only the
   first-screen rules; the depth lives behind the tool call, so "I read the skill" can be checked.
0. **Opt-in.** With `gates.mode: "task"` (default) every hook is silent unless a Drip task is open
   (`/drip:design` → `drip_start` … `drip_end`). `"always"` makes the gate apply to every UI write.
3. **Gates in hooks.** `hooks/pre-write.mjs` runs before Write/Edit. For UI files it computes what is missing
   (`missingBeforeUi` in `core/state.mjs`) and denies with the exact next call. Logic-only edits pass.
4. **Recording + lint.** `hooks/post-write.mjs` records UI writes and lints the file (rules in `data/slop.json`),
   feeding problems back to Claude immediately.
5. **No finishing without looking.** `hooks/stop.mjs` blocks the end of a turn when UI changed after the last
   fit check (max 3 blocks in a row, then it lets go).
6. **Nudges.** `hooks/prompt.mjs` and `hooks/session-start.mjs` add one line of context so Claude calls
   `drip_start` without being told.

Hooks import the dependency-free parts of `mcp/src/core` directly, so the server and hooks share one source of truth.

## Sources of design data

| Need | Source | Key |
|---|---|---|
| References | Dribbble web-client endpoints (XHR fragments + embedded shot JSON), throttled ~1 req/s, cached | none |
| Components | shadcn-style registries (`/r/registry.json`) + shadcn's registry directory | none |
| Icons | Iconify public API | none |
| Fonts | Fontsource API; specimens via Google Fonts CSS | none |
| Photos | Wikimedia Commons; Unsplash, Pexels (free keys); Openverse | optional |
| Image generation | OpenAI, Gemini, custom adapters | user's own |
| Screenshots / previews | the user's Chrome or Edge, headless | none |

## Adding a reference source

Write `mcp/src/modules/refs/<source>.mjs` exporting `listing()` and `shot()` with the same shapes as
`dribbble.mjs`, then register tools for it in `refs/index.mjs`. Keys in `seen` are `<source>:<id>`, so boards
and contact sheets work unchanged.

## Roles: the director and its crew (Swarm Mode)

Swarm Mode is the same design loop with the work split by cost. The director (the session's own model) keeps the decisions and a small
context; cheap subagents do the reading, building and measuring. Gates, state and evidence are unchanged: the crew uses the same tools.

| Agent | File | Model | Does | Returns |
|---|---|---|---|---|
| Scout | `agents/scout.md` | Haiku | `refs_site` / `refs_search` / `refs_gallery` for ONE role, drops cookie and bot pages, calls `refs_study` with the role | top 3, five-line study each |
| Builder | `agents/builder.md` | Sonnet | builds ONE section from the director's spec, DESIGN.md and the kit | changed files, one-section screenshot path |
| Checker | `agents/checker.md` | Haiku | `fitcheck_shot` with `numbersOnly` (or `section`), per section | blockers and numbers only |
| Critic | `agents/critic.md` | Sonnet | independent review (not part of this module) | verdict, scores, fixes |

### Tools (module `mcp/src/modules/swarm`)
- `scout_prepare({ role, subject?, style? })`, `build_prepare({ section, spec, files?, url? })`, `checker_prepare({ url?, sections?, imagesOnRequest? })`
  return the exact prompt and the `Agent({ subagent_type: "drip:<agent>", ... })` call, as `critic_prepare` does. The prompt is passed unchanged.
- `swarmInstructions(task, { env })` is the short block `drip_start` shows in swarm mode. It says so when the host does not launch Drip's named subagents.
- `swarmOn(config, task)`: swarm is on when the config has `swarm: true` (default false) or the task was started with `mode: "swarm"`.
  (Wiring into `drip_start` and the config default belongs to `workflow.mjs` and `core/config.mjs`.)

### Hosts
Claude Code (and the Cowork plugin) load `agents/*.md` from the plugin, model in the frontmatter. Other hosts are not given the swarm agents:
they fall back to the single-agent loop, which the `*_prepare` tools still support (see [HOSTS.md](HOSTS.md#swarm-mode-without-subagents)).

The roles are in `skills/drip/fast.md` (Roles; `drip_guide fast`).

## Drip Film: watch the swarm build

A Drip task records who did what and frames of the page as it is built. The user watches it live and gets a montage at the end, in any IDE: the viewer is a static page Drip serves on localhost.

### Pieces

| Part | Where | What |
|---|---|---|
| Events | `hooks/agent-start.mjs`, `agent-stop.mjs`, `post-write.mjs`, `film.mjs` | Append-only lines in `.drip/film/<task>/events.jsonl`: a subagent's start (type, label, section, piece from its brief), its end (SubagentStop), every UI write and every Drip tool call, each with the `agent_id` Claude Code puts on hook input (`main` for the director). Hosts without these hooks: the server logs its own tool calls (`registry.mjs`, `filmed`). |
| Frames | `mcp/src/modules/film/index.mjs` (`tick`, every 5 s in server mode) | When the page changed (a write, stitch or install) and at most every 12 s, a 1440x900 JPEG of `task.filmUrl` (set by `drip_serve` and the first `fitcheck_shot`) into `frames/`, indexed in `frames.json`. |
| film.json | `mcp/src/core/film.mjs` (`buildFilm`) | Agents (a start is matched to the first unseen `agent_id` of its type), events and frames (each frame knows who was working). The one file the viewer reads. Contract: `version`, `task`, `agents[]`, `events[]`, `frames[]`. |
| Viewer | `film/viewer/` (designed with Drip) | Live: agents as cards, the feed, the latest frame. Montage: the frames as a time-lapse with a lane per agent. `drip_film` copies it next to film.json and serves the folder; without it a small built-in viewer is used. |
| Montage | `finishFilm` at `drip_end` | A last frame, `endedAt`, the link in drip_end's reply, and `montage.mp4` when ffmpeg is on PATH. |

Turn it off per task with `task.film = false`.
