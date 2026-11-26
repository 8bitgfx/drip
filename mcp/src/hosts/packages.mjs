// Self-contained packages: the runtime tree Drip needs (server bundle, hook adapters, skills, data) plus a host manifest.
// Used by `drip install --agent chatgpt` and by `npm run build:hosts -- --pack|--mcpb`.
import fs from "node:fs";
import path from "node:path";
import { adaptText } from "./adapt.mjs";
import { copyTree } from "./common.mjs";
import { hooksJson as codexHooksJson } from "./codex.mjs";
import { readJson } from "../core/jsonstore.mjs";

const SKIP = new Set(["node_modules", ".git", ".DS_Store", "Thumbs.db", ".drip"]);

export function pluginVersion(root) {
  return readJson(path.join(root, ".claude-plugin", "plugin.json"), {}).version || "0.0.0";
}

export function pluginDescription(root) {
  return readJson(path.join(root, ".claude-plugin", "plugin.json"), {}).description || "Drip: design process and tools for coding agents.";
}

/** Copy what the server, the hooks and the guides read at run time. Skills are adapted for `host`. */
export function copyRuntime(root, dest, host) {
  const need = (p) => path.join(root, p);
  if (!fs.existsSync(need("mcp/dist/drip-mcp.mjs"))) throw new Error("mcp/dist/drip-mcp.mjs is missing. Run: cd mcp && npm ci && npm run build");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.join(dest, "mcp", "dist"), { recursive: true });
  fs.copyFileSync(need("mcp/dist/drip-mcp.mjs"), path.join(dest, "mcp", "dist", "drip-mcp.mjs"));
  // The hooks import mcp/src/core/* and the lint module directly (no bundle, no node_modules).
  copyTree(need("mcp/src"), path.join(dest, "mcp", "src"), null, { skip: (n) => SKIP.has(n) });
  fs.copyFileSync(need("mcp/package.json"), path.join(dest, "mcp", "package.json"));
  copyTree(need("hooks"), path.join(dest, "hooks"), null, { skip: (n) => SKIP.has(n) || n === "hooks.json" });
  for (const dir of ["content", "agents"]) if (fs.existsSync(need(dir))) copyTree(need(dir), path.join(dest, dir), null, { skip: (n) => SKIP.has(n) });
  copyTree(need("skills"), path.join(dest, "skills"), (rel, t) => adaptText(t, host), { skip: (n) => SKIP.has(n) });
  // The marker the server walks up to find the plugin root.
  fs.mkdirSync(path.join(dest, ".claude-plugin"), { recursive: true });
  fs.copyFileSync(need(".claude-plugin/plugin.json"), path.join(dest, ".claude-plugin", "plugin.json"));
  for (const f of ["LICENSE", "CREDITS.md"]) if (fs.existsSync(need(f))) fs.copyFileSync(need(f), path.join(dest, f));
}

const KEYWORDS = ["design", "ui", "ux", "frontend", "moodboard", "design-system"];

/** ChatGPT desktop (and Codex) plugin manifest: root plugin.json, mcp.json, hooks/hooks.json. */
export function openaiPluginFiles(o, root) {
  const placeholder = { ...o, template: true, pluginRoot: "${PLUGIN_ROOT}" };
  return {
    "plugin.json": {
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "drip",
      version: pluginVersion(root),
      description: pluginDescription(root),
      author: { name: "Drip contributors" },
      license: "MIT",
      keywords: KEYWORDS,
      extensions: { "com.openai": { hooks: "hooks/hooks.json", requires_local_executor: true, interface: { displayName: "Drip", shortDescription: "A real designer's process: references, moodboards, design systems, fit checks." } } },
    },
    "mcp.json": { mcpServers: { drip: { type: "stdio", command: o.node, args: ["${PLUGIN_ROOT}/mcp/dist/drip-mcp.mjs"], env: { DRIP_HOST: "chatgpt" } } } },
    "hooks/hooks.json": codexHooksJson(placeholder, { plugin: true }),
  };
}

/** Desktop Extension manifest (MCPB manifest_version 0.3). */
export function mcpbManifest(root) {
  return {
    manifest_version: "0.3",
    name: "drip",
    display_name: "Drip",
    version: pluginVersion(root),
    description: pluginDescription(root),
    long_description: "Drip runs locally on your machine: design references, moodboards, design systems, asset tools and fit checks for your coding agent. Nothing is sent to a Drip server (there is none). Needs Chrome or Edge for screenshots.",
    author: { name: "Drip contributors" },
    license: "MIT",
    keywords: KEYWORDS,
    server: {
      type: "node",
      entry_point: "mcp/dist/drip-mcp.mjs",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/mcp/dist/drip-mcp.mjs"],
        env: { DRIP_HOST: "claude-desktop", DRIP_PROJECT_DIR: "${user_config.project_dir}" },
      },
    },
    user_config: {
      project_dir: { type: "directory", title: "Project folder", description: "The project Drip should work in (its .drip folder, DESIGN.md and boards live there). Leave empty to use the folder Claude starts Drip in.", required: false },
    },
    compatibility: { platforms: ["darwin", "win32", "linux"], runtimes: { node: ">=22.0.0" } },
  };
}

export function writeJsonFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
