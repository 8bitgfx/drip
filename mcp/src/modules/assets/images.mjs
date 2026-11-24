// Photos, art and images with their licences, and web-ready saving.
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

const strip = (s) => (s || "").replace(/<[^>]+>/g, "").trim();
const UA = { "User-Agent": "drip-design-mcp/0.4 (design tool; https://github.com/8bitgfx/drip)" };
const fitsOrientation = (r, o) => !o || (o === "landscape" ? r.width > r.height : o === "portrait" ? r.height > r.width : Math.abs(r.width / r.height - 1) < 0.25);

const SOURCES = {
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
    const { body } = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}&license_type=commercial,modification${orientation ? `&aspect_ratio=${orientation === "landscape" ? "wide" : orientation === "portrait" ? "tall" : "square"}` : ""}`, { as: "json", headers: { ...UA, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
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
  "unsplash/pexels/pixabay: best photos (free keys) · openverse: CC licences, commercial-use only · wikimedia: everything, check each licence · " +
  "cleveland: public-domain paintings, prints, woodblock and ukiyo-e, illustration (CC0, up to 3400px; the honest route to painterly and anime-adjacent heroes) · nasa: space, earth, science.";

export function register(server, ctx) {
  server.registerTool(
    "images_search",
    {
      title: "Search photos and art (with licences)",
      description:
        "Search photography and public-domain art for heroes and sections, with author, licence, size and colour for each. " +
        SOURCE_NOTES +
        " Returns a numbered list + contact sheet. Write art-directed queries ('architect at desk morning light', 'hokusai wave', not 'business'). " +
        "Never use film or anime stills (e.g. Ghibli) or unlicensed art: no licence covers a commercial page; for an anime/illustrated look use cleveland ukiyo-e and prints, pixabay kind illustration, or gen_image.",
      inputSchema: {
        query: z.string(),
        source: z.enum(["unsplash", "pexels", "pixabay", "openverse", "wikimedia", "cleveland", "nasa"]).optional().describe("Default: unsplash, else pexels, else pixabay, else openverse"),
        orientation: z.enum(["landscape", "portrait", "square"]).optional(),
        color: z.string().optional().describe("unsplash/pexels/pixabay colour filter, e.g. 'blue', 'black_and_white', 'orange'"),
        kind: z.enum(["photo", "illustration", "vector"]).optional().describe("pixabay only"),
        limit: z.number().int().min(4).max(30).optional(),
      },
    },
    safe(async ({ query, source, orientation, color, kind, limit = 18 }) => {
      const src = source || (getKey("unsplash") ? "unsplash" : getKey("pexels") ? "pexels" : getKey("pixabay") ? "pixabay" : "openverse");
      let results;
      try {
        results = await SOURCES[src]({ query, orientation, limit, color, kind });
      } catch (e) {
        if (source) throw e;
        results = await SOURCES.wikimedia({ query, orientation, limit }); // Openverse is sometimes down
      }
      if (!results.length) return text(`No images for "${query}" on ${src}. Try other words or another source (${Object.keys(SOURCES).join(", ")}).`);
      const items = results.map((r, i) => ({ key: `image:${r.full}`, source: src, id: `${src}-${i}`, title: r.title, url: r.page, image: r.full, thumb: r.thumb, designer: r.author, license: r.license, ping: r.ping, width: r.width, height: r.height }));
      rememberListing(items);
      const bufs = await Promise.all(results.map((r) => fetchImage(r.thumb).then((x) => x.buf).catch(() => Buffer.alloc(0))));
      const fmt = (r) => {
        if (!r.width) return "size on save";
        const big = Math.max(r.width, r.height);
        return `${r.width}x${r.height} ${(r.width / r.height).toFixed(2)}:1${big >= 2400 ? " · hero-ready" : big < 1600 ? " · too small for a full-bleed hero" : ""}`;
      };
      return blocks([
        textBlock(
          `${src}: "${query}"${!getKey("unsplash") && !getKey("pexels") ? "  (no Unsplash/Pexels key: keys_open for better photos)" : ""}\n` +
            results.map((r, i) => `${i + 1}. ${r.title.slice(0, 80)} — ${r.author || "?"} · ${r.license} · ${fmt(r)}${r.color ? ` · ${r.color}` : ""}`).join("\n") +
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
      for (const w of written) prev.push({ file: w.rel, source: item.url, author: item.designer || null, license: item.license || "unknown — check before shipping", credit: credit || null, savedAt: new Date().toISOString() });
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
          `\nLicence: ${item.license || "UNKNOWN: confirm before shipping"}${item.designer ? ` · credit ${item.designer}` : ""}. Logged in .drip/assets.json.\n\n${picture}\n(Hero: fetchpriority="high", no lazy loading. Below the fold: loading="lazy".)`,
      );
    }),
  );
}
