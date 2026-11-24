# Code Mode: drip_search and drip_execute

Two extra tools for agents that would rather write one short script than make twenty tool calls. Every direct MCP tool is still there and unchanged; Code Mode calls the same handlers, so the same gates, state locks and errors apply.

- `drip_search({ query, limit })` finds tools and returns TypeScript-style signatures built from their zod schemas, e.g. `drip.palette_check(args: { pairs: { fg: string; bg: string; label?: string }[] }): Promise<ToolResult>`.
- `drip_execute({ code, timeoutMs?, maxCalls? })` runs the code as the body of an async function in a sandbox. The only thing it can reach is `await drip.<tool>(args)` for allowed tools, plus `console.log`. `return` the result.

```js
const rows = [];
for (const accent of ["#E8452C", "#2B6CB0"]) {
  const gen = await drip.palette_generate({ accent });
  const hex = /accent: .*? 600 (#[0-9A-F]{6})/.exec(gen.text)[1];
  const chk = await drip.palette_check({ pairs: [{ fg: hex, bg: "#FFFFFF" }] });
  rows.push(accent + " " + chk.text);
}
return rows;
```

`drip run --file workflow.js` runs the same thing from the command line ([CLI.md](CLI.md)).

## What a call returns

`{ text, data?, images }`: `text` is the tool's text, `data` is that text parsed when it is JSON, `images` is a list of file paths (images are written to `<project>/.drip/cli/codemode/`, never pushed into the sandbox). A call **throws** on invalid arguments (the message includes the signature), on a gate refusal and on a tool error; use `try/catch` to carry on. `drip_execute` returns the console output, the JSON result (cut at 12000 characters, the full text goes to a file), the call count and time, the list of image files and the first few images (`codemode.maxImages`, default 4) as image blocks.

## The sandbox

QuickJS compiled to WebAssembly (`quickjs-emscripten-core` with the single-file variant `@jitl/quickjs-singlefile-mjs-release-sync`, WASM inlined so esbuild bundles it into `dist/drip-mcp.mjs`). A fresh runtime per run; nothing is shared between runs.

| Not available | Why it holds |
|---|---|
| `require`, `import()`, `process`, `fs`, `fetch`, `Buffer`, timers, `eval` of host code | The runtime has only ECMAScript built-ins; the global object is the sandbox's own. Tests probe `globalThis`, `this`, `Function` / `AsyncFunction` constructors and indirect `eval`. |
| Host internals | The two bridge functions are deleted from the global after the prelude runs; the `drip` object is frozen behind a proxy that throws on unknown tools. |
| Tools outside the allowlist | See below. `drip_execute` itself is never reachable. |

Limits (config `codemode`, or the call's arguments): `timeoutMs` wall time for the whole run (default 120000, max 600000); `cpuMs` longest stretch of script running without waiting on a tool (default 10000, an interrupt handler stops infinite loops); `maxCalls` tool calls per run (default 50, max 500); `memoryMb` (default 64); 256 KB stack (a bigger value overflows the WASM host stack instead of raising a JS error); console output 20000 characters. Arguments are validated with each tool's zod schema before the handler runs. Tool calls run on the host in parallel when the script uses `Promise.all`.

## Allowlist

`mcp/src/core/codemode/allowlist.mjs`: a constant list of name patterns (every tool family Drip ships: `drip_*`, `refs_*`, `board_*`, `components_*`, ...), minus tools that start a local server or open a window (`board_open`, `keys_open`, `drip_serve`). Override in `.drip/config.json`:

```json
{ "codemode": { "allow": ["board_open", "myfamily_*"], "deny": ["gen_*"], "maxCalls": 100, "maxImages": 2 } }
```

`allow` adds patterns, and re-enables a blocked tool when you name it exactly; `deny` always wins; `drip_execute` cannot be allowed. A tool from a new module must match a pattern in `DEFAULT_ALLOW` (or be allowed in config) to appear in scripts.

## Cost

- Bundle: `dist/drip-mcp.mjs` grows from 3,636,740 to 4,585,797 bytes (+949 KB, +26%), almost all the inlined QuickJS WASM.
- Startup: the MCP server starts as fast as before (`node dist/drip-mcp.mjs list`, median of 5 about 240 ms before and after). The WASM is only instantiated when a script runs (about 40 ms for the first run).

## Benchmark

`node mcp/test/bench-codemode.mjs [--server dist/drip-mcp.mjs] [--runs 5]` starts the server and runs one deterministic task both ways over real stdio MCP: eight colour systems (`palette_generate`), pick accent-600 from each, `palette_check` it on white and near-black. That is 16 tool calls. Result on the development machine (Windows 11, Node 26, median of 5, warm):

| | calls | wall time | text the agent reads |
|---|---|---|---|
| direct MCP | 16 | 2408 ms | 36324 chars |
| one `drip_execute` | 1 | 2372 ms | 1146 chars |

Both give the same answer. Honest reading: wall time is the same, because here the tools themselves take the time (about 150 ms each) and the sandbox adds little. What changes is what the agent has to read (31.7x less here, because the script keeps only what it needs) and the number of model round trips (16 to 1). The saving in model latency and tokens cannot be measured offline; it is larger for tasks with many cheap calls and smaller for tasks with one slow call (a screenshot, an image generation).

## Notes on the references in the plan

Chosen: QuickJS-WASM, because the engine is Node and the sandbox must not give scripts a host runtime or need a hosted worker. Cloudflare Agents' code mode and the UTCP code-mode library were treated as design references for "typed signatures plus one script"; neither is a dependency, and nothing here talks to a remote service. The MCP TypeScript SDK is what the server already uses for stdio and what the benchmark uses as a client.

## Where things are

`mcp/src/core/codemode/{sandbox,execute,allowlist,signatures}.mjs`, `mcp/src/modules/codemode/index.mjs` (the two tools, registered in `core/registry.mjs`). Tests: `mcp/test/codemode.test.mjs`.
