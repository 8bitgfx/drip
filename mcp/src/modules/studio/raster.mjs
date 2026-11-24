// Shared helpers for the studio tools: optional dependencies, rasterising an SVG, saving files into the project
// with a credit entry, and a compact preview.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { imageBlock, toJpeg } from "../../core/images.mjs";
import { processImage } from "../../core/imaging.mjs";
import { readJson, withLock, writeJsonAtomic } from "../../core/jsonstore.mjs";
import { ensureProjectDrip, homeDripDir, projectDir } from "../../core/paths.mjs";
import { renderHtml, rendersDir, stamp } from "../../core/render.mjs";

/**
 * Load an optional npm package: from the normal resolution path first, then from ~/.drip/vendor (where
 * `drip doctor --install <dep>` or `npm i <dep>` inside that folder puts it). Returns null when absent.
 */
export async function loadOptional(name) {
  try {
    return await import(name);
  } catch {
    /* not installed here */
  }
  const dir = path.join(homeDripDir, "vendor", "node_modules", name);
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    const entry = typeof pkg.module === "string" ? pkg.module : typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."]?.import || pkg.exports?.["."]?.default || pkg.exports?.["."] || pkg.main || "index.js";
    return await import(pathToFileURL(path.join(dir, typeof entry === "string" ? entry : "index.js")).href);
  } catch {
    return null;
  }
}

/** SVGO when it is installed (optional), else the SVG unchanged. Returns { svg, optimized }. */
export async function optimizeSvg(svg) {
  const svgo = await loadOptional("svgo");
  if (!svgo?.optimize) return { svg, optimized: false };
  try {
    const out = svgo.optimize(svg, { multipass: true, floatPrecision: 1 });
    return { svg: out.data, optimized: true };
  } catch {
    return { svg, optimized: false };
  }
}

/** Where `out` points inside the project; refuses paths that leave it. */
export function projectPath(out) {
  const root = path.resolve(projectDir());
  const abs = path.resolve(root, out);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`"${out}" is outside the project (${root}). Use a project-relative path such as public/img/hero.webp.`);
  return abs;
}

/**
 * Render an SVG to an image buffer. format "png" | "webp" | "jpeg". With @resvg/resvg-js installed (optional) and
 * rasterizer "resvg" it is rendered without a browser; otherwise by the shared headless Chrome.
 */
export async function rasterizeSvg(svg, { width, height, format = "png", maxKB = 400, rasterizer = "browser", config } = {}) {
  if (rasterizer === "resvg") {
    const mod = await loadOptional("@resvg/resvg-js");
    if (!mod?.Resvg) throw new Error("@resvg/resvg-js is not installed. Run: cd ~/.drip/vendor && npm i @resvg/resvg-js (or use rasterizer: \"browser\").");
    const png = Buffer.from(new mod.Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
    return format === "png" ? png : encode(png, { width, format, maxKB, config });
  }
  const file = path.join(rendersDir("studio"), `raster-${stamp()}-${Math.random().toString(36).slice(2, 6)}.png`);
  const png = await renderHtml(`<div style="width:${width}px;height:${height}px;overflow:hidden;line-height:0">${svg.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `)}</div>`, file, { width, height, config });
  fs.rmSync(file, { force: true });
  return format === "png" ? png : encode(png, { width, format, maxKB, config });
}

async function encode(png, { width, format, maxKB, config }) {
  const r = await processImage(png, { outputs: [{ name: "", width, format }], focus: { x: 0.5, y: 0.5 }, maxKB, config });
  return r.files[0].buf;
}

/** Write a file under the project; returns { abs, rel, kb }. */
export function saveFile(out, data) {
  const abs = projectPath(out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, data);
  return { abs, rel: path.relative(projectDir(), abs).replace(/\\/g, "/"), kb: Math.max(1, Math.round(fs.statSync(abs).size / 1024)) };
}

/** Append entries to <project>/.drip/assets.json (the same credits log images_save writes): { file, source, author, license, credit, savedAt }. */
export function logAsset(entries) {
  const log = path.join(ensureProjectDrip(), "assets.json");
  withLock(log, () => {
    const prev = readJson(log, []);
    for (const e of entries) prev.push({ credit: null, author: null, savedAt: new Date().toISOString(), ...e });
    writeJsonAtomic(log, prev);
  });
}

/** A compact JPEG preview block of an image buffer (max 1280 px wide), or null. */
export async function previewBlock(buf, maxW = 1280, maxH = 900) {
  try {
    return imageBlock(await toJpeg(buf, maxW, maxH, 82));
  } catch {
    return null;
  }
}

export function tempDir(prefix = "drip-studio-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    /* locked on Windows; best-effort */
  }
}
