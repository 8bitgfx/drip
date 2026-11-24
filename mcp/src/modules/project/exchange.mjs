// Style packs: a project's design identity as a self-contained folder another repository can import.
//
//   style-pack/
//     manifest.json   what is inside, with a hash per file; every path is relative
//     guide.md        the project skill's text (approved direction, rules, measured tokens)
//     decisions.json  approved rules, exceptions, rejected directions, the approved direction (no feedback events)
//     style.json      measured tokens
//     board.json      the master board: the project's own items with copies of their files, references as metadata only
//     assets/ code/ fonts/ patterns/   project-owned material the board and rules point at
//
// Only what the project owns goes in: files from the repo, its own screenshots and comps, its token CSS. References
// from other people's sites stay metadata (title, URL, note). Personal feedback never leaves the project, and a file
// that looks like it holds a secret is left out and listed. Import never overwrites: assets land in
// .drip/imports/<name>/ and the imported board is a new, editable, scoped board.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDrip, projectDir, projectDripDir } from "../../core/paths.mjs";
import { actor } from "../../core/state.mjs";
import { approveDirection, loadDecisions, loadStyle, skillBody, updateDecisions, writeProjectSkill } from "../../core/memory.mjs";
import { SECRET_FILE } from "./scan.mjs";
import { saveStyle } from "./style.mjs";
import { SCHEMA, createBoard, loadBoard, loadIndex, masterId, updateBoard } from "../board/store.mjs";

const SECRET_TEXT = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|\bAKIA[0-9A-Z]{16}\b|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|(?:api[_-]?key|secret|passw(?:or)?d|token)\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{16,}["'])/i;
const TEXT_EXT = /\.(css|scss|sass|less|json|md|txt|svg|html?|js|ts|mjs|cjs|tsx|jsx)$/i;
const posix = (p) => p.split(path.sep).join("/");
const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");
const safeName = (rel) => rel.replace(/^[./\\]+/, "").replace(/\.\.+/g, ".").replace(/[<>:"|?*]/g, "_");

/** A project file may be copied only if its name and, for text, its content show no secret. Returns a reason when it may not. */
export function whyNotShareable(abs) {
  if (SECRET_FILE.test(path.basename(abs))) return "looks like a secrets file";
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return "not a file";
    if (st.size > 12 * 1024 * 1024) return "larger than 12 MB";
    if (TEXT_EXT.test(abs) && st.size < 2 * 1024 * 1024 && SECRET_TEXT.test(fs.readFileSync(abs, "utf8"))) return "contains something that looks like a secret";
  } catch {
    return "unreadable";
  }
  return null;
}

/** Build a style pack folder from the project. Returns { out, manifest, skipped }. */
export function exportStylePack({ out, name, board: boardId, includePatterns = true, cwd } = {}) {
  const root = projectDir(cwd);
  const idx = loadIndex();
  const mid = boardId || idx.masters.default || masterId(null);
  const board = mid ? loadBoard(mid) : null;
  const projName = name || path.basename(root);
  const dest = path.resolve(root, out || path.join(".drip", "exports", `style-pack-${safeName(projName)}`));
  fs.mkdirSync(dest, { recursive: true });
  const files = [];
  const skipped = [];
  const write = (rel, data, kind) => {
    const abs = path.join(dest, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, data);
    files.push({ path: rel, sha1: sha(data), size: Buffer.byteLength(data), kind });
  };
  const copy = (srcRel, kind) => {
    const abs = path.resolve(root, srcRel);
    if (!abs.startsWith(root)) {
      skipped.push({ path: srcRel, why: "outside the project" });
      return null;
    }
    const why = whyNotShareable(abs);
    if (why) {
      skipped.push({ path: srcRel, why });
      return null;
    }
    const rel = posix(path.join(kind === "font" ? "fonts" : kind === "code" ? "code" : "assets", safeName(srcRel)));
    write(rel, fs.readFileSync(abs), kind);
    return rel;
  };

  // The board: project-owned items are copied with their files, references stay metadata.
  let exportedBoard = null;
  if (board) {
    const items = [];
    for (const it of board.items.filter((x) => !x.removed && x.status !== "archived" && !x.private)) {
      const own = it.provenance?.source === "repo" || it.provenance?.source === "screenshot" || it.provenance?.source === "import";
      const clean = { key: it.key, kind: it.kind, status: it.status, title: it.title, value: it.value, note: it.note, excerpt: it.excerpt, hash: it.hash, provenance: { source: it.provenance?.source || "reference", label: it.provenance?.label || "", url: it.provenance?.url || null, path: null } };
      if (!own) {
        clean.image = undefined; // references from other sites: metadata only
        clean.url = it.url || it.image || null;
        clean.designer = it.designer;
        clean.study = it.study;
      } else if (it.path) {
        const kind = it.kind === "font" ? "font" : it.kind === "tokens" || it.kind === "doc" || it.kind === "page" ? "code" : "asset";
        const rel = copy(it.path, kind);
        if (rel) {
          clean.path = rel;
          clean.provenance.path = rel;
        } else clean.unavailable = true;
      }
      items.push(JSON.parse(JSON.stringify(clean)));
    }
    const directions = board.directions.map((d) => {
      const o = { ...d, tile: undefined };
      if (d.tile && fs.existsSync(d.tile)) o.tile = copy(posix(path.relative(root, d.tile)), "asset");
      return JSON.parse(JSON.stringify(o));
    });
    exportedBoard = { schema: SCHEMA, name: board.name, brief: board.brief, scope: "master", items, directions, chosen: board.chosen, criteria: board.criteria || null, approved: idx.approved.default ? { direction: idx.approved.default.direction, snapshot: idx.approved.default.snapshot, reason: idx.approved.default.reason } : null };
    write("board.json", JSON.stringify(exportedBoard, null, 2), "board");
  }
  // Decisions: approved only, without the feedback that produced them.
  const d = loadDecisions(cwd);
  const decisions = {
    schema: 1,
    rules: d.rules.filter((r) => r.status === "approved" && r.scope === "brand").map(({ topic, value, avoid, since }) => ({ topic, value, avoid, scope: "brand", since })), // never the user's words behind a rule
    rejected: d.rejected.filter((r) => r.kind !== "rule").map(({ kind, what, at }) => ({ kind, what, at })),
  };
  write("decisions.json", JSON.stringify(decisions, null, 2), "decisions");
  const style = loadStyle(cwd);
  if (style?.tokens) write("style.json", JSON.stringify({ schema: 1, tokens: style.tokens, sources: (style.sources || []).map(({ kind, ref, at }) => ({ kind, ref, at })) }, null, 2), "style");
  write("guide.md", skillBody(cwd, { brandOnly: true }), "guide");
  // Approved patterns: the specs and the index, no code.
  if (includePatterns) {
    const pdir = path.join(projectDripDir(cwd), "patterns");
    const pidx = path.join(pdir, "index.json");
    if (fs.existsSync(pidx)) {
      try {
        const index = JSON.parse(fs.readFileSync(pidx, "utf8"));
        const entries = (index.patterns || index.entries || []).filter((p) => p.status === "approved");
        write("patterns/index.json", JSON.stringify({ schema: index.schema || 1, patterns: entries }, null, 2), "patterns");
        for (const p of entries) for (const f of ["spec.json", "spec.md"]) {
          const abs = path.join(pdir, p.id, f);
          if (fs.existsSync(abs) && !whyNotShareable(abs)) write(`patterns/${p.id}/${f}`, fs.readFileSync(abs), "patterns");
        }
      } catch {
        skipped.push({ path: ".drip/patterns/index.json", why: "unreadable" });
      }
    }
  }
  const fonts = [...new Set((exportedBoard?.items || []).filter((i) => i.kind === "font").map((i) => i.value))];
  const manifest = {
    schema: 1,
    kind: "drip-style-pack",
    name: projName,
    createdAt: new Date().toISOString(),
    source: { project: path.basename(root), board: board?.id || null, styleRevision: idx.approved.default?.revision || null },
    approvedDirection: idx.approved.default?.direction || null,
    fonts: fonts.map((f) => ({ family: f, bundled: files.some((x) => x.kind === "font" && x.path.toLowerCase().includes(f.toLowerCase().replace(/\s+/g, "-"))) })),
    dependencies: [],
    files,
    skipped,
    notes: "Project-owned files only. Personal feedback and secrets are never included. Import copies assets into .drip/imports and creates an editable board; it never overwrites.",
  };
  fs.writeFileSync(path.join(dest, "manifest.json"), JSON.stringify(manifest, null, 2));
  return { out: dest, manifest, skipped };
}

/** Import a style pack. Verifies every file's hash, refuses paths that leave the pack, never overwrites. */
export function importStylePack({ from, name, cwd } = {}) {
  const root = projectDir(cwd);
  const src = path.resolve(root, from);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));
  } catch {
    throw new Error(`${from} is not a style pack (no readable manifest.json).`);
  }
  if (manifest.kind !== "drip-style-pack") throw new Error(`${from}/manifest.json is not a Drip style pack.`);
  const packName = name || manifest.name || "style";
  const slug = safeName(packName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "style";
  ensureProjectDrip(cwd);
  let dest = path.join(projectDripDir(cwd), "imports", slug);
  for (let n = 2; fs.existsSync(dest); n++) dest = path.join(projectDripDir(cwd), "imports", `${slug}-${n}`);
  const skipped = [];
  const copied = [];
  for (const f of manifest.files || []) {
    const abs = path.resolve(src, f.path);
    if (path.isAbsolute(f.path) || f.path.split(/[\\/]/).includes("..") || !abs.startsWith(src)) {
      skipped.push({ path: f.path, why: "path leaves the pack" });
      continue;
    }
    let data;
    try {
      data = fs.readFileSync(abs);
    } catch {
      skipped.push({ path: f.path, why: "missing" });
      continue;
    }
    if (f.sha1 && sha(data) !== f.sha1) {
      skipped.push({ path: f.path, why: "hash mismatch (changed since export)" });
      continue;
    }
    const to = path.join(dest, f.path);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, data);
    copied.push(f.path);
  }
  const relDest = posix(path.relative(root, dest));
  const readIn = (rel) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dest, rel), "utf8"));
    } catch {
      return null;
    }
  };
  const packBoard = readIn("board.json");
  const decisions = readIn("decisions.json");
  const style = readIn("style.json");
  const by = actor(cwd);
  const hasIdentity = !!loadIndex().approved.default || loadDecisions(cwd).rules.some((r) => r.status === "approved");
  const asMaster = !masterId(null) && !hasIdentity;

  // A new board for the import: the project's master when it has none, otherwise an editable concept board.
  const board0 = createBoard(`${packName} (imported style)`, packBoard?.brief || "", { scope: asMaster ? "master" : "concept" });
  const board = updateBoard(
    board0.id,
    (b) => {
      b.importedFrom = { name: packName, at: new Date().toISOString(), source: manifest.source || null, files: copied.length };
      b.items = (packBoard?.items || []).map((it) => ({
        ...it,
        status: asMaster ? it.status || "current" : "proposed",
        ...(it.path ? { path: posix(path.join(relDest, it.path)) } : {}),
        provenance: { source: "import", label: `${packName}${it.provenance?.label ? ` · ${it.provenance.label}` : ""}`, url: it.provenance?.url || null, path: it.path ? posix(path.join(relDest, it.path)) : null, addedBy: by, addedAt: new Date().toISOString() },
        addedAt: new Date().toISOString(),
      }));
      b.directions = (packBoard?.directions || []).map((d) => ({ ...d, tile: d.tile ? path.resolve(root, relDest, d.tile) : undefined, items: d.items || [] }));
      b.criteria = packBoard?.criteria || undefined;
    },
    { op: "import", summary: `style pack "${packName}" (${copied.length} files)`, by },
  );
  // Rules and the direction: in force at once when the project had no identity, otherwise proposals the user reviews.
  let ruleCount = 0;
  updateDecisions((d) => {
    for (const r of decisions?.rules || []) {
      d.rules.push({ id: `rule_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`, topic: r.topic, value: r.value, avoid: r.avoid || [], scope: "brand", target: null, status: asMaster ? "approved" : "proposed", since: new Date().toISOString(), source: "import", text: r.text || "", evidence: { import: packName, from: manifest.source?.project || null }, revision: null, supersedes: [] });
      ruleCount++;
    }
    for (const x of decisions?.rejected || []) d.rejected.push({ id: `rej_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`, kind: x.kind || "style", what: x.what, why: x.why, at: new Date().toISOString(), source: "import", evidence: { import: packName } });
    d.imports = [...(d.imports || []), { name: packName, at: new Date().toISOString(), dir: relDest, from: manifest.source || null, asMaster }];
    return d;
  }, cwd);
  let approved = null;
  if (asMaster && packBoard?.approved?.direction) {
    const snap = packBoard.approved.snapshot || packBoard.directions?.find((x) => x.name === packBoard.approved.direction);
    const has = board.directions.some((x) => x.name === packBoard.approved.direction);
    if (!has && snap) updateBoard(board.id, (b) => { b.directions.push({ ...snap, items: [] }); }, { op: "import", summary: "approved direction" });
    approved = approveDirection({ boardId: board.id, direction: packBoard.approved.direction, reason: `imported with the style pack "${packName}"`, mode: "fresh", approved: true, cwd });
    updateBoard(board.id, (b) => { b.chosen = packBoard.approved.direction; }, { op: "choose", summary: "imported direction" });
  }
  if (style?.tokens) {
    saveStyle([{ kind: "import", ref: packName, tokens: style.tokens }], cwd);
  }
  try {
    writeProjectSkill({ cwd });
  } catch {
    /* the skill follows on the next update */
  }
  return { board, asMaster, dest, relDest, copied: copied.length, skipped, rules: ruleCount, approved, packName };
}
