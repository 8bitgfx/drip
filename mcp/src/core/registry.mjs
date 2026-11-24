// One tool registry for every interface: the MCP server, the CLI, Code Mode (drip_search / drip_execute)
// and host adapters all get their tools from here, so names, schemas and handlers never drift apart.
// Modules register with server.registerTool(name, meta, handler) exactly as on an McpServer.
import { loadConfig } from "./config.mjs";
import { updateState } from "./state.mjs";
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
import * as swarm from "../modules/swarm/index.mjs";
import * as parts from "../modules/parts/index.mjs";

export const ctx = { config: () => loadConfig() };

// Order matters only for listings. A module can be turned off in .drip/config.json ("modules": { "<name>": false }).
export const MODULES = { refs, board, components, assets, gen, fitcheck, critic, logo, packs, codemode, patterns, project, inspire, studio, swarm, parts };

// Which tools a task used (task.toolUse): lets gates ask for steps no prose can enforce, such as searching
// components and picture sources before building. Counting never fails a call.
const TRACKED = /^(parts_|components_|catalogue_|images_|art_|shader_|mockup_|scene_|gen_image|assets_3d_|icons_|fonts_|refs_gallery|patterns?_)/;
function tracked(name, handler) {
  if (!TRACKED.test(name)) return handler;
  return async (...args) => {
    const res = await handler(...args);
    try {
      if (!res?.isError)
        updateState((st) => {
          if (st.task) (st.task.toolUse ||= {})[name] = (st.task.toolUse[name] || 0) + 1;
        });
    } catch {
      /* bookkeeping only */
    }
    return res;
  };
}
const wrap = (server) =>
  new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "registerTool") return (name, meta, handler) => target.registerTool(name, meta, tracked(name, handler));
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });

export function registerAll(server, c = ctx) {
  const s = wrap(server);
  workflow.register(s, c);
  const enabled = c.config().modules || {};
  for (const [name, mod] of Object.entries(MODULES)) if (enabled[name] !== false) mod.register(s, c);
}

let cache = null;
/** Every tool as a Map name -> { meta, handler, module }. Cached: registration has no side effects. */
export function collectTools() {
  if (cache) return cache;
  const tools = new Map();
  let current = "workflow";
  const sink = { registerTool: (name, meta, handler) => tools.set(name, { meta, handler: tracked(name, handler), module: current }), registerResource: () => {} };
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
