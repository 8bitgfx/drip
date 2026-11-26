// Drip Film, the process before building: references looked at, assets made or saved, pieces previewed and picked, each
// an event with a small thumbnail saved next to the film (thumbs/). Called by the tools themselves (and, for assets, by
// the registry): fire and forget, never throws, never slows a tool down.
import fs from "node:fs";
import path from "node:path";
import { filmDir, filmEvent } from "../../core/film.mjs";
import { fetchImage, toJpeg } from "../../core/images.mjs";
import { processImage } from "../../core/imaging.mjs";
import { projectDir } from "../../core/paths.mjs";
import { loadState } from "../../core/state.mjs";

const pending = new Set();
let seq = 0;

const EXT = { png: /^\x89PNG/, jpg: /^\xff\xd8/, gif: /^GIF/, webp: /^RIFF....WEBP/s, svg: /<svg/i, avif: /ftypavi/ };
const sniff = (buf) => Object.keys(EXT).find((k) => EXT[k].test(buf.subarray(0, 64).toString("latin1"))) || null;

/** A small copy of an image (a buffer, a local file or a URL) in the film's thumbs/, as a path relative to the film. */
async function thumb(task, kind, src) {
  if (!src) return null;
  const buf = Buffer.isBuffer(src) ? src : (await fetchImage(String(src), { ttlMs: 7 * 24 * 3600e3 })).buf;
  if (!buf?.length) return null;
  const d = path.join(filmDir(task.id), "thumbs");
  fs.mkdirSync(d, { recursive: true });
  const name = `${kind}-${Date.now().toString(36)}${++seq}`;
  try {
    fs.writeFileSync(path.join(d, `${name}.jpg`), await toJpeg(buf, 480, 480, 72));
    return `thumbs/${name}.jpg`;
  } catch {
    /* WebP, AVIF, SVG: Jimp can't read them; the headless browser can */
  }
  try {
    // A tall page shot keeps its top (what a reference shows first).
    const f = (await processImage(buf, { outputs: [{ name: "t", width: 480, format: "jpeg" }], focus: { x: 0.5, y: 0 }, maxKB: 60 })).files[0];
    if (f.height > 640) throw new Error("tall");
    fs.writeFileSync(path.join(d, `${name}.jpg`), f.buf);
    return `thumbs/${name}.jpg`;
  } catch {
    try {
      const f = (await processImage(buf, { outputs: [{ name: "t", ar: "4:3", width: 480, format: "jpeg" }], focus: { x: 0.5, y: 0 }, maxKB: 60 })).files[0];
      fs.writeFileSync(path.join(d, `${name}.jpg`), f.buf);
      return `thumbs/${name}.jpg`;
    } catch {
      // no browser: a small file is shown as it is
      const ext = sniff(buf);
      if (!ext || buf.length > 120 * 1024) return null;
      fs.writeFileSync(path.join(d, `${name}.${ext}`), buf);
      return `thumbs/${name}.${ext}`;
    }
  }
}

/** Record one process event: kind ref | asset | piece, its fields, and the picture it shows (buffer, file or URL). */
export function filmRecord(kind, fields, image, { tool } = {}) {
  let task;
  try {
    task = loadState().task;
  } catch {
    return;
  }
  if (!task?.id || task.film === false) return;
  const t = new Date().toISOString(); // when it happened, not when the thumbnail was done
  const p = (async () => {
    let img = null;
    try {
      img = await thumb(task, kind, image);
    } catch {
      /* no thumbnail */
    }
    if (!img && typeof image === "string" && /^https?:/i.test(image)) img = image;
    filmEvent(task, { t, kind, ...(tool ? { tool } : {}), ...fields, ...(img ? { image: img } : {}) });
  })()
    .catch(() => {})
    .finally(() => pending.delete(p));
  pending.add(p);
}

/** Wait for the thumbnails being made (tests, and drip_end before the last film.json). */
export const filmFlush = () => Promise.all([...pending]);

// Asset tools: what they wrote and the picture they returned, read from the call and its result.
const ASSET_KIND = { gen_image: "generated", art_generate: "art", mockup_render: "mockup", images_save: "photo" };

function sourceOf(file) {
  try {
    const log = JSON.parse(fs.readFileSync(path.join(projectDir(), ".drip", "assets.json"), "utf8"));
    return log.findLast((x) => x.file === file)?.source || null;
  } catch {
    return null;
  }
}

/** The registry calls this after every tool; it records an asset event for the tools that make or save pictures. */
export function filmAsset(name, args = {}, res) {
  const kind = ASSET_KIND[name];
  if (!kind || !res || res.isError) return;
  try {
    const content = res.content || [];
    const said = content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    const img = content.find((c) => c.type === "image" && c.data);
    if (name === "images_save") {
      // "- public/img/hero-desktop.webp: 2400x1350, 312 KB": the first copy is the asset, shown as saved
      const file = (said.match(/^- (.+?): \d+x\d+/m) || [])[1];
      if (!file) return;
      const src = sourceOf(file) || (/^https?:/i.test(args.image || "") ? args.image : null);
      return filmRecord("asset", { file, assetKind: kind, src }, path.resolve(projectDir(), file), { tool: name });
    }
    const file = args.out || null;
    const src = name === "gen_image" ? `generated: ${String(args.prompt || "").slice(0, 140)}` : name === "mockup_render" ? args.image || null : name;
    filmRecord("asset", { file, assetKind: kind, src }, img ? Buffer.from(img.data, "base64") : file ? path.resolve(projectDir(), file) : null, { tool: name });
  } catch {
    /* bookkeeping only */
  }
}
