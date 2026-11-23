#!/usr/bin/env node
// Drip MCP server. Each module registers its own tools; turn modules off in .drip/config.json.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./core/config.mjs";
import * as workflow from "./modules/workflow.mjs";
import * as refs from "./modules/refs/index.mjs";
import * as board from "./modules/board/index.mjs";
import * as components from "./modules/components/index.mjs";
import * as assets from "./modules/assets/index.mjs";
import * as gen from "./modules/gen/index.mjs";
import * as fitcheck from "./modules/fitcheck/index.mjs";

const VERSION = "0.1.0";

const INSTRUCTIONS = `Drip makes you work like a real product designer.
RULE: before writing or restyling ANY UI (page, screen, component, visual tweak) call drip_start. It tells you which guides to read (drip_guide) and what to do next; the plugin blocks UI file writes until the task's requirements are met.
Full loop (new UI): brief -> references (refs_search / refs_tag / refs_view) -> moodboard (board_*) -> direction (board_choose) -> system (DESIGN.md) -> assets (icons_*, fonts_*, palette_*, gradient_*, images_*, gen_*) -> build (components_*) -> fit check (fitcheck_shot, fitcheck_done).
Quick loop (tweaks): drip_start size quick -> read the listed guides -> change -> fitcheck.
Lost? drip_status shows what is done and the exact next call.`;

const ctx = { config: () => loadConfig() };
const server = new McpServer({ name: "drip", version: VERSION }, { instructions: INSTRUCTIONS });

const MODULES = { refs, board, components, assets, gen, fitcheck };
workflow.register(server, ctx);
const enabled = ctx.config().modules;
for (const [name, mod] of Object.entries(MODULES)) if (enabled[name] !== false) mod.register(server, ctx);

await server.connect(new StdioServerTransport());
