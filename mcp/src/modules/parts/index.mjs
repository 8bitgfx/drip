// Ready-made eye candy from taste-skill (github.com/Leonxlnx/taste-skill, MIT): shader grounds, award-site scroll scenes,
// moments, live UI fragments, creative feature cards, pulsing diagrams, printed objects and hero layouts. Pinned and cloned
// into ~/.drip/vendor/taste-skill on first use. Every tool takes several items at once: list, look, copy in one call each.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { blocks, safe, text } from "../../core/result.mjs";
import { get } from "../../core/http.mjs";
import { readJson } from "../../core/jsonstore.mjs";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { screenshot } from "../../core/chrome.mjs";
import { serveDir } from "../../core/serve.mjs";
import { projectDir } from "../../core/paths.mjs";
import { vendor0 } from "../../core/setup.mjs";
import { updateState } from "../../core/state.mjs";
import { dealPieces, formatPieces, ownedKits, saveKits } from "./pieces.mjs";
import { filmRecord } from "../film/record.mjs";
import { ensureInstalled, isReactPage, scaffoldReact, sh } from "./react.mjs";

export const TASTE = { repo: "https://github.com/Leonxlnx/taste-skill.git", sha: "6c0b5c78f5d31776e2210305abaa210cdc0030bf" };
export const tasteDir = () => path.join(vendor0(), "taste-skill");
export const tasteAssets = () => path.join(tasteDir(), "skills", "taste-skill", "assets");
export const tasteReady = () => fs.existsSync(path.join(tasteAssets(), "effects", "index.json"));

const run = (file, args, opts = {}) =>
  new Promise((res, rej) => execFile(file, args, { windowsHide: true, maxBuffer: 1 << 26, ...opts }, (e, out, err) => (e ? rej(new Error(`${file} ${args[0]}: ${String(err || e.message).slice(0, 300)}`)) : res(out))));

let installing = null;
/** Clone the pinned taste-skill once (a plain git clone of a public MIT repo, ~40 MB). */
export async function installTaste() {
  if (tasteReady()) return tasteDir();
  installing ||= (async () => {
    const dir = tasteDir();
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    if (!fs.existsSync(path.join(dir, ".git"))) await run("git", ["clone", "--filter=blob:none", "--quiet", TASTE.repo, dir]);
    await run("git", ["-C", dir, "fetch", "--quiet", "origin", TASTE.sha]).catch(() => {});
    await run("git", ["-C", dir, "checkout", "--quiet", "--force", TASTE.sha]);
    return dir;
  })().finally(() => (installing = null));
  return installing;
}

// family -> where its items live, which file previews it, which reference explains mounting it.
export const FAMILIES = {
  effect: { dir: "effects", ref: "effects-usage.md", about: "shader grounds for a hero frame, a card or a band (WebGL, palette from the page)" },
  scene: { dir: "scenes", ref: "scenes.md", about: "award-site scroll scenes (powers-of-ten pullback, object through giant type...)" },
  moment: { dir: "moments", ref: "moments.md", about: "one dealt moment per page: word highlight, pinned chapters, counter rolls, liquid hover..." },
  ui: { dir: "ui", ref: "cards.md", file: "fragment", about: "live product UI fragments to paste and rewrite (chat, diff review, pipeline board, terminal...)" },
  component: { dir: "components", ref: "effects-creative.md", file: "component", about: "creative feature cards (globe, map, chart, spotlight, pricing, prompt...)" },
  diagram: { dir: "diagrams", ref: "diagrams.md", about: "pulsing diagram cards (hub with branches, lanes, ring of apps)" },
  object: { dir: "objects", ref: "effects-objects.md", about: "printed and rendered objects (dot object, exploded layers, product turntable, halftone photo)" },
  hero: { dir: "layout", ref: "layout-v4.md", about: "hero layouts (centred, split, collage, film, product, statement, word...)" },
};

const describe = (m) => String(m.look || m.for || m.shows || m.job || m.what || m.title || m.name || "").replace(/\s+/g, " ");

/** Every item of a family: { id, name, about, demo } from its index or its folders' meta.json. */
export function familyItems(family) {
  const F = FAMILIES[family];
  const root = path.join(tasteAssets(), F.dir);
  if (!fs.existsSync(root)) return [];
  if (family === "effect") return (readJson(path.join(root, "index.json"))?.effects || []).map((e) => ({ id: e.id, name: e.name, about: describe(e), tags: [e.family, ...(e.bestOn || [])].join(" ") }));
  if (family === "diagram") return Object.entries(readJson(path.join(root, "presets.json"))?.presets || {}).map(([id, p]) => ({ id, name: id, about: describe(p) || `${p.layout || ""} diagram` }));
  if (family === "hero")
    return ((j) => (Array.isArray(j) ? j : j?.heroes || []))(readJson(path.join(root, "heroes.json"))).map((h) => ({ id: h.id, name: h.name, about: describe(h), demo: h.demo ? path.join(root, h.demo) : null }));
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && fs.existsSync(path.join(root, d.name, "meta.json")))
    .map((d) => {
      const m = readJson(path.join(root, d.name, "meta.json")) || {};
      const demo = ["demo.html", "index.html"].map((f) => path.join(root, d.name, f)).find((f) => fs.existsSync(f)) || null;
      return { id: m.id || m.name || d.name, folder: d.name, name: m.title || m.name || d.name, about: describe(m), tags: [...(m.useFor || []), ...(m.bestOn || [])].join(" "), demo };
    });
}

const score = (it, words) => words.reduce((s, w) => s + (`${it.id} ${it.name} ${it.about} ${it.tags || ""}`.toLowerCase().includes(w) ? 1 : 0), 0);

/** A preview page for items without a demo of their own, written beside the family's files (our vendor folder). */
function previewPage(family, it) {
  const F = FAMILIES[family];
  const root = path.join(tasteAssets(), F.dir);
  const file = path.join(root, `_drip_${family}_${it.id}.html`);
  const palette = ":root{--bg:#0B0C10;--surface:#15171D;--ink:#F2F3F5;--muted:#9AA0AA;--accent:#5B8CFF;--accent-ink:#0B0C10}body{margin:0;background:var(--bg);color:var(--ink);font:16px system-ui}";
  let body = "";
  if (family === "effect")
    body = `<style>${palette}.f{position:relative;isolation:isolate;width:100vw;height:100vh}</style><div class="f" data-fx="${it.id}" data-fx-seed="7"></div><script type="module">import fx from './fx.js';fx.mountAll(document);</script>`;
  else if (family === "diagram")
    body = `<style>${palette}.panel{width:900px;margin:80px auto;padding:40px;background:var(--surface);border-radius:20px}</style><div class="panel"><div class="dg" data-diagram="${it.id}"></div></div><link rel="stylesheet" href="./diagram.css"><script type="module" src="./mount.js"></script>`;
  else {
    const dir = path.join(root, it.folder || it.id);
    const index = fs.existsSync(path.join(root, "index.html")) ? fs.readFileSync(path.join(root, "index.html"), "utf8") : "";
    const head = index.includes("</head>") ? index.slice(0, index.indexOf("</head>")).replace(/<script[\s\S]*?<\/script>/g, "") : `<!doctype html><html><head><meta charset="utf-8"><style>${palette}</style>`;
    const html = fs.existsSync(path.join(dir, `${F.file}.html`)) ? fs.readFileSync(path.join(dir, `${F.file}.html`), "utf8") : "";
    const lib = ["ui.js", "shared.js"].filter((f) => fs.existsSync(path.join(root, f))).map((f) => `<script type="module" src="./${f}"></script>`).join("");
    return (
      fs.writeFileSync(
        file,
        `${head}<link rel="stylesheet" href="./${it.folder || it.id}/${F.file}.css"></head><body><div style="max-width:1100px;margin:64px auto;padding:0 32px">${html}</div>${lib}<script type="module" src="./${it.folder || it.id}/${F.file}.js"></script></body></html>`,
      ),
      file
    );
  }
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`);
  return file;
}

const ITEM = z.object({ kind: z.enum(Object.keys(FAMILIES)), id: z.string() });

export function register(server, ctx) {
  registerDeal(server, ctx);
  server.registerTool(
    "parts_list",
    {
      title: "Browse ready-made eye candy",
      description:
        "Lists taste-skill's plain-HTML pieces (called parts), every family in ONE call by default: shader effects, scroll scenes, moments, live UI fragments, creative feature cards, diagram cards, objects and hero layouts. " +
        "For static pages; React pages use components_find / pieces_preview / pieces_install. Then parts_preview the candidates and parts_get the ones you use. Installs the library on first use (one git clone).",
      inputSchema: {
        kinds: z.array(z.enum(Object.keys(FAMILIES))).optional().describe("Default: every family"),
        query: z.string().optional().describe("Words to rank by, e.g. 'globe network', 'chat assistant', 'scroll reveal'"),
        limit: z.number().int().min(1).max(40).optional().describe("Items per family (default 8 with a query, else all)"),
      },
    },
    safe(async ({ kinds, query, limit }) => {
      await installTaste();
      const words = String(query || "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const out = [];
      for (const k of kinds?.length ? kinds : Object.keys(FAMILIES)) {
        let items = familyItems(k);
        if (words.length) items = items.map((it) => ({ it, s: score(it, words) })).sort((a, b) => b.s - a.s).map((x) => x.it);
        items = items.slice(0, limit || (words.length ? 8 : 60));
        out.push(`## ${k} (${FAMILIES[k].about})`, ...items.map((it) => `- ${it.id}: ${it.about.slice(0, 170)}`));
      }
      return text(`${out.join("\n")}\n\nNext: parts_preview({ items: [{ kind, id }, ...] }) to see several at once, parts_get to copy the chosen ones in.`);
    }),
  );

  server.registerTool(
    "parts_preview",
    {
      title: "See several parts at once",
      description: "Renders up to 8 parts in ONE call (each live in Chrome, 1200x750) so you can compare them side by side before choosing. Effects use a neutral dark palette here; on the page they take the page's colours.",
      inputSchema: { items: z.array(ITEM).min(1).max(8) },
    },
    safe(async ({ items }) => {
      await installTaste();
      const base = await serveDir(tasteAssets());
      const content = [];
      const shots = await Promise.all(
        items.map(async ({ kind, id }) => {
          const it = familyItems(kind).find((x) => x.id === id || x.folder === id);
          if (!it) return { kind, id, err: `no ${kind} "${id}" (parts_list)` };
          const file = it.demo || previewPage(kind, it);
          const rel = path.relative(tasteAssets(), file).replace(/\\/g, "/");
          try {
            const png = await screenshot(`${base}/${rel}`, { width: 1200, height: 750, config: ctx.config(), waitMs: 1500 });
            return { kind, id, buf: await toJpeg(png, 800, 800, 78) };
          } catch (e) {
            return { kind, id, err: e.message };
          }
        }),
      );
      for (const s of shots) {
        content.push(textBlock(`${s.kind} ${s.id}${s.err ? `: ${s.err}` : ""}`));
        if (s.buf) content.push(imageBlock(s.buf));
      }
      return blocks(content);
    }),
  );

  server.registerTool(
    "parts_get",
    {
      title: "Copy parts into the project",
      description:
        "Copies the chosen parts (several in one call) into the project with what they need to run (the family's shared scripts and styles, the kit's system.css / motion layer), plus the family's mounting guide as README.md. " +
        "Then rewrite every label, number and name to the client's, and give effects the page's palette (--bg, --surface, --ink, --muted, --accent).",
      inputSchema: {
        items: z.array(ITEM).min(1).max(12),
        out: z.string().optional().describe("Folder for the parts, relative to the project (default: assets beside the page, e.g. saas-award/assets)"),
      },
    },
    safe(async ({ items, out }) => {
      await installTaste();
      const src = tasteAssets();
      const dest = path.resolve(projectDir(), out || "assets");
      const copied = new Set();
      const copy = (rel) => {
        if (copied.has(rel)) return;
        copied.add(rel);
        const from = path.join(src, rel);
        if (!fs.existsSync(from)) return;
        fs.cpSync(from, path.join(dest, rel), { recursive: true, filter: (f) => !path.basename(f).startsWith("_drip_") });
      };
      const lines = [];
      for (const rel of ["system.css", "system.js", "motion"]) copy(rel);
      for (const { kind, id } of items) {
        const F = FAMILIES[kind];
        const it = familyItems(kind).find((x) => x.id === id || x.folder === id);
        if (!it) {
          lines.push(`- ${kind} ${id}: not found (parts_list)`);
          continue;
        }
        const root = path.join(src, F.dir);
        // The family's shared files (fx.js, lib.js, base.css...), then the item's own folder.
        for (const f of fs.readdirSync(root, { withFileTypes: true })) if (f.isFile() && /\.(js|css|json|mjs)$/.test(f.name)) copy(path.join(F.dir, f.name));
        if (it.folder || fs.existsSync(path.join(root, it.id))) copy(path.join(F.dir, it.folder || it.id));
        if (kind === "hero" && it.demo) copy(path.join(F.dir, path.basename(it.demo)));
        const guide = path.join(tasteDir(), "skills", "taste-skill", "references", F.ref);
        if (fs.existsSync(guide)) fs.writeFileSync(path.join(dest, F.dir, "README.md"), fs.readFileSync(guide, "utf8"));
        lines.push(`- ${kind} ${it.id} -> ${path.relative(projectDir(), path.join(dest, F.dir, it.folder || ""))}${it.demo ? ` (demo: ${path.basename(it.demo)})` : ""}`);
      }
      fs.writeFileSync(path.join(dest, "CREDITS-taste-skill.md"), `Parts from taste-skill (https://github.com/Leonxlnx/taste-skill, MIT licence), commit ${TASTE.sha}.\n`);
      return text(`Copied into ${path.relative(projectDir(), dest) || "."}:\n${lines.join("\n")}\nEach family folder has a README.md with how to mount it. Rewrite every label and number to the client's; never ship the demo copy.`);
    }),
  );
}

// ---- dealing: the hero layout, palettes and pairings, and the section variants come from taste-skill's dealers, with a
// history so pages differ. A dealt set is a strong default to build on, never a cage: the brief and the user's brand win.
export const KINDS = ["software", "gaming", "tech", "product", "service", "place"];
const PAGE_TYPE = { software: "software", gaming: "software", tech: "product", product: "product", service: "service", place: "place" };
const LISTS = {
  software: ["nav-mega|nav-cards|nav-centre", "footer-dark|footer-statement|footer-columns", "close-type|close-word", "dark-band|surface-pairs|space", "solid|pill|tonal|arrow", "wordmark|initial|arc|ring|stack|dots"],
  gaming: ["nav-mega|nav-centre|nav-cards", "footer-dark|footer-statement", "close-word|close-type", "dark-band|media-band|space", "solid|pill|block", "wordmark|initial|arc|ring|stack|dots"],
  product: ["nav-cards|nav-split|nav-mega", "footer-columns|footer-dark", "close-photo|close-type|close-word", "dark-band|brand-band", "arrow|solid|block|pill", "wordmark|initial|arc|ring|stack|dots"],
  service: ["nav-mega|nav-split|nav-centre", "footer-visit|footer-dark|footer-columns", "close-type|close-photo", "surface-pairs|dark-band|space", "solid|tonal|block|arrow", "wordmark|initial|arc|ring|stack|dots"],
};
LISTS.tech = LISTS.product;
LISTS.place = ["nav-split|nav-centre", "footer-visit|footer-columns", "close-photo|close-type", "brand-band|space", "solid|block", "wordmark|initial"];
const pick = (opts) => { const o = opts.split("|"); return o[Math.floor(Math.random() * o.length)]; };

// The kit a scaffolded page loads (taste-skill's starter head). Big libraries (photos, scenes, objects, components)
// stay out: parts_get copies those when a page uses one.
const KIT = ["system.css", "system.js", "motion", "backgrounds", "diagrams", "ui", "effects", "moments", "icons/icon.css", "layout/layout.css", "layout/layout.js", "layout/demo.css"];
const NAV_CLASS = { "nav-centre": "nav nav--centre", "nav-split": "nav nav--split" };
const FOOTER_CLASS = { "footer-dark": "footer closing footer--dark ground-inverse", "footer-statement": "footer closing footer--statement" };

/** Writes a ready page from taste-skill's starter: the dealt hero (its markup and CSS), the dealt palette and type as
 *  tokens, the dealt nav, close and footer, and section markers for page_stitch. Every [bracket] is the client's copy. */
export async function scaffoldPage({ out, kind, hero, palette, type, nav, footer, close, buttons, mark, radius }) {
  const skill = path.join(tasteDir(), "skills", "taste-skill");
  const src = tasteAssets();
  const dir = path.resolve(projectDir(), out);
  const page = path.join(dir, "index.html");
  if (fs.existsSync(page)) return `${path.relative(projectDir(), page)} exists: not scaffolded (build on it, or deal into an empty folder).`;
  fs.mkdirSync(dir, { recursive: true });
  for (const rel of KIT) {
    const from = path.join(src, rel);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, "assets", rel), { recursive: true, filter: (f) => !/[\\/](_demo|_lab|demo\.html|check\.(html|mjs)|pick\.mjs)$/.test(f) && !/[\\/]img$/.test(f) });
  }
  fs.writeFileSync(path.join(dir, "assets", "CREDITS-taste-skill.md"), `Kit from taste-skill (https://github.com/Leonxlnx/taste-skill, MIT licence), commit ${TASTE.sha}.\n`);
  // Palette and type as the head block start.mjs prints (font links, kit stylesheets, the :root tokens).
  let head = "";
  if (palette && type) head = await run(process.execPath, [path.join(skill, "scripts", "start.mjs"), "css", "--page", kind === "tech" ? "product" : kind, "--palette", palette, "--type", type, "--radius", radius], { cwd: dir }).catch(() => "");
  fs.rmSync(path.join(dir, ".taste-skill"), { recursive: true, force: true }); // start.mjs arms its own gate there: Drip checks instead
  let html = fs.readFileSync(path.join(src, "starter.html"), "utf8");
  // The dealt hero: its section and its own <style>, with its paths made relative to the page.
  const demo = hero && path.join(src, "layout", `hero-${hero}.html`);
  if (demo && fs.existsSync(demo)) {
    const d = fs.readFileSync(demo, "utf8");
    const fix = (s) => s.replace(/(["'(])\.\.\//g, "$1assets/").replace(/(src|href)="img\//g, '$1="assets/layout/img/');
    for (const m of d.matchAll(/(?:src|href)="img\/([^"]+)"/g)) {
      const f = path.join(src, "layout", "img", m[1]);
      if (fs.existsSync(f)) { fs.mkdirSync(path.join(dir, "assets", "layout", "img"), { recursive: true }); fs.copyFileSync(f, path.join(dir, "assets", "layout", "img", m[1])); }
    }
    const section = (d.match(/<section class="hero[\s\S]*?<\/section>/) || [])[0];
    // The demo's own :root (its sample palette and fonts) goes: the dealt tokens above are the page's.
    const style = ((d.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "").replace(/:root\s*\{[^}]*\}/, "");
    if (section) html = html.replace(/<section class="hero[\s\S]*?<\/section>/, () => fix(section));
    html = html.replace(/<style>[\s\S]*?<\/style>/, () => `<style>\n/* the dealt hero (${hero}) */\n${fix(style).trim()}\n</style>`);
    if (/href="demo\.css"/.test(d)) html = html.replace(/(<link rel="stylesheet" href="assets\/layout\/layout\.css">)/, '$1\n<link rel="stylesheet" href="assets/layout/demo.css">');
  }
  if (head) html = html.replace(/<link rel="stylesheet" href="assets\/system\.css">[\s\S]*?<link rel="stylesheet" href="assets\/icons\/icon\.css">/, () => head.trim());
  // Sections: the builders' files go between the markers (page_stitch); the starter's example and part templates go.
  html = html.replace(/(<\/section>\s*)(?:<!-- SECTIONS[\s\S]*?)?<section class="section[\s\S]*?(<\/main>)/, (_, a, b) => `${a}\n  <!-- drip:sections -->\n  <!-- /drip:sections -->\n${b}`);
  const closeTpl = (html.match(new RegExp(`<template data-part="${close}">([\\s\\S]*?)</template>`)) || [])[1];
  if (closeTpl && close !== "close-type") html = html.replace(/<div class="closing__cta close--type">[\s\S]*?<\/a>\s*<\/div>/, () => closeTpl.trim());
  html = html.replace(/<template data-part="[\s\S]*?<\/template>\s*/g, "");
  html = html.replace(/<header class="nav">/, `<header class="${NAV_CLASS[nav] || "nav"}">`).replace(/<footer class="footer closing"/, `<footer class="${FOOTER_CLASS[footer] || "footer closing"}"`);
  html = html.replace(/<html lang="\[en\]" data-type="\[software\]" data-radius="soft"/, `<html lang="en" data-type="${PAGE_TYPE[kind]}" data-radius="${radius}"`).replace(/data-buttons="solid"/, `data-buttons="${buttons}"`);
  if (!["software", "gaming", "tech"].includes(kind)) html = html.replace(/ data-ground="sand"/, "");
  html = html.replace(/data-mark="\[dealt mark\]"/g, `data-mark="${mark}"`);
  if (mark === "wordmark") html = html.replace(/<span class="mark" data-mark="wordmark" aria-hidden="true"><\/span>/g, "");
  if (mark === "initial") html = html.replace(/<span class="mark" data-mark="initial" aria-hidden="true"><\/span>/g, '<span class="mark mark--initial" aria-hidden="true">[N]</span>');
  fs.writeFileSync(page, html);
  const left = (html.match(/\[[^\]\n]{1,80}\]/g) || []).length;
  return `Scaffolded ${path.relative(projectDir(), page)}: the dealt ${hero || "split"} hero with its CSS, palette ${palette || "?"}, type ${type || "?"}, ${nav}, ${close}, ${footer}, buttons ${buttons}, mark ${mark}; the kit in assets/. ${left} [brackets] to fill with the client's copy (system.js outlines any left in red). Sections go between <!-- drip:sections --> markers (page_stitch).`;
}

/** The React page: the same dealt palette, type and hero layout, as a Vite + Tailwind project for library pieces. */
export async function scaffoldReactPage({ out, kind, hero, palette, type, radius, trade }) {
  const skill = path.join(tasteDir(), "skills", "taste-skill");
  const src = tasteAssets();
  const dir = path.resolve(projectDir(), out);
  const rel = path.relative(projectDir(), dir) || ".";
  if (fs.existsSync(path.join(dir, "package.json")) || fs.existsSync(path.join(dir, "index.html"))) return `${rel} already has a page: not scaffolded (build on it, or deal into an empty folder).`;
  fs.mkdirSync(dir, { recursive: true });
  let head = "";
  if (palette && type) head = await run(process.execPath, [path.join(skill, "scripts", "start.mjs"), "css", "--page", kind === "tech" ? "product" : kind, "--palette", palette, "--type", type, "--radius", radius], { cwd: dir }).catch(() => "");
  fs.rmSync(path.join(dir, ".taste-skill"), { recursive: true, force: true });
  const demo = hero && path.join(src, "layout", `hero-${hero}.html`);
  let heroRecipe = null;
  if (demo && fs.existsSync(demo)) {
    const d = fs.readFileSync(demo, "utf8");
    const section = (d.match(/<section class="hero[\s\S]*?<\/section>/) || [])[0] || "";
    const style = ((d.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "").replace(/:root\s*\{[^}]*\}/, "");
    heroRecipe = `<!-- The dealt hero layout "${hero}" from taste-skill (MIT). Follow its grid, sizes and motion; build it in Hero.tsx with Tailwind and the chosen pieces. Its copy is a demo: never ship it. -->\n<style>\n${style.trim()}\n</style>\n${section}\n`;
  }
  fs.writeFileSync(path.join(dir, "CREDITS-taste-skill.md"), `Palette, type and hero layout dealt by taste-skill (https://github.com/Leonxlnx/taste-skill, MIT licence), commit ${TASTE.sha}.\n`);
  return scaffoldReact({ dir, rel, title: trade ? trade.replace(/\b\w/g, (c) => c.toUpperCase()) : "Page", head, radius, heroRecipe });
}

/** The component file names a shadcn registry item installs ("registry/blocks/header.tsx" -> "header"); [] when unknown. */
export async function registryFileNames(url) {
  try {
    const item = JSON.parse(await get(url, { timeoutMs: 10000, retries: 1 }));
    return [...new Set((item.files || []).map((f) => String(f.target || f.path || "")).filter((p) => /\.(tsx|jsx|ts|js)$/.test(p) && !/(^|\/)(lib|hooks)\//.test(p)).map((p) => p.split("/").pop().replace(/\.\w+$/, "")).filter((n) => n && n !== "index"))];
  } catch {
    return [];
  }
}

export function registerDeal(server, ctx) {
  server.registerTool(
    "pieces_install",
    {
      title: "Install library pieces into a React page",
      description:
        "Installs the chosen pieces (registry URLs from layout_deal's PIECES ON OFFER or components_find) into a React page in ONE shadcn CLI run, so parallel builders never fight over npm. " +
        'Waits for the page\'s npm install first. Example: pieces_install({ page: "saas-award-4", urls: ["https://magicui.design/r/marquee.json", "https://reactbits.dev/r/Silk-TS-TW.json"] })',
      inputSchema: {
        page: z.string().describe("The React page folder (from layout_deal out)"),
        urls: z.array(z.string().url()).min(1).max(20),
      },
    },
    safe(async ({ page, urls }) => {
      const dir = path.resolve(projectDir(), page);
      const root = fs.existsSync(dir) && fs.statSync(dir).isFile() ? path.dirname(dir) : dir;
      if (!isReactPage(root)) return text(`${page} is not a React page (no vite.config.ts + src/App.tsx). On a plain page use parts_get, or download a plain-HTML piece.`, true);
      const bad = urls.find((u) => /["'`$&|;<>^%\s]/.test(u));
      if (bad) return text(`Not a plain registry URL: ${bad}`, true);
      await ensureInstalled(root);
      // Registries time out now and then: retry here, twice, rather than hand the director a round trip.
      const add = () => sh(`npx --yes shadcn@latest add --yes --overwrite ${urls.map((u) => `"${u}"`).join(" ")}`, root).catch((e) => `FAILED: ${e.message}`);
      let outp = await add();
      for (let i = 0; i < 2 && /^FAILED/.test(outp) && /timed? ?out|ETIMEDOUT|ECONNRESET|fetch failed|socket hang up|503|502|429/i.test(outp); i++) {
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        outp = await add();
      }
      const files = [...new Set((String(outp).match(/src[\\/][\w./\\-]+\.(tsx?|css)/g) || []).map((f) => f.replace(/\\/g, "/")))];
      // A registry item's files are often named apart from the item (efferd's "header3" installs header.tsx): keep its real
      // file names, so the page check finds the piece by what it installed, not by its URL.
      const names = Object.fromEntries(await Promise.all(urls.map(async (u) => [u, await registryFileNames(u)])));
      updateState((st) => {
        if (!st.task) return;
        st.task.pieces = [...new Set([...(st.task.pieces || []), ...urls])];
        st.task.pieceFiles = { ...(st.task.pieceFiles || {}), ...Object.fromEntries(Object.entries(names).filter(([, n]) => n.length)) };
      });
      // Picked: the film shows each with the picture it was previewed with (matched by name).
      if (!/^FAILED/.test(outp)) for (const u of urls) filmRecord("piece", { name: `${new URL(u).hostname.replace(/^www\./, "").split(".")[0]} ${u.split("/").pop().replace(/\.json$/i, "")}`, url: u, picked: true }, null, { tool: "pieces_install" });
      return text(`${/^FAILED/.test(outp) ? outp : `Installed ${urls.length} piece(s) in ${path.relative(projectDir(), root)}.`}${files.length ? `\nFiles: ${files.join(", ")}` : ""}\nBuilders import them from @/components/... and use them as they are: restyle to the tokens and the client's content, never rewrite their motion.`, /^FAILED/.test(outp));
    }),
  );

  server.registerTool(
    "drip_kits",
    {
      title: "Record the paid UI kits the user owns",
      description: "Asked once per machine: which paid UI kits the user owns (Aceternity Pro, Magic UI Pro, bencho Pro, Tailark, efferd Pro, Skiper UI, shadcnblocks, 21st.dev, HorizonX...). Deals then offer their pieces too. Pass [] for none. /drip:adapt can turn a kit into a niche pack.",
      inputSchema: { owned: z.array(z.string()).describe("Kit names, or [] for none") },
    },
    safe(async ({ owned }) => {
      saveKits(owned);
      return text(owned.length ? `Recorded: ${owned.join(", ")}. Deals will offer their pieces (installed with the user's own login or token).` : "Recorded: no paid kits. Deals use the free libraries.");
    }),
  );

  server.registerTool(
    "layout_deal",
    {
      title: "Deal a page set (hero, palette, type, sections)",
      description:
        "Deals a starting set for a page from taste-skill's dealers, with a history so pages differ: a hero layout (with its exact grid, sizes and motion at 1440 and 390), three palettes made for the trade, three font pairings, and the nav, footer, closing section, rhythm, button style and mark. " +
        "directions: 3 deals three different sets in ONE call, one per board direction. Build on a set; the brief and the client's own brand win where they speak.",
      inputSchema: {
        kind: z.enum(KINDS).describe("software (app, SaaS, AI, dev tool, fintech app) · gaming · tech (hardware) · product (physical goods) · service (clinic, agency, studio) · place (cafe, shop, hotel)"),
        trade: z.string().describe("What is sold, in a few words, e.g. 'vineyard operations saas'"),
        has: z.array(z.enum(["photo", "ui", "film", "object", "setting"])).optional().describe("Material the page has: ui (its product UI), photo, film, object (a render or cut-out), setting (a game's world)"),
        directions: z.number().int().min(1).max(3).optional().describe("How many different sets (default 1; 3 for the board's directions)"),
        out: z.string().optional().describe("A new page folder, e.g. 'saas-award-3': also writes the page from the dealt set, so you only fill in the copy and the visual"),
        radius: z.enum(["sharp", "soft", "round"]).optional().describe("With out: sharp for fintech and dev tools, soft (default), round for consumer apps"),
        surface: z.enum(["landing", "app"]).optional().describe("landing (default): a marketing page. app: an app screen (dashboard, tool, settings, editor): React, and the pieces are app pieces (shadcn's dashboard and sidebars, charts, Kibo's kanban, dropzone and editor, bencho's inputs and media...)"),
        stack: z.enum(["auto", "react", "html"]).optional().describe("With out: react = Vite + Tailwind so pieces from React libraries (Magic UI, React Bits, Cult UI, efferd...) install as they are; html = one static page with taste-skill's kit. auto (default): react for software, gaming and tech pages, html for products, services and places. The user's word wins (\"no build step\" = html)."),
      },
    },
    safe(async ({ kind, trade, has, directions = 1, out: outDir, radius = "soft", stack: stackIn = "auto", surface = "landing" }) => {
      const stack = surface === "app" ? "react" : stackIn === "auto" ? (["software", "gaming", "tech"].includes(kind) ? "react" : "html") : stackIn;
      await installTaste();
      const skill = path.join(tasteDir(), "skills", "taste-skill");
      const work = path.join(projectDir(), ".drip", "deal");
      fs.mkdirSync(work, { recursive: true });
      const hist = path.join(work, "history.json");
      const out = [];
      const sets = [];
      for (let i = 0; i < directions; i++) {
        const heroArgs = [path.join(skill, "assets", "layout", "deal.mjs"), "--type", PAGE_TYPE[kind], "--history", path.join(work, "layout-history.json")];
        if (kind === "gaming" || kind === "tech") heroArgs.push("--kind", kind);
        if (has?.length) heroArgs.push("--has", has.join(","));
        const [hero, look] = await Promise.all([
          run(process.execPath, heroArgs, { cwd: work }).catch((e) => `hero deal failed: ${e.message}`),
          run(process.execPath, [path.join(skill, "scripts", "start.mjs"), "deal", "--page", kind === "tech" ? "product" : kind, "--trade", trade, "--history", hist], { cwd: work }).catch((e) => `palette deal failed: ${e.message}`),
        ]);
        const [nav, footer, close, rhythm, buttons, mark] = LISTS[kind].map(pick);
        const clean = (s) => String(s).replace(/<skill>/g, skill.replace(/\\/g, "/")).split("\n").filter((l) => !/finish gate is armed|^then: node|plan line 2/.test(l)).join("\n").trim();
        sets.push({ hero: String(hero), look: String(look), nav, footer, close, buttons, mark });
        out.push(`===== SET ${i + 1}${directions > 1 ? ` (direction ${i + 1})` : ""} =====\n${clean(hero)}\n\n${clean(look)}\n\nSECTIONS: nav ${nav} · footer ${footer} · close ${close} · rhythm ${rhythm} · buttons ${buttons} · mark ${mark}`);
      }
      const first = out[0] || "";
      const hero = (first.match(/^hero: ([a-z-]+)/m) || [])[1];
      const palette = (first.match(/^ {2}([a-z0-9-]+) {2,}[A-Z]/m) || [])[1];
      const summary = [hero && `hero ${hero}`, palette && `palette ${palette}`, kind].filter(Boolean).join(", ");
      const htmlParts = stack === "html" ? Object.fromEntries(["effect", "ui", "component", "moment"].map((k) => [k, familyItems(k)])) : null;
      const dealt = dealPieces({ kind, stack, surface, historyFile: path.join(work, "pieces-history.json"), htmlParts });
      const piecesText = formatPieces(dealt, { stack, owned: ownedKits() });
      updateState((st) => {
        if (st.task) st.task.deal = { kind, trade, summary, stack, at: new Date().toISOString() };
        if (st.task && outDir) st.task.page = { dir: outDir, stack };
      });
      if (outDir && sets[0]) {
        const s = sets[0];
        const type = (s.look.split(/^TYPE for/m)[1]?.match(/^ {2}([a-z0-9-]+) {2,}/m) || [])[1];
        let made;
        if (stack === "react") made = await scaffoldReactPage({ out: outDir, kind, hero, palette, type, radius, trade });
        else made = await scaffoldPage({ out: outDir, kind, hero, palette, type, nav: s.nav, footer: s.footer, close: s.close, buttons: s.buttons, mark: s.mark, radius });
        return text(
          `${out.join("\n\n")}\n\n${piecesText}\n\n${made}\n` +
            `Next (pass 1): choose the hero's pieces (and the nav's), then ONE build_prepare for the hero${stack === "react" ? " (with the nav: one builder, the pieces installed first with pieces_install)" : ""} and launch its drip:builder. While it builds, nothing else to write: the builder writes the code. Then fitcheck_shot({ url, hero: true }) once.`,
        );
      }
      return text(`${out.join("\n\n")}\n\n${piecesText}\n\nThe hero demos and section recipes: parts_get({ items: [{ kind: "hero", id: "<hero id>" }] }) copies the hero's demo; its README (layout-v4) has the recipes. Take the first palette and pairing unless they clash with the client's own colours.`);
    }),
  );
}
