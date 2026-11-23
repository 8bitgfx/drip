#!/usr/bin/env node
// Drip MCP server. Each module registers its own tools; turn modules off in .drip/config.json.
//
// Also a CLI, for when the MCP connection is down or for scripts and subagents:
//   node mcp/dist/drip-mcp.mjs list
//   node mcp/dist/drip-mcp.mjs <tool> '<json args>' [--out <dir>]     (images are saved to --out, default .drip/cli)
//   e.g. node mcp/dist/drip-mcp.mjs refs_tag '{"tag":"bakery logo"}' --out shots
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./core/config.mjs";
import { projectDripDir } from "./core/paths.mjs";
import * as workflow from "./modules/workflow.mjs";
import * as refs from "./modules/refs/index.mjs";
import * as board from "./modules/board/index.mjs";
import * as components from "./modules/components/index.mjs";
import * as assets from "./modules/assets/index.mjs";
import * as gen from "./modules/gen/index.mjs";
import * as fitcheck from "./modules/fitcheck/index.mjs";
import * as critic from "./modules/critic/index.mjs";
import * as logo from "./modules/logo/index.mjs";
import * as packs from "./modules/packs/index.mjs";

const VERSION = "0.3.3";

const INSTRUCTIONS = `Drip makes you work like a real product designer.
Start with drip_start when the user asks for Drip (/drip:design) or for a proper design process; it returns the playbook and tells you what to do next. While a Drip task is open, the plugin blocks UI writes until requirements are met (brief, studied references, critic-ranked direction) and blocks ending the turn until a fit check and, on full loops, a passing critic review. Other tools (references, palettes, fonts, icons, components, logo tools) are fine to use any time.
Page loop (fast): intake (AskUserQuestion -> drip_brief) -> refs_site on shipped sites -> refs_study (batched) -> board_create -> board_directions (renders first-viewport comps) -> critic ranks (critic_prepare -> Agent drip:critic -> critic_record) -> board_open -> board_choose -> drip_kit + DESIGN.md -> nav + hero -> fitcheck_shot hero:true -> sections -> fitcheck_shot (page gate) -> critic -> fitcheck_done -> drip_end. The playbook (returned by drip_start) holds the numbers.
Logo mode: intake -> refs -> concepts -> logo_sheet -> critic -> logo_outline / logo_test -> critic -> user picks.
Lost? drip_status shows what is done and the exact next call. Examples: drip_guide examples/portfolio.`;

const ctx = { config: () => loadConfig() };
const MODULES = { refs, board, components, assets, gen, fitcheck, critic, logo, packs };

function registerAll(server) {
  workflow.register(server, ctx);
  const enabled = ctx.config().modules;
  for (const [name, mod] of Object.entries(MODULES)) if (enabled[name] !== false) mod.register(server, ctx);
}

async function cli(argv) {
  const tools = new Map();
  registerAll({ registerTool: (name, meta, handler) => tools.set(name, { meta, handler }) });
  const [cmd, json, ...rest] = argv;
  if (cmd === "list" || cmd === "--help" || cmd === "-h") {
    for (const [name, { meta }] of tools) console.log(`${name.padEnd(22)} ${(meta.description || "").split(". ")[0].slice(0, 110)}`);
    return;
  }
  const tool = tools.get(cmd);
  if (!tool) {
    console.error(`Unknown tool "${cmd}". Run: list`);
    process.exit(2);
  }
  const outIdx = rest.indexOf("--out");
  const outDir = path.resolve(outIdx >= 0 ? rest[outIdx + 1] : path.join(projectDripDir(), "cli"));
  const args = z.object(tool.meta.inputSchema || {}).parse(json ? JSON.parse(json) : {});
  const res = await tool.handler(args, {});
  let n = 0;
  for (const c of res.content || []) {
    if (c.type === "text") console.log(c.text);
    if (c.type === "image") {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${cmd}-${Date.now()}-${++n}.${c.mimeType === "image/png" ? "png" : "jpg"}`);
      fs.writeFileSync(file, Buffer.from(c.data, "base64"));
      console.log(`[image] ${file}`);
    }
  }
  // The board / key servers keep the process alive; a CLI call is done once it has printed.
  process.exit(res.isError ? 1 : 0);
}

if (process.argv.length > 2) {
  await cli(process.argv.slice(2));
} else {
  const server = new McpServer({ name: "drip", version: VERSION }, { instructions: INSTRUCTIONS });
  registerAll(server);
  await server.connect(new StdioServerTransport());
}
