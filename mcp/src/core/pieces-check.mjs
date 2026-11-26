// Is every library piece the director named actually on the page? A piece installed and then hand-made around is the
// commonest way "pieces before homemade" gets dodged. React pages only: the piece is a file under src/components that
// something in src imports.
import fs from "node:fs";
import path from "node:path";
import { projectDir } from "./paths.mjs";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** "https://reactbits.dev/r/AccordionGallery-TS-TW.json" / "@magicui/marquee" -> "accordiongallery" / "marquee". */
export function pieceKey(piece) {
  if (!piece || /^custom/i.test(piece)) return null;
  const last = String(piece).split(/[/@]/).filter(Boolean).pop() || "";
  return norm(last.replace(/\.json$/i, "").replace(/-(TS|JS)-(TW|CSS)$/i, "")) || null;
}

function walk(dir, out = [], depth = 6) {
  if (depth < 0 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out, depth - 1);
    else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) out.push(f);
  }
  return out;
}

/** Blockers for named pieces that aren't installed or aren't imported anywhere on the page. */
export function unusedPieces(task, root = projectDir()) {
  if (!task?.page?.dir || !task.sections) return [];
  const page = path.resolve(root, task.page.dir);
  const src = path.join(page, "src");
  if (!fs.existsSync(path.join(src, "App.tsx"))) return []; // static pages: their parts are copied in, not imported
  const files = walk(src);
  const comps = files.filter((f) => f.includes(`${path.sep}components${path.sep}`));
  const out = [];
  for (const [id, s] of Object.entries(task.sections)) {
    const key = pieceKey(s.piece);
    if (!key || key.length < 4) continue;
    // The piece's file: its name, or its folder (shadcn installs some as components/<name>/index.tsx), or the file names
    // its registry item installed (pieces_install records them: "header3" installs header.tsx).
    const keys = new Set([key, ...(task.pieceFiles?.[s.piece] || []).map(norm).filter((k) => k.length >= 3)]);
    const mine = comps.filter((f) => keys.has(norm(path.basename(f).replace(/\.\w+$/, ""))) || keys.has(norm(path.basename(path.dirname(f)))));
    if (!mine.length) {
      out.push(`piece not on the page: #${id} names ${s.piece}, but no ${key} component is installed under src/components (pieces_install it, or name what the section really uses)`);
      continue;
    }
    const names = new Set(mine.map((f) => (path.basename(f).startsWith("index.") ? path.basename(path.dirname(f)) : path.basename(f).replace(/\.\w+$/, ""))));
    const used = files.some((f) => !mine.includes(f) && [...names].some((n) => new RegExp(`from\\s+["'][^"']*/${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/index)?["']`).test(fs.readFileSync(f, "utf8"))));
    if (!used) out.push(`piece not on the page: #${id} names ${s.piece}, it is installed (${[...names].join(", ")}) but nothing imports it, so the section was hand-made around it. Use the piece, or say why it doesn't fit`);
  }
  return out;
}
