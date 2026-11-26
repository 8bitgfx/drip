// .drip/patterns/<id>/ (spec.json, spec.md, reference/, preview/, files) and .drip/patterns/index.json.
// The index is read by other tools too (components_local_find lists approved entries), so its schema is stable:
//   { revision, patterns: [{ id, name, kind: component|section|page|motion|style, files: [project-relative paths],
//     spec: "<rel path to spec.json>", previews: ["<rel paths>"], source: { url?, file?, title?, author?, capturedAt },
//     status: proposed|approved, tags: [], notes?, updatedAt }] }
import fs from "node:fs";
import path from "node:path";
import { ensureDir, ensureProjectDrip, projectDir } from "../../core/paths.mjs";
import { readJson, updateJson, writeJsonAtomic } from "../../core/jsonstore.mjs";
import { relPath, slug as slugOf } from "../../core/util.mjs";

export const KINDS = ["component", "section", "page", "motion", "style"];
export const patternsRoot = () => ensureDir(path.join(ensureProjectDrip(), "patterns"));
export const indexFile = () => path.join(patternsRoot(), "index.json");
export const patternDir = (id) => ensureDir(path.join(patternsRoot(), id));
export const slug = (s) => slugOf(s || "pattern", { fallback: "pattern" });
export const rel = (p) => relPath(projectDir(), p);

export function listPatterns({ status, kind, tag } = {}) {
  const idx = readJson(indexFile(), { patterns: [] });
  return (idx.patterns || []).filter((p) => (!status || p.status === status) && (!kind || p.kind === kind) && (!tag || (p.tags || []).includes(tag)));
}

export function getPattern(id) {
  const entry = listPatterns().find((p) => p.id === id);
  if (!entry) return null;
  return { entry, dir: path.join(patternsRoot(), id), spec: readJson(path.join(patternsRoot(), id, "spec.json"), null) };
}

/** Insert or merge one entry under the index lock; concurrent sessions never lose each other's entries. */
export function upsertPattern(entry) {
  return updateJson(
    indexFile(),
    (doc) => {
      doc.patterns ||= [];
      const i = doc.patterns.findIndex((p) => p.id === entry.id);
      const merged = { ...(i >= 0 ? doc.patterns[i] : {}), ...entry, updatedAt: new Date().toISOString() };
      if (i >= 0) doc.patterns[i] = merged;
      else doc.patterns.push(merged);
    },
    { init: { patterns: [] } },
  );
}

export function writeSpec(id, spec) {
  const dir = patternDir(id);
  writeJsonAtomic(path.join(dir, "spec.json"), spec);
  return dir;
}

export function saveImages(dir, sub, items) {
  const out = ensureDir(path.join(dir, sub));
  return items.map(({ name, buf }) => {
    const f = path.join(out, name);
    fs.writeFileSync(f, buf);
    return f;
  });
}
