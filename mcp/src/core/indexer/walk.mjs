// Walks a project's files with the filesystem (not git), so UNTRACKED files are included, honouring .gitignore
// files at every level. Never touches the git index. No dependencies.
import fs from "node:fs";
import path from "node:path";

export const ALWAYS_SKIP = new Set(["node_modules", ".git", ".drip", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".turbo", ".cache", ".parcel-cache", "coverage", "out", ".vercel", ".netlify", "storybook-static", "__pycache__", ".venv", "venv", ".idea", ".vscode", ".output", ".expo", "target"]);
const SECRET = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12|pfx)|id_rsa.*|credentials.*\.json|secrets?\.(json|ya?ml))$/i;

/** One .gitignore line -> { re, negate, dirOnly } relative to the folder the file lives in. */
function compileLine(raw) {
  let line = raw.replace(/\r$/, "");
  if (!line.trim() || line.startsWith("#")) return null;
  line = line.replace(/(?<!\\)\s+$/, "");
  let negate = false;
  if (line.startsWith("!")) {
    negate = true;
    line = line.slice(1);
  }
  let dirOnly = false;
  if (line.endsWith("/")) {
    dirOnly = true;
    line = line.slice(0, -1);
  }
  const anchored = line.includes("/");
  line = line.replace(/^\//, "");
  let re = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "*") {
      if (line[i + 1] === "*") {
        const slash = line[i + 2] === "/";
        re += slash ? "(?:.*/)?" : ".*";
        i += slash ? 2 : 1;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "[") {
      const end = line.indexOf("]", i);
      if (end > i) {
        re += line.slice(i, end + 1);
        i = end;
      } else re += "\\[";
    } else re += c.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return { re: new RegExp(anchored ? `^${re}$` : `(?:^|/)${re}$`), negate, dirOnly };
}

function loadIgnore(dir) {
  try {
    return fs.readFileSync(path.join(dir, ".gitignore"), "utf8").split("\n").map(compileLine).filter(Boolean);
  } catch {
    return [];
  }
}

/** True when `rel` (posix path from the ignore file's folder) is ignored by the rules (last match wins). */
function ignored(rules, rel, isDir) {
  let result = false;
  for (const r of rules) {
    if (r.dirOnly && !isDir) continue;
    if (r.re.test(rel)) result = !r.negate;
  }
  return result;
}

/**
 * All files under `root` with one of `exts` (lower-case, with dot). Returns [{ rel, abs, size, mtimeMs }].
 * Skips dependency, build and cache folders, files git ignores, and secret-looking files (.env, keys).
 */
export function walkProject(root, { exts, maxFiles = 20000, maxBytes = 1_500_000 } = {}) {
  const out = [];
  const stack = [{ dir: root, rules: [{ base: root, rules: loadIgnore(root) }] }];
  while (stack.length) {
    const { dir, rules } = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const relRoot = path.relative(root, abs).split(path.sep).join("/");
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (ALWAYS_SKIP.has(e.name)) continue;
        if (rules.some((s) => ignored(s.rules, path.relative(s.base, abs).split(path.sep).join("/"), true))) continue;
        stack.push({ dir: abs, rules: [...rules, { base: abs, rules: loadIgnore(abs) }].filter((s) => s.rules.length) });
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (!exts.has(ext) || SECRET.test(relRoot)) continue;
        if (rules.some((s) => ignored(s.rules, path.relative(s.base, abs).split(path.sep).join("/"), false))) continue;
        let st;
        try {
          st = fs.statSync(abs);
        } catch {
          continue;
        }
        if (st.size > maxBytes || e.name.endsWith(".min.js") || e.name.endsWith(".d.ts")) continue;
        out.push({ rel: relRoot, abs, size: st.size, mtimeMs: Math.round(st.mtimeMs) });
        if (out.length >= maxFiles) return out;
      }
    }
  }
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}
