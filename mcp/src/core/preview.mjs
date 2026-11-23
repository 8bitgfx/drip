// Render a bit of HTML to a picture (via headless Chrome) so Claude can SEE a palette, font pairing,
// gradient or icon set before committing to it. Returns null when no browser is available.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { screenshot } from "../modules/fitcheck/chrome.mjs";
import { imageBlock, toJpeg } from "./images.mjs";

export async function previewHtml(html, { width = 1200, height = 700, config } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-preview-"));
  const file = path.join(dir, "preview.html");
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style></head><body>${html}</body></html>`);
  try {
    const png = await screenshot(pathToFileURL(file).href, { width, height, waitMs: 2500, config });
    return imageBlock(await toJpeg(png, width, height));
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      /* locked temp dir on Windows; best-effort */
    }
  }
}
