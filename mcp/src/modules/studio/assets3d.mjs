// assets_3d_search / assets_3d_save: HDRIs, PBR texture sets and models from Poly Haven (api.polyhaven.com) and
// ambientCG (ambientcg.com/api/v2). Downloads go into the project with a provenance record (source page, author,
// licence as the source states it); scene_render and blender_render use them as environment lights and materials.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, rememberListing, resolve } from "../../core/seen.mjs";
import { logAsset, projectPath } from "./raster.mjs";

const UA = { "User-Agent": "drip-design-mcp/0.5 (design tool; https://github.com/8bitgfx/drip)" };
const DAY = 24 * 3600e3;
const PH = "https://api.polyhaven.com";
const ACG = "https://ambientcg.com/api/v2/full_json";
const TYPES = { hdri: { ph: "hdris", acg: "HDRI" }, texture: { ph: "textures", acg: "Material" }, model: { ph: "models", acg: "3DModel" } };
const PH_TYPE = { 0: "hdri", 1: "texture", 2: "model" };

// ---- zip (stored + deflate) ----------------------------------------------------------------------------------

/** Read a zip file held in memory: [{ name, data }]. Directories are skipped. */
export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Not a zip file (no end-of-archive record)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt zip directory");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + csize);
    out.push({ name, data: method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw) });
  }
  return out;
}

/** Write zip entries under `dir`, refusing names that climb out of it. Returns the relative file names. */
export function extractTo(entries, dir) {
  const root = path.resolve(dir);
  const written = [];
  for (const e of entries) {
    const target = path.resolve(root, e.name);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error(`Refusing to write outside the folder: ${e.name}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.data);
    written.push(e.name);
  }
  return written;
}

// ---- Poly Haven --------------------------------------------------------------------------------------------------

const phList = async (type) => (await get(`${PH}/assets?t=${TYPES[type].ph}`, { as: "json", headers: UA, ttlMs: DAY })).body;
const phFiles = async (id) => (await get(`${PH}/files/${id}`, { as: "json", headers: UA, ttlMs: 7 * DAY })).body;
const phInfo = async (id) => (await get(`${PH}/info/${id}`, { as: "json", headers: UA, ttlMs: 7 * DAY })).body;

export function rankAssets(map, query, limit) {
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const rows = Object.entries(map).map(([id, a]) => {
    const hay = `${id} ${a.name} ${(a.tags || []).join(" ")} ${(a.categories || []).join(" ")}`.toLowerCase();
    const hits = words.filter((w) => hay.includes(w)).length;
    return { id, a, hits, pop: a.download_count || 0 };
  });
  return rows.filter((r) => !words.length || r.hits > 0).sort((x, y) => y.hits - x.hits || y.pop - x.pop).slice(0, limit);
}

async function searchPolyHaven(type, query, limit) {
  const map = await phList(type);
  return rankAssets(map, query, limit).map(({ id, a }) => ({
    key: `polyhaven:${id}`,
    source: "polyhaven",
    id,
    title: a.name,
    url: `https://polyhaven.com/a/${id}`,
    image: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=360&height=360`,
    designer: Object.keys(a.authors || {}).join(", ") || "Poly Haven",
    designerUrl: "polyhaven.com",
    tags: [...(a.categories || []), ...(a.tags || [])].slice(0, 8),
    kind3d: type,
    maxResolution: a.max_resolution,
  }));
}

// ---- ambientCG --------------------------------------------------------------------------------------------------

async function searchAmbient(type, query, limit) {
  const url = `${ACG}?q=${encodeURIComponent(query || "")}&type=${TYPES[type].acg}&limit=${limit}&sort=Popular&include=imageData`;
  const { body } = await get(url, { as: "json", headers: UA, ttlMs: DAY });
  return (body.foundAssets || []).map((a) => ({
    key: `ambientcg:${a.assetId}`,
    source: "ambientcg",
    id: a.assetId,
    title: a.displayName || a.assetId,
    url: a.shortLink || `https://ambientcg.com/view?id=${a.assetId}`,
    image: a.previewImage?.["256-PNG"] || Object.values(a.previewImage || {})[0],
    designer: "ambientCG",
    designerUrl: "ambientcg.com",
    tags: (a.tags || []).slice(0, 8),
    kind3d: type,
  }));
}

async function acgDownloads(id) {
  const { body } = await get(`${ACG}?id=${encodeURIComponent(id)}&include=downloadData`, { as: "json", headers: UA, ttlMs: DAY });
  const a = body.foundAssets?.[0];
  if (!a) throw new Error(`ambientCG has no asset "${id}"`);
  return { asset: a, downloads: a.downloadFolders?.default?.downloadFiletypeCategories?.zip?.downloads || [] };
}

const download = async (url) => (await get(url, { as: "buffer", headers: UA, ttlMs: 30 * DAY })).body;

/** The bytes of an HDRI: a project .hdr file, or a Poly Haven id at 1k / 2k (cached on disk). */
export async function hdrBuffer(idOrPath, res = "1k") {
  if (/\.hdr$/i.test(idOrPath)) return fs.readFileSync(projectPath(idOrPath));
  const files = await phFiles(idOrPath);
  const hit = files.hdri?.[res]?.hdr || files.hdri?.["1k"]?.hdr;
  if (!hit) throw new Error(`Poly Haven has no HDRI "${idOrPath}" (search with assets_3d_search type hdri).`);
  return download(hit.url);
}

// ---- tools --------------------------------------------------------------------------------------------------------

const PH_TEXTURE_MAPS = { Diffuse: "diff", nor_gl: "nor_gl", Rough: "rough", AO: "ao", Displacement: "disp" };

export function register(server) {
  server.registerTool(
    "assets_3d_search",
    {
      title: "Search HDRIs, PBR textures and 3D models",
      description:
        "Searches Poly Haven and ambientCG for HDRIs (studio and environment light for renders), PBR material sets (wood, concrete, fabric, paper, metal...) and 3D models. Returns a numbered contact sheet; assets_3d_save downloads one into the project. " +
        'Example: assets_3d_search({ type: "hdri", query: "studio soft", limit: 12 })  then  assets_3d_save({ asset: "3" })',
      inputSchema: {
        query: z.string().optional().describe("Words: studio, wood, concrete, sunset, fabric..."),
        type: z.enum(["hdri", "texture", "model"]).optional().describe("Default hdri"),
        source: z.enum(["all", "polyhaven", "ambientcg"]).optional(),
        limit: z.number().int().min(4).max(36).optional(),
      },
    },
    safe(async ({ query = "", type = "hdri", source = "all", limit = 18 }) => {
      const per = source === "all" ? Math.ceil(limit / 2) : limit;
      const lists = await Promise.all([source !== "ambientcg" ? searchPolyHaven(type, query, per).catch((e) => ({ error: `Poly Haven: ${e.message}` })) : [], source !== "polyhaven" ? searchAmbient(type, query, per).catch((e) => ({ error: `ambientCG: ${e.message}` })) : []]);
      const errors = lists.filter((l) => l.error).map((l) => l.error);
      const items = lists.filter(Array.isArray).flat().slice(0, limit);
      if (!items.length) return text(`No ${type}s found for "${query}".${errors.length ? ` ${errors.join(" · ")}` : ""}`, errors.length > 0);
      const tag = rememberListing(items, { kind: "asset3d", query, category: type });
      const lines = items.map((it, i) => `${tag}-${i + 1}. ${it.title} — ${it.source} · ${it.tags.slice(0, 4).join(", ")}${it.maxResolution ? ` · up to ${it.maxResolution[0]}px` : ""} · ${it.url}`);
      const bufs = await Promise.all(items.map((it) => fetchImage(it.image).then((r) => r.buf).catch(() => Buffer.alloc(0))));
      return blocks([textBlock(`Listing ${tag}: ${type}s for "${query || "popular"}". Sheet numbers = ${tag}-<n>.\n${lines.join("\n")}${errors.length ? `\nSkipped: ${errors.join(" · ")}` : ""}\n\nNEXT: assets_3d_save({ asset: "${tag}-1" }) downloads it into the project (resolution 1k by default).`), imageBlock(await contactSheet(bufs, { cols: 6, tileW: 220, tileH: 220 }))]);
    }),
  );

  server.registerTool(
    "assets_3d_save",
    {
      title: "Download a Poly Haven / ambientCG asset into the project",
      description:
        "Downloads an asset from assets_3d_search (number like \"L2-3\", or \"polyhaven:<id>\" / \"ambientcg:<id>\") into assets/3d/<source>/<id>/ with a provenance.json and an entry in .drip/assets.json (source page, authors, licence). " +
        "HDRI: the .hdr file at the chosen resolution (pass its id as environment.hdri in scene_render / blender_render, or the saved path). Texture sets: diffuse, normal, roughness, AO, displacement maps (use the folder as material.pbrFolder). Models: glTF with its textures. " +
        'Example: assets_3d_save({ asset: "polyhaven:studio_small_09", resolution: "2k" })',
      inputSchema: {
        asset: z.string().describe("A number from the last assets_3d_search, or source:id"),
        resolution: z.enum(["1k", "2k", "4k"]).optional().describe("Default 1k (enough for lighting and previews; 2k-4k for hero stills)"),
        dest: z.string().optional().describe("Project folder (default assets/3d)"),
      },
    },
    safe(async ({ asset, resolution = "1k", dest = "assets/3d" }) => {
      const key = resolve(asset, "polyhaven");
      const [source, ...rest] = key.split(":");
      const id = rest.join(":");
      if (!["polyhaven", "ambientcg"].includes(source) || !id) return text(`"${asset}" is not a Poly Haven or ambientCG asset. Use a number from assets_3d_search or source:id.`, true);
      const known = lookup(key);
      const folder = path.join(dest, source, id).replace(/\\/g, "/");
      const abs = projectPath(folder);
      fs.mkdirSync(abs, { recursive: true });
      const files = [];
      let authors = [];
      let kind;
      let page;
      if (source === "polyhaven") {
        const [info, listing] = await Promise.all([phInfo(id), phFiles(id)]);
        kind = PH_TYPE[info.type] || known?.kind3d || "asset";
        authors = Object.keys(info.authors || {});
        page = `https://polyhaven.com/a/${id}`;
        const put = async (url, rel) => {
          const target = path.join(abs, rel);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, await download(url));
          files.push(rel.replace(/\\/g, "/"));
        };
        if (kind === "hdri") {
          const hit = listing.hdri?.[resolution]?.hdr || listing.hdri?.["1k"]?.hdr;
          if (!hit) throw new Error(`No .hdr file for ${id} at ${resolution}`);
          await put(hit.url, path.basename(new URL(hit.url).pathname));
        } else if (kind === "texture") {
          for (const [map, short] of Object.entries(PH_TEXTURE_MAPS)) {
            const hit = listing[map]?.[resolution]?.jpg || listing[map]?.["1k"]?.jpg;
            if (hit) await put(hit.url, `${id}_${short}_${resolution}.jpg`);
          }
        } else {
          const gltf = listing.gltf?.[resolution]?.gltf || listing.gltf?.["1k"]?.gltf;
          if (!gltf) throw new Error(`No glTF for ${id} at ${resolution}`);
          await put(gltf.url, `${id}.gltf`);
          for (const [rel, f] of Object.entries(gltf.include || {})) await put(f.url, rel);
        }
      } else {
        const { asset: a, downloads } = await acgDownloads(id);
        kind = known?.kind3d || (a.dataType?.toLowerCase().includes("hdri") ? "hdri" : a.dataType?.toLowerCase().includes("3d") ? "model" : "texture");
        authors = ["ambientCG"];
        page = a.shortLink || `https://ambientcg.com/view?id=${id}`;
        const want = resolution.toUpperCase();
        const pick = downloads.find((d) => d.attribute?.toUpperCase().startsWith(`${want}-JPG`)) || downloads.find((d) => d.attribute?.toUpperCase().startsWith(want) && /JPG|HDR|PNG/i.test(d.attribute)) || downloads.find((d) => d.attribute?.toUpperCase().startsWith(want)) || downloads[0];
        if (!pick) throw new Error(`ambientCG lists no downloads for ${id}`);
        files.push(...extractTo(unzip(await download(pick.downloadLink || pick.fullDownloadPath)), abs));
      }
      const record = { source, id, kind, url: page, authors, license: "CC0 1.0 (as stated by the source)", resolution, retrievedAt: new Date().toISOString(), files };
      fs.writeFileSync(path.join(abs, "provenance.json"), JSON.stringify(record, null, 2));
      logAsset(files.slice(0, 40).map((f) => ({ file: `${folder}/${f}`, source: page, author: authors.join(", ") || null, license: record.license })));
      const hint = kind === "hdri" ? `Use it: scene_render({ scene: { environment: { hdri: "${source === "polyhaven" ? id : `${folder}/${files.find((f) => /\.hdr$/i.test(f)) || ""}`}" } ... } }).` : kind === "texture" ? `Use it: material: { pbrFolder: "${folder}" } in scene_render.` : `A glTF model: open it in blender_render (objects can import it) or a three.js page.`;
      return text(`Saved ${kind} "${id}" (${source}, ${resolution}) to ${folder}/ — ${files.length} file${files.length === 1 ? "" : "s"}: ${files.slice(0, 8).join(", ")}${files.length > 8 ? ", ..." : ""}.\nAuthors: ${authors.join(", ") || "?"} · ${record.license} · ${page}\nProvenance: ${folder}/provenance.json and .drip/assets.json.\n${hint}`);
    }),
  );
}

