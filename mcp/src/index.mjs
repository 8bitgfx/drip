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

const VERSION = "0.8.7";

const INSTRUCTIONS = `Drip makes you work like a real product designer.
Start with drip_start when the user asks for Drip (/drip:design) or for design work; it returns the guide and the first calls. While a Drip task is open, the plugin blocks UI writes until you have looked at proven work and dealt a set, and blocks ending the turn until a fitcheck_shot has seen the current version. Other tools (references, palettes, fonts, icons, components, logo tools) are fine to use any time.
Roles: you direct (look, decide, choose pieces, write specs, small fixes); drip:builder agents (Sonnet) write the code; drip:helper agents (Haiku) do small jobs.
Page loop (fast, in passes): PASS 1 refs_gallery + layout_deal({ ..., out }) (deals the set and PIECES ON OFFER from proven libraries, writes the page: React + Tailwind for software/gaming/tech, static otherwise) in one message -> pieces_install -> ONE build_prepare for the hero -> builder -> fitcheck_shot hero:true -> show the user, stop. PASS 2 pieces_install -> ONE build_prepare with every section (each on a piece) -> all builders in one message -> page_stitch -> fitcheck_shot once -> drip_end. The critic (critic_prepare -> Agent drip:critic -> critic_record) is a reality check at the final version. drip_start({ loop: "full" }) runs the old process (intake, roles, comps, plan) for big brand work.
Logo mode: intake -> refs -> concepts -> logo_sheet -> critic -> logo_outline / logo_test -> critic -> user picks.
Beyond the loop:
- Memory: drip_start loads the project's approved direction and learned rules; record the user's reactions with feedback_record.
- Reuse: search the project's own components first (components_local_find, components_plan for a page).
- Match something the user points at: pattern_study, build your own, then pattern_compare.
- Original art: art_generate, shader_hero, scene_render.
- Code Mode: when you would make many calls in a row (palettes x fonts, refs across sites, checks across pages), drip_search finds tool signatures and drip_execute runs one sandboxed script that calls them.
- Before hand-off: drip_check({ changed: true }) runs the project's lint, types and tests plus the slop lint.
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
  startRecorder(() => loadConfig()); // Drip Film: frames of the page while a task builds it
}
