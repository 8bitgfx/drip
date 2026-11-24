// The incremental component index: .drip/index/components.json (jsonstore: lock, atomic write, revision).
// Cached per file by mtime + size, then by content hash, so a re-run only parses files that changed.
// Includes untracked files (it walks the filesystem); never touches the git index.
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDrip, projectDir } from "../paths.mjs";
import { readJson, updateJson } from "../jsonstore.mjs";
import { EXTS, extractFile, hashText } from "./extract.mjs";
import { walkProject } from "./walk.mjs";

export const INDEX_SCHEMA = 1;
export const indexFile = (root = projectDir()) => path.join(ensureProjectDrip(root), "index", "components.json");

export function loadIndex(root = projectDir()) {
  const doc = readJson(indexFile(root), null);
  return doc && doc.schema === INDEX_SCHEMA ? doc : null;
}

/**
 * Bring the index up to date. Returns { index, stats: { files, reused, reparsed, added, removed, ms }, changed: [rel] }
 * where `changed` lists files that are new, edited (content hash differs) or removed since the last run.
 */
export function indexProject({ root = projectDir(), full = false } = {}) {
  const t0 = Date.now();
  const prev = full ? null : loadIndex(root);
  const prevFiles = prev?.files || {};
  const found = walkProject(root, { exts: EXTS });
  const files = {};
  const changed = [];
  let reused = 0;
  let reparsed = 0;
  let added = 0;
  for (const f of found) {
    const old = prevFiles[f.rel];
    if (old && old.mtimeMs === f.mtimeMs && old.size === f.size) {
      files[f.rel] = old;
      reused++;
      continue;
    }
    let src;
    try {
      src = fs.readFileSync(f.abs, "utf8");
    } catch {
      continue;
    }
    const hash = hashText(src);
    if (old && old.hash === hash) {
      files[f.rel] = { ...old, mtimeMs: f.mtimeMs, size: f.size };
      reused++;
      continue;
    }
    let facts;
    try {
      facts = extractFile(f.rel, src);
    } catch (e) {
      facts = { rel: f.rel, error: String(e.message || e).slice(0, 120), imports: [], exports: [], locals: [], jsx: {}, tokens: { vars: {}, defined: {} }, literals: { colors: [], radii: [], shadows: [] }, units: [] };
    }
    files[f.rel] = { mtimeMs: f.mtimeMs, size: f.size, hash, facts };
    changed.push(f.rel);
    if (old) reparsed++;
    else added++;
  }
  const removed = Object.keys(prevFiles).filter((r) => !files[r]);
  changed.push(...removed);
  const unchanged = !changed.length && prev && Object.keys(files).length === Object.keys(prevFiles).length && Object.entries(files).every(([r, e]) => prevFiles[r]?.mtimeMs === e.mtimeMs);
  let index = prev;
  if (!unchanged) {
    index = updateJson(
      indexFile(root),
      (doc) => {
        doc.schema = INDEX_SCHEMA;
        doc.root = path.basename(root);
        doc.files = files;
        doc.indexedAt = new Date().toISOString();
      },
      { init: { schema: INDEX_SCHEMA, files: {} } },
    );
  }
  return { index, stats: { files: Object.keys(files).length, reused, reparsed, added, removed: removed.length, ms: Date.now() - t0 }, changed };
}

/** A hash of everything indexed: file hashes in path order. */
export function indexHash(index) {
  return hashText(Object.entries(index.files || {}).map(([r, e]) => `${r}:${e.hash}`).join("\n"));
}

const RESOLVE_EXT = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".vue", ".svelte", ".astro", ".css", ".scss"];

/** Resolve an import specifier from file `fromRel` to an indexed file (relative paths and @/, ~/, # aliases). */
export function resolveImport(fromRel, spec, fileSet) {
  const tries = [];
  if (spec.startsWith(".")) tries.push(path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec)));
  else if (/^(@|~|#)\//.test(spec)) {
    const rest = spec.slice(2);
    tries.push(`src/${rest}`, rest, `app/${rest}`, `lib/${rest}`);
  } else return null;
  for (const base of tries) {
    if (fileSet.has(base)) return base;
    for (const e of RESOLVE_EXT) {
      if (fileSet.has(base + e)) return base + e;
      if (fileSet.has(`${base}/index${e}`)) return `${base}/index${e}`;
    }
  }
  return null;
}

/** Derived views over the index: components with usage counts, stories, tests, tokens, the import graph. */
export function graphOf(index) {
  const files = index.files || {};
  const fileSet = new Set(Object.keys(files));
  const components = [];
  const byName = new Map();
  const tokensDefined = {};
  for (const [rel, e] of Object.entries(files)) {
    const f = e.facts;
    for (const [name, d] of Object.entries(f.tokens?.defined || {})) tokensDefined[name] = { ...d, file: rel };
    for (const x of [...(f.exports || []), ...(f.locals || [])]) {
      if (x.kind !== "component") continue;
      const c = { ...x, file: rel, usedBy: [], usageCount: 0, stories: [], tests: [], tokens: Object.keys(f.tokens?.vars || {}) };
      components.push(c);
      if (!byName.has(x.name)) byName.set(x.name, []);
      byName.get(x.name).push(c);
    }
  }
  const importGraph = {};
  for (const [rel, e] of Object.entries(files)) {
    const f = e.facts;
    const edges = [];
    const bindings = new Map();
    for (const imp of f.imports || []) {
      const target = resolveImport(rel, imp.from, fileSet);
      if (target) edges.push(target);
      for (const n of imp.names || []) bindings.set(n.name, { target, imported: n.imported, from: imp.from });
    }
    importGraph[rel] = [...new Set(edges)];
    // usage of components defined elsewhere
    for (const [tag, count] of Object.entries(f.jsx || {})) {
      const defs = byName.get(tag) || byName.get(bindings.get(tag)?.imported) || [];
      const b = bindings.get(tag);
      const def = defs.find((d) => b?.target && d.file === b.target) || (!b ? defs.find((d) => d.file === rel) : null) || (b && !b.target ? null : defs.length === 1 && defs[0].exported ? defs[0] : null);
      if (!def || (def.file === rel && !b)) continue;
      if (!f.isTest && !f.isStory) {
        def.usageCount += count;
        if (!def.usedBy.includes(rel) && def.usedBy.length < 12) def.usedBy.push(rel);
      }
    }
    if (f.isStory || f.isTest) {
      const list = f.isStory ? "stories" : "tests";
      const named = f.story?.component;
      for (const [name, b] of bindings) {
        if (!b.target) continue;
        for (const c of byName.get(b.imported === "default" ? name : b.imported) || byName.get(name) || []) if (c.file === b.target && !c[list].includes(rel)) c[list].push(rel);
      }
      if (named) for (const c of byName.get(named) || []) if (!c[list].includes(rel)) c[list].push(rel);
    }
  }
  return { components, byName, tokensDefined, importGraph, fileSet };
}
