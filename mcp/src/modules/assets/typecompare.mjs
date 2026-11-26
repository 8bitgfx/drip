// fonts_compare: candidate typefaces side by side on YOUR copy, with the numbers a designer reads off the files
// (x-height, cap height, width per em, stroke contrast, weight). Fonts are open fonts by family name (Fontsource)
// or local .ttf/.otf/.woff files; they are embedded in the page, so what you see is what the file draws.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import opentype from "opentype.js";
import { z } from "zod";
import { withTab, openPage } from "../../core/browser.mjs";
import { get } from "../../core/http.mjs";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { rendersDir, stamp } from "../../core/render.mjs";
import { noteFontResearch } from "./fonts.mjs";
import { escHtml as esc } from "../../core/util.mjs";

const API = "https://api.fontsource.org/v1/fonts";
const DAY30 = 30 * 24 * 3600e3;

const toArrayBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

/** The family name stored in a font file (names are grouped by platform in opentype.js). */
export function familyName(font) {
  const n = font.names || {};
  return n.fontFamily?.en || n.windows?.fontFamily?.en || n.unicode?.fontFamily?.en || n.macintosh?.fontFamily?.en || "";
}

export const parseFont = (buf) => opentype.parse(toArrayBuffer(Buffer.from(buf)));

/**
 * Get one font file: a local path (project-relative or absolute) or an open font family at the nearest
 * available weight. Returns { buf, family, weight, id, local, format, category? }.
 */
export async function loadFontFile(spec, weight = 400) {
  const s = String(spec).trim();
  const local = path.resolve(projectDir(), s);
  if (/\.(ttf|otf|woff)$/i.test(s)) {
    if (!fs.existsSync(local)) throw new Error(`Font file not found: ${local}`);
    return { buf: fs.readFileSync(local), family: path.basename(s).replace(/\.[^.]+$/, ""), weight, id: local, local: true, format: path.extname(s).slice(1).toLowerCase() };
  }
  if (/\.woff2$/i.test(s)) throw new Error("woff2 files can't be read for metrics; pass the .ttf, .otf or .woff of the same font");
  const id = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let meta;
  try {
    ({ body: meta } = await get(`${API}/${id}`, { as: "json", ttlMs: 7 * 24 * 3600e3 }));
  } catch {
    throw new Error(`No open font "${s}" (looked up "${id}" on Fontsource). Check the name with fonts_search, or pass a .ttf/.otf/.woff path.`);
  }
  const have = (meta.weights || []).map(Number);
  const w = have.length ? have.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a)) : weight;
  const url = meta.variants?.[String(w)]?.normal?.[meta.defSubset || "latin"]?.url?.woff || `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${w}-normal.woff`;
  const { body } = await get(url, { as: "buffer", ttlMs: DAY30 });
  return { buf: body, family: meta.family, weight: w, id, local: false, format: "woff", category: meta.category, license: meta.license };
}

// ---- metrics ----------------------------------------------------------------------------------------------

function flatten(path2) {
  // Path commands -> closed polylines (curves sampled at 12 steps), in font units (y up after our flip).
  const polys = [];
  let cur = [];
  let px = 0;
  let py = 0;
  const bez = (pts, n = 12) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      if (pts.length === 3) cur.push([u * u * pts[0][0] + 2 * u * t * pts[1][0] + t * t * pts[2][0], u * u * pts[0][1] + 2 * u * t * pts[1][1] + t * t * pts[2][1]]);
      else cur.push([u * u * u * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t * t * t * pts[3][0], u * u * u * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t * t * t * pts[3][1]]);
    }
  };
  for (const c of path2.commands) {
    if (c.type === "M") {
      if (cur.length) polys.push(cur);
      cur = [[c.x, c.y]];
    } else if (c.type === "L") cur.push([c.x, c.y]);
    else if (c.type === "Q") bez([[px, py], [c.x1, c.y1], [c.x, c.y]]);
    else if (c.type === "C") bez([[px, py], [c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]]);
    else if (c.type === "Z") {
      if (cur.length) polys.push(cur);
      cur = [];
    }
    if (c.x !== undefined) {
      px = c.x;
      py = c.y;
    }
  }
  if (cur.length) polys.push(cur);
  return polys;
}

/** Sorted crossings of a scanline with all polygon edges. axis "y": horizontal line at `at`, returns x's. */
function crossings(polys, at, axis) {
  const xs = [];
  const [a, b] = axis === "y" ? [1, 0] : [0, 1];
  for (const poly of polys)
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      if (p[a] <= at !== q[a] <= at) xs.push(p[b] + ((at - p[a]) / (q[a] - p[a])) * (q[b] - p[b]));
    }
  return xs.sort((m, n) => m - n);
}

/** Width of the "l" stem at mid height, in em (serifs and tails ignored). */
export function stemWidth(font) {
  const g = font.charToGlyph("l");
  if (!g || g.index === 0) return null;
  const upm = font.unitsPerEm;
  const p = g.getPath(0, 0, upm);
  const bb = p.getBoundingBox();
  const xs = crossings(flatten(p).map((poly) => poly.map(([x, y]) => [x, -y])), -(bb.y1 + bb.y2) / 2, "y");
  return xs.length >= 2 ? (xs[1] - xs[0]) / upm : null;
}

/** Thick (vertical stems) and thin (horizontal strokes) of the "o", in em, and their ratio. */
export function strokeContrast(font) {
  const g = font.charToGlyph("o");
  if (!g || g.index === 0) return null;
  const upm = font.unitsPerEm;
  const polys = flatten(g.getPath(0, 0, upm)).map((p) => p.map(([x, y]) => [x, -y])); // getPath is y-down
  const bb = g.getPath(0, 0, upm).getBoundingBox();
  const midY = -(bb.y1 + bb.y2) / 2;
  const midX = (bb.x1 + bb.x2) / 2;
  const xs = crossings(polys, midY, "y");
  const ys = crossings(polys, midX, "x");
  if (xs.length < 4 || ys.length < 4) return null;
  const thick = (xs[1] - xs[0] + (xs[xs.length - 1] - xs[xs.length - 2])) / 2;
  const thin = (ys[1] - ys[0] + (ys[ys.length - 1] - ys[ys.length - 2])) / 2;
  if (!(thin > 0)) return null;
  return { thick: thick / upm, thin: thin / upm, ratio: thick / thin };
}

/** What a designer reads off a font file, all as fractions of the em (x-height etc.) or plain ratios. */
export function fontMetrics(font) {
  const upm = font.unitsPerEm;
  const box = (ch) => {
    const g = font.charToGlyph(ch);
    return g && g.index !== 0 ? g.getPath(0, 0, upm).getBoundingBox() : null;
  };
  const x = box("x");
  const H = box("H");
  const os2 = font.tables.os2 || {};
  const xHeight = x ? -x.y1 / upm : os2.sxHeight ? os2.sxHeight / upm : null;
  const capHeight = H ? -H.y1 / upm : os2.sCapHeight ? os2.sCapHeight / upm : null;
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const adv = [...lower].map((c) => font.charToGlyph(c).advanceWidth / upm);
  const avgWidth = adv.reduce((a, b) => a + b, 0) / adv.length;
  const stem = stemWidth(font);
  const contrast = strokeContrast(font);
  const r = (v, n = 3) => (v == null ? null : +v.toFixed(n));
  return {
    unitsPerEm: upm,
    xHeight: r(xHeight),
    capHeight: r(capHeight),
    xToCap: xHeight && capHeight ? r(xHeight / capHeight, 2) : null,
    ascender: r(font.ascender / upm, 2),
    descender: r(font.descender / upm, 2),
    avgWidth: r(avgWidth),
    width: avgWidth < 0.47 ? "narrow" : avgWidth > 0.56 ? "wide" : "normal",
    stem: r(stem, 3),
    contrast: contrast ? r(contrast.ratio, 2) : null,
    contrastClass: contrast ? (contrast.ratio < 1.15 ? "monoline" : contrast.ratio < 1.6 ? "low contrast" : contrast.ratio < 2.5 ? "moderate contrast" : "high contrast") : null,
    glyphs: font.numGlyphs,
  };
}

// ---- the sheet --------------------------------------------------------------------------------------------


export function sheetHtml(cards, { headline, body, sizes = [56, 18], width = 1400, cols }) {
  const n = cols || (cards.length <= 2 ? cards.length : cards.length === 4 ? 2 : 3);
  const faces = cards
    .flatMap((c, i) =>
      c.files.map((f) => `@font-face{font-family:"c${i}";font-weight:${f.weight};font-style:normal;src:url(data:font/${f.format === "woff" ? "woff" : f.format === "otf" ? "otf" : "ttf"};base64,${f.buf.toString("base64")}) format("${f.format === "woff" ? "woff" : f.format === "otf" ? "opentype" : "truetype"}")}`),
    )
    .join("\n");
  const html = cards
    .map((c, i) => {
      const heavy = c.files[c.files.length - 1].weight;
      const light = c.files[0].weight;
      const m = c.metrics;
      return `<section>
  <header><b>${esc(c.label)}</b><span>${esc(c.files.map((f) => f.weight).join(" / "))}${c.category ? ` · ${esc(c.category)}` : ""}</span></header>
  <h1 style="font-family:'c${i}';font-weight:${heavy};font-size:${sizes[0]}px">${esc(headline)}</h1>
  <p style="font-family:'c${i}';font-weight:${light};font-size:${sizes[1]}px">${esc(body)}</p>
  <div class=w>${c.files.map((f) => `<span style="font-family:'c${i}';font-weight:${f.weight}">Aa ${f.weight}</span>`).join("")}<span style="font-family:'c${i}';font-weight:${light};font-variant-numeric:tabular-nums">$1,234.56 0123456789</span></div>
  <footer>x-height ${m.xHeight} · cap ${m.capHeight} · width ${m.avgWidth} (${m.width}) · ${m.contrastClass || "contrast ?"}${m.contrast ? ` ${m.contrast}:1` : ""}</footer>
</section>`;
    })
    .join("\n");
  return `<!doctype html><meta charset=utf-8><style>${faces}
*{box-sizing:border-box}body{margin:0;background:#f6f5f1;color:#16140f;font:13px/1.4 system-ui,sans-serif}
.g{display:grid;grid-template-columns:repeat(${n},1fr);gap:1px;background:#d9d6cd;padding:1px}
section{background:#fbfaf7;padding:28px 32px 20px;min-width:0}
header{display:flex;justify-content:space-between;align-items:baseline;color:#77716a;margin-bottom:18px}header b{color:#16140f;font-weight:600;font-size:14px}
h1{margin:0 0 16px;line-height:1.08;letter-spacing:-.01em;overflow-wrap:anywhere}
p{margin:0 0 18px;line-height:1.55;color:#3d3a33;max-width:62ch}
.w{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;font-size:22px;color:#16140f;margin-bottom:14px}
.w span:last-child{font-size:16px;color:#3d3a33}
footer{color:#77716a;font-size:12px;border-top:1px solid #e6e3da;padding-top:10px}</style><div class=g style="width:${width}px">${html}</div>`;
}

async function renderSheet(html, { width, config }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-fonts-"));
  const file = path.join(dir, "sheet.html");
  fs.writeFileSync(file, html);
  try {
    return await withTab(config, async (tab) => {
      await openPage(tab, pathToFileURL(file).href, { width, height: 900, settleMs: 400 });
      const { result } = await tab.s("Runtime.evaluate", { expression: "Math.ceil(document.querySelector('.g').getBoundingClientRect().height)", returnByValue: true });
      const height = Math.min(4000, result.value || 900);
      const { data } = await tab.s("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true });
      return Buffer.from(data, "base64");
    });
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      /* temp dir locked on Windows */
    }
  }
}

export function metricsTable(cards) {
  const head = "font | weights | x-height | cap | x/cap | width/em | stroke contrast | stem";
  const rows = cards.map((c) => `${c.label} | ${c.files.map((f) => f.weight).join("/")} | ${c.metrics.xHeight} | ${c.metrics.capHeight} | ${c.metrics.xToCap} | ${c.metrics.avgWidth} ${c.metrics.width} | ${c.metrics.contrast ? `${c.metrics.contrast}:1 ${c.metrics.contrastClass}` : "?"} | ${c.metrics.stem}`);
  return [head, ...rows].join("\n");
}

export function register(server, ctx) {
  server.registerTool(
    "fonts_compare",
    {
      title: "Compare typefaces on your copy",
      description:
        "Candidate fonts side by side in ONE sheet, set with your real headline and body text, plus measured facts from the font files (x-height, cap height, width per em, stroke contrast, stem). " +
        "Use it after fonts_pair / fonts_search to choose between 2-6 faces with your eyes and numbers, and again to check a wordmark candidate. Fonts: open font family names (Fontsource) or local .ttf/.otf/.woff paths (the project's own fonts). " +
        'Example: fonts_compare({ fonts: ["<candidate 1>", "<candidate 2>", "<candidate 3>"], headline: "Slow bread, baked at dawn", body: "Small-batch loaves for the street.", weights: [400, 700] })',
      inputSchema: {
        fonts: z.array(z.string()).min(1).max(8).describe("Family names (open fonts) or local font file paths"),
        text: z.string().max(200).optional().describe("The headline to set (default: a sample line)"),
        body: z.string().max(400).optional().describe("A body sentence or two (default: sample prose with numerals)"),
        sizes: z.array(z.number().min(10).max(160)).min(1).max(2).optional().describe("[headline px, body px], default [56, 18]"),
        weights: z.array(z.number().int().min(100).max(900)).min(1).max(4).optional().describe("Weights to show, default [400, 700]; the nearest the family has is used"),
      },
    },
    safe(async ({ fonts, text: headline = "Ship the product, not the template", body = "The quick brown fox jumps over the lazy dog. Pricing starts at $29 a month: 1,234 teams, 99.9% uptime.", sizes = [56, 18], weights = [400, 700] }) => {
      noteFontResearch();
      const ws = [...new Set(weights)].sort((a, b) => a - b);
      const failed = [];
      const cards = (
        await Promise.all(
          fonts.map(async (spec) => {
            try {
              const files = [];
              for (const w of ws) {
                const f = await loadFontFile(spec, w);
                if (!files.some((x) => x.weight === f.weight)) files.push(f);
              }
              files.sort((a, b) => a.weight - b.weight);
              // metrics from the regular-ish file (closest to 400)
              const base = files.reduce((a, b) => (Math.abs(b.weight - 400) < Math.abs(a.weight - 400) ? b : a));
              const metrics = fontMetrics(parseFont(base.buf));
              const font = parseFont(base.buf);
              const label = files[0].local ? familyName(font) || files[0].family : files[0].family;
              return { label, spec, files, metrics, category: files[0].category };
            } catch (err) {
              failed.push(`${spec}: ${err.message}`);
              return null;
            }
          }),
        )
      ).filter(Boolean);
      if (!cards.length) return text(`No font could be loaded.\n${failed.join("\n")}`, true);
      const width = cards.length === 1 ? 900 : cards.length === 2 ? 1400 : 1500;
      const png = await renderSheet(sheetHtml(cards, { headline, body, sizes, width }), { width, config: ctx.config() });
      const dir = rendersDir();
      const file = path.join(dir, `fonts-${stamp()}.png`);
      fs.writeFileSync(file, png);
      return blocks([
        textBlock(`Compared ${cards.length} font${cards.length > 1 ? "s" : ""} (saved ${file}):\n${metricsTable(cards)}${failed.length ? `\n\nNot loaded:\n${failed.join("\n")}` : ""}\n\nRead it: similar x-height and width pair easily; a big x-height gap means one needs a size step down. Contrast and stem say whether the faces feel like the same hand.`),
        imageBlock(await toJpeg(png, 1600, 4000, 86)),
      ]);
    }),
  );
}
