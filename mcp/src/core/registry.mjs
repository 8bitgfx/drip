// One tool registry for every interface: the MCP server, the CLI, Code Mode (drip_search / drip_execute)
// and host adapters all get their tools from here, so names, schemas and handlers never drift apart.
// Modules register with server.registerTool(name, meta, handler) exactly as on an McpServer.
import { loadConfig } from "./config.mjs";
import * as workflow from "../modules/workflow.mjs";
import * as refs from "../modules/refs/index.mjs";
import * as board from "../modules/board/index.mjs";
import * as components from "../modules/components/index.mjs";
import * as assets from "../modules/assets/index.mjs";
import * as gen from "../modules/gen/index.mjs";
import * as fitcheck from "../modules/fitcheck/index.mjs";
import * as critic from "../modules/critic/index.mjs";
import * as logo from "../modules/logo/index.mjs";
import * as packs from "../modules/packs/index.mjs";
import * as codemode from "../modules/codemode/index.mjs";
import * as patterns from "../modules/patterns/index.mjs";
import * as project from "../modules/project/index.mjs";
import * as inspire from "../modules/inspire/index.mjs";
import * as studio from "../modules/studio/index.mjs";

export const ctx = { config: () => loadConfig() };

// Order matters only for listings. A module can be turned off in .drip/config.json ("modules": { "<name>": false }).
export const MODULES = { refs, board, components, assets, gen, fitcheck, critic, logo, packs, codemode, patterns, project, inspire, studio };

export function registerAll(server, c = ctx) {
  workflow.register(server, c);
  const enabled = c.config().modules || {};
  for (const [name, mod] of Object.entries(MODULES)) if (enabled[name] !== false) mod.register(server, c);
}

let cache = null;
/** Every tool as a Map name -> { meta, handler, module }. Cached: registration has no side effects. */
export function collectTools() {
  if (cache) return cache;
  const tools = new Map();
  let current = "workflow";
  const sink = { registerTool: (name, meta, handler) => tools.set(name, { meta, handler, module: current }), registerResource: () => {} };
  workflow.register(sink, ctx);
  const enabled = ctx.config().modules || {};
  for (const [name, mod] of Object.entries(MODULES)) {
    if (enabled[name] === false) continue;
    current = name;
    mod.register(sink, ctx);
  }
  cache = tools;
  return tools;
}
