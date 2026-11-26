# Drip on other agent hosts

Drip's engine is one local Node program (`mcp/dist/drip-mcp.mjs`, a stdio MCP server, plus the same code as a CLI). Each host starts that same engine on the user's machine; nothing is hosted, no account, no tunnel. A host adapter only does the host-specific parts: where the MCP server is registered, where skills and rules go, how hooks are wired, which subagent plays the critic.

**Status: the host integrations below have automated checks. Live desktop installation remains unverified.** The installers, hook adapters and packages are tested against temporary home folders and sample payloads written from the official docs (`mcp/test/hosts.test.mjs`). Codex, Cursor and OpenCode are not installed on the development machine and no host software was installed or run. Research was done on 2026-11-24 from the pages linked below; the docs were read through a summarising fetch tool, so quoted shapes are approximate where marked.

## Install

```sh
drip hosts                                   # list hosts and their state
drip install --agent codex [--dry-run]       # codex | cursor | opencode | claude-desktop | chatgpt
drip uninstall --agent codex                 # removes only what install added
drip doctor                                  # includes one line per host
drip hosts doctor codex                      # one host in detail (the host's files plus the machine checks of drip doctor)
drip doctor --fix --yes                      # installs MockStudio, axe-core, svgo (never Chrome, Edge or Blender)
```

`install` points the host at this checkout (or at the installed plugin folder) with absolute paths, makes a backup of every file it changes (`<file>.drip-backup-<time>`), never overwrites a file it cannot parse, never replaces an entry it did not write (a user's own server called `drip` is left alone and reported), and records what it did in `~/.drip/hosts/<host>.json` so `uninstall` removes exactly that. It needs `mcp/dist/drip-mcp.mjs` (`cd mcp && npm ci && npm run build`). Programmatic API: `mcp/src/hosts/index.mjs` (`install`, `uninstall`, `listHosts`, `doctor`; `home` and `env` are injectable).

`npm run build:hosts` (in `mcp/`) regenerates `hosts/<host>/` (templates with `<DRIP_ROOT>` / `${PLUGIN_ROOT}` placeholders, committed; `--check` fails when stale) and, with `--pack`, builds self-contained packages in `dist-hosts/` (not committed): `chatgpt-plugin/`, `codex-plugin/` and `drip.mcpb`. `--mcpb` builds only the Claude Desktop extension.

## Capability matrix

`supported` = built and tested with sample payloads; `partial` = see the note; `unsupported` = the host has no way to do it (stated, not faked); `unknown` = docs silent and not tested.

| | MCP tools | Image results | Skills | Write hook | Stop hook | Session start | Critic subagent | MCP Apps |
|---|---|---|---|---|---|---|---|---|
| Claude Code (reference, unchanged) | supported | supported | supported | supported | supported | supported | supported | unknown |
| Codex | supported | unknown | supported | supported | supported | supported | partial (1) | unknown |
| Cursor | supported | supported | supported | supported (2) | supported (3) | supported | supported | supported |
| OpenCode | supported | unknown | supported | supported (4) | unsupported (5) | unsupported | supported | unknown |
| Claude Desktop chat | supported | unknown | partial (6) | unsupported | unsupported | unsupported | unsupported | unknown |
| Claude Cowork (Drip plugin) | supported | unknown | supported | partial (7) | partial (7) | partial (7) | supported | unknown |
| ChatGPT Desktop / Work | supported (8) | unknown | supported | supported (9) | supported (9) | supported (9) | unknown (10) | unknown |
| T3 Code | via the agent underneath (11) | | | | | | | |
| Claude / ChatGPT in the browser | deferred (12) | | | | | | | |

1. Codex subagents are separate TOML files (`~/.codex/agents/*.toml`) but inherit the parent's permissions and MCP servers; the docs say `sandbox_mode` and `mcp_servers` in an agent file do not override the parent. The critic is read-only by its prompt, not by the host.
2. The payload fields of Cursor's file-writing tool (`tool_input`) are not documented in the pages read; the adapter reads `file_path`, `path`, `target_file` and `contents`/`content` tolerantly. Unverified against a running Cursor.
3. Cursor's stop hook cannot block; it returns `followup_message`, which makes Cursor run another turn (`loop_limit` 5; Drip stops asking after 3).
4. Through an OpenCode plugin (`tool.execute.before` throws to block). Only the V1 plugin API is implemented (see OpenCode below).
5. OpenCode plugins have no hook that can block the end of a turn (`session.idle` is observe-only). The installed rule tells the agent to call `drip_status`, `fitcheck_done` and `drip_end` itself. Where the host cannot force the loop, Drip's gates enforce completion through Drip's own tools only.
6. Skills in Claude chat are uploaded as a ZIP under Customize > Skills (needs code execution enabled); the Drip engine is reachable only through MCP there.
7. Cowork loads the Claude Code plugin format. Sub-agents and hooks are documented as running in Cowork, but a GitHub issue (claude-code #27398) reports plugin hooks not firing in Cowork on Windows. Treat the gates as unverified in Cowork.
8. ChatGPT reaches a local stdio server only through a desktop-only plugin (below); custom MCP connections in ChatGPT web are remote-only.
9. Plugin hooks work only for plugins installed manually in the desktop app and must be trusted by the user in the app.
10. The docs list `SubagentStart`/`SubagentStop` hook events but say nothing about bundling subagents in a plugin; the critic gate is not claimed on this host until tested.
11. T3 Code is a front end for other agents (below).
12. See "Web hosts".

Where a host has no write or stop hook, or no subagent, Drip says so in the installed rule file and in the install output. It never presents self-review as the independent critic: on hosts without a subagent the critic gate is unsupported, and a full workflow that requires it is unsupported there.

## Setup and doctor on every host
- `drip install --agent <host>` first runs the full `drip doctor` checks. A missing Chrome or Edge (every screenshot, fit check and preview needs one) stops the install with exit 3 and the exact fix: install Chrome or Edge, or set `DRIP_CHROME` / `fitcheck.chromePath`. `--dry-run` only warns. Drip never installs Chrome, Edge or Blender.
- `drip hosts doctor <host>` and `drip doctor` add the same machine checks (Node, Chrome/Edge, optional pieces, project, Code Mode) to the host's own lines, so "ready" means the first visual step will work.
- `drip_start` mentions what is missing once per machine (cached in `~/.drip/setup.json`); `drip doctor --fix --yes` installs the optional pieces.

## Swarm Mode without subagents
Swarm Mode ([ARCHITECTURE.md](ARCHITECTURE.md#roles-the-director-and-its-crew-swarm-mode)) needs a host that launches Drip's named subagents (`drip:scout`, `drip:builder`, `drip:checker`, with a model per agent). Claude Code and the Cowork plugin do. The other hosts here only get the critic agent, so on them:
- `swarmInstructions` says "work the single-agent loop": the same gates and tools, you scout, build and check yourself, in the same order.
- `scout_prepare`, `build_prepare` and `checker_prepare` still work as written briefs. Where a host has its own subagents you may launch them with those prompts by hand; Drip does not install or claim them.
- Nothing is lost except the cost saving. The host is detected from `DRIP_HOST` (set by every adapter; unset means Claude Code).

## What each adapter does

All hosts: the engine is registered as a local stdio server; the skills in `skills/` are copied with Claude-Code-only wording rewritten (`mcp/src/hosts/adapt.mjs`: tool names without the `mcp__plugin_drip_drip__` prefix, no "load deferred tools with ToolSearch" step, the critic called by the host's name, no `AskUserQuestion`); a short always-on rule says Drip is opt-in, to start with `drip_start`, to use the host's `drip-critic` subagent and what the host cannot enforce. The hook adapters are in `hooks/hosts/<host>.mjs`: they translate the host's payload to the Claude Code format, run the unchanged `hooks/pre-write.mjs` and friends, and translate the answer back (denial, block, extra context). On any error they print nothing and exit 0, so a host is never broken by Drip. Session ids map to Drip's per-session task state, so several sessions in one folder stay separate.

### Codex native plugin

Run `codex plugin marketplace add 8bitgfx/drip`. Open **Plugins** in the ChatGPT desktop app or `/plugins` in Codex and install **Drip** from **Drip Design**. Review the plugin hooks with `/hooks` and trust them to enable Drip's write and completion checks. Start a new session and ask `@Drip` for a design.

The plugin starts the committed Drip MCP bundle in your project and includes Drip's skills and design guides. It needs Node 22+ on `PATH` and Chrome or Edge for screenshots. To update the marketplace, run `codex plugin marketplace upgrade drip-design`.

For independent reviews, put [drip-critic.toml](../hosts/codex/agents/drip-critic.toml) in your Codex `agents/` folder (`~/.codex/agents/` by default, or `$CODEX_HOME/agents/` if set), then start a new session. Codex loads custom agents from its own agent directories. The Drip workflow uses this named agent to record independent reviews.

If you previously ran `drip install --agent codex`, use the same checkout to run `node mcp/dist/drip-mcp.mjs uninstall --agent codex` before enabling the plugin. This avoids loading two copies of the MCP server and hooks. Set up the critic again after uninstalling the old integration.

### Codex direct installer (CLI and desktop app)

- MCP: `[mcp_servers.drip]` in `~/.codex/config.toml` (`$CODEX_HOME` honoured), inside a marked block, with `startup_timeout_sec` and `tool_timeout_sec`. Source: https://learn.chatgpt.com/docs/extend/mcp?surface=cli (redirect target of developers.openai.com/codex).
- Skills: `~/.agents/skills/<skill>/SKILL.md` (https://learn.chatgpt.com/docs/build-skills).
- Hooks: `~/.codex/hooks.json`, Drip's groups merged next to the user's: `SessionStart`, `UserPromptSubmit`, `PreToolUse` and `PostToolUse` on `apply_patch|Edit|Write`, `PostToolUse` on `drip_start` (binds the session to its task), `Stop`, `SubagentStop` (records that the critic really ran). The patch text in `tool_input.command` is parsed for file names and added lines. Denial is `hookSpecificOutput.permissionDecision: "deny"`, a stop block is `{ decision: "block", reason }`, extra context is `hookSpecificOutput.additionalContext` (https://learn.chatgpt.com/docs/hooks). Codex asks the user to review new hooks (`/hooks`) before they run.
- Critic: `~/.codex/agents/drip-critic.toml` (https://learn.chatgpt.com/docs/agent-configuration/subagents).
- Rules: a marked block in `~/.codex/AGENTS.md` (the global AGENTS.md location is from general Codex knowledge, not confirmed on the pages read).
- Unknown: image results reach the model in the desktop app (a Codex commit renders MCP image blocks in the TUI); MCP Apps; the Windows form of `CODEX_HOME`; the hook payload of events other than `SessionEnd` is reconstructed from the field list, not from a verbatim example.

### Cursor

- MCP: `~/.cursor/mcp.json`, `mcpServers.drip` with `DRIP_PROJECT_DIR` set to `${workspaceFolder}` (https://cursor.com/docs/context/mcp). Images from tools are supported.
- Skills: `~/.cursor/skills/` (https://cursor.com/docs/skills). Rules: `.cursor/rules/drip.mdc` (`alwaysApply: true`) when a project folder is given; Cursor has no user-level rule file other than the Settings UI (https://cursor.com/docs/context/rules).
- Hooks: `~/.cursor/hooks.json` (`version: 1`): `sessionStart` (returns `additional_context`), `preToolUse` and `postToolUse` on `Write`, `afterFileEdit`, `stop` (returns `followup_message`), `subagentStop`, `afterMCPExecution` on `drip_start` (https://cursor.com/docs/hooks). Cursor's `beforeSubmitPrompt` cannot add context, so Drip's per-prompt reminders are not used there. Cursor also runs Claude Code hooks from `.claude/settings.json` (https://cursor.com/docs/reference/third-party-hooks); Drip does not rely on that.
- Critic: `~/.cursor/agents/drip-critic.md` with `readonly: true` (https://cursor.com/docs/context/subagents), which is a real restriction (no edits, no state-changing shell), unlike Codex.
- Unknown: the file-write tool's `tool_input` shape; whether the MCP server sees any Cursor environment beyond what `env` sets.

### OpenCode

- Two doc generations exist: V1 (`mcp.<name>`, https://opencode.ai/v1/docs/mcp-servers/) and V2 (`mcp.servers.<name>`, https://opencode.ai/docs/mcp-servers/). The installer follows the layout already in `~/.config/opencode/opencode.json` and defaults to V1; if only `opencode.jsonc` exists it prints the snippet instead of rewriting a file with comments.
- Plugin (V1 API, https://opencode.ai/v1/docs/plugins.md): `~/.config/opencode/plugins/drip.js` runs Drip's adapter on `tool.execute.before` (throwing blocks the write) and appends lint notes in `tool.execute.after`. With a V2 config the plugin is not installed (the V2 plugin API, `Plugin.define`, has no documented way to block a tool except the permission hook); MCP, skills and the critic still install.
- Critic: `~/.config/opencode/agents/drip-critic.md`, `mode: subagent`, `permission: edit/bash/webfetch deny` (V1 key names; https://opencode.ai/v1/docs/agents/). Skills: `~/.config/opencode/skills/`. Rules: marked block in `~/.config/opencode/AGENTS.md`.
- Unknown: the exact `tool.execute.after` argument shapes (taken from community examples), image results, MCP Apps, which doc generation a given OpenCode build follows (`opencode --version`).

### Claude Desktop and Cowork

- Chat: `drip install --agent claude-desktop` adds `mcpServers.drip` to `claude_desktop_config.json` (macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`, Linux `~/.config/Claude/`; https://modelcontextprotocol.io/docs/develop/connect-local-servers). The Windows Store (MSIX) build reads a copy under `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\`; the installer edits that one when it exists (path from secondary sources, https://exchangepedia.com/2026/04/claudetools-claude-desktop-powershell-module.html). Claude Desktop gives a server no project folder: pass one to install (or set `DRIP_PROJECT_DIR` on the entry).
- Extension: `npm run build:hosts -- --mcpb` writes `dist-hosts/drip.mcpb` (manifest_version 0.3, `server.type: "node"`, `${__dirname}` paths, a `project_dir` `user_config` of type `directory`, the server, hooks, skills and data bundled; https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md). Install it from Settings > Extensions (Advanced settings > Extension Developer for a local file). Node is built into Desktop.
- Cowork: local MCP servers and plugins with local MCP servers work through the desktop app only (https://support.claude.com/en/articles/15520349). Cowork loads the Claude Code plugin format, so the existing `.claude-plugin` (skills, commands, `agents/critic.md`, hooks) is the Cowork integration; no separate adapter was written (https://support.claude.com/en/articles/13837440-use-plugins-in-cowork, https://code.claude.com/docs/en/plugins-reference). Cowork refuses plugins containing a `bin/` directory; Drip has none.
- Plain chat has no hooks or subagents: the write gate, stop gate and independent critic are unsupported there; the full workflow (which requires the critic) is unsupported in plain chat. Use Cowork, or Claude Code.
- Unknown: image results, MCP Apps rendering in Desktop vs Cowork, session id and project variables for a chat server, whether hooks fire in Cowork on Windows.

### ChatGPT Desktop / Work

- A desktop-only plugin (https://developers.openai.com/plugins/deploy/desktop-only, https://developers.openai.com/plugins/build/plugins): root `plugin.json` (schema `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, OpenAI settings under `extensions."com.openai"`: `hooks`, `requires_local_executor`, `interface`), `mcp.json` with a stdio entry using `${PLUGIN_ROOT}`, `hooks/hooks.json` in Codex format, `skills/`. `drip install --agent chatgpt` builds that folder (self-contained: server bundle, hook adapters, skills, data) in `~/.drip/hosts/chatgpt-plugin` and adds a local entry to `~/.agents/plugins/marketplace.json` (`source.path` starting with `./`); then install it from the ChatGPT desktop app. `npm run build:hosts -- --pack` also builds `dist-hosts/chatgpt-plugin` and `dist-hosts/codex-plugin` (the same format works with `codex plugin marketplace add`).
- A plugin with a local MCP server is desktop-only: it can be mentioned only in local threads, and public directory submission of local MCP servers is limited to allowlisted organisations. Plugin hooks are supported only for manually installed desktop plugins and need the user's trust; they cannot be in the public directory. The marketplace entry fields (`source.source`, `policy`, `category`) follow the docs' description, not a verbatim sample.
- Migration from a Claude plugin (https://developers.openai.com/plugins/guides/submit-claude-plugin) is a web portal that keeps skills and drops hooks, commands, agents and `.mcpb`; Drip does not use it, it builds the OpenAI-format plugin from the same sources.
- Not found in the docs: the phrase "Work with local execution" (a secondary report says Work on desktop can use local files and apps while web/mobile Work runs in the cloud), image results from MCP tools, MCP Apps in the desktop app, plugin-bundled subagents.

### T3 Code

T3 Code (https://t3.codes, https://github.com/pingdotgg/t3code) is a front end that drives Codex, Claude Code, Cursor, OpenCode and other agents; it is not a harness with its own MCP, skills or hooks. Install Drip into the agent you run under it (`drip install --agent codex`, ...). Whether T3 Code passes each agent's configuration through unchanged is not documented on the pages read and was not tested; `drip install --agent t3code` says this and changes nothing.

### Web hosts

Claude and ChatGPT in the browser are deferred. The engine is local, and a browser session can reach it only through a hosted service or a tunnel, which Drip does not have (ChatGPT's custom MCP connections require a public HTTPS URL or a tunnel: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt). A portable skill without the engine is not full Drip, so no degraded web version is offered.

## MCP Apps

The MCP Apps extension (https://github.com/modelcontextprotocol/ext-apps, stable spec 2026-01-26: tools declare `_meta.ui.resourceUri` pointing at a `ui://` HTML resource, MIME type `text/html;profile=mcp-app`) is listed as supported by Claude, ChatGPT and VS Code; Cursor's docs say it supports the extension; for Codex and OpenCode the docs are silent. Drip's previews still use the local browser, image results and files everywhere; the studio workstream adds the `ui://` resource helpers.

## Not done

- No host was run. Hook payload shapes marked unknown above are the first things to check on a real install (`drip hosts doctor <host>` reports what is installed, not that the host loads it).
- Claude Desktop `.mcpb` was zipped and its manifest checked against the file layout; it was not loaded into Claude Desktop (the real Claude Desktop config was not touched).
- Cowork's hook behaviour, Codex's image handling and Cursor's write-tool payload need a real run.
