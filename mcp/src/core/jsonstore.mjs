// Safe JSON files for state that several sessions, hosts and the CLI write at once
// (boards, the project index, decisions). No dependencies: hooks may import this file.
//
//   readJson(file, fallback)            never throws
//   writeJsonAtomic(file, data)         temp file + rename (Windows: retried, then direct write)
//   withLock(file, fn)                  an exclusive <file>.lock (O_EXCL); stale locks (> 10 s) are broken
//   updateJson(file, fn, { expect })    lock -> read -> fn(doc) -> revision + 1 -> write; with `expect`
//                                       a stale revision throws a RevisionConflict instead of losing an update
import fs from "node:fs";
import path from "node:path";

export class RevisionConflict extends Error {
  constructor(file, expected, actual) {
    super(`${path.basename(path.dirname(file))}/${path.basename(file)} changed since revision ${expected} (now ${actual}). Read it again and re-apply your change.`);
    this.name = "RevisionConflict";
    this.expected = expected;
    this.actual = actual;
  }
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  fs.writeFileSync(tmp, body);
  for (let i = 0; i < 5; i++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch {
      sleep(15 * (i + 1)); // Windows: a reader has the file open for a moment
    }
  }
  fs.writeFileSync(file, body);
  fs.rmSync(tmp, { force: true });
}

/** Run fn while holding <file>.lock. Synchronous on purpose: callers are short read-modify-writes. */
export function withLock(file, fn, { timeoutMs = 5000, staleMs = 10000 } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  const start = Date.now();
  let fd = null;
  while (fd === null) {
    try {
      fd = fs.openSync(lock, "wx");
      fs.writeSync(fd, String(process.pid));
    } catch (e) {
      // Windows: a lock another process is deleting right now answers EPERM/EACCES, not EEXIST: busy as well.
      if (!["EEXIST", "EPERM", "EACCES"].includes(e.code)) throw e;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > staleMs) fs.rmSync(lock, { force: true });
      } catch {
        /* gone already */
      }
      if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${lock}`);
      sleep(10 + Math.random() * 20);
    }
  }
  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lock, { force: true });
  }
}

/**
 * Read-modify-write under the lock. fn(doc) mutates doc or returns a new one.
 * opts.expect: the revision the caller based its change on; a newer file throws RevisionConflict.
 * opts.init: the document to start from when the file does not exist.
 */
export function updateJson(file, fn, { expect, init = {} } = {}) {
  return withLock(file, () => {
    const cur = readJson(file, null) ?? structuredClone(init);
    const rev = cur.revision || 0;
    if (expect !== undefined && expect !== null && expect !== rev) throw new RevisionConflict(file, expect, rev);
    const next = fn(cur) ?? cur;
    next.revision = rev + 1;
    next.updatedAt = new Date().toISOString();
    writeJsonAtomic(file, next);
    return next;
  });
}

/** Append one JSON line (append-only logs such as feedback.jsonl). O_APPEND writes of one line are atomic enough. */
export function appendJsonl(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + "\n");
}

export function readJsonl(file) {
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
