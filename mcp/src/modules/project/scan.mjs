// Look at a repository and list the visual material it already has: README, DESIGN.md, design tokens, CSS and theme
// files, fonts, logos and brand assets, approved imagery, pages, the component stack. Reads only the relevant files
// (never node_modules, builds, caches, .env or key files), never runs a script from the repo, never writes anything.
//
// importInventory() turns that into board items: first-class, with project-relative paths, explicit source labels and
// status "current" (the existing UI is evidence of what exists, not an approved look).
import fs from "node:fs";
import path from "node:path";
import { designDoc } from "../../core/skills.mjs";
import { addItem, boardDir, fileHash, makeProvenance, updateBoard } from "../board/store.mjs";
import { fwd as posix } from "../../core/util.mjs";

export const SKIP_DIR = /^(node_modules|\.git|\.hg|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|\.vercel|\.output|dist|build|out|coverage|\.drip|\.venv|venv|env|__pycache__|target|vendor|\.gradle|Pods|\.idea|\.vscode|tmp|temp)$/i;
// Names that may hold secrets or private material: never read, copied, or listed with content.
export const SECRET_FILE = /(^\.env|\.pem$|\.key$|\.p12$|\.pfx$|\.keystore$|\.jks$|id_rsa|id_ed25519|credentials|secrets?\.|\.npmrc$|\.netrc$|\.htpasswd|service-account|\.tfvars$)/i;
const IMG = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const FONT = /\.(woff2?|ttf|otf)$/i;
const LOGO_NAME = /(logo|wordmark|brand|logotype|lockup|favicon|app-?icon|mark)\b/i;
const ASSET_DIR = /(^|\/)(public|assets|static|images?|img|media|brand|branding|design|illustrations?)(\/|$)/i;
const MAX_FILES = 6000;
const MAX_BYTES = 8 * 1024 * 1024;


/** Walk the repo (skip lists applied), return project-relative POSIX paths with sizes. */
export function walkRepo(root, { depth = 7, max = MAX_FILES } = {}) {
  const files = [];
  const skipped = { secrets: 0, big: 0, dirs: 0 };
  const walk = (dir, d) => {
    if (d < 0 || files.length >= max) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR.test(e.name)) skipped.dirs++;
        else walk(abs, d - 1);
      } else if (e.isFile()) {
        if (SECRET_FILE.test(e.name)) {
          skipped.secrets++;
          continue;
        }
        let size = 0;
        try {
          size = fs.statSync(abs).size;
        } catch {
          continue;
        }
        files.push({ rel: posix(path.relative(root, abs)), size });
      }
    }
  };
  walk(root, depth);
  return { files, skipped };
}

const read = (root, rel, n = 200000) => {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8").slice(0, n);
  } catch {
    return "";
  }
};

function varCount(css) {
  return (css.match(/--[a-z0-9-]+\s*:/gi) || []).length;
}

function fontFamilies(css) {
  return [...css.matchAll(/@font-face\s*{[^}]*?font-family\s*:\s*["']?([^;"'}]+)["']?/gi)].map((m) => m[1].trim());
}

function firstParagraph(md) {
  const body = md.replace(/^---[\s\S]*?---/, "").split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^(#|!\[|<|\[!\[|\|)/.test(p) && p.length > 30);
  return (body || "").replace(/\s+/g, " ").slice(0, 400);
}

const COMPONENT_LIBS = [
  ["tailwindcss", "Tailwind CSS"],
  ["@radix-ui", "Radix Primitives"],
  ["react-aria", "React Aria"],
  ["@base-ui", "Base UI"],
  ["@headlessui", "Headless UI"],
  ["@mui/material", "MUI"],
  ["@chakra-ui", "Chakra UI"],
  ["antd", "Ant Design"],
  ["@mantine", "Mantine"],
  ["styled-components", "styled-components"],
  ["@emotion", "Emotion"],
  ["framer-motion", "Motion"],
  ["motion", "Motion"],
  ["class-variance-authority", "cva (variants)"],
  ["tailwind-variants", "tailwind-variants"],
  ["lucide-react", "Lucide icons"],
  ["@phosphor-icons", "Phosphor icons"],
  ["storybook", "Storybook"],
  ["@ladle", "Ladle"],
];

/** The inventory of one repository. Nothing is read beyond the relevant files. */
export function scanRepo(root) {
  const { files, skipped } = walkRepo(root);
  const inv = { root, readme: null, designDocs: [], tokens: [], css: [], fonts: [], logos: [], images: [], pages: [], stack: { name: null, libs: [], shadcn: false, tailwindConfig: null }, counts: {}, skipped };
  const doc = designDoc(root);
  if (doc) inv.designDocs.push({ rel: doc.rel, chars: doc.text.length });
  for (const f of files) {
    const base = path.posix.basename(f.rel);
    const low = f.rel.toLowerCase();
    if (!inv.readme && /^readme(\.md|\.mdx|\.txt)?$/i.test(base) && !f.rel.includes("/")) inv.readme = { rel: f.rel, summary: firstParagraph(read(root, f.rel, 6000)) };
    else if (/^(design|brand|style-?guide)\.md$/i.test(base) && !inv.designDocs.some((d) => d.rel === f.rel)) inv.designDocs.push({ rel: f.rel, chars: f.size });
    else if (/\.(css|scss|sass|less)$/i.test(base)) {
      const css = read(root, f.rel, 300000);
      const vars = varCount(css) + (/@theme\b/.test(css) ? 1 : 0);
      for (const fam of fontFamilies(css)) if (!inv.fonts.some((x) => x.family === fam)) inv.fonts.push({ family: fam, source: f.rel, file: null });
      if (vars >= 3) inv.tokens.push({ rel: f.rel, kind: "css", vars, size: f.size });
      else inv.css.push({ rel: f.rel, size: f.size });
    } else if (/(^|\/)(tokens?|design-tokens|theme)(\.[a-z]+)?\.(json|js|ts|mjs|cjs)$/i.test(low) || /(^|\/)tokens?\/[^/]+\.json$/i.test(low)) inv.tokens.push({ rel: f.rel, kind: "tokens", vars: null, size: f.size });
    else if (/^tailwind\.config\.(js|ts|mjs|cjs)$/i.test(base)) {
      inv.stack.tailwindConfig = f.rel;
      inv.tokens.push({ rel: f.rel, kind: "tailwind", vars: null, size: f.size });
    } else if (FONT.test(base)) inv.fonts.push({ family: base.replace(/\.[^.]+$/, "").replace(/[-_](regular|bold|italic|medium|semibold|light|\d{3})\b.*$/i, "").replace(/[-_]+/g, " ").trim(), source: f.rel, file: f.rel });
    else if (IMG.test(base) && f.size <= MAX_BYTES) {
      if (LOGO_NAME.test(base) || /(^|\/)(brand|branding|logos?)\//i.test(low)) inv.logos.push({ rel: f.rel, size: f.size });
      else if (ASSET_DIR.test(low) && !/node_modules|\.test\.|__snapshots__/.test(low)) inv.images.push({ rel: f.rel, size: f.size });
    } else if (/(^|\/)(index|home)\.html?$/i.test(low) || /(^|\/)app\/(.*\/)?page\.(tsx|jsx|js|ts)$/i.test(low) || /(^|\/)pages\/[^_][^/]*\.(tsx|jsx)$/i.test(low) || /(^|\/)src\/routes\/.*\+page\.svelte$/i.test(low) || /(^|\/)pages\/.*\.astro$/i.test(low)) inv.pages.push({ rel: f.rel });
    else if (base === "components.json") inv.stack.shadcn = true;
    else if (base === "package.json" && !f.rel.includes("/")) {
      try {
        const pkg = JSON.parse(read(root, f.rel, 200000));
        inv.stack.name = pkg.name || null;
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const [pre, label] of COMPONENT_LIBS) if (Object.keys(deps).some((d) => d === pre || d.startsWith(`${pre}/`) || d.startsWith(pre)) && !inv.stack.libs.includes(label)) inv.stack.libs.push(label);
      } catch {
        /* no package.json worth reading */
      }
    }
  }
  if (inv.stack.shadcn && !inv.stack.libs.includes("shadcn/ui")) inv.stack.libs.unshift("shadcn/ui");
  // The most representative first: logos by name then size, images by size, tokens by variable count.
  inv.logos.sort((a, b) => Number(/logo/i.test(b.rel)) - Number(/logo/i.test(a.rel)) || a.rel.length - b.rel.length);
  inv.images.sort((a, b) => b.size - a.size);
  inv.tokens.sort((a, b) => (b.vars || 0) - (a.vars || 0));
  inv.counts = { files: files.length, logos: inv.logos.length, images: inv.images.length, fonts: inv.fonts.length, tokens: inv.tokens.length, css: inv.css.length, pages: inv.pages.length };
  return inv;
}

/** Plain-text summary of an inventory (for tool output). */
export function describeInventory(inv) {
  const L = [];
  L.push(`README: ${inv.readme ? `${inv.readme.rel}${inv.readme.summary ? ` — ${inv.readme.summary.slice(0, 160)}` : ""}` : "none"}`);
  L.push(`DESIGN.md: ${inv.designDocs.length ? inv.designDocs.map((d) => d.rel).join(", ") : "none"}`);
  L.push(`Tokens/theme: ${inv.tokens.length ? inv.tokens.slice(0, 5).map((t) => `${t.rel}${t.vars ? ` (${t.vars} vars)` : ""}`).join(", ") : "none"}; other CSS files: ${inv.css.length}`);
  L.push(`Fonts: ${inv.fonts.length ? [...new Set(inv.fonts.map((f) => f.family))].slice(0, 8).join(", ") : "none"}`);
  L.push(`Logos/brand assets: ${inv.logos.length ? inv.logos.slice(0, 6).map((l) => l.rel).join(", ") : "none"}; approved imagery: ${inv.images.length} file(s)`);
  L.push(`Pages: ${inv.pages.length ? inv.pages.slice(0, 6).map((p) => p.rel).join(", ") : "none found"}`);
  L.push(`Stack: ${inv.stack.libs.length ? inv.stack.libs.join(", ") : "no component library found"}${inv.stack.name ? ` (${inv.stack.name})` : ""}`);
  L.push(`Skipped (never read): ${inv.skipped.secrets} secret-looking file(s), ${inv.skipped.dirs} dependency/build/cache folder(s).`);
  return L.join("\n");
}

const LIMITS = { logos: 12, images: 24, tokens: 6, css: 0, fonts: 12, pages: 20 };

/**
 * Add the inventory's material to a board. Same file again refreshes it (a changed hash is recorded), the same bytes
 * under another name are not added twice. Returns counts; nothing in the repo is changed.
 * opts: { by, kinds: [...], only: [relative paths] }
 */
export function importInventory(boardId, inv, { by = null, kinds, only } = {}) {
  const want = (k) => !kinds || kinds.includes(k);
  const keep = (rel) => !only || only.some((p) => rel === p || rel.startsWith(`${p.replace(/\/$/, "")}/`));
  const root = inv.root;
  const entries = [];
  const prov = (label, rel) => makeProvenance({ source: "repo", label, path: rel, by });
  const file = (rel) => fileHash(path.join(root, rel));
  if (want("docs")) {
    if (inv.readme && keep(inv.readme.rel)) entries.push({ entry: { key: `file:${inv.readme.rel}`, kind: "doc", title: inv.readme.rel, path: inv.readme.rel, hash: file(inv.readme.rel), excerpt: inv.readme.summary, note: "what the project says it is (README): audience and purpose context" }, prov: prov("README", inv.readme.rel) });
    for (const d of inv.designDocs) if (keep(d.rel)) entries.push({ entry: { key: `file:${d.rel}`, kind: "doc", title: d.rel, path: d.rel, hash: file(d.rel), excerpt: read(root, d.rel, 600).replace(/\s+/g, " "), note: "the project's written design rules (hand-maintained; Drip never overwrites it)" }, prov: prov("DESIGN.md", d.rel) });
  }
  if (want("tokens")) for (const t of inv.tokens.slice(0, LIMITS.tokens)) if (keep(t.rel)) entries.push({ entry: { key: `file:${t.rel}`, kind: "tokens", title: t.rel, path: t.rel, hash: file(t.rel), value: t.vars ? `${t.vars} custom properties` : t.kind, note: `design tokens in the code (${t.kind}): the measurable colours, type, spacing and radii the UI already uses` }, prov: prov("tokens", t.rel) });
  if (want("fonts")) for (const f of inv.fonts.slice(0, LIMITS.fonts)) if (keep(f.source)) entries.push({ entry: { key: `font:${f.family}`, kind: "font", value: f.family, title: f.family, ...(f.file ? { path: f.file, hash: file(f.file) } : {}), note: `font the project ships (${f.source})` }, prov: prov("font", f.source) });
  if (want("logos")) for (const l of inv.logos.slice(0, LIMITS.logos)) if (keep(l.rel)) entries.push({ entry: { key: `file:${l.rel}`, kind: "logo", title: path.posix.basename(l.rel), path: l.rel, hash: file(l.rel), note: "the project's own logo / brand asset (current identity, not a reference)" }, prov: prov("logo", l.rel) });
  if (want("images")) for (const i of inv.images.slice(0, LIMITS.images)) if (keep(i.rel)) entries.push({ entry: { key: `file:${i.rel}`, kind: "image", title: path.posix.basename(i.rel), path: i.rel, hash: file(i.rel), note: "imagery the project already uses (current implementation)" }, prov: prov("image", i.rel) });
  if (want("pages")) for (const p of inv.pages.slice(0, LIMITS.pages)) if (keep(p.rel)) entries.push({ entry: { key: `file:${p.rel}`, kind: "page", title: p.rel, path: p.rel, hash: file(p.rel), note: "an existing page of the product (current implementation)" }, prov: prov("page", p.rel) });
  if (want("stack") && inv.stack.libs.length) entries.push({ entry: { key: "stack:components", kind: "stack", title: "Component stack", value: inv.stack.libs.join(", "), note: `the project builds with ${inv.stack.libs.join(", ")}: reuse these primitives instead of adding another library` }, prov: prov("package.json", "package.json") });
  return applyEntries(boardId, entries, { by, op: "import", summary: `repo scan: ${entries.length} item(s)` });
}

/** Add prepared { entry, prov, status? } entries to a board in one locked write. */
export function applyEntries(boardId, entries, { by = null, op = "import", summary = "" } = {}) {
  const counts = { added: 0, updated: 0, duplicate: 0 };
  const board = updateBoard(
    boardId,
    (b) => {
      for (const { entry, prov, status } of entries) {
        const before = b.items.find((x) => x.key === entry.key)?.hash;
        const r = addItem(b, entry, { provenance: prov, status: status || "current" });
        counts[r.action]++;
        if (r.action === "updated" && before && entry.hash && before !== entry.hash) {
          r.item.changedAt = new Date().toISOString();
          r.item.note = entry.note;
        }
      }
    },
    { op, summary, by },
  );
  return { board, counts };
}

/** Where a board keeps files Drip made for it (screenshots of the running app): .drip/boards/<id>/assets, as a project-relative path. */
export function boardAssetPath(boardId, name, root) {
  const abs = path.join(boardDir(boardId), "assets", name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return { abs, rel: posix(path.relative(root, abs)) };
}
