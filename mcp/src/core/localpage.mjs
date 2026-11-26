// Local pages the user opens in a browser (API keys, settings): 127.0.0.1 only, a random token in every URL
// and form so other local pages can't post to them, closed after `ttlMs`. Also: opening a URL in the browser.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

/**
 * Serves one page. `handle({ url, form, token, send })` answers every request that carries the token;
 * `form` is the POST body as URLSearchParams (null on GET) and `send(html)` writes the page.
 * Returns { url, token, close }. `onClose` runs when the page closes (ttl or close()).
 */
export async function servePage(handle, { ttlMs = 30 * 60 * 1000, onClose } = {}) {
  const token = crypto.randomBytes(16).toString("hex");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.searchParams.get("t") !== token) return res.writeHead(403).end("Forbidden");
    const send = (html) => res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" }).end(html);
    let form = null;
    if (req.method === "POST") {
      let body = "";
      for await (const c of req) body += c;
      form = new URLSearchParams(body);
    }
    await handle({ url, form, token, send });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const page = {
    token,
    url: `http://127.0.0.1:${server.address().port}/?t=${token}`,
    close() {
      server.close();
      onClose?.();
    },
  };
  if (ttlMs) setTimeout(page.close, ttlMs).unref();
  return page;
}

/** Opens a URL in the user's default browser (not in tests or CI). Returns whether it tried. */
export function openInBrowser(url) {
  if (process.env.DRIP_NO_OPEN || process.env.CI) return false;
  try {
    const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
    return true;
  } catch {
    return false;
  }
}
