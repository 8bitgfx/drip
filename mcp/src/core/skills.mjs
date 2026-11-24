// Find the design rules the user already has: DESIGN.md in the project, and Claude skills (project,
// user and plugin skills) whose name or description matches the task. Drip and the critic judge
// against them, so a product's own invariants are never silently broken.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectDir } from "./paths.mjs";

const DESIGN_MD = ["DESIGN.md", "docs/DESIGN.md", "design/DESIGN.md", "docs/design/DESIGN.md", ".drip/DESIGN.md"];

/** The project's DESIGN.md (the locked direction and system), or null. */
export function designDoc(cwd = projectDir()) {
  for (const rel of DESIGN_MD) {
    const f = path.join(cwd, rel);
    if (fs.existsSync(f)) return { file: f, rel, text: fs.readFileSync(f, "utf8") };
  }
  return null;
}

function frontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const get = (k) => (m[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
  return { name: get("name"), description: get("description") || "" };
}

function findSkillFiles(root, depth, out) {
  if (depth < 0 || out.length > 400) return;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isFile() && e.name === "SKILL.md") out.push(path.join(root, e.name));
    else if (e.isDirectory() && !/^(node_modules|\.git|drip)$/.test(e.name)) findSkillFiles(path.join(root, e.name), depth - 1, out);
  }
}

let cache = null;
function allSkills(cwd) {
  if (cache && cache.cwd === cwd && Date.now() - cache.at < 60000) return cache.list;
  const files = [];
  findSkillFiles(path.join(cwd, ".claude", "skills"), 2, files);
  const projectCount = files.length;
  findSkillFiles(path.join(os.homedir(), ".claude", "skills"), 2, files);
  findSkillFiles(path.join(os.homedir(), ".claude", "plugins", "cache"), 6, files);
  const seen = new Set();
  const list = [];
  for (const [i, f] of files.entries()) {
    let fm;
    try {
      fm = frontmatter(fs.readFileSync(f, "utf8").slice(0, 3000));
    } catch {
      continue;
    }
    const name = fm.name || path.basename(path.dirname(f));
    if (seen.has(name) || /drip/i.test(f.replace(/\\/g, "/").split("/plugins/cache/")[1]?.split("/")[0] || "")) continue;
    seen.add(name);
    list.push({ name, description: fm.description, file: f, project: i < projectCount });
  }
  cache = { cwd, at: Date.now(), list };
  return list;
}

const STOP = new Set("the a an and or for of to in on with my our your this that page site app design make new build redesign landing screen ui ux web website".split(" "));

/** Skills relevant to this task: product/brand rules (names from the task) and design-rule skills. */
export function relevantSkills(task, cwd = projectDir()) {
  if (!task) return [];
  const words = `${task.title} ${task.brief?.what || ""} ${task.brief?.constraints || ""}`.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  const keys = [...new Set(words.filter((w) => !STOP.has(w)))];
  const scored = allSkills(cwd).map((s) => {
    const hay = `${s.name} ${s.description}`.toLowerCase();
    let score = keys.filter((k) => hay.includes(k)).length * 3;
    if (/invariant|brand|product rule|design system|style guide|voice/.test(hay)) score += 1;
    if (s.project) score += 1;
    return { ...s, score };
  });
  return scored.filter((s) => s.score >= 3).sort((a, b) => b.score - a.score).slice(0, 5);
}
