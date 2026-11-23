// Photos and images with their licences: Wikimedia Commons (no key), Unsplash and Pexels (free keys),
// Openverse (may refuse anonymous calls). images_save downloads into the project and logs the credit.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { getKey } from "../../core/keys.mjs";
import { projectDir, projectDripDir, ensureDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { rememberListing, resolve, lookup } from "../../core/seen.mjs";

const strip = (s) => (s || "").replace(/<[^>]+>/g, "").trim();

const SOURCES = {
  async wikimedia({ query, orientation, limit }) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit * 2}&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&origin=*`;
    const { body } = await get(url, { as: "json", headers: { "User-Agent": "drip-design-mcp/0.1 (design reference tool)" } });
    return Object.values(body.query?.pages || {})
      .map((p) => {
        const ii = p.imageinfo?.[0] || {};
        const m = ii.extmetadata || {};
        return { title: p.title.replace(/^File:/, "").replace(/\.\w+$/, ""), thumb: ii.thumburl, full: ii.url, width: ii.width, height: ii.height, page: ii.descriptionurl, author: strip(m.Artist?.value), license: strip(m.LicenseShortName?.value) || "see page" };
      })
      .filter((r) => r.thumb && r.width >= 1000 && (!orientation || (orientation === "landscape" ? r.width > r.height : orientation === "portrait" ? r.height > r.width : true)))
      .slice(0, limit);
  },
  async unsplash({ query, orientation, limit }) {
    const key = getKey("unsplash");
    if (!key) throw new Error("No Unsplash key. Get a free one at unsplash.com/developers, then keys_open (or set UNSPLASH_ACCESS_KEY).");
    const { body } = await get(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}${orientation ? `&orientation=${orientation === "square" ? "squarish" : orientation}` : ""}`, { as: "json", headers: { Authorization: `Client-ID ${key}` } });
    return body.results.map((p) => ({ title: p.alt_description || p.description || query, thumb: p.urls.small, full: p.urls.regular, width: p.width, height: p.height, page: p.links.html, author: p.user?.name, license: "Unsplash License (free, credit appreciated)" }));
  },
  async pexels({ query, orientation, limit }) {
    const key = getKey("pexels");
    if (!key) throw new Error("No Pexels key. Get a free one at pexels.com/api, then keys_open (or set PEXELS_API_KEY).");
    const { body } = await get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}${orientation ? `&orientation=${orientation}` : ""}`, { as: "json", headers: { Authorization: key } });
    return body.photos.map((p) => ({ title: p.alt || query, thumb: p.src.medium, full: p.src.large2x, width: p.width, height: p.height, page: p.url, author: p.photographer, license: "Pexels License (free, credit appreciated)" }));
  },
  async openverse({ query, limit }) {
    const token = getKey("openverse");
    const { body } = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`, { as: "json", headers: { "User-Agent": "drip-design-mcp/0.1", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    return body.results.map((p) => ({ title: p.title, thumb: p.thumbnail, full: p.url, width: p.width, height: p.height, page: p.foreign_landing_url, author: p.creator, license: `${p.license} ${p.license_version || ""}`.trim() }));
  },
};

export function register(server, ctx) {
  server.registerTool(
    "images_search",
    {
      title: "Search photos (with licences)",
      description:
        "Search real photography for heroes and sections, with author and licence for each. Sources: wikimedia (no key), unsplash and pexels (free keys, best quality), openverse. " +
        "Returns a numbered list + contact sheet. Write art-directed queries ('architect at desk morning light', not 'business'). Read drip_guide imagery first.",
      inputSchema: {
        query: z.string(),
        source: z.enum(["wikimedia", "unsplash", "pexels", "openverse"]).optional().describe("Default: unsplash if its key is set, else wikimedia"),
        orientation: z.enum(["landscape", "portrait", "square"]).optional(),
        limit: z.number().int().min(4).max(30).optional(),
      },
    },
    safe(async ({ query, source, orientation, limit = 18 }) => {
      const src = source || (getKey("unsplash") ? "unsplash" : getKey("pexels") ? "pexels" : "wikimedia");
      const results = await SOURCES[src]({ query, orientation, limit });
      if (!results.length) return text(`No images for "${query}" on ${src}. Try other words or another source.`);
      const items = results.map((r, i) => ({ key: `image:${r.full}`, source: src, id: `${src}-${i}`, title: r.title, url: r.page, image: r.full, thumb: r.thumb, designer: r.author, license: r.license }));
      rememberListing(items);
      const bufs = await Promise.all(results.map((r) => fetchImage(r.thumb).then((x) => x.buf).catch(() => Buffer.alloc(0))));
      return blocks([
        textBlock(`${src}: "${query}"\n${results.map((r, i) => `${i + 1}. ${r.title.slice(0, 80)} — ${r.author || "?"} · ${r.license} · ${r.width}x${r.height}`).join("\n")}\n\nSave one with images_save (logs the credit). Add to the board with board_add (ref = number).`),
        imageBlock(await contactSheet(bufs, { cols: 6, tileW: 300, tileH: 225 })),
      ]);
    }),
  );

  server.registerTool(
    "images_save",
    {
      title: "Save an image into the project",
      description: "Downloads an image (number from the last images_search, or a URL) into the project and records source, author and licence in .drip/assets.json, so credits can be shipped.",
      inputSchema: { image: z.string(), dest: z.string().describe("Project path, e.g. public/images/hero.jpg"), credit: z.string().optional() },
    },
    safe(async ({ image, dest, credit }) => {
      const item = /^https?:/.test(image) ? { image, url: image } : lookup(resolve(image, "image"));
      if (!item?.image) return text("Unknown image. Use a number from the last images_search or a URL.", true);
      const { buf } = await fetchImage(item.image, { ttlMs: 0 });
      const file = path.resolve(projectDir(), dest);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf);
      const log = path.join(ensureDir(projectDripDir()), "assets.json");
      const list = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : [];
      list.push({ file: dest, source: item.url, author: item.designer || null, license: item.license || "unknown — check before shipping", credit: credit || null, savedAt: new Date().toISOString() });
      fs.writeFileSync(log, JSON.stringify(list, null, 2));
      return text(`Saved ${dest} (${Math.round(buf.length / 1024)} KB). Licence: ${item.license || "UNKNOWN — confirm before shipping"}. Logged in .drip/assets.json.\nServe it at the size it displays (srcset / next/image), with real alt text.`);
    }),
  );
}
