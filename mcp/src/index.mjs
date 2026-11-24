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

const VERSION = "0.5.0";

const INSTRUCTIONS = `Drip makes you work like a real product designer.
Start with drip_start when the user asks for Drip (/drip:design) or for a proper design process; it returns the playbook and tells you what to do next. While a Drip task is open, the plugin blocks UI writes until requirements are met (brief, studied references, critic-ranked direction) and blocks ending the turn until a fit check and, on full loops, a passing critic review. Other tools (references, palettes, fonts, icons, components, logo tools) are fine to use any time.
Page loop (fast): intake (AskUserQuestion -> drip_brief) -> refs_site on shipped sites -> refs_study (batched) -> board_create -> board_directions (renders first-viewport comps) -> critic ranks (critic_prepare -> Agent drip:critic -> critic_record) -> board_open -> board_choose -> drip_kit + DESIGN.md -> nav + hero -> fitcheck_shot hero:true -> sections -> fitcheck_shot (page gate) -> critic -> fitcheck_done -> drip_end. The playbook (returned by drip_start) holds the numbers.
Logo mode: intake -> refs -> concepts -> logo_sheet -> critic -> logo_outline / logo_test -> critic -> user picks.
Lost? drip_status shows what is done and the exact next call. Examples: drip_guide examples/portfolio.`;

if (process.argv.length > 2) {
  // CLI: a call is done once it has printed; the board / key servers would keep the process alive.
  process.exitCode = await runCli(process.argv.slice(2), { version: VERSION });
  process.exit(process.exitCode);
} else {
  const server = new McpServer({ name: "drip", version: VERSION }, { instructions: INSTRUCTIONS });
  registerAll(server);
  setIdentity({ server: true }); // one server per Claude session: it owns at most one task
  await server.connect(new StdioServerTransport());
}
