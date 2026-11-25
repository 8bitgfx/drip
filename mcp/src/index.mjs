#!/usr/bin/env node
// Drip MCP server. Each module registers its own tools; turn modules off in .drip/config.json.
//
// Also a CLI (core/cli.mjs; `drip` bin), for when the MCP connection is down or for scripts and subagents:
//   node mcp/dist/drip-mcp.mjs list
//   node mcp/dist/drip-mcp.mjs doctor | tools schema <name> | call <tool> --input '<json>' --json | run --file x.js
//   node mcp/dist/drip-mcp.mjs <tool> '<json args>' [--out <dir>]     (images are saved to --out, default .drip/cli)
//   e.g. node mcp/dist/drip-mcp.mjs refs_tag '{"tag":"bakery logo"}' --out shots
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setIdentity } from "./core/state.mjs";
import { registerAll } from "./core/registry.mjs";
import { runCli } from "./core/cli.mjs";
import { loadConfig } from "./core/config.mjs";
import { startRecorder } from "./modules/film/index.mjs";

const VERSION = "0.8.14";

const INSTRUCTIONS = `Drip is a design director for UI work: pages, app screens, sites, dashboards, components and logos.
For design work call drip_start with the request: it returns the task, the first calls and two guides (taste: what good looks like; the loop: in what order). Follow them; drip_status shows the next call when lost; drip_end closes the task.
While a task is open, hooks hold UI writes until the work has been looked at and dealt, and hold the end of the turn until a fitcheck_shot has seen the latest version. Reference, palette, font, icon and piece tools are fine to use any time. Many more tools are one call away: drip_search finds them, drip_execute runs a script of calls.`;

if (process.argv.length > 2) {
  // CLI: a call is done once it has printed; the board / key servers would keep the process alive.
  process.exitCode = await runCli(process.argv.slice(2), { version: VERSION });
  process.exit(process.exitCode);
} else {
  const server = new McpServer({ name: "drip", version: VERSION }, { instructions: INSTRUCTIONS });
  registerAll(server);
  setIdentity({ server: true }); // one server per Claude session: it owns at most one task
  await server.connect(new StdioServerTransport());
  startRecorder(() => loadConfig()); // Drip Film: frames of the page while a task builds it
}
