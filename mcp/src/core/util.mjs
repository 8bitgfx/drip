// Small helpers used across the server. Node built-ins only, so hooks may import it too.
import crypto from "node:crypto";
import path from "node:path";

const HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML (body and quoted attributes). null and undefined become "". */
export const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => HTML[c]);

/** A file-system and URL safe id: lower case, runs of other characters become "-", trimmed, cut to `max`. */
export function slug(s, { max = 48, fallback = "" } = {}) {
  const out = String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
  return out || fallback;
}

/** sha1 of a string or buffer, hex; `len` cuts it. */
export const sha1 = (data, len) => {
  const hex = crypto.createHash("sha1").update(data).digest("hex");
  return len ? hex.slice(0, len) : hex;
};

/** A path with forward slashes (for messages, JSON and URLs on Windows). */
export const fwd = (p) => String(p).replace(/\\/g, "/");

/** `abs` relative to `root`, with forward slashes. */
export const relPath = (root, abs) => path.relative(root, abs).split(path.sep).join("/");

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** Decodes HTML entities (named, decimal and hex). */
export function decodeHtml(s = "") {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Text of an HTML fragment: tags dropped, whitespace collapsed, entities decoded. */
export const stripTags = (html = "") => decodeHtml(String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
