// Polite HTTP: one request at a time per host with a delay, a disk cache in ~/.drip/cache,
// and clear errors. Every network call in Drip goes through here.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, homeDripDir } from "./paths.mjs";

const cacheDir = path.join(homeDripDir, "cache");
const lastHit = new Map(); // host -> timestamp
const queues = new Map(); // host -> promise chain

const DAY = 24 * 60 * 60 * 1000;

function cacheFile(key, ext) {
  const hash = crypto.createHash("sha1").update(key).digest("hex");
  return path.join(cacheDir, hash.slice(0, 2), `${hash}.${ext}`);
}

function readCache(file, ttlMs) {
  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs > ttlMs) return null;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function writeCache(file, buf) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, buf);
}

/** Run `fn` after the previous request to the same host finished and `delayMs` passed. */
function throttle(host, delayMs, fn) {
  const prev = queues.get(host) || Promise.resolve();
  const next = prev.then(async () => {
    const wait = (lastHit.get(host) || 0) + delayMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastHit.set(host, Date.now());
    }
  });
  queues.set(host, next.catch(() => {}));
  return next;
}

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}${body ? `: ${String(body).slice(0, 200)}` : ""}`);
    this.status = status;
  }
}

/**
 * GET a URL. Options: headers, delayMs (per-host spacing), ttlMs (cache; 0 = no cache), as ("text" | "json" | "buffer").
 * Returns { body, contentType, cached }.
 */
export async function get(url, { headers = {}, delayMs = 0, ttlMs = DAY, as = "text", timeoutMs = 30000, retries = 2, maxWaitS = 8 } = {}) {
  const ext = as === "buffer" ? "bin" : "txt";
  const file = cacheFile(url + JSON.stringify(headers), ext);
  if (ttlMs > 0) {
    const hit = readCache(file, ttlMs);
    const meta = readCache(file + ".type", ttlMs);
    if (hit) return { body: decode(hit, as), contentType: meta?.toString() || "", cached: true };
  }
  const host = new URL(url).host;
  return throttle(host, delayMs, async () => {
    // Rate limited (429) or briefly unavailable (503): wait as told (Retry-After) or back off, then retry.
    let res;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
      if (![429, 503].includes(res.status) || attempt >= retries) break;
      const after = Number(res.headers.get("retry-after"));
      const wait = Math.min(maxWaitS, Number.isFinite(after) && after > 0 ? after : 3 * 2 ** attempt) * 1000;
      await res.arrayBuffer().catch(() => {});
      await new Promise((r) => setTimeout(r, wait));
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status === 429) throw new HttpError(429, url, "rate limited after retries; slow down (fewer parallel calls) and try again in a minute");
    if (!res.ok) throw new HttpError(res.status, url, as === "buffer" ? "" : buf.toString("utf8"));
    const contentType = res.headers.get("content-type") || "";
    if (ttlMs > 0) {
      writeCache(file, buf);
      writeCache(file + ".type", Buffer.from(contentType));
    }
    return { body: decode(buf, as), contentType, cached: false };
  });
}

/** POST JSON (never cached). Returns parsed JSON. */
export async function postJson(url, body, { headers = {}, timeoutMs = 180000 } = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, url, text);
  return JSON.parse(text);
}

function decode(buf, as) {
  if (as === "buffer") return buf;
  const text = buf.toString("utf8");
  return as === "json" ? JSON.parse(text) : text;
}
