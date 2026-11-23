// A tiny local web server for live boards: http://localhost:<port>/b/<id>
// The user stars / removes / annotates; board_read hands that feedback to Claude.
import http from "node:http";
import { loadBoard, saveBoard } from "./store.mjs";
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

async function handle(req, res) {
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
      board.feedback.push(entry);
      const item = board.items.find((it) => it.key === entry.key);
      if (item && entry.action === "star") item.starred = !!entry.value;
      if (item && entry.action === "remove") item.removed = true;
      if (item && entry.action === "note") item.userNote = entry.value;
      saveBoard(board);
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
