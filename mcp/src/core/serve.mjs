// A tiny static server for previewing plain HTML/CSS builds without a dev server: one port per folder,
// found free automatically (no clashes with whatever else runs), kept for the life of the MCP server.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
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

/** A free port on 127.0.0.1. */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const children = new Set();
process.once("exit", () => {
  for (const c of children) try { c.kill(); } catch { /* gone */ }
});

/** A Vite page (vite.config.* beside src/): npm install if needed, then `vite` on a free port. */
async function startVite(root) {
  const { ensureInstalled } = await import("../modules/parts/react.mjs");
  await ensureInstalled(root);
  const port = await freePort();
  const bin = path.join(root, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [bin, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child);
  child.unref();
  let log = "";
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Vite did not start in ${root}: ${log.slice(-400)}`)), 60000);
    const on = (d) => {
      log += d;
      if (/ready in|Local:/i.test(log)) {
        clearTimeout(t);
        resolve();
      }
    };
    child.stdout.on("data", on);
    child.stderr.on("data", on);
    child.once("exit", (code) => {
      clearTimeout(t);
      children.delete(child);
      servers.delete(root);
      reject(new Error(`Vite exited (${code}) in ${root}: ${log.slice(-400)}`));
    });
  });
  return port;
}

export const isVite = (root) => ["vite.config.ts", "vite.config.js", "vite.config.mjs"].some((f) => fs.existsSync(path.join(root, f)));

/** Serve `dir` (default: the project) and return its base URL. A Vite page runs its dev server (live reload). */
export async function serveDir(dir) {
  const root = path.resolve(projectDir(), dir || ".");
  if (!fs.existsSync(root)) throw new Error(`No folder ${root}`);
  if (!servers.has(root)) {
    const p = isVite(root) ? startVite(root) : start(root);
    p.catch(() => servers.delete(root));
    servers.set(root, p);
  }
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
