// Niche packs: Drip specialised for one niche (written by /drip:adapt).
//   ~/.drip/packs/<id>/          personal
//   <project>/.drip/packs/<id>/  shared with the team (wins over personal)
// Each pack: pack.json + guide.md, genres.md, artists.md, queries.md, critic.md, refs.json, slop.json, catalogue.json
//
// pack.json "type": "niche" (default, activated by its keywords) or "project" (this project's own style pack: it applies
// to every design task in the project, its critic.md joins the critic's rubric, its guide reaches the agent through
// project_context instead of being pasted into drip_start). A pack can carry a declarative, versioned "workflow":
// { stages: [{ id, title, requires?, gate?, criteria? }], criteria: [] }. Data only: nothing in a pack is ever executed.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, ensureProjectDrip, homeDripDir, projectDripDir } from "./paths.mjs";

export const PACK_FILES = ["guide.md", "genres.md", "artists.md", "queries.md", "critic.md", "sources.md", "refs.json", "slop.json", "catalogue.json"];

function roots(cwd) {
  return [path.join(projectDripDir(cwd), "packs"), path.join(homeDripDir, "packs")];
}

export function packDir(id, cwd) {
  for (const r of roots(cwd)) if (fs.existsSync(path.join(r, id, "pack.json"))) return path.join(r, id);
  return null;
}

export function listPacks(cwd) {
  const out = new Map();
  for (const r of roots(cwd).reverse()) {
    if (!fs.existsSync(r)) continue;
    for (const id of fs.readdirSync(r)) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(r, id, "pack.json"), "utf8"));
        out.set(id, { ...meta, id, dir: path.join(r, id), shared: r.startsWith(projectDripDir(cwd)) });
      } catch {
        /* not a pack */
      }
    }
  }
  return [...out.values()];
}

export const WORKFLOW_GATES = ["brief", "references", "direction", "critic", "system", "hero", "fitcheck", "user"];
const EXEC_KEYS = /^(command|cmd|script|exec|run|shell|install|hook|code)$/i;

/** Check a pack's declarative workflow; returns the cleaned workflow or throws with what is wrong. Never accepts anything executable. */
export function validateWorkflow(w) {
  if (!w || typeof w !== "object") throw new Error("workflow must be an object { stages: [...], criteria?: [...] }");
  const stages = Array.isArray(w.stages) ? w.stages : [];
  const ids = new Set();
  const out = [];
  for (const st of stages) {
    for (const k of Object.keys(st || {})) if (EXEC_KEYS.test(k)) throw new Error(`Workflow stages are data only: "${k}" is not allowed (packs never run code).`);
    if (!st?.id || !/^[a-z0-9-]+$/.test(st.id)) throw new Error("every stage needs an id like 'direction-review'");
    if (ids.has(st.id)) throw new Error(`duplicate stage id "${st.id}"`);
    ids.add(st.id);
    out.push({ id: st.id, title: String(st.title || st.id), requires: (st.requires || []).map(String), gate: st.gate ? String(st.gate) : undefined, criteria: (st.criteria || []).map(String), sources: (st.sources || []).map(String) });
  }
  for (const st of out) {
    for (const r of st.requires) if (!ids.has(r)) throw new Error(`stage "${st.id}" requires unknown stage "${r}"`);
    if (st.gate && !WORKFLOW_GATES.includes(st.gate)) throw new Error(`stage "${st.id}": gate must be one of ${WORKFLOW_GATES.join(", ")}`);
  }
  return { stages: out, criteria: (w.criteria || []).map(String) };
}

export function createPack({ id, name, niche, keywords = [], summary, shared, type, workflow }, cwd) {
  if (shared || type === "project") ensureProjectDrip(cwd);
  const dir = ensureDir(path.join((shared || type === "project") ? path.join(projectDripDir(cwd), "packs") : path.join(homeDripDir, "packs"), id));
  const file = path.join(dir, "pack.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const meta = { ...prev, id, name, niche, keywords, summary, createdAt: prev.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (type || prev.type) meta.type = type || prev.type;
  if (workflow) {
    const clean = validateWorkflow(workflow);
    const same = JSON.stringify(prev.workflow?.stages) === JSON.stringify(clean.stages) && JSON.stringify(prev.workflow?.criteria) === JSON.stringify(clean.criteria);
    if (!same) {
      meta.workflowVersion = (prev.workflowVersion || 0) + 1;
      meta.workflowHistory = [...(prev.workflowHistory || []), ...(prev.workflow ? [{ version: prev.workflowVersion || 1, workflow: prev.workflow, until: meta.updatedAt }] : [])].slice(-10);
    }
    meta.workflow = clean;
  }
  fs.writeFileSync(file, JSON.stringify(meta, null, 2));
  return { ...meta, dir };
}

export function writePackFile(id, file, content, cwd) {
  if (!PACK_FILES.includes(file)) throw new Error(`Pack files are: ${PACK_FILES.join(", ")}`);
  const dir = packDir(id, cwd);
  if (!dir) throw new Error(`No pack "${id}". Create it with pack_create first.`);
  if (file.endsWith(".json")) JSON.parse(content); // validate
  fs.writeFileSync(path.join(dir, file), content);
  const metaFile = path.join(dir, "pack.json");
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return path.join(dir, file);
}

export function readPackFile(id, file, cwd) {
  const dir = packDir(id, cwd);
  if (!dir) return null;
  const f = path.join(dir, file);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

/** Packs whose keywords appear in the text, plus this project's own style pack(s) (type "project"), which always apply. */
export function matchPacks(text, cwd) {
  const t = text.toLowerCase();
  return listPacks(cwd).filter((p) => p.type === "project" || (p.keywords || []).some((k) => k && t.includes(String(k).toLowerCase())));
}

export const isProjectPack = (id, cwd) => listPacks(cwd).some((p) => p.id === id && p.type === "project");
