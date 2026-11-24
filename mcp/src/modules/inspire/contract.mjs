// The reference-provider contract and the small helpers every adapter shares.
//
//   provider = {
//     id,              // "awwwards": prefix of every item key ("awwwards:rocket-saas")
//     label,           // "Awwwards"
//     kinds,           // what it can return: "site" | "section" | "component" | "motion" | "app" | "type"
//     status,          // what a live check last found: "works" | "feed" (no text search: latest items, ranked by title match) | "needs-key"
//     needsKey,        // optional: name of the key (env var or ~/.drip/keys.json entry)
//     search(query, { kind, limit, page, config }) -> Promise<Item[]>
//   }
//   Item = { key, title, url, image, author, source, tags, kind, ... }
//
// Adapters that read HTML export their parser (parseX(html) -> Item[]) so tests can run it on a fixture.
import { get } from "../../core/http.mjs";

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decode(s = "") {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export const strip = (html = "") => decode(String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();

/** Resolve a possibly relative URL against a base; returns "" for junk. */
export function abs(u, base) {
  if (!u) return "";
  try {
    return new URL(decode(u).trim(), base).href;
  } catch {
    return "";
  }
}

export const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The first src of an srcset-less <img>, preferring a real URL over a lazy-load placeholder. */
export function imgSrc(tag) {
  const get1 = (n) => (tag.match(new RegExp(`\\s${n}="([^"]+)"`, "i")) || [])[1];
  const cands = [get1("data-src"), get1("src"), (get1("data-srcset") || get1("srcset") || "").split(",")[0]?.trim().split(/\s+/)[0]];
  return cands.find((c) => c && !c.startsWith("data:")) || "";
}

/** Largest candidate in an srcset ("url 600w, url 1200w"). */
export function biggestSrcset(srcset = "") {
  const parts = srcset.split(",").map((p) => p.trim().split(/\s+/)).filter((p) => p[0]);
  parts.sort((a, b) => parseFloat(b[1] || "0") - parseFloat(a[1] || "0"));
  return parts[0]?.[0] || "";
}

/** Build a normalised item. `id` is the provider-local id; the key is "<provider>:<id>". */
export function makeItem(provider, { id, title, url, image, images, author, tags = [], kind = "site", ...extra }) {
  const clean = (s) => decode(String(s || "")).replace(/\s+/g, " ").trim();
  return {
    key: `${provider}:${id}`,
    title: clean(title) || String(id),
    url,
    image,
    ...(images?.length ? { images } : {}),
    author: clean(author) || hostOf(url) || "",
    source: provider,
    tags: [...new Set(tags.map(clean).filter(Boolean))].slice(0, 12),
    kind,
    ...extra,
  };
}

/** GET HTML (or JSON text) politely: spaced per host, cached 6 h, with the configured user agent. Sites that answer scripted requests with a block page raise a clear error. */
export async function getHtml(url, config, { delayMs = 1200, ttlMs = 6 * 3600e3, headers = {}, fetchPage = get } = {}) {
  const ua = config?.refs?.userAgent || "Mozilla/5.0";
  let body;
  try {
    ({ body } = await fetchPage(url, { headers: { "user-agent": ua, accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8", ...headers }, delayMs, ttlMs }));
  } catch (err) {
    if ([403, 429].includes(err?.status)) throw new Error(`${hostOf(url)} refuses scripted requests (HTTP ${err.status}); open it in your own browser`);
    throw err;
  }
  if (CHALLENGE.test(String(body).slice(0, 4000))) throw new Error(`${hostOf(url)} shows a human check to scripted requests; open it in your own browser`);
  return body;
}

const CHALLENGE = /<title>s*(Just a moment|Attention Required|Vercel Security Checkpoint)/i;

/**
 * For providers without a text search (a latest-items feed): rank by how many query words hit the
 * title/tags, keep matches first. Items that match nothing stay behind them, flagged `feed: true`.
 */
export function rankByQuery(items, query) {
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return items.map((it) => ({ ...it, feed: true }));
  const scored = items.map((it, i) => {
    const hay = `${it.title} ${it.tags.join(" ")} ${it.author}`.toLowerCase();
    const hits = words.filter((w) => hay.includes(w)).length;
    return { it: { ...it, ...(hits ? {} : { feed: true }) }, hits, i };
  });
  scored.sort((a, b) => b.hits - a.hits || a.i - b.i);
  return scored.map((s) => s.it);
}
