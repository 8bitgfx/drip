// DESIGN.md says one thing, the CSS another: compare the colours and font families the doc names with
// the ones the stylesheets actually define, so a stale DESIGN.md (or a build that drifted) is caught.
import fs from "node:fs";
import path from "node:path";

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const norm = (h) => {
  h = h.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};

function cssFiles(root, out = [], depth = 4) {
  if (depth < 0 || out.length > 60) return out;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (/^(node_modules|\.git|\.next|dist|build|\.drip|out|coverage)$/.test(e.name)) continue;
    const f = path.join(root, e.name);
    if (e.isDirectory()) cssFiles(f, out, depth - 1);
    else if (/\.(css|scss|html)$/i.test(e.name) || /tailwind\.config\.(js|ts|mjs|cjs)$/.test(e.name)) out.push(f);
  }
  return out;
}

/** Custom properties and their values from every :root / [data-theme] block. */
function tokens(src) {
  const out = {};
  for (const block of src.match(/(?::root|\[data-theme[^\]]*\]|\.dark|html)[^{]*\{[^}]*\}/g) || []) {
    for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) out[m[1]] = m[2].trim();
  }
  return out;
}

export function designDrift(root, docFile) {
  const doc = fs.readFileSync(docFile, "utf8");
  const docHex = new Set((doc.match(HEX) || []).map(norm));
  const files = cssFiles(root);
  const defined = {};
  const used = new Set();
  const families = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    Object.assign(defined, tokens(src));
    for (const h of src.match(HEX) || []) used.add(norm(h));
    for (const m of src.matchAll(/font-family\s*:\s*["']?([^"',;]+)/gi)) families.add(m[1].trim());
    for (const m of src.matchAll(/--font[\w-]*\s*:\s*["']?([^"',;]+)/gi)) families.add(m[1].trim());
    for (const m of src.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^&"')]+)/gi)) families.add(decodeURIComponent(m[1]).replace(/\+/g, " ").split(":")[0]);
  }
  const tokenHex = new Set(Object.values(defined).flatMap((v) => (v.match(HEX) || []).map(norm)));
  const issues = [];
  const missing = [...docHex].filter((h) => !used.has(h));
  if (missing.length) issues.push(`DESIGN.md names ${missing.join(" ")} but no stylesheet uses ${missing.length > 1 ? "them" : "it"}: update DESIGN.md or the tokens`);
  const undocumented = [...tokenHex].filter((h) => !docHex.has(h) && !["#ffffff", "#000000", "#fff", "#000"].includes(h));
  if (undocumented.length) issues.push(`tokens define ${undocumented.slice(0, 8).join(" ")} which DESIGN.md never mentions: add ${undocumented.length > 1 ? "them" : "it"} with a role, or remove`);
  const placeholder = Object.entries(defined).filter(([, v]) => /DISPLAY FACE|TEXT FACE/.test(v));
  if (placeholder.length) issues.push(`kit placeholders still in the CSS: ${placeholder.map(([k]) => k).join(", ")} — set the real faces`);
  const docFaces = [...families].filter((f) => !/^(ui-|system-ui|sans-serif|serif|monospace|inherit|var\()/i.test(f));
  const notInDoc = docFaces.filter((f) => !doc.toLowerCase().includes(f.toLowerCase()));
  if (notInDoc.length) issues.push(`fonts in the code but not in DESIGN.md: ${notInDoc.slice(0, 5).join(", ")}`);
  return { issues, files: files.length, docHex: docHex.size, tokenCount: Object.keys(defined).length };
}
