// A tiny static server for previewing plain HTML/CSS builds without a dev server: one port per folder,
// found free automatically (no clashes with whatever else runs), kept for the life of the MCP server.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { projectDir } from "./paths.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8",
};

const servers = new Map(); // root -> Promise<port>

function start(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, rel);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    } catch {
      if (!path.extname(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    }
    fs.readFile(file, (err, buf) => {
      if (err) return res.writeHead(404, { "content-type": "text/plain" }).end(`Not found: ${rel}`);
      res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
      res.end(buf);
    });
  });
  server.unref();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

/** Serve `dir` (default: the project) and return its base URL. */
export async function serveDir(dir) {
  const root = path.resolve(projectDir(), dir || ".");
  if (!fs.existsSync(root)) throw new Error(`No folder ${root}`);
  if (!servers.has(root)) servers.set(root, start(root));
  const port = await servers.get(root);
  return `http://127.0.0.1:${port}`;
}

/** A URL for `target`: URLs pass through; a local .html file (or folder) is served and its URL returned. */
export async function toUrl(target) {
  if (/^(https?|file):/i.test(target)) return target;
  const abs = path.resolve(projectDir(), target);
  const isDir = fs.existsSync(abs) && fs.statSync(abs).isDirectory();
  const base = await serveDir(isDir ? abs : path.dirname(abs));
  return isDir ? `${base}/` : `${base}/${encodeURIComponent(path.basename(abs))}`;
}
