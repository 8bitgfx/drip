// Niche packs: Drip specialised for one niche (written by /drip:adapt).
//   ~/.drip/packs/<id>/          personal
//   <project>/.drip/packs/<id>/  shared with the team (wins over personal)
// Each pack: pack.json + guide.md, genres.md, artists.md, queries.md, critic.md, refs.json, slop.json, catalogue.json
import fs from "node:fs";
import path from "node:path";
import { ensureDir, homeDripDir, projectDripDir } from "./paths.mjs";

export const PACK_FILES = ["guide.md", "genres.md", "artists.md", "queries.md", "critic.md", "sources.md", "refs.json", "slop.json", "catalogue.json"];

function roots(cwd) {
  return [path.join(projectDripDir(cwd), "packs"), path.join(homeDripDir, "packs")];
}

export function packDir(id, cwd) {
  for (const r of roots(cwd)) if (fs.existsSync(path.join(r, id, "pack.json"))) return path.join(r, id);
  return null;
}

export function listPacks(cwd) {
  const out = new Map();
  for (const r of roots(cwd).reverse()) {
    if (!fs.existsSync(r)) continue;
    for (const id of fs.readdirSync(r)) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(r, id, "pack.json"), "utf8"));
        out.set(id, { ...meta, id, dir: path.join(r, id), shared: r.startsWith(projectDripDir(cwd)) });
      } catch {
        /* not a pack */
      }
    }
  }
  return [...out.values()];
}

export function createPack({ id, name, niche, keywords, summary, shared }, cwd) {
  const dir = ensureDir(path.join(shared ? path.join(projectDripDir(cwd), "packs") : path.join(homeDripDir, "packs"), id));
  const file = path.join(dir, "pack.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const meta = { ...prev, id, name, niche, keywords, summary, createdAt: prev.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(meta, null, 2));
  return { ...meta, dir };
}

export function writePackFile(id, file, content, cwd) {
  if (!PACK_FILES.includes(file)) throw new Error(`Pack files are: ${PACK_FILES.join(", ")}`);
  const dir = packDir(id, cwd);
  if (!dir) throw new Error(`No pack "${id}". Create it with pack_create first.`);
  if (file.endsWith(".json")) JSON.parse(content); // validate
  fs.writeFileSync(path.join(dir, file), content);
  const metaFile = path.join(dir, "pack.json");
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return path.join(dir, file);
}

export function readPackFile(id, file, cwd) {
  const dir = packDir(id, cwd);
  if (!dir) return null;
  const f = path.join(dir, file);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

/** Packs whose keywords appear in the text. */
export function matchPacks(text, cwd) {
  const t = text.toLowerCase();
  return listPacks(cwd).filter((p) => (p.keywords || []).some((k) => k && t.includes(String(k).toLowerCase())));
}
