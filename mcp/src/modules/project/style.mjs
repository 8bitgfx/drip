// Measure a project's real visual language, from two sources that are merged:
//   static    CSS / SCSS / token JSON / Tailwind config files: the custom properties and the values the code declares
//   rendered  a running page (or a local .html) in the shared headless Chrome: what the browser actually computed
// The result (colours with roles, type scale, spacing steps, radii, shadows, motion timings, grid) is saved to
// .drip/memory/style.json with its sources, and feeds the generated project skill. Numbers, not mood words.
import fs from "node:fs";
import path from "node:path";
import { openPage, withTab } from "../../core/browser.mjs";
import { updateJson } from "../../core/jsonstore.mjs";
import { styleFile } from "../../core/memory.mjs";
import { ensureProjectDrip, projectDir } from "../../core/paths.mjs";
import { hashFile } from "../../core/evidence.mjs";
import { SECRET_FILE } from "./scan.mjs";

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi;
const FUNC_COLOR = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi;

const rank = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);
const toPx = (v) => {
  const m = String(v).trim().match(/^(-?[\d.]+)(px|rem|em)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Math.round((m[2] && m[2].toLowerCase() !== "px" ? n * 16 : n) * 100) / 100;
};

function normHex(h) {
  h = h.toLowerCase();
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return h.length === 9 && h.endsWith("ff") ? h.slice(0, 7) : h;
}

/** Tokens from CSS source text: custom properties and the values declared in rules. */
export function parseCss(src) {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const vars = {};
  for (const m of css.matchAll(/(--[a-z0-9-_]+)\s*:\s*([^;}\n]+)/gi)) vars[m[1]] = m[2].trim();
  const colors = new Map();
  const sizes = new Map();
  const families = new Map();
  const spacing = new Map();
  const radii = new Map();
  const shadows = new Map();
  const motion = new Map();
  const weights = new Map();
  let containerMax = null;
  const columns = new Map();
  for (const m of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)(?=;|})/gi)) {
    const prop = m[1].toLowerCase();
    const val = m[2].trim();
    for (const c of val.match(HEX) || []) bump(colors, normHex(c));
    for (const c of val.match(FUNC_COLOR) || []) bump(colors, c.replace(/\s+/g, " "));
    if (prop === "font-size") {
      const px = toPx(val);
      if (px) bump(sizes, px);
    } else if (prop === "font-family") bump(families, val.split(",")[0].replace(/["']/g, "").trim());
    else if (prop === "font-weight" && /^\d{3}$/.test(val)) bump(weights, val);
    else if (/^(padding|margin|gap|row-gap|column-gap|padding-(top|right|bottom|left|inline|block)|margin-(top|right|bottom|left|inline|block))$/.test(prop)) for (const t of val.split(/\s+/)) {
      const px = toPx(t);
      if (px && px > 0 && px <= 256) bump(spacing, px);
    }
    else if (prop === "border-radius") bump(radii, val.split(/\s+/)[0]);
    else if (prop === "box-shadow" && val !== "none") bump(shadows, val.replace(/\s+/g, " ").slice(0, 120));
    else if (prop === "transition" || prop === "animation" || prop === "transition-duration" || prop === "animation-duration") {
      for (const d of val.match(/\b\d*\.?\d+m?s\b/g) || []) bump(motion, d);
      for (const e of val.match(/\b(ease(?:-in|-out|-in-out)?|linear|cubic-bezier\([^)]*\)|spring\([^)]*\))/g) || []) bump(motion, e.replace(/\s+/g, ""));
    } else if (prop === "max-width" && /^\d+(px|rem)$/.test(val)) {
      const px = toPx(val);
      if (px && px >= 640 && px <= 2000 && (!containerMax || px > containerMax)) containerMax = px;
    } else if (prop === "grid-template-columns") {
      const rep = val.match(/repeat\(\s*(\d+)/);
      bump(columns, rep ? Number(rep[1]) : val.split(/\s+/).filter((x) => !x.startsWith("[")).length);
    }
  }
  return {
    vars,
    colors: rank(colors, 20).map(([value, count]) => ({ value, count })),
    type: rank(sizes, 14).map(([size, count]) => ({ size, count })),
    families: rank(families, 8).map(([family, count]) => ({ family, count })),
    weights: rank(weights, 6).map(([w]) => w),
    spacing: rank(spacing, 16).map(([v]) => v).sort((a, b) => a - b),
    radii: rank(radii, 8).map(([v]) => v),
    shadows: rank(shadows, 4).map(([v]) => v),
    motion: rank(motion, 10).map(([v]) => v),
    grid: containerMax || columns.size ? { containerMax, columns: rank(columns, 2).map(([c]) => c) } : null,
  };
}

/** Tokens from a JSON token file (flat or nested "value" / "$value" objects) or a Tailwind config's literal values. */
export function parseTokenFile(file) {
  const src = fs.readFileSync(file, "utf8");
  if (/\.json$/i.test(file)) {
    let j;
    try {
      j = JSON.parse(src);
    } catch {
      return { vars: {}, colors: [], type: [], families: [], weights: [], spacing: [], radii: [], shadows: [], motion: [], grid: null };
    }
    const vars = {};
    const walk = (o, pre) => {
      for (const [k, v] of Object.entries(o || {})) {
        const p = pre ? `${pre}.${k}` : k;
        if (v && typeof v === "object" && ("value" in v || "$value" in v)) vars[p] = String(v.value ?? v.$value);
        else if (v && typeof v === "object") walk(v, p);
        else if (typeof v === "string" || typeof v === "number") vars[p] = String(v);
      }
    };
    walk(j, "");
    const css = Object.entries(vars).map(([k, v]) => `${/color|colour|bg|fg|brand|accent|ink/i.test(k) ? "color" : /size|font/i.test(k) ? "font-size" : /radius/i.test(k) ? "border-radius" : /space|gap|pad|margin/i.test(k) ? "padding" : "x"}: ${v};`).join("\n");
    const parsed = parseCss(css);
    parsed.vars = vars;
    return parsed;
  }
  // tailwind.config / theme.js: read the literal hex, px and font names it contains
  const parsed = parseCss(src.replace(/['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]/g, "$1: $2;"));
  parsed.vars = {};
  return parsed;
}

const merge = (parts) => {
  const colors = new Map();
  const type = new Map();
  const fam = new Map();
  const spacing = new Map();
  const radii = new Map();
  const shadows = new Map();
  const motion = new Map();
  const weights = new Map();
  const roles = new Map();
  let grid = null;
  const vars = {};
  for (const t of parts) {
    Object.assign(vars, t.vars || {});
    for (const c of t.colors || []) {
      bump(colors, c.value, c.count || 1);
      if (c.role) roles.set(c.value, c.role);
    }
    for (const s of t.type || []) bump(type, `${s.size}|${s.weight || ""}|${s.family || ""}|${s.lineHeight || ""}`, s.count || 1);
    for (const f of t.families || []) bump(fam, f.family, f.count || 1);
    for (const v of t.spacing || []) bump(spacing, v);
    for (const v of t.radii || []) bump(radii, v);
    for (const v of t.shadows || []) bump(shadows, v);
    for (const v of t.motion || []) bump(motion, v);
    for (const w of t.weights || []) bump(weights, w);
    if (t.grid && (!grid || (t.grid.containerMax || 0) > (grid.containerMax || 0))) grid = t.grid;
  }
  return {
    vars,
    colors: rank(colors, 16).map(([value, count]) => ({ value, count, ...(roles.has(value) ? { role: roles.get(value) } : {}) })),
    type: rank(type, 12)
      .map(([k, count]) => {
        const [size, weight, family, lineHeight] = k.split("|");
        return { size: Number(size), ...(weight ? { weight } : {}), ...(family ? { family } : {}), ...(lineHeight ? { lineHeight } : {}), count };
      })
      .sort((a, b) => a.size - b.size),
    families: rank(fam, 6).map(([family, count]) => ({ family, count })),
    weights: rank(weights, 5).map(([w]) => w),
    spacing: rank(spacing, 14).map(([v]) => v).sort((a, b) => a - b),
    radii: rank(radii, 6).map(([v]) => v),
    shadows: rank(shadows, 3).map(([v]) => v),
    motion: rank(motion, 8).map(([v]) => v),
    grid,
  };
};

// What the browser computed, aggregated in the page so only a small object comes back.
const PAGE_SCRIPT = `(() => {
  const els = [...document.querySelectorAll('body, body *')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }).slice(0, 3500);
  const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
  const hex = (c) => { const m = c.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?/); if (!m) return null; if (m[4] !== undefined && +m[4] < 0.05) return null; return '#' + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, '0')).join(''); };
  const colors = new Map(), type = new Map(), spacing = new Map(), radii = new Map(), shadows = new Map(), motion = new Map(), fam = new Map();
  const roles = {};
  const body = getComputedStyle(document.body);
  roles.ground = hex(getComputedStyle(document.documentElement).backgroundColor) || hex(body.backgroundColor) || '#ffffff';
  roles.ink = hex(body.color);
  const btn = [...document.querySelectorAll('button, a[class*=btn i], a[class*=button i], [role=button], input[type=submit]')].map((e) => hex(getComputedStyle(e).backgroundColor)).filter((c) => c && c !== roles.ground);
  const bm = new Map(); btn.forEach((c) => bump(bm, c)); roles.accent = [...bm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  let containerMax = 0; const columns = new Map();
  for (const el of els) {
    const cs = getComputedStyle(el);
    const area = Math.max(1, Math.round(el.getBoundingClientRect().width * el.getBoundingClientRect().height / 1000));
    const bg = hex(cs.backgroundColor); if (bg) bump(colors, bg, area);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (own) {
      const c = hex(cs.color); if (c) bump(colors, c, 20);
      const f = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); bump(fam, f);
      bump(type, Math.round(parseFloat(cs.fontSize)) + '|' + cs.fontWeight + '|' + f + '|' + (cs.lineHeight === 'normal' ? '' : Math.round(parseFloat(cs.lineHeight))));
    }
    for (const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','rowGap','columnGap']) { const v = Math.round(parseFloat(cs[p])); if (v > 0 && v <= 256) bump(spacing, v); }
    if (cs.borderTopLeftRadius !== '0px') bump(radii, cs.borderTopLeftRadius);
    if (cs.boxShadow !== 'none') bump(shadows, cs.boxShadow.slice(0, 120));
    for (const [d, e] of [[cs.transitionDuration, cs.transitionTimingFunction], [cs.animationDuration, cs.animationTimingFunction]]) { const ds = d.split(',').map((x) => x.trim()); const es = e.split(/,(?![^(]*\\))/).map((x) => x.trim()); ds.forEach((x, i) => { if (x !== '0s') { bump(motion, x); if (es[i]) bump(motion, es[i]); } }); }
    if (cs.display === 'grid' && cs.gridTemplateColumns !== 'none') bump(columns, cs.gridTemplateColumns.split(' ').length);
    if (cs.maxWidth !== 'none' && /px$/.test(cs.maxWidth)) { const m = parseFloat(cs.maxWidth); if (m >= 640 && m <= 2000 && m > containerMax) containerMax = m; }
  }
  const r = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const vars = {};
  for (const sheet of [...document.styleSheets]) { let rules; try { rules = sheet.cssRules; } catch (e) { continue; } for (const rule of rules || []) { if (rule.selectorText === ':root' && rule.style) for (const p of rule.style) if (p.startsWith('--')) vars[p] = rule.style.getPropertyValue(p).trim(); } }
  return {
    title: document.title, vars,
    colors: r(colors, 14).map(([value, count]) => ({ value, count, ...(roles.ground === value ? { role: 'ground' } : roles.ink === value ? { role: 'ink' } : roles.accent === value ? { role: 'accent' } : {}) })),
    type: r(type, 14).map(([k, count]) => { const [size, weight, family, lineHeight] = k.split('|'); return { size: +size, weight, family, ...(lineHeight ? { lineHeight } : {}), count }; }),
    families: r(fam, 6).map(([family, count]) => ({ family, count })),
    spacing: r(spacing, 14).map(([v]) => v).sort((a, b) => a - b),
    radii: r(radii, 6).map(([v]) => v), shadows: r(shadows, 3).map(([v]) => v), motion: r(motion, 8).map(([v]) => v),
    grid: containerMax || columns.size ? { containerMax: containerMax || null, columns: r(columns, 2).map(([c]) => c) } : null, roles,
  };
})()`;

/** Measure a page: one tab at the given width. */
export async function measurePage(url, { width = 1440, height = 900, config } = {}) {
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, idle: true });
    const { result } = await tab.s("Runtime.evaluate", { expression: PAGE_SCRIPT, returnByValue: true });
    return result.value;
  });
}

/** Measure these files (relative to the project) as static sources. Secret-looking files are never read. */
export function measureFiles(rels, root = projectDir()) {
  const out = [];
  for (const rel of rels) {
    if (SECRET_FILE.test(path.basename(rel))) continue;
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(path.resolve(root))) continue;
    if (!fs.existsSync(abs)) continue;
    const tokens = /\.(css|scss|sass|less)$/i.test(rel) ? parseCss(fs.readFileSync(abs, "utf8")) : parseTokenFile(abs);
    out.push({ kind: "file", ref: rel, hash: hashFile(abs), tokens });
  }
  return out;
}

/** Store measured sources in .drip/memory/style.json (replacing an earlier measurement of the same source) and re-merge. */
export function saveStyle(sources, cwd) {
  ensureProjectDrip(cwd);
  return updateJson(
    styleFile(cwd),
    (cur) => {
      const by = new Map((cur.sources || []).map((s) => [`${s.kind}:${s.ref}`, s]));
      for (const s of sources) by.set(`${s.kind}:${s.ref}`, { kind: s.kind, ref: s.ref, hash: s.hash || null, width: s.width || null, at: new Date().toISOString(), tokens: s.tokens });
      cur.schema = 1;
      cur.sources = [...by.values()];
      cur.tokens = merge(cur.sources.map((s) => s.tokens));
      return cur;
    },
    { init: { schema: 1, sources: [], tokens: null } },
  );
}

/** One-paragraph summary of tokens for tool output. */
export function describeTokens(t) {
  if (!t) return "nothing measured";
  const L = [];
  if (t.colors?.length) L.push(`colours: ${t.colors.slice(0, 8).map((c) => `${c.value}${c.role ? ` (${c.role})` : ""}`).join(", ")}`);
  if (t.type?.length) L.push(`type scale: ${t.type.slice(0, 8).map((x) => `${x.size}px${x.weight ? `/${x.weight}` : ""}`).join(", ")}${t.families?.length ? ` · faces: ${t.families.slice(0, 3).map((f) => f.family).join(", ")}` : ""}`);
  if (t.spacing?.length) L.push(`spacing steps (px): ${t.spacing.slice(0, 12).join(", ")}`);
  if (t.radii?.length) L.push(`radii: ${t.radii.join(", ")}`);
  if (t.shadows?.length) L.push(`shadows: ${t.shadows.length} (${t.shadows[0].slice(0, 60)}…)`);
  if (t.motion?.length) L.push(`motion: ${t.motion.join(", ")}`);
  if (t.grid) L.push(`grid: container ${t.grid.containerMax || "?"}px, columns ${(t.grid.columns || []).join("/") || "?"}`);
  L.push(`${Object.keys(t.vars || {}).length} custom properties`);
  return L.join("\n");
}
