// Shared helpers for host installers: where things are, backups, safe JSON merges, marked text blocks,
// copying transformed skills. Nothing here touches a real home folder unless the caller passes it.
// Everything works on Windows, macOS and Linux; paths are built with node:path and the injected `home` / `env`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJsonAtomic } from "../core/jsonstore.mjs";
import { fwd } from "../core/util.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The plugin root = the repo (or installed plugin) that holds skills/, hooks/ and mcp/. */
export function defaultPluginRoot() {
  return path.resolve(here, "..", "..", "..");
}

/** Normalise install options. `home` and `env` are injectable so tests never touch the real machine. */
export function resolveOpts(opts = {}) {
  const home = path.resolve(opts.home || os.homedir());
  return {
    pluginRoot: opts.template ? opts.pluginRoot : path.resolve(opts.pluginRoot || defaultPluginRoot()),
    home,
    env: opts.env || process.env,
    platform: opts.platform || process.platform,
    dryRun: !!opts.dryRun,
    project: opts.project ? path.resolve(opts.project) : null,
    variant: opts.variant || null,
    node: opts.node || "node",
    template: !!opts.template,
  };
}

/** Forward slashes are valid in every host config and survive JSON/TOML escaping. */
export { fwd };

/** Join under the plugin root. In template mode (generated packages) the root is a placeholder like ${PLUGIN_ROOT}. */
export const J = (o, ...parts) => fwd(o.template ? [o.pluginRoot, ...parts].join("/") : path.join(o.pluginRoot, ...parts));
export const serverFile = (o) => J(o, "mcp", "dist", "drip-mcp.mjs");
export const hookFile = (o, name) => J(o, "hooks", "hosts", `${name}.mjs`);

// ---- recording what an install did, so uninstall removes exactly that ----

export function manifestPath(o, id) {
  return path.join(o.home, ".drip", "hosts", `${id}.json`);
}

export class Changes {
  constructor(o, id) {
    this.o = o;
    this.id = id;
    this.files = []; // { path, kind: "file"|"dir"|"block"|"entry", ... }
    this.backups = [];
    this.actions = [];
  }

  note(msg) {
    this.actions.push(msg);
  }

  /** Copy a file aside before the first change to it. */
  backup(file) {
    if (this.o.dryRun || !fs.existsSync(file) || this.backups.some((b) => b.file === file)) return;
    const copy = `${file}.drip-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.copyFileSync(file, copy);
    this.backups.push({ file, copy });
  }

  write(file, content, { executable = false } = {}) {
    this.note(`write ${file}`);
    if (this.o.dryRun) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, executable ? { mode: 0o755 } : undefined);
  }

  track(entry) {
    this.files.push(entry);
  }

  save(extra = {}) {
    if (this.o.dryRun) return;
    const file = manifestPath(this.o, this.id);
    const prev = readJson(file, {});
    writeJsonAtomic(file, {
      host: this.id,
      installedAt: prev.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pluginRoot: this.o.pluginRoot,
      files: mergeTracked(prev.files || [], this.files),
      backups: [...(prev.backups || []), ...this.backups],
      ...extra,
    });
  }
}

function mergeTracked(a, b) {
  const key = (e) => `${e.kind}:${e.path}:${e.name || ""}`;
  const map = new Map(a.map((e) => [key(e), e]));
  for (const e of b) map.set(key(e), e);
  return [...map.values()];
}

export const readManifest = (o, id) => readJson(manifestPath(o, id), null);

// ---- JSON config merge (mcp.json, claude_desktop_config.json, hooks.json, opencode.json) ----

/** Read a JSON config; a missing file is {}. A file that exists but does not parse throws (never overwrite it). */
export function readConfig(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} is not valid JSON (${e.message}). Fix or move it, then run install again; Drip never overwrites a file it cannot read.`);
  }
}

export function writeConfig(ch, file, data) {
  ch.backup(file);
  ch.write(file, `${JSON.stringify(data, null, 2)}\n`);
}

/** Is this server entry Drip's own (so install may update it and uninstall may remove it)? */
export function isDripServer(entry) {
  const parts = [entry?.command, ...(Array.isArray(entry?.command) ? entry.command : []), ...(entry?.args || [])].filter((x) => typeof x === "string");
  return parts.some((p) => /drip-mcp\.mjs$/i.test(p.replace(/\\/g, "/")));
}

/** Set obj[key] = value unless a foreign entry is there. Returns "added" | "updated" | "conflict". */
export function setOwned(obj, key, value, isOwned = isDripServer) {
  if (obj[key] !== undefined && !isOwned(obj[key])) return "conflict";
  const had = obj[key] !== undefined;
  obj[key] = value;
  return had ? "updated" : "added";
}

// ---- marked text blocks (TOML, markdown) ----

export const BLOCK_START = (label = "drip") => `# >>> ${label} (managed by drip; remove with: drip uninstall) >>>`;
export const BLOCK_END = (label = "drip") => `# <<< ${label} <<<`;
const MD_START = "<!-- >>> drip (managed by drip; remove with: drip uninstall) >>> -->";
const MD_END = "<!-- <<< drip <<< -->";

function markers(kind) {
  return kind === "md" ? [MD_START, MD_END] : [BLOCK_START(), BLOCK_END()];
}

/** Insert or replace Drip's marked block in a text file's content. Returns the new content. */
export function upsertBlock(content, body, kind = "toml") {
  const [s, e] = markers(kind);
  const block = `${s}\n${body.replace(/\s+$/, "")}\n${e}\n`;
  const i = content.indexOf(s);
  const j = content.indexOf(e);
  if (i >= 0 && j > i) return `${content.slice(0, i)}${block}${content.slice(j + e.length).replace(/^\r?\n/, "")}`;
  const sep = content && !content.endsWith("\n") ? "\n\n" : content ? "\n" : "";
  return `${content}${sep}${block}`;
}

export function removeBlock(content, kind = "toml") {
  const [s, e] = markers(kind);
  const i = content.indexOf(s);
  const j = content.indexOf(e);
  if (i < 0 || j < i) return { content, removed: false };
  const before = content.slice(0, i).replace(/\n+$/, "\n");
  const after = content.slice(j + e.length).replace(/^\r?\n/, "");
  return { content: `${before}${after}`.replace(/^\n+/, ""), removed: true };
}

export const hasBlock = (content, kind = "toml") => content.includes(markers(kind)[0]);

export function writeBlockFile(ch, file, body, kind) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  ch.backup(file);
  ch.write(file, upsertBlock(cur, body, kind));
  ch.track({ kind: "block", path: file, style: kind });
}

// ---- skills ----

export const SKILL_MARK = ".drip-managed";

/** Copy a tree, passing text files through `transform(relPath, text)`. */
export function copyTree(src, dest, transform, { skip = () => false } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip(ent.name)) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyTree(s, d, transform, { skip });
    else if (transform && /\.(md|mdc|txt)$/i.test(ent.name)) fs.writeFileSync(d, transform(path.relative(src, s), fs.readFileSync(s, "utf8")));
    else fs.copyFileSync(s, d);
  }
}

/** Install Drip's skills into `dir` (one folder per skill, marked so uninstall removes only these). */
export function installSkills(ch, dir, transform) {
  const src = path.join(ch.o.pluginRoot, "skills");
  const names = fs.readdirSync(src, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(src, e.name, "SKILL.md"))).map((e) => e.name);
  for (const name of names) {
    const dest = path.join(dir, name);
    if (fs.existsSync(dest) && !fs.existsSync(path.join(dest, SKILL_MARK))) {
      ch.note(`skip skill ${name}: ${dest} exists and is not Drip's`);
      continue;
    }
    ch.note(`skill ${name} -> ${dest}`);
    if (!ch.o.dryRun) {
      fs.rmSync(dest, { recursive: true, force: true });
      copyTree(path.join(src, name), dest, (rel, text) => (rel === "SKILL.md" || rel.endsWith(".md") ? transform(text) : text));
      fs.writeFileSync(path.join(dest, SKILL_MARK), "Installed by drip. Remove with: drip uninstall\n");
    }
    ch.track({ kind: "dir", path: dest });
  }
  return names;
}

/** Undo what a manifest recorded. Returns a list of what was removed. */
export function undoManifest(o, id, handlers = {}) {
  const man = readManifest(o, id);
  const removed = [];
  if (!man) return { removed, found: false };
  for (const e of man.files) {
    try {
      if (e.kind === "dir" && fs.existsSync(path.join(e.path, SKILL_MARK))) {
        if (!o.dryRun) fs.rmSync(e.path, { recursive: true, force: true });
        removed.push(e.path);
      } else if (e.kind === "file" && fs.existsSync(e.path)) {
        if (!o.dryRun) fs.rmSync(e.path, { force: true });
        removed.push(e.path);
      } else if (e.kind === "block" && fs.existsSync(e.path)) {
        const r = removeBlock(fs.readFileSync(e.path, "utf8"), e.style);
        if (r.removed) {
          if (!o.dryRun) {
            if (r.content.trim()) fs.writeFileSync(e.path, r.content);
            else fs.rmSync(e.path, { force: true });
          }
          removed.push(`${e.path} (Drip block)`);
        }
      } else if (e.kind === "entry" && handlers[e.handler]) {
        if (handlers[e.handler](e)) removed.push(`${e.path} (${e.name})`);
      }
    } catch (err) {
      removed.push(`${e.path}: not removed (${err.message})`);
    }
  }
  if (!o.dryRun) fs.rmSync(manifestPath(o, id), { force: true });
  return { removed, found: true };
}

/** JSON entry removal helper: delete obj-path key when it is Drip's. */
export function removeJsonEntry(file, locate, dryRun, isOwned = isDripServer) {
  if (!fs.existsSync(file)) return false;
  const cfg = readConfig(file);
  const holder = locate(cfg);
  if (!holder) return false;
  const [obj, key] = holder;
  if (obj?.[key] === undefined || !isOwned(obj[key])) return false;
  if (dryRun) return true;
  delete obj[key];
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
  return true;
}

export function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

