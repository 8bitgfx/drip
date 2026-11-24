// Moodboards on disk: <project>/.drip/boards/<id>/board.json (+ board.html when rendered), and the project
// pointer file <project>/.drip/boards/index.json.
//
// Schema 2 (v0.5). A v0.4 board (no `schema`) is migrated in memory on every read and written back, with all of
// its items, directions, chosen direction, stars, notes and feedback intact, by the next update.
//
//   board:  { schema, id, name, brief, scope: master|feature|concept, brand, parent, status: active|archived,
//             revision, createdAt, updatedAt, items[], directions[], chosen, chosenReason, criteria, directionsAt,
//             tilesAt, feedback[], feedbackReadAt, approved: { direction, ... } | null, styleRevisions? }
//   item:   { key, kind, status: current|inspiration|proposed|approved|rejected|archived, provenance, hash, path, ... }
//             path = project-relative (POSIX) for files in the repo or under .drip; image/url = remote.
//   index:  { schema, revision, masters: { <brand|default>: boardId }, boards: { id: {...} }, approved: { <brand>: {...} } }
//
// Every write goes through updateBoard / updateIndex: lock, read, change, revision + 1, atomic write. Two sessions
// adding items at once both land; a caller that passes `expect` with a stale revision gets a RevisionConflict.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, ensureProjectDrip, projectDir, projectDripDir } from "../../core/paths.mjs";
import { appendJsonl, readJson, readJsonl, RevisionConflict, updateJson } from "../../core/jsonstore.mjs";

export { RevisionConflict };
export const SCHEMA = 2;
export const SCOPES = ["master", "feature", "concept"];
export const ITEM_STATUS = ["current", "inspiration", "proposed", "approved", "rejected", "archived"];

// Readers use these (they never create anything: looking must not litter a project that has no Drip memory).
const readDir = () => path.join(projectDripDir(), "boards");
/** The boards folder, created (with .drip/.gitignore) for the callers that write. */
export const boardsDir = () => ensureDir(path.join(ensureProjectDrip(), "boards"));
export const indexFile = () => path.join(readDir(), "index.json");

export function slug(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "board"
  );
}

export function boardFile(id) {
  return path.join(readDir(), id, "board.json");
}

export const boardDir = (id) => path.dirname(boardFile(id));
export const historyFile = (id) => path.join(boardDir(id), "history.jsonl");

// ---- paths: stored project-relative so a moved project keeps working ----
export function toRel(p, root = projectDir()) {
  if (!p || typeof p !== "string" || !path.isAbsolute(p)) return p;
  const rel = path.relative(root, p);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel.split(path.sep).join("/") : p;
}

export function fromRel(p, root = projectDir()) {
  return p && typeof p === "string" && !path.isAbsolute(p) ? path.resolve(root, p) : p;
}

/** A v0.4 tile path is absolute and points into the old checkout: find the same tile in this board's folder. */
function resolveTile(tile, id) {
  if (!tile) return tile;
  const abs = fromRel(tile);
  if (fs.existsSync(abs)) return abs;
  const alt = path.join(boardDir(id), "tiles", path.basename(String(tile).replace(/\\/g, "/")));
  return fs.existsSync(alt) ? alt : abs;
}

// ---- migration and the disk <-> memory shapes ----
export function defaultStatus(kind) {
  return kind === "shot" || kind === "image" || kind === "color" || kind === "font" ? "inspiration" : "current";
}

export function migrateBoard(raw) {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  const b = raw;
  b.items = Array.isArray(b.items) ? b.items : [];
  b.directions = Array.isArray(b.directions) ? b.directions : [];
  b.feedback = Array.isArray(b.feedback) ? b.feedback : [];
  if (b.schema !== SCHEMA) {
    b.migratedFrom = b.schema || 1;
    b.schema = SCHEMA;
    b.scope = b.scope || "feature";
    b.status = b.status || "active";
    b.parent = b.parent ?? null;
    b.brand = b.brand ?? null;
    for (const it of b.items) {
      it.status = it.status || defaultStatus(it.kind);
      it.provenance = it.provenance || { source: it.source || "reference", label: it.from?.query || it.designer || "", url: it.url || it.image || null, path: null, addedBy: null, addedAt: it.addedAt || b.createdAt || null };
    }
  }
  b.revision = b.revision || 0;
  return b;
}

function diskToMem(raw) {
  const b = migrateBoard(raw);
  if (!b) return null;
  for (const d of b.directions) if (d.tile) d.tile = resolveTile(d.tile, b.id);
  return b;
}

function memToDisk(b) {
  const out = { ...b, schema: SCHEMA };
  out.directions = (b.directions || []).map((d) => (d.tile ? { ...d, tile: toRel(d.tile) } : d));
  return out;
}

export function loadBoard(id) {
  if (!id || /[\\/]/.test(id)) return null;
  return diskToMem(readJson(boardFile(id), null));
}

/** Lock, read, change, write: the only safe way to change a board that other sessions may write too. */
export function updateBoard(id, fn, { expect, op = "update", summary = "", by = null } = {}) {
  const file = boardFile(id);
  if (!id || !fs.existsSync(file)) throw new Error(`No board "${id}".`);
  const next = updateJson(
    file,
    (cur) => {
      const b = diskToMem(cur);
      if (!b) throw new Error(`Board "${id}" is unreadable.`);
      const r = fn(b);
      return memToDisk(r && typeof r === "object" && !Array.isArray(r) && r.id ? r : b);
    },
    { expect, init: {} },
  );
  try {
    appendJsonl(historyFile(id), { rev: next.revision, at: next.updatedAt, op, summary, by });
  } catch {
    /* the log is a convenience */
  }
  return diskToMem(next);
}

/** Compatibility: write a whole board you loaded. Throws RevisionConflict when the board changed since you loaded it. */
export function saveBoard(board) {
  boardsDir();
  ensureDir(boardDir(board.id));
  const file = boardFile(board.id);
  const next = updateJson(
    file,
    (cur) => {
      const rev = cur.revision || 0;
      if (board.revision !== undefined && board.revision !== null && board.revision !== rev) throw new RevisionConflict(file, board.revision, rev);
      return memToDisk({ ...board });
    },
    { init: {} },
  );
  const out = diskToMem(next);
  Object.assign(board, out); // callers keep using the object they passed in
  return board;
}

// ---- the project index ----
const emptyIndex = () => ({ schema: 1, revision: 0, masters: {}, boards: {}, approved: {} });
const brandKey = (brand) => brand || "default";

export function loadIndex() {
  const raw = readJson(indexFile(), null);
  if (raw) return { ...emptyIndex(), ...raw };
  return bootstrapIndex();
}

export function updateIndex(fn) {
  boardsDir();
  return updateJson(indexFile(), (cur) => fn({ ...emptyIndex(), ...cur }), { init: emptyIndex() });
}

function boardIds() {
  try {
    return fs.readdirSync(readDir(), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * First look at a project that has boards from before the index existed: pick the master from them, never
 * silently making a new one. The latest board with a chosen direction wins, else the latest board.
 */
function bootstrapIndex() {
  const boards = boardIds().map((id) => loadBoard(id)).filter(Boolean);
  if (!boards.length) return emptyIndex();
  boards.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
  const master = boards.find((b) => b.chosen) || boards[0];
  const idx = updateIndex((i) => {
    if (Object.keys(i.boards).length) return i;
    for (const b of boards) i.boards[b.id] = { name: b.name, scope: b.id === master.id ? "master" : b.scope || "feature", parent: b.id === master.id ? null : master.id, brand: b.brand || null, status: b.status || "active", legacy: true };
    i.masters.default = master.id;
    i.note = "master chosen from the boards that existed before the project index";
    return i;
  });
  updateBoard(master.id, (b) => {
    b.scope = "master";
    if (b.chosen && !b.approved) b.approved = { direction: b.chosen, reason: b.chosenReason || "", at: b.updatedAt || null, migrated: true, critic: null };
    return b;
  }, { op: "master", summary: "chosen as the project master when the index was created" });
  return idx;
}

export function masterId(brand) {
  const idx = loadIndex();
  const id = idx.masters[brandKey(brand)];
  return id && loadBoard(id) ? id : null;
}

export function registerBoard(board) {
  return updateIndex((i) => {
    i.boards[board.id] = { ...(i.boards[board.id] || {}), name: board.name, scope: board.scope, parent: board.parent || null, brand: board.brand || null, status: board.status || "active" };
    if (board.scope === "master" && !i.masters[brandKey(board.brand)]) i.masters[brandKey(board.brand)] = board.id;
    return i;
  });
}

export function setMaster(id, brand) {
  const b = loadBoard(id);
  if (!b) throw new Error(`No board "${id}".`);
  updateIndex((i) => {
    const prev = i.masters[brandKey(brand)];
    if (prev && i.boards[prev] && prev !== id) i.boards[prev].scope = "feature";
    i.masters[brandKey(brand)] = id;
    i.boards[id] = { ...(i.boards[id] || {}), name: b.name, scope: "master", parent: null, brand: brand || b.brand || null, status: "active" };
    return i;
  });
  updateBoard(id, (x) => {
    x.scope = "master";
    x.parent = null;
    if (brand) x.brand = brand;
  }, { op: "master", summary: "set as the project master" });
}

// ---- boards ----
export function createBoard(name, brief, { scope, parent, brand = null } = {}) {
  const exists = masterId(brand);
  const sc = scope || (exists ? "feature" : "master");
  if (!SCOPES.includes(sc)) throw new Error(`scope must be one of ${SCOPES.join(", ")}`);
  if (sc === "master" && exists) throw new Error(`The project already has a master board ("${exists}"). Use scope "feature" or "concept" for a new board, or board_update to change which board is the master.`);
  let id = slug(name);
  let n = 2;
  const dirs = boardsDir();
  while (true) {
    try {
      fs.mkdirSync(path.join(dirs, id));
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      id = `${slug(name)}-${n++}`;
    }
  }
  const now = new Date().toISOString();
  const board = saveBoard({
    schema: SCHEMA,
    id,
    name,
    brief,
    scope: sc,
    brand,
    parent: sc === "master" ? null : parent ?? exists ?? null,
    status: "active",
    createdAt: now,
    items: [],
    directions: [],
    chosen: null,
    approved: null,
    feedback: [],
    feedbackReadAt: null,
  });
  registerBoard(board);
  try {
    appendJsonl(historyFile(id), { rev: board.revision, at: now, op: "create", summary: `${sc} board created`, by: null });
  } catch {
    /* ignore */
  }
  return board;
}

export function listBoards({ includeArchived = true } = {}) {
  return boardIds()
    .map((id) => loadBoard(id))
    .filter((b) => b && (includeArchived || b.status !== "archived"))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

/** Items that count: not removed by the user and not archived. */
export function liveItems(board) {
  return board.items.filter((it) => !it.removed && it.status !== "archived");
}

/**
 * Which board does this call mean? An explicit id, then the task's board, then the project master, then the latest
 * board. `how` says which, so a tool can tell the agent when it fell back.
 */
export function resolveBoard({ id, task } = {}) {
  if (id) {
    const bid = id === "master" ? masterId(task?.memory?.brand) : id;
    const b = bid && loadBoard(bid);
    if (!b) throw new Error(`No board "${id}". board_list shows them.`);
    return { board: b, how: "explicit" };
  }
  if (task?.board?.id) {
    const b = loadBoard(task.board.id);
    if (b) return { board: b, how: "task" };
  }
  const m = masterId(task?.memory?.brand);
  if (m) return { board: loadBoard(m), how: "master" };
  const latest = listBoards({ includeArchived: false })[0];
  if (latest) return { board: latest, how: "latest" };
  return { board: null, how: "none" };
}


// ---- items: dedupe by stable source key and by content hash ----
export function contentHash(data) {
  return crypto.createHash("sha1").update(data).digest("hex").slice(0, 16);
}

export function fileHash(file) {
  try {
    return contentHash(fs.readFileSync(file));
  } catch {
    return null;
  }
}

export function makeProvenance({ source, label = "", path: p = null, url = null, by = null } = {}) {
  return { source: source || "agent", label, path: p, url, addedBy: by, addedAt: new Date().toISOString() };
}

/**
 * Add or refresh one item. Same key: refresh its fields and keep what people wrote (stars, notes, status, provenance).
 * Same content hash under another key: not added again; the key is recorded as an alias of the first.
 * Returns { action: "added" | "updated" | "duplicate", item }.
 */
export function addItem(board, entry, { provenance, status } = {}) {
  const existing = board.items.find((x) => x.key === entry.key);
  if (existing) {
    const keep = { starred: existing.starred, userNote: existing.userNote, status: existing.status, provenance: existing.provenance, addedAt: existing.addedAt, aliases: existing.aliases };
    Object.assign(existing, entry, { removed: false }, Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)));
    if (entry.hash && existing.hash !== entry.hash) existing.hash = entry.hash;
    return { action: "updated", item: existing };
  }
  if (entry.hash) {
    const twin = board.items.find((x) => x.hash && x.hash === entry.hash && !x.removed);
    if (twin) {
      twin.aliases = [...new Set([...(twin.aliases || []), entry.key])];
      return { action: "duplicate", item: twin };
    }
  }
  const item = { ...entry, status: status || entry.status || defaultStatus(entry.kind), provenance: provenance || entry.provenance || makeProvenance({}), addedAt: entry.addedAt || new Date().toISOString() };
  board.items.push(item);
  return { action: "added", item };
}

/** Merge items that share a content hash; the first keeps the annotations of the others. Returns how many were merged. */
export function dedupeBoard(board) {
  let merged = 0;
  const seen = new Map();
  board.items = board.items.filter((it) => {
    if (!it.hash) return true;
    const first = seen.get(it.hash);
    if (!first) {
      seen.set(it.hash, it);
      return true;
    }
    first.aliases = [...new Set([...(first.aliases || []), it.key, ...(it.aliases || [])])];
    if (it.starred) first.starred = true;
    if (it.userNote && !first.userNote) first.userNote = it.userNote;
    for (const d of board.directions) d.items = d.items.map((k) => (k === it.key ? first.key : k));
    merged++;
    return false;
  });
  return merged;
}

// ---- archive, fork, reset: never delete; the last two need the user's yes (`approved: true`) ----
function needYes(approved, what) {
  if (approved !== true) throw new Error(`${what} changes an established board, so it needs the user's yes first. Ask them, then call again with approved: true.`);
}

export function archiveBoard(id, { by = null, reason = "" } = {}) {
  const idx = loadIndex();
  const isMaster = Object.values(idx.masters).includes(id);
  if (isMaster) throw new Error(`"${id}" is the project master. Make another board the master (board_update with master: true on it) before archiving this one.`);
  const b = updateBoard(id, (x) => {
    x.status = "archived";
    x.archivedAt = new Date().toISOString();
    x.archivedReason = reason;
  }, { op: "archive", summary: reason || "archived", by });
  registerBoard(b);
  return b;
}

export function forkBoard(id, { name, scope = "concept", approved, by = null } = {}) {
  needYes(approved, "Forking a board");
  const src = loadBoard(id);
  if (!src) throw new Error(`No board "${id}".`);
  const copy = createBoard(name || `${src.name} (fork)`, src.brief, { scope: scope === "master" ? "concept" : scope, parent: src.id, brand: src.brand });
  const items = structuredClone(src.items).filter((i) => !i.removed);
  const next = updateBoard(copy.id, (b) => {
    b.items = items;
    b.directions = structuredClone(src.directions);
    b.criteria = src.criteria;
    b.forkedFrom = { id: src.id, revision: src.revision, at: new Date().toISOString() };
    return b;
  }, { op: "fork", summary: `forked from ${src.id} r${src.revision}`, by });
  return next;
}

export function resetBoard(id, { approved, by = null } = {}) {
  needYes(approved, "Resetting a board");
  const cur = loadBoard(id);
  if (!cur) throw new Error(`No board "${id}".`);
  const snap = path.join(boardDir(id), "history", `reset-${Date.now()}.json`);
  ensureDir(path.dirname(snap));
  fs.writeFileSync(snap, JSON.stringify(memToDisk(cur), null, 2));
  const b = updateBoard(id, (x) => {
    x.items = [];
    x.directions = [];
    x.chosen = null;
    x.chosenReason = undefined;
    x.criteria = undefined;
    x.approved = null;
    x.resetAt = new Date().toISOString();
  }, { op: "reset", summary: `cleared; previous content saved to ${path.relative(projectDir(), snap).split(path.sep).join("/")}`, by });
  return { board: b, snapshot: snap };
}

export const boardHistory = (id, limit = 30) => readJsonl(historyFile(id)).slice(-limit);
