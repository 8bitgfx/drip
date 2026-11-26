// Render HTML / SVG / URLs to PNG files with headless Chrome, so images exist on disk for the
// critic subagent (it reads image files) and for boards. Files go to <project>/.drip/renders/.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { screenshot } from "./chrome.mjs";
import { ensureDir, ensureProjectDrip } from "./paths.mjs";

export function rendersDir(sub = "") {
  return ensureDir(path.join(ensureProjectDrip(), "renders", sub));
}

export function stamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/** Screenshot a URL into `file`. Returns the PNG buffer. */
export async function renderUrl(url, file, { width = 1440, height = 900, dark = false, format = "png", quality = 82, config } = {}) {
  const png = await screenshot(url, { width, height, dark, format, quality, config });
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, png);
  return png;
}

/** Render an HTML fragment (full document optional) into `file`. */
export async function renderHtml(html, file, { width = 1200, height = 800, format = "png", quality = 82, config } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-render-"));
  const page = path.join(dir, "page.html");
  const doc = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style></head><body>${html}</body></html>`;
  fs.writeFileSync(page, doc);
  try {
    return await renderUrl(pathToFileURL(page).href, file, { width, height, format, quality, config });
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      /* locked temp dir on Windows; best-effort */
    }
  }
}

/** Render an SVG string centred on a background into `file`. */
export async function renderSvg(svg, file, { size = 1024, bg = "#ffffff", padding = 0.12, config } = {}) {
  const inner = svg.replace(/<\?xml[^>]*>/, "");
  const pad = Math.round(size * padding);
  return renderHtml(
    `<div style="width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center;box-sizing:border-box;padding:${pad}px"><div style="width:100%;height:100%;display:grid;place-items:center">${inner.replace(/<svg/, '<svg style="width:100%;height:100%;display:block"')}</div></div>`,
    file,
    { width: size, height: size, config },
  );
}
