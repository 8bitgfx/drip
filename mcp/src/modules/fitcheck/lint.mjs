// Static slop / polish checks. Rules are data: data/slop.json (+ <project>/.drip/slop.json).
// No dependencies: the PostToolUse hook imports this file directly.
import fs from "node:fs";
import path from "node:path";
import { dataDir, projectDripDir } from "../../core/paths.mjs";

function readRules(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).rules || [];
  } catch {
    return [];
  }
}

export function loadRules(cwd) {
  return [...readRules(path.join(dataDir, "slop.json")), ...readRules(path.join(projectDripDir(cwd), "slop.json"))];
}

/** Lint one file's text. Returns [{ id, severity, line, message, fix, count }]. */
export function lintText(source, rules) {
  const out = [];
  const lines = source.split("\n");
  for (const r of rules) {
    let re;
    try {
      re = new RegExp(r.pattern, `${(r.flags || "").replace("g", "")}g`);
    } catch {
      continue;
    }
    if (r.unless && new RegExp(r.unless, "i").test(source)) continue;
    const hits = [];
    lines.forEach((l, i) => {
      re.lastIndex = 0;
      const n = (l.match(re) || []).length;
      for (let k = 0; k < n; k++) hits.push(i + 1);
    });
    if (!hits.length || hits.length < (r.min || 1)) continue;
    out.push({ id: r.id, severity: r.severity || "warn", line: hits[0], count: hits.length, message: r.message, fix: r.fix });
  }
  // Too many font families in one file.
  const families = new Set([...source.matchAll(/font-family:\s*([^;}{]+)/gi)].map((m) => m[1].split(",")[0].trim().replace(/['"]/g, "").toLowerCase()));
  if (families.size > 3) out.push({ id: "font-families", severity: "warn", line: 1, count: families.size, message: `${families.size} font families in one file.`, fix: "One pairing: a display face and a text face (drip_guide type)." });
  return out;
}

export function lintFiles(files, cwd) {
  const rules = loadRules(cwd);
  const results = [];
  for (const f of files) {
    let src;
    try {
      src = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const issue of lintText(src, rules)) results.push({ file: f, ...issue });
  }
  return results;
}

export function formatIssues(issues, cwd) {
  if (!issues.length) return "No slop or polish issues found by the static checks (that does not replace looking at it).";
  const order = { error: 0, warn: 1, info: 2 };
  return issues
    .sort((a, b) => order[a.severity] - order[b.severity])
    .map((i) => `${i.severity.toUpperCase()} ${path.relative(cwd || process.cwd(), i.file)}:${i.line} [${i.id}${i.count > 1 ? ` x${i.count}` : ""}] ${i.message} -> ${i.fix}`)
    .join("\n");
}
