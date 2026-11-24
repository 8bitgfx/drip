// One Page Love through its own MCP endpoint (https://onepagelove.com/mcp, free beta, no key): curated sites
// with real hero copy, and cropped sections (pricing tables, FAQs, footers...). We call it with plain JSON-RPC.
import { decode, hostOf, makeItem, slugify } from "../contract.mjs";

export const ENDPOINT = "https://api.onepagelove.com/mcp";
export const MAX_LIMIT = 10; // search_inspiration and search_sections answer "too_big, maximum 10" above this

const COLORS = ["dark", "colorful", "blue", "white", "grey", "green", "red", "black", "brown", "orange", "purple", "pink", "yellow", "beige", "pastel", "gold", "monochrome", "teal", "lime"];
const GENRES = { saas: "saas", portfolio: "portfolio", landing: "landing-page", app: "app", startup: "startup", finance: "finance", fintech: "finance", restaurant: "restaurant", game: "game", gaming: "game", agency: "service", ecommerce: "e-commerce", shop: "e-commerce", photography: "photography", event: "event", music: "music-related" };
const SECTIONS = ["social-proof", "testimonials", "faq", "pricing", "team", "pricing-table", "testimonial-grid", "client-logos", "screenshots", "contact-form", "mockup-device", "infographics", "faq-accordion", "header-navigation", "how-it-works", "big-footer", "metrics", "cta", "cta-hero", "newsletter", "footer", "navigation"];

/** Pull structured filters (color, genre) out of a free-text query; the rest stays as `query`. */
export function toFilters(query = "") {
  const rest = [];
  const f = {};
  for (const w of query.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean)) {
    if (!f.color && COLORS.includes(w)) f.color = w;
    else if (!f.genre && GENRES[w]) f.genre = GENRES[w];
    else rest.push(w);
  }
  return { ...f, query: rest.join(" ") };
}

/** Which section type a query is about (longest known slug it contains), else "cta". */
export function sectionType(query = "") {
  const s = slugify(query);
  const hit = SECTIONS.filter((t) => s.includes(t)).sort((a, b) => b.length - a.length)[0];
  return hit || "cta";
}

/** Parse the text blocks the MCP returns in image_mode "markdown". */
export function parseOpl(blocks, kind = "site") {
  const out = [];
  for (const b of blocks) {
    const text = typeof b === "string" ? b : b?.text;
    if (!text) continue;
    const m = text.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*\n\*\*(.+?)\*\*\s*·\s*([^\n]*)/);
    if (!m) continue;
    const parts = m[4].split("·").map((s) => s.trim()).filter(Boolean);
    const urls = parts.filter((p) => /^https?:\/\//.test(p));
    const live = urls.find((u) => !/onepagelove\.com\//.test(u)) || "";
    const page = urls.find((u) => /onepagelove\.com\//.test(u)) || live;
    const meta = parts.filter((p) => !/^https?:\/\//.test(p));
    const field = (n) => text.match(new RegExp(`^${n}: (.*)$`, "m"))?.[1];
    const genre = meta.find((p) => /^genre:/i.test(p))?.replace(/^genre:\s*/i, "").split(",").map((s) => s.trim()) || [];
    const label = meta.find((p) => !/^genre:/i.test(p));
    const copy = [field("Headline") && `"${field("Headline")}"`, field("Subtext")].filter(Boolean).join(" — ");
    out.push(
      makeItem("onepagelove", {
        id: slugify(page.replace(/^https?:\/\/onepagelove\.com\//, "")) || slugify(m[3]),
        title: decode(m[3]),
        url: page,
        image: m[2],
        images: kind === "site" ? [m[2].replace(/w=\d+,h=\d+,fit=cover,g=top/, "w=1400")] : undefined,
        author: hostOf(live),
        tags: [...genre, ...(label ? [label] : [])],
        kind,
        live: live || undefined,
        copy: copy || undefined,
        cta: field("CTAs"),
      }),
    );
  }
  return out;
}

const memo = new Map();

/** One JSON-RPC tools/call; the server answers as text/event-stream or plain JSON. Cached for 30 minutes. */
export async function callTool(name, args, { endpoint = ENDPOINT, fetchFn = fetch, userAgent = "drip-mcp (design reference search)" } = {}) {
  const key = `${endpoint}|${name}|${JSON.stringify(args)}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.blocks;
  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": userAgent },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`One Page Love MCP: HTTP ${res.status}`);
  const json = JSON.parse(body.trim().startsWith("{") ? body : body.split(/\r?\n/).find((l) => l.startsWith("data:")).slice(5));
  if (json.error) throw new Error(`One Page Love MCP: ${json.error.message || JSON.stringify(json.error)}`);
  const blocks = json.result?.content || [];
  if (json.result?.isError) throw new Error(`One Page Love MCP: ${blocks.map((b) => b.text).join(" ").slice(0, 200)}`);
  memo.set(key, { at: Date.now(), blocks });
  return blocks;
}

export const onepagelove = {
  id: "onepagelove",
  label: "One Page Love",
  kinds: ["site", "section"],
  status: "works",
  async search(query, { kind = "site", limit = 12, config }) {
    const opts = { userAgent: config?.refs?.userAgent };
    const lim = Math.min(limit, MAX_LIMIT); // the endpoint rejects more than 10 (too_big, maximum 10)
    if (kind === "section") return parseOpl(await callTool("search_sections", { section_type: sectionType(query), ...pick(toFilters(query), ["color", "genre"]), limit: lim, image_mode: "markdown" }, opts), "section");
    const f = toFilters(query);
    return parseOpl(await callTool("search_inspiration", { ...f, ...(f.query ? {} : { query: undefined }), limit: lim, image_mode: "markdown" }, opts), "site");
  },
};

function pick(o, keys) {
  return Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, o[k]]));
}
