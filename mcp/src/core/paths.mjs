// Where things live. No dependencies: hooks import this file directly.
//
//   plugin root   the drip repo / installed plugin (skills, rules, data)
//   project dir   the user's project; per-task state lives in <project>/.drip/
//   home dir      ~/.drip: cache, keys, usage log, global config
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Walk up from this file until we find the plugin manifest (works from src/ and from the dist bundle). */
function findPluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT && fs.existsSync(process.env.CLAUDE_PLUGIN_ROOT)) return process.env.CLAUDE_PLUGIN_ROOT;
  let dir = here;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(here, "..", "..", "..");
}

export const pluginRoot = findPluginRoot();
export const skillsDir = path.join(pluginRoot, "skills");
export const rulesDir = path.join(pluginRoot, "rules");
export const dataDir = path.join(pluginRoot, "data");

export function projectDir(cwd) {
  return cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

export function projectDripDir(cwd) {
  return path.join(projectDir(cwd), ".drip");
}

export const homeDripDir = process.env.DRIP_HOME || path.join(os.homedir(), ".drip");

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
