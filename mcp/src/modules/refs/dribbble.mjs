// Dribbble, read the way its own web client reads it: the infinite-scroll requests
// (X-Requested-With: XMLHttpRequest) return HTML fragments and the shot page embeds its data as JSON.
// No account, no API key. Logged out, keyword search stops after ~84 results; tag, feed and designer
// pages page deeply. Be polite: requests are spaced and cached (core/http.mjs).
import { get } from "../../core/http.mjs";

const BASE = "https://dribbble.com";
export const CATEGORIES = ["animation", "branding", "illustration", "mobile", "print", "product-design", "typography", "web-design"];

function headers(config) {
  return { "User-Agent": config.refs.userAgent, "X-Requested-With": "XMLHttpRequest", Accept: "text/html, */*" };
}

async function fetchHtml(url, config, ttlMs = 6 * 3600e3) {
  const { body } = await get(url, { headers: headers(config), delayMs: config.refs.delayMs, ttlMs });
  if (!body || body.length < 200) throw new Error("Dribbble returned an empty page (it may be blocking automated requests right now). Try again later or use a browser.");
  return body;
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m] || m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const clean = (s) => decode((s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

/** Strip the CDN query so we can ask for our own size/format. */
export function cdnBase(url) {
  return (url || "").split("?")[0];
}

export function thumbUrl(base, w = 400, h = 300) {
  return `${base}?format=jpg&resize=${w}x${h}&vertical=center`;
}

export function fullUrl(base, w = 1400) {
  return `${base}?format=jpg&resize=${w}x0`;
}

/** Parse a listing fragment (search, tag, feed, designer) into shot cards. */
export function parseCards(html) {
  const chunks = html.split(/<li\s+id="screenshot-/).slice(1);
  const cards = [];
  for (const c of chunks) {
    const id = c.match(/^(\d+)/)?.[1];
    if (!id) continue;
    const href = c.match(/href="(\/shots\/\d+[^"]*)"/)?.[1];
    const title = clean(c.match(/class="shot-title">([\s\S]*?)<\/div>/)?.[1]) || clean(c.match(/<span class="accessibility-text">View ([\s\S]*?)<\/span>/)?.[1]);
    const img = c.match(/data-src="([^"]+)"/)?.[1] || c.match(/<noscript>\s*<img src="([^"]+)"/)?.[1];
    const video = c.match(/data-video-teaser-small="([^"]+)"/)?.[1] || null;
    const userBlock = c.match(/class="user-information"[\s\S]*?<\/a>/)?.[0] || "";
    const designerUrl = userBlock.match(/href="\/([^"/?]+)"/)?.[1] || null;
    const designer = clean(userBlock.match(/class="display-name">([\s\S]*?)<\/span>/)?.[1]);
    const likes = clean(c.match(/data-shot-like-count>([\s\S]*?)<\/span>/)?.[1]);
    const views = clean(c.match(/js-shot-views-count[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    const boosted = /data-boost-id="\d+"/.test(c);
    cards.push({ id, url: href ? BASE + href : `${BASE}/shots/${id}`, title, image: cdnBase(decode(img || "")), video: video ? decode(video) : null, designer, designerUrl, likes, views, boosted });
  }
  return cards;
}

function listingUrl(kind, { query, sort = "popular", category, page = 1, tag, username, timeframe }) {
  const cat = category ? `/${category}` : "";
  if (kind === "search") return `${BASE}/search/shots/${sort}${cat}?q=${encodeURIComponent(query)}&page=${page}`;
  if (kind === "tag") return `${BASE}/tags/${encodeURIComponent(tag.trim().toLowerCase().replace(/\s+/g, "_"))}?page=${page}`;
  if (kind === "feed") return `${BASE}/shots/${sort}${cat}?page=${page}${timeframe ? `&timeframe=${timeframe}` : ""}`;
  if (kind === "designer") return `${BASE}/${encodeURIComponent(username)}/shots?page=${page}`;
  throw new Error(`unknown listing ${kind}`);
}

export async function listing(kind, params, config) {
  const url = listingUrl(kind, params);
  const html = await fetchHtml(url, config);
  return { url, cards: parseCards(html) };
}

/** Find the JSON object that starts right after `marker` (balanced braces, string-aware). */
function jsonAfter(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf("{", at);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < html.length; k++) {
    const ch = html[k];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, k + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** ProseMirror-ish doc -> plain text. */
function docText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  const inner = (node.content || []).map(docText).join(node.type === "doc" ? "\n" : "");
  return /heading|paragraph|listItem/.test(node.type) ? `${inner}\n` : inner;
}

/** Everything about one shot: data, description, palette, media in order. */
export async function shot(id, config) {
  const html = await fetchHtml(`${BASE}/shots/${id}`, config, 24 * 3600e3);
  const data = jsonAfter(html, "shotData:") || {};
  const blocks = (data.contentBlocks?.results || []).slice().sort((a, b) => a.position - b.position);
  const media = [];
  const text = [];
  for (const b of blocks) {
    if (b.contentType === "text") text.push(docText(b.content?.text).replace(/\n{3,}/g, "\n\n").trim());
    else
      for (const up of b.userUploadsAttributes || []) {
        const fileId = up.fileDetails?.id;
        const meta = b.content?.media?.[0] || {};
        if (!fileId) continue;
        media.push({ type: b.contentType, url: `https://cdn.dribbble.com/${fileId}`, width: meta.width, height: meta.height });
      }
  }
  const palette = [...new Set([...html.matchAll(/<li class="color">\s*<a[^>]*title="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase()))];
  const still = cdnBase(data.featureShotUrl || data.shotMediaPreview?.shotImageUrl || "");
  // Videos: use the still frame Dribbble made for the teaser so Claude can see something.
  const images = media.filter((m) => m.type === "image").map((m) => m.url);
  if (still && (data.isVideo || !images.length)) images.unshift(still);
  return {
    id: String(data.shotId || id),
    url: `${BASE}/shots/${id}`,
    title: data.title || clean(html.match(/shot-header__title">([\s\S]*?)</)?.[1]),
    designer: data.shotUser?.name,
    designerUrl: data.shotUser?.username,
    postedOn: data.postedOn,
    likes: data.likesCount,
    saves: data.savesCount,
    views: data.viewsCount,
    tags: data.tags || [],
    palette,
    description: text.filter(Boolean).join("\n\n"),
    images: [...new Set(images)],
    videos: media.filter((m) => m.type === "video").map((m) => m.url),
    isVideo: !!data.isVideo,
  };
}
