// One tool registry for every interface: the MCP server, the CLI, Code Mode (drip_search / drip_execute)
// and host adapters all get their tools from here, so names, schemas and handlers never drift apart.
// Modules register with server.registerTool(name, meta, handler) exactly as on an McpServer.
import { loadConfig } from "./config.mjs";
import { loadState, updateState } from "./state.mjs";
import { filmEvent } from "./film.mjs";
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
import * as film from "../modules/film/index.mjs";

export const ctx = { config: () => loadConfig() };

// Order matters only for listings. A module can be turned off in .drip/config.json ("modules": { "<name>": false }).
export const MODULES = { refs, board, components, assets, gen, fitcheck, critic, logo, packs, codemode, patterns, project, inspire, studio, swarm, parts, film };

// Which tools a task used (task.toolUse): lets gates ask for steps no prose can enforce, such as searching
// components and picture sources before building. Counting never fails a call.
const TRACKED = /^(parts_|pieces_|components_|catalogue_|images_|art_|shader_|mockup_|scene_|gen_image|assets_3d_|icons_|fonts_|refs_gallery|patterns?_)/;
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
// Hosts without Claude Code's hooks (Codex, Cursor...) still get a film: the server logs its own tool calls there.
// In Claude Code the hooks do it (with which agent made the call), so the server stays quiet.
function filmed(name, handler) {
  const host = String(process.env.DRIP_HOST || "").toLowerCase();
  if (!host || host === "claude-code" || /^(drip_status|drip_guide|drip_film)$/.test(name)) return handler;
  return async (...args) => {
    const res = await handler(...args);
    try {
      const task = loadState().task;
      if (task) filmEvent(task, { kind: { page_stitch: "stitch", pieces_install: "install", fitcheck_shot: "shot" }[name] || "tool", agent: "main", tool: name, summary: name.replace(/_/g, " ") });
    } catch {
      /* bookkeeping only */
    }
    return res;
  };
}

const wrap = (server) =>
  new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "registerTool") return (name, meta, handler) => target.registerTool(name, meta, filmed(name, tracked(name, handler)));
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });

// The tools the agent sees: what the fast loop uses. Everything else stays one call away through Code Mode
// (drip_search finds it, drip_execute runs it), so the tool list stays small and every tool still works.
// "tools": "all" in .drip/config.json lists every tool directly.
export const CORE = new Set([
  "drip_start", "drip_status", "drip_guide", "drip_brief", "drip_end", "drip_skip", "drip_kit", "drip_serve", "drip_check", "drip_search", "drip_execute", "keys_open",
  "refs_site", "refs_gallery", "refs_view", "refs_search",
  "layout_deal", "parts_list", "parts_preview", "parts_get", "pieces_install", "pieces_preview", "drip_kits", "components_get", "drip_film",
  "images_search", "images_save", "fonts_compare", "fonts_search", "palette_check", "icons_search", "icons_get", "mockup_render",
  "components_find", "components_local_find",
  "fitcheck_shot", "fitcheck_done", "critic_prepare", "critic_record",
  "build_prepare", "scout_prepare", "checker_prepare", "page_stitch",
  "board_create", "board_directions", "board_tile", "board_choose", "logo_sheet", "logo_test",
]);

export function registerAll(server, c = ctx) {
  const all = c.config().tools === "all" || process.env.DRIP_TOOLS === "all";
  const s = wrap(all ? server : new Proxy(server, { get: (t, p, r) => (p === "registerTool" ? (name, meta, h) => (CORE.has(name) ? t.registerTool(name, meta, h) : undefined) : ((v) => (typeof v === "function" ? v.bind(t) : v))(Reflect.get(t, p, r))) }));
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
