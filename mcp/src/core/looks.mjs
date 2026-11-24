// What Drip has already made: the faces and palette of every locked direction, across ALL projects
// (~/.drip/looks.jsonl). Agents drift to the same few faces and colours; board_directions checks new
// directions against this history so a new project doesn't quietly repeat the last five.
import path from "node:path";
import { appendJsonl, readJsonl } from "./jsonstore.mjs";
import { homeDripDir, projectDir } from "./paths.mjs";

export const looksFile = () => path.join(homeDripDir, "looks.jsonl");

// Faces agents reach for once the first-tier defaults (Inter, Geist, Space Grotesk…) are banned. Allowed, but each
// needs a reason tied to the subject (typeReason), and never the same one twice in a row across projects.
// The AI tells: faces agents reach for once Inter is banned, which make every page look the same model made it.
// Clean premium sans faces (Satoshi, General Sans, Manrope, Plus Jakarta...) are not here: polished pages use them well.
export const OVERUSED_FACES = [
  "Bricolage Grotesque", "Instrument Serif", "Fraunces", "Syne", "Clash Display", "Space Grotesk", "DM Serif Display",
  "Playfair Display", "Cormorant Garamond", "Anybody", "Big Shoulders Display", "Climate Crisis", "Dela Gothic One",
];

const norm = (f) => f.toLowerCase().replace(/\b(variable|vf)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** "Fraunces 600 + Söhne" -> ["Fraunces", "Söhne"] (weights, numbers and roles stripped). */
export function facesOf(type) {
  return String(type || "")
    .split(/\s*(?:\+|\/|,|&|\bwith\b|\band\b)\s*/i)
    .map((s) => s.replace(/\b(\d{3}|regular|medium|bold|semibold|light|italic|display|text|mono for (data|labels|numbers))\b/gi, "").replace(/\(.*?\)/g, "").trim())
    .filter((s) => s.length > 1);
}

export const sameFace = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `));
};

export function isOverused(face, list = OVERUSED_FACES) {
  return list.some((o) => sameFace(o, face));
}

/** Recent looks, newest first. */
export function recentLooks(n = 5) {
  return readJsonl(looksFile()).slice(-n).reverse();
}

export function recordLook({ direction, type, palette, task, board }) {
  appendJsonl(looksFile(), { at: new Date().toISOString(), project: projectDir(), task, board, direction, faces: facesOf(type), palette: (palette || []).slice(0, 4) });
}

function rgb(hex) {
  const h = String(hex).replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(f, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Rough perceptual distance (redmean), 0..~765. */
export function colourDistance(a, b) {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return Infinity;
  const r = (x[0] + y[0]) / 2;
  const [dr, dg, db] = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
  return Math.sqrt((2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db);
}

/** Same ground AND same accent as a recent look = the same page again. Palettes are in role order: ground, ink, accent… */
export function samePalette(p, q) {
  if (!p?.length || !q?.length) return false;
  const ground = colourDistance(p[0], q[0]) < 40;
  const accent = p[2] && q[2] ? colourDistance(p[2], q[2]) < 60 : false;
  return ground && accent;
}
