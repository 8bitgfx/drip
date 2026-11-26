// Is every library piece the director named actually on the page? A piece installed and then hand-made around is the
// commonest way "pieces before homemade" gets dodged. React pages only: the piece is a file under src/components that
// something in src imports.
import fs from "node:fs";
import path from "node:path";
import { projectDir } from "./paths.mjs";
import { relPath, sha1 } from "./util.mjs";

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

/** sha1 of every component file of a page, keyed by its path from `base` (the project): what pieces_install compares. */
export function componentHashes(pageRoot, base = projectDir()) {
  const out = {};
  for (const f of walk(path.join(pageRoot, "src", "components"))) out[relPath(base, f)] = sha1(fs.readFileSync(f));
  return out;
}

/** Demo effects that often don't fit the page: big shadows, hover shadows, lifts and scales, rings. Worth a decision. */
export const DEMO_EFFECTS = /\b(?:hover:)?shadow-(?:md|lg|xl|2xl)\b|\bhover:(?:-?translate-y-[\w.[\]]+|scale-1\d\d)\b|\bring-[1-4]\b/g;

/** Type sizes a piece brings with it (Tailwind's own steps and px values): the page's type roles replace them. */
export const DEMO_SIZES = /\b(?:[a-z]+:)?text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d+(?:\.\d+)?(?:px|rem)\])(?![\w-])/g;

/** Tailwind palette classes a library ships its demos in; a restyled piece uses the page's tokens instead. */
export const DEMO_COLOURS = /\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|divide)-(?:zinc|slate|gray|neutral|stone|blue|indigo|violet|purple|sky)-\d{2,3}\b/g;

/** Blockers for named pieces that aren't installed, aren't imported anywhere on the page, or kept their demo colours. */
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

/** The pieces on the page that are worth a second look, as notes (never blockers): an unchanged piece, demo colours,
 *  demo effects. Keeping them is fine when they fit the page; the point is that someone decided. */
export function pieceReview(task, root = projectDir()) {
  const out = [];
  for (const { id, piece, names, mine } of piecesOnPage(task, root)) {
    const unchanged = task.installed && mine.every((f) => task.installed[relPath(root, f)] === sha1(fs.readFileSync(f)));
    const effects = [...new Set(mine.flatMap((f) => fs.readFileSync(f, "utf8").match(DEMO_EFFECTS) || []))];
    const colours = [...new Set(mine.flatMap((f) => fs.readFileSync(f, "utf8").match(DEMO_COLOURS) || []))];
    const sizes = [...new Set(mine.flatMap((f) => fs.readFileSync(f, "utf8").match(DEMO_SIZES) || []))];
    const bits = [effects.length ? `effects ${effects.slice(0, 4).join(", ")}` : "", colours.length >= 3 ? `demo colours ${colours.slice(0, 4).join(", ")}` : "", sizes.length >= 2 ? `its own type sizes ${sizes.slice(0, 5).join(", ")} (use the page's type roles)` : ""].filter(Boolean);
    if (unchanged || bits.length)
      out.push(`#${id} (${[...names].join(", ") || piece})${unchanged ? " is unchanged from the library" : ""}${bits.length ? `${unchanged ? ", with" : " still has"} ${bits.join("; ")}` : ""}: keep what fits this page, change what doesn't (its other cards, buttons and hover are the measure)`);
  }
  return out;
}

/** The named pieces that are installed and imported: { id, piece, names, mine }. */
function piecesOnPage(task, root) {
  if (!task?.page?.dir || !task.sections) return [];
  const src = path.join(path.resolve(root, task.page.dir), "src");
  if (!fs.existsSync(path.join(src, "App.tsx"))) return [];
  const files = walk(src);
  const comps = files.filter((f) => f.includes(`${path.sep}components${path.sep}`));
  const out = [];
  for (const [id, s] of Object.entries(task.sections)) {
    const key = pieceKey(s.piece);
    if (!key || key.length < 4) continue;
    const keys = new Set([key, ...(task.pieceFiles?.[s.piece] || []).map(norm).filter((k) => k.length >= 3)]);
    const mine = comps.filter((f) => keys.has(norm(path.basename(f).replace(/\.\w+$/, ""))) || keys.has(norm(path.basename(path.dirname(f)))));
    if (!mine.length) continue;
    const names = new Set(mine.map((f) => (path.basename(f).startsWith("index.") ? path.basename(path.dirname(f)) : path.basename(f).replace(/\.\w+$/, ""))));
    out.push({ id, piece: s.piece, names, mine });
  }
  return out;
}

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "public", ".git", ".drip", ".next", ".vite"]);

/** The page's code files before an install: path (from the page root, with /) -> content. */
export function installSnapshot(pageRoot) {
  const out = {};
  const visit = (dir, depth) => {
    if (depth < 0 || !fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      const f = path.join(dir, e.name);
      if (e.isDirectory()) visit(f, depth - 1);
      else if (/\.(tsx|ts|jsx|js|css)$/.test(e.name) && fs.statSync(f).size < 400_000) out[path.relative(pageRoot, f).split(path.sep).join("/")] = fs.readFileSync(f, "utf8");
    }
  };
  visit(pageRoot, 7);
  return out;
}

/** A file with nothing in it: empty, only whitespace or comments, or an export of nothing. */
export const isStub = (s) => !String(s).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/export\s*\{\s*\}\s*;?/g, "").trim();

/**
 * Tidy what an install left behind (registry items that ship empty placeholder files or write to the wrong root):
 * a new empty file is removed; a page file the install emptied gets its content back; a new code file outside src/
 * (a stray components/ folder at the page root) moves to the same path under src/ when that is free, else is removed as a
 * duplicate; folders left empty go. Returns what it did, in words.
 */
export function tidyInstall(pageRoot, before) {
  const after = installSnapshot(pageRoot);
  const done = [];
  const abs = (rel) => path.join(pageRoot, ...rel.split("/"));
  const emptied = new Set();
  for (const [rel, text] of Object.entries(after)) {
    const was = before[rel];
    if (was === undefined && isStub(text)) {
      fs.rmSync(abs(rel), { force: true });
      emptied.add(path.dirname(abs(rel)));
      done.push(`removed the empty file ${rel}`);
    } else if (was !== undefined && !isStub(was) && isStub(text)) {
      fs.writeFileSync(abs(rel), was);
      done.push(`restored ${rel} (the install emptied it)`);
    } else if (was === undefined && !/^src\//.test(rel) && /\.(tsx|ts|jsx|js|css)$/.test(rel) && !/^[^/]+\.(c|m)?(js|ts)$/.test(rel)) {
      const target = `src/${rel}`;
      if (after[target] === undefined) {
        fs.mkdirSync(path.dirname(abs(target)), { recursive: true });
        fs.renameSync(abs(rel), abs(target));
        done.push(`moved ${rel} to ${target}`);
      } else if (after[target] === text) {
        fs.rmSync(abs(rel), { force: true });
        done.push(`removed ${rel} (a copy of ${target})`);
      } else {
        done.push(`left ${rel}: it is outside src/ and differs from ${target}; merge or delete it`);
      }
      emptied.add(path.dirname(abs(rel)));
    }
  }
  // Folders the install made and left empty (a stray components/ at the root), up to the page root.
  for (let d of emptied) {
    while (d.startsWith(pageRoot) && d !== pageRoot && fs.existsSync(d) && !fs.readdirSync(d).length) {
      fs.rmdirSync(d);
      d = path.dirname(d);
    }
  }
  return done;
}
