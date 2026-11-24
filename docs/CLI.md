# The Drip command line

`drip` runs the same handlers as the MCP server. Both get their tools from one registry (`mcp/src/core/registry.mjs`), so a tool has the same name, arguments, gates and output over MCP, here, and in Code Mode. There is no daemon and nothing to host.

```sh
node mcp/dist/drip-mcp.mjs <command>      # always works
drip <command>                            # after `npm link` in mcp/, or via the "drip" bin in mcp/package.json
```

The old forms still work unchanged: `drip-mcp list` and `drip-mcp <tool> '<json>' [--out dir]`.

## Commands

| Command | What it does |
|---|---|
| `drip doctor [--json]` | Checks Node (22+), Chrome/Edge, Blender, uvx, optional dependencies, which API keys are set (names only, never values), plugin and project folders, `.drip` task state, the tool registry and the Code Mode sandbox. Host installers add their own lines when present. Exit 3 if something required is missing. |
| `drip doctor --install <dep>` | Installs one optional dependency into `~/.drip/vendor` (`axe-core`, `svgo`, `resvg`, `ts-morph`, `fontkit`). Code that wants one calls `vendorImport(name)` from `core/vendor.mjs`; it gets `null` when the dependency is absent and says how to enable it. |
| `drip tools list [--json]` | Every tool: name, module, description. |
| `drip tools schema <name>` | The tool's input as JSON Schema (draft 2020-12), generated from the same zod definition MCP uses. |
| `drip call <tool> [--input json \| --input-file f \| --input -] [--json] [--out dir]` | Runs any tool. `--input -` reads JSON from stdin (stdin is never read unless you ask). |
| `drip project inspect` | Calls `project_context` when that tool exists, otherwise prints a short summary (root, `.drip`, DESIGN.md, boards, open task, config). |
| `drip board open [--no-wait]` | Calls `board_open`, then keeps running while the preview server is up (Ctrl+C to stop; `--no-wait` exits at once). |
| `drip components index\|audit [--changed] [--json]` | Calls `components_index` / `components_audit` when registered; otherwise "not available in this build" (exit 3). |
| `drip check [--changed\|--full] [--json]` | Calls `drip_check` when registered, otherwise runs `fitcheck_lint` only and says so on stderr. |
| `drip run --file workflow.js [--json]` | Runs a Code Mode script (see [CODEMODE.md](CODEMODE.md)). |
| `drip install\|uninstall --agent <codex\|cursor\|opencode\|claude-desktop\|chatgpt> [--dry-run]`, `drip hosts [--json]`, `drip hosts doctor <host>` | Host installers. They load `mcp/src/hosts/index.mjs` (`install`, `uninstall`, `listHosts`, `doctor`); without it these commands say so and exit 3. |
| `drip help`, `drip <tool> --help` | Help generated from the registry. |

## Global options

| Option | Meaning |
|---|---|
| `--project <dir>` | Work on this project (sets `DRIP_PROJECT_DIR` for the run). |
| `--session <id>`, `--task <id>` | Identity for task state across separate invocations. `--task` binds the session to that task id (it must already exist; a warning is printed otherwise). |
| `--json` | One JSON object on stdout: `{ ok, tool, text, images: [paths], error?: { code, message } }`. Some commands add fields (`checks`, `tools`, `result`, `logs`). |
| `--out <dir>` | Where images and long output are written (default `<project>/.drip/cli`). |
| `--max-chars <n>` | Longest text printed before it is cut and the full text written to a file (default 20000; the old `drip <tool> '<json>'` form prints everything, as it always did). |

Images are never printed as base64: they are saved as files and listed as `[image] <path>` (or in `images`). Progress, warnings and errors go to stderr; stdout holds only the result.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Done. |
| 1 | The tool returned an error or refused (a gate), or a script failed. |
| 2 | Usage: unknown command or tool, invalid arguments (checked with the tool's zod schema), bad JSON, unknown option. |
| 3 | A prerequisite is missing: Chrome/Edge, an API key, a feature or host installer this build does not have. |

## Safety

Subprocesses are started with argument arrays (`execFile`), never through a shell with interpolated input. The CLI shares the handlers, state files and locks with MCP, so gates and revision checks behave the same. The CLI can do deterministic work and prepare critic prompts (`critic_prepare`); the creative judgement still needs a host model.

## Where things are

`mcp/src/core/cli.mjs` (commands, `invokeTool`), `core/doctor.mjs`, `core/vendor.mjs`, `mcp/src/index.mjs` (entry: more than two arguments means CLI). Tests: `mcp/test/cli.test.mjs`.
