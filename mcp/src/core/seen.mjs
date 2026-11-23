// A small per-project memory of every reference Claude has come across, keyed by "<source>:<id>",
// plus the numbering of the last listing (so "open #12" works). Lives in <project>/.drip/cache/.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, projectDripDir } from "./paths.mjs";

const file = () => path.join(ensureDir(path.join(projectDripDir(), "cache")), "seen.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    return { items: {}, last: [] };
  }
}

function save(db) {
  fs.writeFileSync(file(), JSON.stringify(db));
}

/** Remember items from a listing and number them 1..n as "the last listing". */
export function rememberListing(items) {
  const db = load();
  for (const it of items) db.items[it.key] = { ...db.items[it.key], ...it };
  db.last = items.map((it) => it.key);
  save(db);
}

export function remember(item) {
  const db = load();
  db.items[item.key] = { ...db.items[item.key], ...item };
  save(db);
}

/** Resolve "12" / "#12" (number in the last listing) or "dribbble:123" / "123" (id) to a stored item key. */
export function resolve(ref, source = "dribbble") {
  const db = load();
  const s = String(ref).trim();
  const num = s.match(/^#?(\d{1,3})$/);
  if (num && db.last[+num[1] - 1]) return db.last[+num[1] - 1];
  if (s.includes(":")) return s;
  return `${source}:${s.replace(/^#/, "")}`;
}

export function lookup(key) {
  return load().items[key] || null;
}
