// Evidence is only good for the thing it looked at. This file answers two questions:
//
//   artifactRev(task)      what exactly is being reviewed right now? A short hash of the UI files this task wrote,
//                          DESIGN.md, the chosen direction and the approved style revision. Fit-check shots, audit
//                          blockers and critic verdicts store it; when it differs later they are stale.
//   workspaceDiff(task)    which UI files changed without Drip seeing it (a shell edit, a host without write hooks)?
//                          drip_start takes a snapshot of the UI files' hashes, the write hooks keep it current for
//                          every edit they see, so what differs at the end was never seen.
//
// No dependencies beyond node and core/paths|config|skills: hooks import this through core/state.mjs.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { projectDir, projectDripDir } from "./paths.mjs";
import { designDoc } from "./skills.mjs";

const SKIP_DIR = /^(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|dist|build|out|coverage|\.drip|\.venv|venv|__pycache__|target|vendor|\.gradle|Pods)$/;
const MAX_FILES = 4000;
const HASH_LIMIT = 1024 * 1024;

const sha = (x) => crypto.createHash("sha1").update(x).digest("hex");

/** Content hash (12 hex). Files over 1 MB hash size + mtime instead of reading them. */
export function hashFile(abs) {
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return null;
    return (st.size > HASH_LIMIT ? sha(`${st.size}:${st.mtimeMs}`) : sha(fs.readFileSync(abs))).slice(0, 12);
  } catch {
    return null;
  }
}

/** Project-relative POSIX paths of the UI files (config.uiFiles, minus config.ignoreFiles), walking skip-listed folders out. */
export function uiFilesIn(root = projectDir(), config = loadConfig(root)) {
  const ui = new RegExp(config.uiFiles, "i");
  const ignore = new RegExp(config.ignoreFiles, "i");
  const out = [];
  const walk = (dir, depth) => {
    if (depth < 0 || out.length >= MAX_FILES) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.isDirectory()) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIR.test(e.name)) walk(abs, depth - 1);
      } else if (e.isFile()) {
        const rel = path.relative(root, abs).split(path.sep).join("/");
        if (ui.test(rel) && !ignore.test(rel)) out.push(rel);
      }
    }
  };
  walk(root, 8);
  return out;
}

/** What is being reviewed: the task's UI files + DESIGN.md + the chosen direction + the approved style revision. */
export function artifactRev(task, cwd) {
  if (!task) return null;
  const root = projectDir(cwd);
  const files = [...new Set((task.uiWrites || []).map((w) => w.file))].sort();
  const parts = files.map((f) => `${f}:${hashFile(path.resolve(root, f)) || "gone"}`);
  const doc = designDoc(root);
  parts.push(`design:${doc ? sha(doc.text).slice(0, 12) : "none"}`);
  parts.push(`direction:${task.board?.chosen || "none"}`);
  parts.push(`style:${task.memory?.styleRevision || "none"}`);
  return sha(parts.join("\n")).slice(0, 12);
}

// ---- workspace snapshot ----
const snapDir = (cwd) => path.join(projectDripDir(cwd), "snapshots");
export const snapshotFile = (taskId, cwd) => path.join(snapDir(cwd), `${taskId}.json`);

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.writeFileSync(file, JSON.stringify(data));
    fs.rmSync(tmp, { force: true });
  }
}

function readSnapshot(taskId, cwd) {
  try {
    return JSON.parse(fs.readFileSync(snapshotFile(taskId, cwd), "utf8"));
  } catch {
    return null;
  }
}

/** Remember every UI file's hash as of now (drip_start). Old snapshots (> 14 days) are removed. */
export function takeSnapshot(task, cwd) {
  if (!task) return null;
  const root = projectDir(cwd);
  const files = {};
  for (const rel of uiFilesIn(root, loadConfig(cwd))) files[rel] = hashFile(path.resolve(root, rel));
  const snap = { task: task.id, at: new Date().toISOString(), files };
  writeAtomic(snapshotFile(task.id, cwd), snap);
  try {
    for (const f of fs.readdirSync(snapDir(cwd))) {
      const abs = path.join(snapDir(cwd), f);
      if (Date.now() - fs.statSync(abs).mtimeMs > 14 * 864e5) fs.rmSync(abs, { force: true });
    }
  } catch {
    /* housekeeping only */
  }
  return snap;
}

/** A hook saw this edit: the file is known, whatever its content is now. */
export function markSeen(task, rel, cwd) {
  if (!task) return;
  const snap = readSnapshot(task.id, cwd);
  if (!snap) return;
  const root = projectDir(cwd);
  const abs = path.resolve(root, rel);
  snap.files[rel.split(path.sep).join("/")] = hashFile(abs);
  if (snap.files[rel] === null) delete snap.files[rel];
  writeAtomic(snapshotFile(task.id, cwd), snap);
}

/** UI files that differ from the snapshot and were never reported by a hook. Empty when there is no snapshot. */
export function workspaceDiff(task, cwd) {
  if (!task) return { unseen: [], snapshotAt: null };
  const snap = readSnapshot(task.id, cwd);
  if (!snap) return { unseen: [], snapshotAt: null };
  const root = projectDir(cwd);
  const now = {};
  for (const rel of uiFilesIn(root, loadConfig(cwd))) now[rel] = hashFile(path.resolve(root, rel));
  const unseen = [];
  for (const [rel, h] of Object.entries(now)) {
    if (snap.files[rel] === h) continue;
    if (snap.shot && snap.shot.files[rel] === h) continue; // a shot showed exactly this content
    let mtime = Date.now();
    try {
      mtime = fs.statSync(path.resolve(root, rel)).mtimeMs;
    } catch {
      /* gone between the walk and now */
    }
    unseen.push({ file: rel, status: rel in snap.files ? "changed" : "new", mtime });
  }
  for (const rel of Object.keys(snap.files)) if (!(rel in now) && !(snap.shot && !(rel in snap.shot.files))) unseen.push({ file: rel, status: "deleted", mtime: Date.now() });
  return { unseen, snapshotAt: snap.at };
}

/**
 * A fit-check shot looked at these UI files: remember their content hashes (next to the drip_start snapshot). A file whose
 * content still matches what a shot showed is not "unseen" later, however it got written (a build script, a formatter).
 */
export function markShot(task, cwd) {
  if (!task) return;
  const root = projectDir(cwd);
  const snap = readSnapshot(task.id, cwd) || { task: task.id, at: new Date().toISOString(), files: {} };
  const files = {};
  for (const rel of uiFilesIn(root, loadConfig(cwd))) files[rel] = hashFile(path.resolve(root, rel));
  snap.shot = { at: new Date().toISOString(), files };
  writeAtomic(snapshotFile(task.id, cwd), snap);
}

/** The hash a file had when the last shot was taken (null when there was no shot or the file did not exist). */
export function shotHash(task, rel, cwd) {
  const snap = task ? readSnapshot(task.id, cwd) : null;
  return snap?.shot?.files?.[rel.split(path.sep).join("/")] ?? null;
}

/**
 * The UI files a check should lint: every UI file in the project the lint rules apply to, from disk, so a root index.html
 * a script wrote (untracked, never in the code index) is included. Project-relative POSIX paths.
 */
export function lintableUiFiles(cwd, extra = []) {
  const root = projectDir(cwd);
  return [...new Set([...uiFilesIn(root, loadConfig(cwd)), ...extra])];
}

/** Accept the current state as known (after the unseen edits were folded into the task). */
export function refreshSnapshot(task, cwd) {
  if (task) takeSnapshot(task, cwd);
}
