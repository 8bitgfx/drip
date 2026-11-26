// Photos and art for drafts, and web-ready saving. Licences are the user's call: sources are logged, never gated.
// Sources: Unsplash / Pexels / Pixabay (free keys, best photos), Openverse (commercial-use filter),
// Wikimedia Commons, the Cleveland Museum of Art (public-domain CC0 paintings, prints, woodblocks and
// illustration: the safe source for painterly / illustrated heroes), NASA (space, earth, science).
// images_save writes web copies (WebP/JPEG, resized, cropped to each slot around the focal point, under a
// size budget) and logs the credit.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { processImage } from "../../core/imaging.mjs";
import { getKey } from "../../core/keys.mjs";
import { ensureProjectDrip, projectDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { rememberListing, resolve, lookup } from "../../core/seen.mjs";
import { decodeHtml as decode } from "../../core/util.mjs";
import { installTaste, tasteAssets, tasteReady } from "../parts/index.mjs";

/** Resolve within ms or give up with []: one slow source never holds the search. */
const within = (p, ms) => Promise.race([p.catch(() => []), new Promise((r) => setTimeout(() => r([]), ms))]);
const ABSTRACT = /\b(abstract|gradient|texture|noise|grain|sky|cloud|cosmic|space|nebula|surreal|dreamy|background|wallpaper|pattern|aurora|light leak|bokeh|flowers?|illustration|painting|art)\b/i;
const BROWSER_UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" };

/** Bing image results (plain HTML, no key): murl = the image, turl = its thumbnail, purl = the page it is on. */
export function parseBing(html) {
  const out = [];
  for (const m of String(html).matchAll(/m="(\{[^"]*?\})"|m='(\{[^']*?\})'/g)) {
    const raw = decode(m[1] || m[2] || "");
    const get = (k) => (raw.match(new RegExp(`"${k}":"(.*?)"`)) || [])[1];
    const full = get("murl");
    if (full) out.push({ title: get("t") || "", full, thumb: get("turl") || full, page: get("purl") || full });
  }
  return out;
}

let library = null;
/** taste-skill's vetted photo library (413 tagged photographs, Unsplash ones served by picsum.photos): instant, no key. */
function libraryPhotos() {
  if (library) return library;
  if (!tasteReady()) {
    installTaste().catch(() => {});
    return [];
  }
  try {
    library = JSON.parse(fs.readFileSync(path.join(tasteAssets(), "photos", "photos.json"), "utf8")).photos || [];
  } catch {
    library = [];
  }
  return library;
}

const strip = (s) => (s || "").replace(/<[^>]+>/g, "").trim();
const UA = { "User-Agent": "drip-design-mcp/0.4 (design tool; https://github.com/8bitgfx/drip)" };
const fitsOrientation = (r, o) => !o || (o === "landscape" ? r.width > r.height : o === "portrait" ? r.height > r.width : Math.abs(r.width / r.height - 1) < 0.25);

/** Imageory (imageory.in): a curated gallery of free-to-use hero and background images, each with the prompt that made it. */
export function parseImageory(html) {
  const s = String(html).replace(/\\"/g, '"');
  const out = [];
  const re = /\{"id":"[0-9a-f-]{36}","slug":"/g;
  let m;
  while ((m = re.exec(s))) {
    let depth = 0;
    let i = m.index;
    for (; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}" && --depth === 0) break;
    }
    try {
      const o = JSON.parse(s.slice(m.index, i + 1));
      if (o.src && !o.premium) out.push(o);
    } catch {
      /* a fragment, not a record */
    }
  }
  return out;
}

const SOURCES = {
  async library({ query, orientation, limit }) {
    const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return libraryPhotos()
      .filter((p) => p.url && !(p.people === "figure"))
      .map((p) => ({ p, hits: words.filter((w) => `${p.alt} ${p.subject} ${p.motif} ${(p.trades || []).join(" ")} ${(p.colours || []).join(" ")} ${p.set || ""} ${p.tone || ""}`.toLowerCase().includes(w)).length }))
      .filter((x) => x.hits >= Math.min(2, words.length))
      .sort((a, b) => b.hits - a.hits || (b.p.quality || 0) - (a.p.quality || 0))
      .map(({ p }) => {
        const r = p.ratio || p.width / p.height || 1.5;
        const pic = /picsum\.photos/.test(p.url);
        return { title: p.alt, thumb: pic ? `${p.url}/480/${Math.round(480 / r)}` : p.url, full: pic ? `${p.url}/2400/${Math.round(2400 / r)}` : p.url, width: p.width, height: p.height, page: p.page, author: p.by, license: p.licence };
      })
      .filter((r) => fitsOrientation(r, orientation))
      .slice(0, limit);
  },
  async web({ query, orientation, limit }) {
    const { body } = await get(`https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=0&count=${Math.max(limit * 3, 35)}&qft=+filterui:imagesize-large${orientation === "landscape" ? "+filterui:aspect-wide" : orientation === "portrait" ? "+filterui:aspect-tall" : ""}&adlt=moderate`, { as: "text", headers: BROWSER_UA, ttlMs: 24 * 3600e3 });
    // Stock agencies serve watermarked previews: useless even as a draft.
    const STOCK = /(alamy|dreamstime|istockphoto|gettyimages|shutterstock|stock.adobe|adobestock|vecteezy|123rf|depositphotos|bigstockphoto|canstockphoto|stocksy|pond5|agefotostock|superstock|freepik|pngtree|vectorstock|envato|photodune|colourbox|megapixl|panthermedia|fotosearch|masterfile|westend61|lovepik|pikbest|storyblocks|pixta|crushpixel|yayimages|clipdealer|fotolia|thinkstock|wavebreakmedia|stockfresh|featurepics|mostphotos|eyeem|picfair|imagesbazaar|photocase|rawpixel)./i;
    const perHost = {};
    const host = (u) => { try { return new URL(u).hostname; } catch { return u; } };
    return parseBing(body).filter((r) => !STOCK.test(r.page) && !STOCK.test(r.full) && (perHost[host(r.page)] = (perHost[host(r.page)] || 0) + 1) <= 3).slice(0, limit).map((r) => ({ ...r, width: 0, height: 0, author: (() => { try { return new URL(r.page).hostname.replace(/^www\./, ""); } catch { return "web"; } })(), license: "web find (draft: check before shipping)" }));
  },
  async imageory({ query, orientation, limit }) {
    const { body } = await get("https://imageory.in/gallery", { as: "text", headers: { "User-Agent": "Mozilla/5.0 (drip design tool)" }, ttlMs: 24 * 3600e3 });
    const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return parseImageory(body)
      .map((o) => ({ o, hits: words.filter((w) => `${o.title} ${(o.tags || []).join(" ")} ${o.prompt || ""}`.toLowerCase().includes(w)).length }))
      .filter((x) => !words.length || x.hits)
      .sort((a, b) => b.hits - a.hits)
      .map(({ o }) => ({ title: o.title, thumb: o.src, full: o.src, width: o.width || 0, height: o.height || 0, page: "https://imageory.in/gallery", author: "Imageory", license: "free to use (Imageory)", prompt: o.prompt }))
      .filter((r) => fitsOrientation(r, orientation))
      .slice(0, limit);
  },
  async unsplash({ query, orientation, limit, color }) {
    const key = getKey("unsplash");
    if (!key) throw new Error("No Unsplash key. Get a free one at unsplash.com/developers, then keys_open (or set UNSPLASH_ACCESS_KEY).");
    const { body } = await get(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}${orientation ? `&orientation=${orientation === "square" ? "squarish" : orientation}` : ""}${color ? `&color=${color}` : ""}`, { as: "json", headers: { Authorization: `Client-ID ${key}` } });
    return body.results.map((p) => ({
      title: p.alt_description || p.description || query,
      thumb: p.urls.small,
      full: `${p.urls.raw}&w=2600&q=85&fm=jpg&fit=max`,
      width: p.width,
      height: p.height,
      color: p.color,
      page: p.links.html,
      author: p.user?.name,
      license: "Unsplash License (free for commercial use; credit the photographer)",
      ping: p.links.download_location,
    }));
  },
  async pexels({ query, orientation, limit, color }) {
    const key = getKey("pexels");
    if (!key) throw new Error("No Pexels key. Get a free one at pexels.com/api, then keys_open (or set PEXELS_API_KEY).");
    const { body } = await get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}${orientation ? `&orientation=${orientation}` : ""}${color ? `&color=${color}` : ""}`, { as: "json", headers: { Authorization: key } });
    return body.photos.map((p) => ({ title: p.alt || query, thumb: p.src.medium, full: `${p.src.original}?auto=compress&cs=tinysrgb&w=2600`, width: p.width, height: p.height, color: p.avg_color, page: p.url, author: p.photographer, license: "Pexels License (free for commercial use; link to Pexels)" }));
  },
  async pixabay({ query, orientation, limit, color, kind }) {
    const key = getKey("pixabay");
    if (!key) throw new Error("No Pixabay key. Get a free one at pixabay.com/api/docs, then keys_open (or set PIXABAY_API_KEY).");
    const type = kind === "illustration" ? "illustration" : kind === "vector" ? "vector" : "photo";
    const { body } = await get(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=${Math.max(3, limit)}&image_type=${type}&safesearch=true${orientation ? `&orientation=${orientation === "landscape" ? "horizontal" : "vertical"}` : ""}${color ? `&colors=${color}` : ""}`, { as: "json", ttlMs: 24 * 3600e3 });
    return body.hits.map((p) => ({ title: p.tags || query, thumb: p.webformatURL, full: p.largeImageURL, width: p.imageWidth, height: p.imageHeight, page: p.pageURL, author: p.user, license: "Pixabay Content License (free for commercial use; may include AI-generated uploads: check)" }));
  },
  async openverse({ query, limit, orientation }) {
    const token = getKey("openverse");
    const { body } = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}${orientation ? `&aspect_ratio=${orientation === "landscape" ? "wide" : orientation === "portrait" ? "tall" : "square"}` : ""}`, { as: "json", headers: { ...UA, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    return body.results.map((p) => ({ title: p.title, thumb: p.thumbnail, full: p.url, width: p.width, height: p.height, page: p.foreign_landing_url, author: p.creator, license: `${p.license.toUpperCase()} ${p.license_version || ""}`.trim() + (/^by/i.test(p.license) ? " (credit required)" : "") }));
  },
  async wikimedia({ query, orientation, limit }) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit * 2}&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2600&origin=*`;
    const { body } = await get(url, { as: "json", headers: UA });
    return Object.values(body.query?.pages || {})
      .map((p) => {
        const ii = p.imageinfo?.[0] || {};
        const m = ii.extmetadata || {};
        // Download the 2600px rendition, never the original (often 10-50 MB).
        return { title: p.title.replace(/^File:/, "").replace(/\.\w+$/, ""), thumb: ii.thumburl?.replace(/\/\d+px-/, "/400px-"), full: ii.thumburl || ii.url, width: ii.width, height: ii.height, page: ii.descriptionurl, author: strip(m.Artist?.value), license: (strip(m.LicenseShortName?.value) || "see page") + (/SA/.test(m.LicenseShortName?.value || "") ? " (share-alike)" : "") };
      })
      .filter((r) => r.thumb && r.width >= 1000 && fitsOrientation(r, orientation))
      .slice(0, limit);
  },
  async cleveland({ query, orientation, limit }) {
    // Cleveland Museum of Art Open Access: CC0, no key, direct image files (other museums' image servers block tools).
    const { body } = await get(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&cc0=1&has_image=1&limit=${limit * 2}`, { as: "json", headers: UA, ttlMs: 7 * 24 * 3600e3 });
    return (body.data || [])
      .filter((a) => a.images?.web?.url)
      .map((a) => {
        const big = a.images.print || a.images.web;
        return { title: `${a.title}${a.creation_date ? ` (${a.creation_date})` : ""}`, thumb: a.images.web.url, full: big.url, width: +big.width || 0, height: +big.height || 0, page: a.url, author: a.creators?.[0]?.description?.split("(")[0].trim() || a.culture?.[0] || "Unknown", license: "CC0 public domain (Cleveland Museum of Art)" };
      })
      .filter((r) => fitsOrientation(r, orientation))
      .slice(0, limit);
  },
  async nasa({ query, limit }) {
    const { body } = await get(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=${limit}`, { as: "json", headers: UA, ttlMs: 7 * 24 * 3600e3 });
    return (body.collection?.items || []).slice(0, limit).map((it) => {
      const d = it.data?.[0] || {};
      const thumb = it.links?.[0]?.href;
      return { title: d.title || query, thumb, full: thumb?.replace(/~thumb\.jpg$/, "~large.jpg"), width: 0, height: 0, page: `https://images.nasa.gov/details/${d.nasa_id}`, author: d.center ? `NASA ${d.center}` : "NASA", license: "NASA media (generally no copyright; credit NASA; no endorsement, no NASA logos)" };
    });
  },
};

const SOURCE_NOTES =
  "By default ONE call searches every source at once (each gives up after a few seconds) and merges them: library (taste-skill's vetted, tagged photos: instant), unsplash/pexels/pixabay (when their free keys are set: the best photos), web (an image search of the whole web), openverse, wikimedia, and imageory for abstract, sky and background art. " +
  "Pass source for one: cleveland (public-domain paintings, prints, ukiyo-e), nasa (space, earth, science). These are drafts: licences are the user's call, every saved file's source is logged in .drip/assets.json.";

export function register(server, ctx) {
  server.registerTool(
    "images_search",
    {
      title: "Search photos and art (every source at once)",
      description:
        "Search photography and art for heroes and sections, with author, size and colour for each. " +
        SOURCE_NOTES +
        " Returns a numbered list + contact sheet. Write art-directed queries ('aerial vineyard rows morning', 'architect at desk morning light', not 'business'). Several queries: pass queries (up to 4) in the same call.",
      inputSchema: {
        query: z.string().optional(),
        queries: z.array(z.string()).max(4).optional().describe("Several searches in one call, e.g. ['aerial vineyard', 'grapes close up', 'winemaker hands']"),
        source: z.enum(["library", "web", "imageory", "unsplash", "pexels", "pixabay", "openverse", "wikimedia", "cleveland", "nasa"]).optional().describe("Default: all at once, merged"),
        orientation: z.enum(["landscape", "portrait", "square"]).optional(),
        color: z.string().optional().describe("unsplash/pexels/pixabay colour filter, e.g. 'blue', 'black_and_white', 'orange'"),
        kind: z.enum(["photo", "illustration", "vector"]).optional().describe("pixabay only"),
        limit: z.number().int().min(1).max(30).optional().describe("Results wanted (4 at least are shown: a small ask is rounded up)"),
      },
    },
    safe(async ({ query, queries, source, orientation, color, kind, limit: asked = 12 }) => {
      const limit = Math.max(4, asked);
      const qs = [...new Set([query, ...(queries || [])].filter(Boolean))];
      if (!qs.length) return text("Pass query (or queries).", true);
      const keyed = ["unsplash", "pexels", "pixabay"].filter((k) => getKey(k));
      const each = Math.max(4, Math.ceil(limit / qs.length));
      const runOne = async (q) => {
        if (source) return (await SOURCES[source]({ query: q, orientation, limit: each, color, kind })).map((r) => ({ ...r, src: source }));
        // Every source at once, each given a few seconds; merged round-robin so the best sources lead.
        const order = ["library", ...keyed, ...(ABSTRACT.test(q) ? ["imageory"] : []), "web", "openverse", "wikimedia"];
        const lists = await Promise.all(order.map((k) => within(SOURCES[k]({ query: q, orientation, limit: each, color, kind }), k === "library" ? 3000 : 7000).then((l) => l.map((r) => ({ ...r, src: k })))));
        const merged = [];
        for (let i = 0; merged.length < each && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && merged.length < each) merged.push(l[i]);
        return merged;
      };
      const seen = new Set();
      const results = (await Promise.all(qs.map(runOne))).flat().filter((r) => r.full && !seen.has(r.full) && seen.add(r.full)).slice(0, limit);
      const src = source || "all";
      if (!results.length) return text(`No images for "${qs.join('", "')}"${source ? ` on ${source}` : ""}. Try other words.`);
      const items = results.map((r, i) => ({ key: `image:${r.full}`, source: r.src, id: `${r.src}-${i}`, title: r.title, url: r.page, image: r.full, thumb: r.thumb, designer: r.author, license: r.license, ping: r.ping, width: r.width, height: r.height }));
      rememberListing(items);
      const bufs = await Promise.all(results.map((r) => Promise.race([fetchImage(r.thumb).then((x) => x.buf).catch(() => Buffer.alloc(0)), new Promise((ok) => setTimeout(() => ok(Buffer.alloc(0)), 5000))])));
      const fmt = (r) => {
        if (!r.width) return "size on save";
        const big = Math.max(r.width, r.height);
        return `${r.width}x${r.height} ${(r.width / r.height).toFixed(2)}:1${big >= 2400 ? " · hero-ready" : big < 1600 ? " · too small for a full-bleed hero" : ""}`;
      };
      return blocks([
        textBlock(
          `${src}: "${qs.join('", "')}"${!keyed.length ? "  (no Unsplash/Pexels/Pixabay key: free keys via keys_open give the best photos)" : ""}\n` +
            results.map((r, i) => `${i + 1}. ${String(r.title || "").slice(0, 80)} — ${r.src} · ${r.author || "?"} · ${fmt(r)}${r.color ? ` · ${r.color}` : ""}${r.prompt ? `\n   prompt: ${r.prompt.slice(0, 220)}${r.prompt.length > 220 ? "…" : ""}` : ""}`).join("\n") +
            (results.some((r) => r.src === "imageory") ? "\nImageory images come with their prompt: adapt it with gen_image for a variation in the brand's colours." : "") +
            `\n\nTiles are letterboxed (whole image shown). Save one with images_save({ image: "3", dest: "public/img/hero", slots: [{ name: "desktop", ar: "16:9", width: 2400 }, { name: "phone", ar: "4:5", width: 1200 }] }).`,
        ),
        imageBlock(await contactSheet(bufs, { cols: 6, tileW: 300, tileH: 225, fit: "contain" })),
      ]);
    }),
  );

  server.registerTool(
    "images_save",
    {
      title: "Save web-ready images into the project",
      description:
        "Downloads an image (number from the last images_search, a URL, or a project file) and writes WEB copies: resized, cropped to each slot's ratio around the focal point " +
        "(auto-detected from where the detail is, or yours), encoded WebP (default) or JPEG under maxKB. Returns the files, their sizes and a ready <picture> snippet. " +
        "Logs source, author and licence in .drip/assets.json, and sends Unsplash's required download ping. Never ship a 7 MB original. " +
        'Example: images_save({ image: "3", dest: "public/img/hero", slots: [{ name: "desktop", ar: "16:9", width: 2400 }, { name: "phone", ar: "4:5", width: 1200 }] })',
      inputSchema: {
        image: z.string().describe("Number from the last images_search, a URL, or a path in the project"),
        dest: z.string().describe("Project path without extension (public/img/hero) or with one (public/img/hero.webp)"),
        slots: z
          .array(z.object({ name: z.string(), ar: z.string().optional().describe("'16:9', '4:5', '1:1', '21:9'; omit to keep the image's ratio"), width: z.number().int().min(64).max(4000).optional() }))
          .optional()
          .describe("One file per slot: dest-<name>.<ext>. Default: one copy, 2400px wide, original ratio"),
        format: z.enum(["webp", "jpeg", "png"]).optional().describe("Default webp (png for graphics with transparency)"),
        focus: z.union([z.literal("auto"), z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })]).optional().describe("Crop centre: 'auto' (default) or fractions"),
        maxKB: z.number().int().min(30).max(3000).optional().describe("Size budget per file (default 400)"),
        keepOriginal: z.boolean().optional(),
        credit: z.string().optional(),
      },
    },
    safe(async ({ image, dest, slots, format, focus = "auto", maxKB = 400, keepOriginal, credit }) => {
      const local = !/^https?:/.test(image) && fs.existsSync(path.resolve(projectDir(), image));
      const item = /^https?:/.test(image) ? { image, url: image } : local ? { image: path.resolve(projectDir(), image), url: image } : lookup(resolve(image, "image"));
      if (!item?.image) return text("Unknown image. Use a number from the last images_search, a URL or a project file.", true);
      const { buf } = await fetchImage(item.image, { ttlMs: 0 });
      if (item.ping && getKey("unsplash")) get(item.ping, { as: "json", ttlMs: 0, headers: { Authorization: `Client-ID ${getKey("unsplash")}` } }).catch(() => {});
      const ext0 = path.extname(dest).slice(1).toLowerCase();
      const fmt = format || (["jpg", "jpeg"].includes(ext0) ? "jpeg" : ext0 === "png" ? "png" : "webp");
      const stem = ext0 ? dest.slice(0, -ext0.length - 1) : dest;
      const list = slots?.length ? slots : [{ name: "", width: 2400 }];
      const res = await processImage(buf, { outputs: list.map((s) => ({ name: s.name, ar: s.ar, width: s.width || 2400, format: fmt })), focus, maxKB, config: ctx.config() });
      const ext = fmt === "jpeg" ? "jpg" : fmt;
      const written = res.files.map((f) => {
        const rel = `${stem}${f.name ? `-${f.name}` : ""}.${ext}`;
        const abs = path.resolve(projectDir(), rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, f.buf);
        return { ...f, rel };
      });
      if (keepOriginal) {
        const o = path.resolve(projectDir(), `${stem}-original${path.extname(new URL(item.image, "file:///").pathname) || ".jpg"}`);
        fs.writeFileSync(o, buf);
      }
      const log = path.join(ensureProjectDrip(), "assets.json");
      const prev = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : [];
      for (const w of written) prev.push({ file: w.rel, source: item.url, author: item.designer || null, license: item.license || null, credit: credit || null, savedAt: new Date().toISOString() });
      fs.writeFileSync(log, JSON.stringify(prev, null, 2));
      const web = (rel) => "/" + rel.replace(/\\/g, "/").replace(/^public\//, "");
      const phone = written.find((w) => w.height > w.width);
      const desk = written.find((w) => w.width >= w.height) || written[0];
      const picture = phone && desk && phone !== desk
        ? `<picture>\n  <source media="(max-width: 640px)" srcset="${web(phone.rel)}" width="${phone.width}" height="${phone.height}">\n  <img src="${web(desk.rel)}" width="${desk.width}" height="${desk.height}" alt="DESCRIBE WHAT IT SHOWS" fetchpriority="high">\n</picture>`
        : `<img src="${web(desk.rel)}" width="${desk.width}" height="${desk.height}" alt="DESCRIBE WHAT IT SHOWS">`;
      return text(
        `Original ${res.width}x${res.height} (${Math.round(buf.length / 1024)} KB), focal point ${Math.round(res.focus.x * 100)}% ${Math.round(res.focus.y * 100)}%.\n` +
          written.map((w) => `- ${w.rel}: ${w.width}x${w.height}, ${w.kb} KB${w.kb > maxKB ? " (over budget: try a smaller width)" : ""}`).join("\n") +
          `\nSource logged in .drip/assets.json${item.designer ? ` (${item.designer})` : ""}.\n\n${picture}\n(Hero: fetchpriority="high", no lazy loading. Below the fold: loading="lazy".)`,
      );
    }),
  );
}
