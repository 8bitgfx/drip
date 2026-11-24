# Architecture

```
drip/
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
                       skills (DESIGN.md + the workspace's own skills), images, keys, seen, preview, result helpers
    src/modules/
      workflow.mjs     drip_start / guide / status / mark / skip / end
      refs/            dribbble.mjs (source adapter) + index.mjs (tools)
      board/           store, render (HTML), server (live board), index (tools)
      components/      catalogue + shadcn-style registries
      assets/          color (OKLCH maths), palette, gradient, icons (Iconify), fonts (Fontsource), images (photos)
      gen/             providers/ (openai, gemini, template) + keypage (local key form) + index
      fitcheck/        chrome (screenshot via the shared browser), lint (slop rules), drift (DESIGN.md vs CSS),
                       compare (drip_compare, board_brand), index (tools)
    dist/drip-mcp.mjs  the bundle (committed)
    test/              unit + hooks + skills + browser.test.mjs (browser tools, offline, runs in CI);
                       smoke.mjs / smoke-03.mjs (end to end, hit Dribbble and other services)
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
