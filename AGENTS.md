# Working on Drip (for coding agents)

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first, then [docs/SKILL_FORMAT.md](docs/SKILL_FORMAT.md) before touching any skill.

- **Skills**: `skills/drip-<topic>/SKILL.md` stays short (first-screen rules + "call drip_guide"); depth goes in `guide.md` and `reference/*.md`. Every reference file must be listed in its SKILL.md table. Reference other guides by topic name, never by path. Only mention MCP tools that exist (list in SKILL_FORMAT.md).
- **Enforcement lives in tools and hooks, not prose.** If agents keep skipping something, add a gate (`missingBeforeUi` in `mcp/src/core/state.mjs`) or a tool error that names the right call, not another paragraph.
- **Server**: plain ESM JavaScript in `mcp/src`. Files under `mcp/src/core` that hooks import (`paths`, `config`, `state`) and `modules/fitcheck/lint.mjs` must stay dependency-free.
- **Always lint, rebuild and test** after server changes: `cd mcp && npm run check` (lint + build + tests, the same as CI in `.github/workflows/ci.yml`; CI also fails when the committed `mcp/dist` bundle is stale). Run `npm run smoke` for network paths (it calls Dribbble, Iconify, Fontsource, registries; it never calls paid APIs).
- **Commit `mcp/dist/drip-mcp.mjs`**: users run the plugin without `npm install`.
- **Brand and README art live on the `brand` branch** (logo sources, renders, `assets/readme/*.png`); the README loads them by raw URL. Keep `main` free of them; only `.claude-plugin/icon.png` stays here.
- **Licences**: guides adapt MIT/Apache sources in our own words with credit (CREDITS.md); paraphrase-only for sources without a reuse licence. Never commit third-party assets.
- **Be polite to Dribbble**: keep requests throttled and cached (`core/http.mjs`); never add bulk downloading.
- **Roles are fixed**: the session the user talks to is the director (the artist and manager): it looks, decides, picks pieces and writes specs. One or two `drip:builder` agents write the code. It never hands the whole task to a new session or a swarm.
- **Release**: bump the version in `.claude-plugin/plugin.json`, `plugin.json`, `hosts/chatgpt/plugin.json`, `hosts/claude-desktop/manifest.json`, `mcp/package.json`, `mcp/package-lock.json` and `mcp/src/index.mjs`; `npm run build` and `npm run build:hosts` (the hosts test fails on stale `hosts/`); push only after `npm test` shows `fail 0`; chain the push behind that check, never after it unconditionally.
- **Local install**: copy `git archive HEAD` into `~/.claude/plugins/cache/drip-design/drip/<ver>`, update `~/.claude/plugins/installed_plugins.json`, and reset the marketplace clone `~/.claude/plugins/marketplaces/drip-design` to `origin/main`. Background subagents run hooks from the marketplace clone, so a stale clone runs old gates.
- **Testing**: run the CLI with `CLAUDE_PROJECT_DIR` pointing at a scratch folder (e.g. `C:\Dev\drip-lab`); otherwise it writes `.drip/` into whatever repo the shell is in.

## Gotchas
- **Backslashes**: `node -e`, heredocs and `sed` mangle `\n`, `\b` and `\\` (one write produced literal backspace bytes). Write regex-heavy code with the editor, or replace whole lines read from a file.
- **The AUDIT string** in `core/cdp.mjs` is a template literal run in the page: no `${}` inside it, and backslashes doubled.
- **esbuild bundle**: a dynamic `import()` of a module that is also imported statically breaks zod's init order ("Class2 is not a constructor"). Use static imports.
- **designDoc** (`core/skills.mjs`): a page Drip builds in its own folder (`task.page.dir`) reads only its own DESIGN.md. Falling back to the host repo's guide fed one product's style guide to another product's critic.
- **Transcript checks** (`hooks/transcript.mjs`, `hooks/claims.mjs`): claims on the user's or critic's behalf are checked against the Claude Code transcript. Hook feedback, task notifications and system reminders arrive as "user" rows: never count them as the user. Other hosts have no transcript, so the checks pass there.
- **Gates count calls, not work**, unless written carefully. Every gate added so far was dodged by the cheapest call that satisfies it; check the result (files on disk, the page, the transcript), not that a tool ran.

See [docs/NEXT.md](docs/NEXT.md) for the open problems and the user's latest feedback.

- **Data files** (`data/*.json`) are the place for catalogue entries, font pairings and slop rules; keep `price`/`license` as "check" unless verified.
