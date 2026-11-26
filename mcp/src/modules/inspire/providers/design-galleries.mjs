// Design-reference galleries read from their public pages (checked 2026-11-26): getdesign.ai (the JSON the page itself
// calls), posts.design, loadmo.re, recent.design, supahero.io, navbar.gallery, cta.gallery, inspora.design.
// None has a text search we could rely on, so each is a feed: fetch the latest page (politely, cached) and rank by title.
// Every parser takes the page HTML (or the JSON text) and returns normalised items, so tests run it on a fixture.
import { abs, decode, getHtml, makeItem, rankByQuery, slugify, strip } from "../contract.mjs";

const day = (s) => (/^\d{4}-\d{2}-\d{2}/.test(s || "") ? s.slice(0, 10) : undefined);
const attr = (chunk, name) => chunk.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const titleCase = (slug) => String(slug || "").split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

// ---- getdesign.ai: DESIGN.md files; the home page fetches /api/designs (public JSON) ---------------------------
export function parseGetDesign(json) {
  let list;
  try {
    list = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return [];
  }
  const out = [];
  for (const d of Array.isArray(list) ? list : []) {
    if (!d?.id || d.sponsored || !d.src) continue;
    const palette = (d.info?.palette || []).map((p) => p?.[0]).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c || "")).slice(0, 8);
    out.push(
      makeItem("getdesign", {
        id: d.id,
        title: d.t || d.id,
        url: `https://getdesign.ai/#design/${encodeURIComponent(d.id)}`,
        image: abs(d.src, "https://getdesign.ai"),
        author: d.by,
        tags: [...(d.tags || []), d.c].filter(Boolean),
        kind: "design-md",
        live: d.url || undefined,
        description: d.desc || undefined,
        ...(palette.length ? { palette } : {}),
        ...(d.pro ? { pro: true } : {}),
        ...(d.post ? { post: d.post } : {}),
      }),
    );
  }
  return out;
}

const getdesign = {
  id: "getdesign",
  label: "getdesign.ai",
  kinds: ["section", "site"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseGetDesign(await getHtml("https://getdesign.ai/api/designs", config)), query).slice(0, limit);
  },
};

// ---- posts.design: social posts of good companies; <article data-item-id> cards with a screen-reader caption ----
export function parsePostsDesign(html) {
  const out = [];
  for (const chunk of html.split("<article data-item-id=").slice(1)) {
    const id = chunk.match(/^"([^"]+)"/)?.[1];
    const href = attr(chunk, "data-detail-href");
    const image = chunk.match(/<img width="\d+" height="\d+"[^>]*?\ssrc="([^"]+)"/)?.[1];
    const cap = chunk.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1];
    if (!id || !href || !image || !cap) continue;
    const parts = strip(cap.replace(/<!--[\s\S]*?-->/g, "")).replace(/\.\s*Captured\s*\S*\.?\s*$/, "").split(" · ").map((s) => s.trim()).filter(Boolean);
    const [title, brand, ...rest] = parts;
    out.push(
      makeItem("posts", {
        id,
        title,
        url: abs(href, "https://posts.design"),
        image: abs(image, "https://posts.design"),
        author: brand,
        tags: rest.filter((t) => !t.startsWith("@")),
        kind: "social",
        postedAt: day(chunk.match(/<time dateTime="([^"]+)"/)?.[1]),
      }),
    );
  }
  return out;
}

const posts = {
  id: "posts",
  label: "posts.design",
  kinds: ["image"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parsePostsDesign(await getHtml("https://posts.design/", config)), query).slice(0, limit);
  },
};

// ---- loadmo.re: unusual mobile websites; a Kirby site, cards with a poster background and a name ---------------
export function parseLoadmore(html) {
  const out = [];
  for (const chunk of html.split('<div class="post">').slice(1)) {
    const slug = chunk.match(/href="https?:\/\/loadmo\.re\/posts\/([^"/]+)"/)?.[1];
    const image = chunk.match(/background-image:\s*url\(([^)]+)\)/)?.[1];
    const name = chunk.match(/class="post-sitename">([\s\S]*?)<\/p>/)?.[1];
    if (!slug || !image || !name) continue;
    const credit = chunk.match(/class="post-credits">([\s\S]*?)<\/p>/)?.[1] || "";
    const studio = strip(credit).replace(/^by\s+/i, "");
    out.push(
      makeItem("loadmore", {
        id: slug,
        title: strip(name),
        url: `https://loadmo.re/posts/${slug}`,
        image: abs(image.replace(/^['"]|['"]$/g, ""), "https://loadmo.re"),
        author: studio || "loadmo.re",
        tags: ["mobile"],
        kind: "mobile",
        live: credit.match(/href="(https?:[^"]+)"/)?.[1],
      }),
    );
  }
  return out;
}

const loadmore = {
  id: "loadmore",
  label: "loadmo.re",
  kinds: ["site"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseLoadmore(await getHtml("https://loadmo.re/", config)), query).slice(0, limit);
  },
};

// ---- recent.design: the same feed Godly shows (cards link to /i/<id>-<slug>, media on cdn.recent.design) ---------
export function parseRecentDesign(html) {
  const out = [];
  for (const chunk of html.split("<article").slice(1)) {
    if (!/data-slot="feed-media-card"/.test(chunk)) continue;
    const label = chunk.match(/aria-label="View post: ([^"]*)"/)?.[1];
    const href = chunk.match(/href="(\/i\/[^"]+)"/)?.[1];
    const image = chunk.match(/<img[^>]*\ssrc="(https:\/\/cdn\.recent\.design\/items\/[^"]+)"/)?.[1];
    if (!label || !href || !image) continue;
    const author = chunk.match(/<img[^>]*\ssrc="https:\/\/cdn\.recent\.design\/entities\/[^"]*"[^>]*?\salt="([^"]*)"/)?.[1];
    out.push(makeItem("recentdesign", { id: href.replace(/^\/i\//, ""), title: label, url: abs(href, "https://recent.design"), image, author: author || "recent.design", tags: ["recent", "ui"], kind: "motion" }));
  }
  return out;
}

const recentdesign = {
  id: "recentdesign",
  label: "recent.design",
  kinds: ["motion"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseRecentDesign(await getHtml("https://recent.design/", config)), query).slice(0, limit);
  },
};

// ---- supahero.io: website hero sections; plain cards <a href="/hero/<slug>"><img src alt> ------------------------
export function parseSupahero(html) {
  const out = [];
  const seen = new Set();
  const re = /<a [^>]*href="\/hero\/([^"]+)"[^>]*>\s*<div[^>]*>\s*<img src="([^"]+)" alt="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const [, slug, image, alt] = m;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(makeItem("supahero", { id: slug, title: alt || titleCase(slug), url: `https://supahero.io/hero/${slug}`, image: abs(image, "https://supahero.io"), author: "supahero.io", tags: ["hero"], kind: "hero" }));
  }
  return out;
}

const supahero = {
  id: "supahero",
  label: "Supahero",
  kinds: ["section"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseSupahero(await getHtml("https://supahero.io/", config)), query).slice(0, limit);
  },
};

// ---- navbar.gallery: <div class="card" data-slug data-site data-types data-styles data-platform> ------------------
export function parseNavbarGallery(html) {
  const out = [];
  for (const chunk of html.split('<div class="card" data-slug=').slice(1)) {
    const slug = chunk.match(/^"([^"]+)"/)?.[1];
    const image = chunk.match(/<img src="(https:\/\/cdn\.navbar\.gallery\/[^"]+)"/)?.[1];
    if (!slug || !image) continue;
    const title = chunk.match(/aria-label="([^"]*)"\s+data-file/)?.[1] || titleCase(slug);
    const site = attr(chunk, "data-site");
    out.push(
      makeItem("navbar", {
        id: slug,
        title,
        url: `https://www.navbar.gallery/navbar/${slug}`,
        image,
        author: slug,
        tags: ["navbar", ...String(attr(chunk, "data-types") || "").split(/[|,]/), ...decode(attr(chunk, "data-styles") || "").split("|"), attr(chunk, "data-platform")].filter(Boolean),
        kind: "nav",
        live: site || undefined,
      }),
    );
  }
  return out;
}

const navbar = {
  id: "navbar",
  label: "Navbar Gallery",
  kinds: ["section"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseNavbarGallery(await getHtml("https://www.navbar.gallery/", config)), query).slice(0, limit);
  },
};

// ---- cta.gallery: a Framer page; each CTA is <a href="./cta/<slug>"> holding the picture and the brand name -------
export function parseCtaGallery(html) {
  const out = [];
  const seen = new Set();
  const re = /<a [^>]*href="\.\/cta\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, slug, inner] = m;
    if (seen.has(slug)) continue;
    const image = [...inner.matchAll(/<img[^>]*?\swidth="(\d+)"[^>]*?\ssrc="([^"]+)"/g)].find((x) => Number(x[1]) >= 300)?.[2];
    const title = strip(inner);
    if (!image || !title) continue;
    seen.add(slug);
    out.push(makeItem("cta", { id: slug, title, url: `https://www.cta.gallery/cta/${slug}`, image: abs(image, "https://www.cta.gallery"), author: title, tags: ["cta"], kind: "cta" }));
  }
  return out;
}

const cta = {
  id: "cta",
  label: "cta.gallery",
  kinds: ["section"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseCtaGallery(await getHtml("https://www.cta.gallery/", config)), query).slice(0, limit);
  },
};

// ---- inspora.design: an archive of visual work; cards carry data-feed-post-* attributes, sponsors are skipped ----
export function parseInspora(html) {
  const out = [];
  for (const chunk of html.split("<article").slice(1)) {
    const path = attr(chunk, "data-feed-post-pathname");
    const title = attr(chunk, "data-feed-post-title");
    // The picture is a looping video (its poster) or a plain <img>; both carry a written description.
    const media = chunk.match(/<(?:video|img)\s[^>]*data-feed-transition-media[^>]*>/)?.[0] || "";
    const poster = attr(media, "poster") || attr(media, "src");
    if (!path || !title || !poster) continue;
    out.push(
      makeItem("inspora", {
        id: path.replace(/^\/posts\//, "") || slugify(title),
        title,
        url: abs(path, "https://www.inspora.design"),
        image: abs(poster, "https://www.inspora.design"),
        author: attr(chunk, "data-feed-creator-name"),
        tags: ["visual"],
        kind: "site",
        description: strip(attr(media, "aria-label") || attr(media, "alt") || "") || undefined,
      }),
    );
  }
  return out;
}

const inspora = {
  id: "inspora",
  label: "Inspora",
  kinds: ["site"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseInspora(await getHtml("https://www.inspora.design/", config)), query).slice(0, limit);
  },
};

export const providers = [getdesign, posts, loadmore, recentdesign, supahero, navbar, cta, inspora];
