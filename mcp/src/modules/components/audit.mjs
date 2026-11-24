// Component audit over the index: near-duplicate logic and markup (token shingles), repeated CSS blocks,
// token drift (raw values that equal or nearly equal a defined token) and odd module boundaries.
// Every finding names file:line for both sides and a reuse candidate. No file-length limits.
import fs from "node:fs";
import path from "node:path";
import { graphOf, resolveImport } from "../../core/indexer/index.mjs";
import { similarity } from "../../core/indexer/extract.mjs";
import { readJson } from "../../core/jsonstore.mjs";
import { projectDripDir } from "../../core/paths.mjs";

const SEV = { high: 0, medium: 1, low: 2 };

const jaccard = (a, b) => {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let both = 0;
  for (const x of A) if (B.has(x)) both++;
  return both / (A.size + B.size - both);
};

const hexNorm = (v) => {
  const m = /^#([0-9a-f]{3})$/i.exec(v);
  return (m ? "#" + [...m[1]].map((c) => c + c).join("") : v).toLowerCase();
};
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const colorDist = (a, b) => Math.hypot(...rgbOf(a).map((v, i) => v - rgbOf(b)[i]));
const shortVal = (v) => v.replace(/\s+/g, "").toLowerCase();

/** Exceptions the user recorded on purpose: .drip/check/exceptions.json { audit: [{ kind, files: [..], reason }] }. */
export function loadExceptions(root) {
  return readJson(path.join(projectDripDir(root), "check", "exceptions.json"), {}) || {};
}

function excepted(finding, ex) {
  return (ex.audit || []).some((e) => (!e.kind || e.kind === finding.kind) && (e.files || []).length > 0 && e.files.every((f) => finding.files.some((x) => x.file === f || `${x.file}:${x.line}` === f || x.name === f)));
}

/**
 * Run the audit. Options: changed (Set of rel paths: keep findings touching them), root (for exceptions).
 * Returns { findings, stats }.
 */
export function auditIndex(index, { changed = null, root } = {}) {
  const t0 = Date.now();
  const g = graphOf(index);
  const files = index.files || {};
  const findings = [];
  const usage = new Map(g.components.map((c) => [`${c.file}::${c.name}`, c.usageCount]));
  const defOf = (file, name) => g.components.find((c) => c.file === file && c.name === name);

  // ---- 1. near-duplicate units (logic + markup) ----------------------------------------------------
  const units = [];
  for (const [rel, e] of Object.entries(files)) {
    if (e.facts.isTest || e.facts.isStory) continue;
    for (const u of e.facts.units || []) units.push({ ...u, file: rel });
  }
  const posting = new Map();
  units.forEach((u, i) => {
    for (const h of u.sh) {
      if (!posting.has(h)) posting.set(h, []);
      posting.get(h).push(i);
    }
  });
  const shared = new Map();
  for (const list of posting.values()) {
    if (list.length > 40) continue; // boilerplate shingle
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) shared.set(list[a] * 100003 + list[b], (shared.get(list[a] * 100003 + list[b]) || 0) + 1);
  }
  let pairsChecked = 0;
  const dupPairs = [];
  for (const [key, count] of shared) {
    if (count < 6) continue;
    const a = units[Math.floor(key / 100003)];
    const b = units[key % 100003];
    if (a.file === b.file && Math.abs(a.line - b.line) < 2) continue;
    if (Math.min(a.n, b.n) < 45 || Math.max(a.n, b.n) / Math.min(a.n, b.n) > 2.2) continue;
    // legitimate variants: thin wrappers around one component, or a base and the wrapper that renders it
    if (a.thin && b.thin) continue;
    if (g.importGraph[a.file]?.includes(b.file) && a.thin) continue;
    if (g.importGraph[b.file]?.includes(a.file) && b.thin) continue;
    pairsChecked++;
    const sim = similarity(a, b);
    if (sim < 0.62) continue;
    const classSim = a.classes.length || b.classes.length ? jaccard(a.classes, b.classes) : 0;
    const markup = a.component && b.component && classSim >= 0.7;


    dupPairs.push({ a, b, sim, markup, classSim });
  }
  // Group pairs into clusters (a helper copied five times is one finding, not ten).
  const parent = new Map();
  const find = (x) => (parent.get(x) === x || !parent.has(x) ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const uk = (u) => `${u.file}::${u.line}`;
  for (const p of dupPairs) {
    parent.set(uk(p.a), parent.has(uk(p.a)) ? parent.get(uk(p.a)) : uk(p.a));
    parent.set(uk(p.b), parent.has(uk(p.b)) ? parent.get(uk(p.b)) : uk(p.b));
    parent.set(find(uk(p.a)), find(uk(p.b)));
  }
  const clusters = new Map();
  for (const p of dupPairs) {
    const root = find(uk(p.a));
    if (!clusters.has(root)) clusters.set(root, { pairs: [], units: new Map() });
    const c = clusters.get(root);
    c.pairs.push(p);
    c.units.set(uk(p.a), p.a);
    c.units.set(uk(p.b), p.b);
  }
  for (const c of clusters.values()) {
    const us = [...c.units.values()];
    const sim = Math.min(...c.pairs.map((p) => p.sim));
    const markup = c.pairs.every((p) => p.markup);
    const minN = Math.min(...us.map((u) => u.n));
    const use = (u) => usage.get(`${u.file}::${u.name}`) ?? 0;
    const keep = [...us].sort((x, y) => use(y) - use(x) || (x.file < y.file ? -1 : 1))[0];
    const names = [...new Set(us.map((u) => u.name))];
    const what = markup ? "markup and styling" : "code structure";
    findings.push({
      kind: markup ? "duplicate-markup" : "duplicate-logic",
      severity: sim >= 0.85 && minN >= 80 ? "high" : "medium",
      similarity: +sim.toFixed(2),
      files: us.map((u) => ({ file: u.file, line: u.line, end: u.end, name: u.name })),
      message: us.length === 2 ? `${us[0].name} and ${us[1].name} are ${Math.round(sim * 100)}% the same ${what} (${us[0].n} and ${us[1].n} tokens${markup ? `, ${Math.round(c.pairs[0].classSim * 100)}% shared classes` : ""}).` : `${us.length} near-identical copies (${names.slice(0, 4).join(", ")}${names.length > 4 ? ", ..." : ""}): at least ${Math.round(sim * 100)}% the same ${what}.`,
      reuse: `${keep.name} (${keep.file}:${keep.line}, used ${use(keep)}x)`,
      fix: `Keep ${keep.name}; make the others use it (props or a variant for what differs) or extract the shared part. If they are different concepts that merely look alike, add an exception in .drip/check/exceptions.json.`,
    });
  }

  // ---- 2. repeated CSS blocks ----------------------------------------------------------------------
  const blocks = [];
  for (const [rel, e] of Object.entries(files)) for (const b of e.facts.css?.blocks || []) blocks.push({ ...b, file: rel });
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.selector === b.selector) continue;
      const sim = jaccard(a.decls, b.decls);
      if (sim < 0.85 || Math.min(a.decls.length, b.decls.length) < 5) continue;
      findings.push({
        kind: "duplicate-css",
        severity: "medium",
        similarity: +sim.toFixed(2),
        files: [
          { file: a.file, line: a.line, name: a.selector },
          { file: b.file, line: b.line, name: b.selector },
        ],
        message: `${a.selector} and ${b.selector} declare ${Math.round(sim * 100)}% the same ${Math.min(a.decls.length, b.decls.length)}+ properties.`,
        reuse: `one shared class or a component for ${a.selector}`,
        fix: "Give them one class (or a CSS custom property set) and let each use add only what differs.",
      });
    }

  // ---- 3. token drift ------------------------------------------------------------------------------
  const colorTokens = [];
  const radiusTokens = [];
  const shadowTokens = [];
  for (const [name, d] of Object.entries(g.tokensDefined)) {
    const v = d.value.trim();
    if (/^#[0-9a-f]{3,8}$/i.test(v)) colorTokens.push({ name, value: hexNorm(v), file: d.file, line: d.line });
    else if (/^(rgba?|hsla?)\(/i.test(v)) colorTokens.push({ name, value: shortVal(v), file: d.file, line: d.line, raw: true });
    else if (/^[\d.]+(px|rem)$/.test(v) && /radius|round/i.test(name)) radiusTokens.push({ name, value: v, file: d.file, line: d.line });
    else if (/shadow|elevation/i.test(name)) shadowTokens.push({ name, value: shortVal(v), file: d.file, line: d.line });
  }
  const definesTokens = new Set(Object.values(g.tokensDefined).map((d) => d.file));
  for (const [rel, e] of Object.entries(files)) {
    if (definesTokens.has(rel) || e.facts.isTest || e.facts.isStory || !/\.(css|scss|tsx|jsx|vue|svelte|astro)$/.test(rel)) continue;
    const lit = e.facts.literals || {};
    const seenLit = new Set();
    for (const c of lit.colors || []) {
      if (seenLit.has(`${c.line}:${c.v}`)) continue;
      seenLit.add(`${c.line}:${c.v}`);
      const v = c.v.startsWith("#") ? hexNorm(c.v) : shortVal(c.v);
      const exact = colorTokens.find((t) => t.value === v || (!t.raw && v.startsWith("#") && v.length === 9 && v.slice(0, 7) === t.value && v.endsWith("ff")));
      if (exact) findings.push({ kind: "token-drift", severity: v === "#ffffff" || v === "#000000" ? "low" : "high", files: [{ file: rel, line: c.line, name: c.v }], message: `${c.v} is the value of ${exact.name} (${exact.file}:${exact.line}) written out by hand.`, reuse: `var(${exact.name})`, fix: `Use var(${exact.name}) so a theme change reaches it.` });
      else if (v.startsWith("#") && v.length === 7) {
        const near = colorTokens.filter((t) => !t.raw && t.value.length === 7).map((t) => ({ t, d: colorDist(v, t.value) })).sort((x, y) => x.d - y.d)[0];
        if (near && near.d <= 12) findings.push({ kind: "token-drift", severity: "medium", files: [{ file: rel, line: c.line, name: c.v }], message: `${c.v} is a near miss of ${near.t.name} ${near.t.value} (colour distance ${Math.round(near.d)}).`, reuse: `var(${near.t.name})`, fix: `Use var(${near.t.name}), or add a new token if this colour is meant to differ.` });
      }
    }
    for (const r of lit.radii || []) {
      const t = radiusTokens.find((x) => x.value === r.v);
      if (t) findings.push({ kind: "token-drift", severity: "medium", files: [{ file: rel, line: r.line, name: r.v }], message: `radius ${r.v} equals ${t.name} (${t.file}:${t.line}).`, reuse: `var(${t.name})`, fix: `Use var(${t.name}).` });
    }
    for (const s of lit.shadows || []) {
      const v = shortVal(s.v);
      const t = shadowTokens.find((x) => x.value === v);
      if (t) findings.push({ kind: "token-drift", severity: "medium", files: [{ file: rel, line: s.line, name: "box-shadow" }], message: `box-shadow equals ${t.name} (${t.file}:${t.line}).`, reuse: `var(${t.name})`, fix: `Use var(${t.name}).` });
    }
  }

  // ---- 4. module boundaries ------------------------------------------------------------------------
  for (const [name, defs] of g.byName) {
    const exported = defs.filter((d) => d.exported);
    if (new Set(exported.map((d) => d.file)).size > 1)
      findings.push({ kind: "ambiguous-component", severity: "medium", files: exported.map((d) => ({ file: d.file, line: d.line, name })), message: `${name} is defined in ${new Set(exported.map((d) => d.file)).size} files, so imports can pick the wrong one.`, reuse: `${name} (${exported[0].file}:${exported[0].line})`, fix: "Keep one, or rename the others for what they are (for example CheckoutButton)." });
  }
  const seenCycle = new Set();
  const visit = (start, node, stack, depth) => {
    if (depth > 6) return;
    for (const next of g.importGraph[node] || []) {
      if (next === start && stack.length > 1) {
        const key = [...stack].sort().join("|");
        if (!seenCycle.has(key)) {
          seenCycle.add(key);
          findings.push({ kind: "import-cycle", severity: "medium", files: stack.map((f) => ({ file: f, line: 1, name: path.posix.basename(f) })), message: `Import cycle: ${[...stack, start].join(" -> ")}.`, reuse: "move the shared part into a third module", fix: "Break the cycle: extract what both need into its own file, or pass it in as a prop." });
        }
      } else if (!stack.includes(next) && stack.length < 6 && /\.(tsx|jsx|ts|js|mjs|vue|svelte|astro)$/.test(next)) visit(start, next, [...stack, next], depth + 1);
    }
  };
  for (const f of Object.keys(g.importGraph)) if (/\.(tsx|jsx|vue|svelte|astro)$/.test(f)) visit(f, f, [f], 0);
  for (const [rel, e] of Object.entries(files)) {
    const isPrimitive = /(^|\/)ui\//.test(rel) && !e.facts.isTest && !e.facts.isStory;
    for (const target of g.importGraph[rel] || []) {
      if (isPrimitive && /(^|\/)(components|features|pages|app|routes)\//.test(target) && !/(^|\/)ui\//.test(target) && g.components.some((c) => c.file === target))
        findings.push({ kind: "boundary", severity: "medium", files: [{ file: rel, line: 1, name: "primitive" }, { file: target, line: 1, name: "product component" }], message: `The primitive ${rel} imports a product component (${target}); primitives should not know about the product.`, reuse: "pass the content in as props or children", fix: "Invert the dependency: the product component should import the primitive." });
      if (!/(^|\/)(pages|app|routes)\//.test(rel) && /(^|\/)(pages|routes)\//.test(target) && !files[rel].facts.isTest && !files[rel].facts.isStory) findings.push({ kind: "boundary", severity: "low", files: [{ file: rel, line: 1, name: "component" }, { file: target, line: 1, name: "page" }], message: `${rel} imports from a page (${target}).`, reuse: "a shared component", fix: "Move what is shared out of the page into components/." });
    }
    for (const imp of files[rel].facts.imports || []) if (/^(\.\.\/){3,}/.test(imp.from) && resolveImport(rel, imp.from, g.fileSet)) findings.push({ kind: "boundary", severity: "low", files: [{ file: rel, line: 1, name: imp.from }], message: `${rel} reaches up ${imp.from.match(/\.\.\//g).length} folders (${imp.from}).`, reuse: "an alias or a closer home for it", fix: "Move the shared file closer or import it through an alias." });
  }
  void defOf;

  const ex = loadExceptions(root);
  let out = findings.filter((f) => !excepted(f, ex));
  if (changed) out = out.filter((f) => f.files.some((x) => changed.has(x.file)));
  out.sort((a, b) => SEV[a.severity] - SEV[b.severity] || (b.similarity || 0) - (a.similarity || 0) || a.files[0].file.localeCompare(b.files[0].file));
  return { findings: out, stats: { units: units.length, pairsChecked, cssBlocks: blocks.length, tokens: Object.keys(g.tokensDefined).length, ms: Date.now() - t0 } };
}

export function formatFinding(f, root) {
  const where = f.files.map((x) => `${x.file}:${x.line}${x.name && !/^[A-Za-z]:|\//.test(x.name) ? ` ${x.name}` : ""}`).join(" · ");
  return `[${f.severity}] ${f.kind}: ${f.message}\n    ${where}\n    reuse: ${f.reuse}\n    fix: ${f.fix}`;
}

/** The unit's source lines, for judges and for the reader (bounded). */
export function sourceOf(root, file, line, end, max = 60) {
  try {
    const lines = fs.readFileSync(path.join(root, file), "utf8").split("\n");
    return lines.slice(line - 1, Math.min(end || line + max, line - 1 + max)).join("\n");
  } catch {
    return "";
  }
}
