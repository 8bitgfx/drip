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

// Words that describe the task or the surface, not the subject: galleries match the subject ("coffee", "ai tool", "gaming").
const NOT_SUBJECT = new Set("a an and the for with of to in on at by from that which who sells selling my our your their its new modern clean beautiful nice cool bold simple minimal great best design designs designed redesign redesigned make build create improve update refresh rework revamp landing landingpage page pages website websites site web homepage home main screen screens view ui ux app hero section sections layout template theme".split(" "));

/** The subject words of a query: lower case, no task or surface words, no URLs or domains, at most `max`. */
export function subjectWords(query, max = 3) {
  return String(query || "")
    .toLowerCase()
    .replace(/https?:[^\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => !/[a-z0-9-]+\.[a-z]{2,}/.test(w)) // domains (vizzbees.com) name the client, not the subject
    .map((w) => w.replace(/[^a-z0-9-]+/g, ""))
    .filter((w) => w.length > 1 && !NOT_SUBJECT.has(w))
    .slice(0, max);
}

// Words for a LOOK (colour, mood, finish), as opposed to the subject of a search.
const STYLE_WORDS = new Set("red blue green yellow orange purple pink black white gray grey brown beige cream teal gold silver neon pastel colorful colourful bold playful minimal minimalist dark light brutalist brutalism editorial retro vintage elegant luxury luxurious modern clean vibrant moody gradient glass glassmorphism flat 3d futuristic cute quirky quiet loud warm cool sleek gritty organic geometric monochrome".split(" "));

/** A query that mixes look words with a subject ("bold dark fintech"): { style, subject }, else null. */
export function mixedQuery(query) {
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const style = words.filter((w) => STYLE_WORDS.has(w));
  const subject = words.filter((w) => w.length > 1 && !STYLE_WORDS.has(w) && !NOT_SUBJECT.has(w));
  return style.length && subject.length ? { style, subject } : null;
}

/** The note refs_search and refs_gallery add when a query mixes a look with a subject; "" when it doesn't. */
export function mixNote(query, tool = "refs_search") {
  const m = mixedQuery(query);
  if (!m) return "";
  const look = m.style.join(" ");
  const subject = m.subject.slice(0, 3).join(" ");
  return (
    `MIXED QUERY: "${look}" is a LOOK and "${subject}" is a SUBJECT; mixed in one search they match neither well (you get the subject in a random look, or the look on random subjects). ` +
    `Run two searches instead: ${tool}("${subject}") for the same kind of product or page (study it with role page or competitor), and ${tool}("${look}") for the look (role style).`
  );
}

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
