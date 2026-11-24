// A tiny local web server for live boards: http://localhost:<port>/b/<id>
// The user stars / removes / annotates; board_read hands that feedback to Claude.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { projectDir } from "../../core/paths.mjs";
import { SECRET_FILE } from "../project/scan.mjs";
import { loadBoard, updateBoard } from "./store.mjs";
import { recordFeedback } from "../../core/memory.mjs";
import { renderBoard } from "./render.mjs";

let server = null;
let port = null;

export async function ensureServer(preferredPort) {
  if (server) return port;
  for (let p = preferredPort; p < preferredPort + 20; p++) {
    const ok = await new Promise((resolve) => {
      const s = http.createServer(handle);
      s.once("error", () => resolve(false));
      s.listen(p, "127.0.0.1", () => {
        server = s;
        port = p;
        resolve(true);
      });
    });
    if (ok) return port;
  }
  throw new Error(`No free port for the board server near ${preferredPort}`);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" };

/** /b/<id>/file/<project-relative path>: an image an item points at, only from inside the project and never a secret file. */
function serveItemFile(req, res) {
  const m = req.url.match(/^\/b\/([a-z0-9-]+)\/file\/([^?]+)/);
  if (!m) return false;
  const rel = decodeURIComponent(m[2]);
  const root = projectDir();
  const abs = path.resolve(root, rel);
  const ext = path.extname(abs).toLowerCase();
  if (!loadBoard(m[1]) || !MIME[ext] || !abs.startsWith(root + path.sep) || SECRET_FILE.test(path.basename(abs)) || !fs.existsSync(abs)) {
    res.writeHead(404, { "content-type": "text/plain" }).end("No such file");
    return true;
  }
  res.writeHead(200, { "content-type": MIME[ext], "cache-control": "no-store" }).end(fs.readFileSync(abs));
  return true;
}

async function handle(req, res) {
  if (serveItemFile(req, res)) return;
  const m = req.url.match(/^\/b\/([a-z0-9-]+)(\/feedback|\/data)?\/?$/);
  const board = m && loadBoard(m[1]);
  if (!board) {
    res.writeHead(404, { "content-type": "text/plain" }).end("No such board");
    return;
  }
  if (m[2] === "/feedback" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const entry = JSON.parse(body);
      // Revision-checked write: a second session's change to the same board is never overwritten.
      const after = updateBoard(
        board.id,
        (b) => {
          b.feedback.push(entry);
          const item = b.items.find((it) => it.key === entry.key);
          if (item && entry.action === "star") item.starred = !!entry.value;
          if (item && entry.action === "remove") item.removed = true;
          if (item && entry.action === "note") item.userNote = entry.value;
        },
        { op: entry.action, summary: String(entry.key || "") },
      );
      // The user's own action is evidence of their taste: kept in .drip/memory/feedback.jsonl (a typed note is explicit, a star or removal is a selection).
      try {
        const item = after.items.find((it) => it.key === entry.key);
        recordFeedback({ scope: after.scope === "master" ? "brand" : "feature", board: after.id, kind: entry.action, source: entry.action === "note" ? "user-explicit" : "user-selection", target: entry.key, text: `${entry.action} ${item?.title || entry.key}${entry.action === "note" ? `: ${entry.value}` : ""}` });
      } catch {
        /* evidence is best effort */
      }
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }
  if (m[2] === "/data") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(board));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(await renderBoard(board, { mode: "live" }));
}

/** Stop the live board server (tests, shutdown). */
export function closeServer() {
  server?.close();
  server = null;
  port = null;
}
