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
// What the server serves or copies lives in content/: rules and examples (drip_guide), data (catalogue, pieces,
// font pairs, slop rules), kit (templates drip_kit copies) and the Film viewer.
export const contentDir = path.join(pluginRoot, "content");
export const rulesDir = path.join(contentDir, "rules");
export const dataDir = path.join(contentDir, "data");
export const examplesDir = path.join(contentDir, "examples");
export const kitDir = path.join(contentDir, "kit");
export const filmViewerDir = path.join(contentDir, "film-viewer");

/** The installed Drip version, from the plugin manifest ("" when it can't be read). */
export function pluginVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8")).version || "";
  } catch {
    return "";
  }
}

// The project root, the same on every host: an explicit cwd, then the host's project variable
// (DRIP_PROJECT_DIR works everywhere; Claude Code sets CLAUDE_PROJECT_DIR), then the nearest folder
// above the working directory that has a .drip folder or is a git root, then the working directory.
const HOST_PROJECT_VARS = ["DRIP_PROJECT_DIR", "CLAUDE_PROJECT_DIR", "CURSOR_PROJECT_DIR", "CODEX_PROJECT_DIR", "OPENCODE_PROJECT_DIR"];
const rootCache = new Map();

export function findProjectRoot(start = process.cwd()) {
  if (rootCache.has(start)) return rootCache.get(start);
  let dir = path.resolve(start);
  let found = null;
  for (let i = 0; i < 40; i++) {
    const drip = path.join(dir, ".drip");
    if (drip !== homeDripDir && fs.existsSync(drip)) {
      found = dir;
      break;
    }
    if (fs.existsSync(path.join(dir, ".git"))) {
      found = dir;
      break;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  const out = found || path.resolve(start);
  rootCache.set(start, out);
  return out;
}

export function projectDir(cwd) {
  if (cwd) return cwd;
  for (const v of HOST_PROJECT_VARS) if (process.env[v]) return process.env[v];
  return findProjectRoot(process.cwd());
}

export function projectDripDir(cwd) {
  return path.join(projectDir(cwd), ".drip");
}

// ---- .drip/.gitignore: one marked block Drip owns; every line outside it is the user's ----
export const GITIGNORE_BEGIN = "# >>> drip (generated; put your own lines outside this block) >>>";
export const GITIGNORE_END = "# <<< drip <<<";
const LEGACY_HEAD = "# Drip's working files. Shareable settings and the asset credits log stay tracked.";
const LEGACY_LINES = new Set([LEGACY_HEAD, "*", "!.gitignore", "!config.json", "!slop.json", "!catalogue.json", "!assets.json"]);

/**
 * The lines of the generated block. `share` is the project's opt-in: { boards, feedback, assets }.
 * Default: only settings stay tracked. share.boards adds board metadata, the project index, decisions,
 * the project skill, patterns metadata and packs. Git cannot re-include a file under an ignored folder,
 * so each shared folder is un-ignored first and its contents ignored again except the named files.
 * Personal feedback (memory/feedback.jsonl), rendered boards, tiles, screenshots and caches stay untracked.
 */
export function gitignoreBlock(share = {}) {
  const lines = [GITIGNORE_BEGIN, "# Drip's working files stay local. Settings and the asset credits log are tracked.", "*", "!.gitignore", "!config.json", "!slop.json", "!catalogue.json", "!assets.json"];
  if (share.boards) {
    lines.push(
      "# opt-in sharing (config.json share.boards): the design memory travels with the repo",
      "!boards/",
      "boards/*",
      "!boards/index.json",
      "!boards/*/",
      "boards/*/*",
      "!boards/*/board.json",
      "!memory/",
      "memory/*",
      "!memory/decisions.json",
      "!memory/style.json",
      "!skills/",
      "skills/*",
      "!skills/project-design/",
      "skills/project-design/*",
      "!skills/project-design/SKILL.md",
      "!packs/",
      "packs/*",
      "!packs/*/",
      "packs/*/*",
      "!packs/*/*.md",
      "!packs/*/*.json",
      "!patterns/",
      "patterns/*",
      "!patterns/index.json",
      "!patterns/*/",
      "patterns/*/*",
      "!patterns/*/spec.json",
      "!patterns/*/spec.md",
    );
    if (share.feedback) lines.push("!memory/feedback.jsonl");
    if (share.assets) lines.push("!boards/*/assets/", "boards/*/assets/*", "!boards/*/assets/*.svg", "!boards/*/assets/*.png", "!boards/*/assets/*.jpg", "!boards/*/assets/*.webp");
  }
  lines.push(GITIGNORE_END);
  return lines.join("\n");
}

function readShare(dir) {
  try {
    const share = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8")).share;
    return share && typeof share === "object" ? share : {};
  } catch {
    return {};
  }
}

/** Write or migrate <dir>/.gitignore. Keeps every line the user wrote; replaces only Drip's block. */
export function syncGitignore(dir, share = readShare(dir)) {
  const file = path.join(dir, ".gitignore");
  const block = gitignoreBlock(share);
  let cur = null;
  try {
    cur = fs.readFileSync(file, "utf8");
  } catch {
    /* none yet */
  }
  if (cur === null) {
    fs.writeFileSync(file, `${block}\n`);
    return { changed: true, file };
  }
  const eol = cur.includes("\r\n") ? "\r\n" : "\n";
  const lines = cur.split(/\r?\n/);
  const b = lines.indexOf(GITIGNORE_BEGIN);
  const e = lines.indexOf(GITIGNORE_END);
  const full = block.split("\n");
  // A hand-written file only gets the sharing lines (no "*"), wrapped in the same markers so the next sync finds them.
  const partial = [GITIGNORE_BEGIN, ...full.filter((l) => l !== "*" && !l.startsWith("# Drip's working") && l !== GITIGNORE_BEGIN && l !== GITIGNORE_END), GITIGNORE_END];
  let next;
  if (b >= 0 && e > b) {
    const wasPartial = !lines.slice(b, e).includes("*");
    next = [...lines.slice(0, b), ...(wasPartial ? partial : full), ...lines.slice(e + 1)].join(eol);
  } else if (lines.includes(LEGACY_HEAD)) {
    // The file Drip generated before 0.5 (maybe with the user's lines added): wrap Drip's part, keep theirs.
    const mine = lines.filter((l) => l.trim() && !LEGACY_LINES.has(l.trim()));
    next = [...full, ...(mine.length ? ["", ...mine] : [])].join(eol) + eol;
  } else if (share.boards) {
    next = `${cur.replace(/\s*$/, "")}${eol}${partial.join(eol)}${eol}`;
  } else return { changed: false, file };
  if (next === cur) return { changed: false, file };
  fs.writeFileSync(file, next);
  return { changed: true, file };
}

const gitignoreChecked = new Set();

/** Create <project>/.drip (with a .gitignore that keeps only shareable settings) and return its path. */
export function ensureProjectDrip(cwd) {
  const dir = ensureDir(projectDripDir(cwd));
  if (!gitignoreChecked.has(dir)) {
    gitignoreChecked.add(dir);
    try {
      const f = path.join(dir, ".gitignore");
      const cur = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
      if (!cur || (cur.includes(LEGACY_HEAD) && !cur.includes(GITIGNORE_BEGIN))) syncGitignore(dir);
    } catch {
      /* read-only project: carry on */
    }
  }
  return dir;
}

export const homeDripDir = process.env.DRIP_HOME || path.join(os.homedir(), ".drip");

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
