// A small per-project memory of every reference Claude has come across, keyed by "<source>:<id>",
// plus every listing's numbering. Each listing gets a tag (L1, L2…), so "L2-7" always means item 7 of
// listing L2, even when several searches ran in parallel. A bare number ("7") means the last listing.
// Lives in <project>/.drip/cache/seen.json.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, ensureProjectDrip } from "./paths.mjs";

const file = () => path.join(ensureDir(path.join(ensureProjectDrip(), "cache")), "seen.json");

function load() {
  try {
    const db = JSON.parse(fs.readFileSync(file(), "utf8"));
    return { items: {}, last: [], listings: {}, counter: 0, ...db };
  } catch {
    return { items: {}, last: [], listings: {}, counter: 0 };
  }
}

function save(db) {
  fs.writeFileSync(file(), JSON.stringify(db));
}

/** Remember a listing's items; returns its tag ("L3"). `from` describes where they came from. */
export function rememberListing(items, from = null) {
  const db = load();
  for (const it of items) db.items[it.key] = { ...db.items[it.key], ...it, ...(from && !db.items[it.key]?.from ? { from } : {}) };
  db.counter += 1;
  const tag = `L${db.counter}`;
  db.listings[tag] = items.map((it) => it.key);
  const keep = Object.keys(db.listings).slice(-40);
  db.listings = Object.fromEntries(keep.map((k) => [k, db.listings[k]]));
  db.last = items.map((it) => it.key);
  db.lastTag = tag;
  save(db);
  return tag;
}

export function remember(item) {
  const db = load();
  db.items[item.key] = { ...db.items[item.key], ...item };
  save(db);
}

/**
 * Resolve a reference to an item key:
 *   "L2-7"            item 7 of listing L2 (safe when searches run in parallel)
 *   "7" / "#7"        item 7 of the most recent listing
 *   "123456" / "dribbble:123456"   a shot id
 */
export function resolve(ref, source = "dribbble") {
  const db = load();
  const s = String(ref).trim();
  const tagged = s.match(/^(L\d+)[-:#](\d{1,3})$/i);
  if (tagged) {
    const list = db.listings[tagged[1].toUpperCase()];
    if (list?.[+tagged[2] - 1]) return list[+tagged[2] - 1];
  }
  const num = s.match(/^#?(\d{1,3})$/);
  if (num && db.last[+num[1] - 1]) return db.last[+num[1] - 1];
  if (/^https?:\/\//i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s)) return siteKey(s);
  if (s.includes(":")) return s;
  return `${source}:${s.replace(/^#/, "")}`;
}

/** "https://www.linear.app/" -> "site:linear.app" (shipped sites studied with refs_site). */
export function siteKey(url) {
  const u = new URL(/^https?:/i.test(url) ? url : `https://${url}`);
  return `site:${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
}

export function lookup(key) {
  return load().items[key] || null;
}
