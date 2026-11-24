// wordmark_build: outlined SVG wordmarks with kerning you control pair by pair. Where logo_outline gives one
// quick outline, this keeps an editable spec (font, weight, tracking, kerning pairs, ligatures, colours) next to
// the SVG, measures the gaps between letters, and previews the mark large, small and reversed.
// Fonts: open font family names (Fontsource) or the project's own .ttf/.otf/.woff files.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { ensureDir, ensureProjectDrip } from "../../core/paths.mjs";
import { renderHtml } from "../../core/render.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadFontFile, parseFont } from "./typecompare.mjs";

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "wordmark";
const wordmarksDir = () => path.join(ensureProjectDrip(), "wordmarks");

const n2 = (v) => +v.toFixed(2);
/** SVG path data from an opentype.js path (own formatter: toPathData is not stable across opentype.js versions). */
export function pathData(p) {
  return p.commands
    .map((c) => (c.type === "Z" ? "Z" : c.type === "M" || c.type === "L" ? `${c.type}${n2(c.x)} ${n2(c.y)}` : c.type === "Q" ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}` : `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}`))
    .join("");
}

/** The pairs a kerning object can name, "AV" style (two characters). Anything else is rejected with a hint. */
export function checkPairs(kerning = {}) {
  for (const [k, v] of Object.entries(kerning)) {
    if (Array.from(k).length !== 2) throw new Error(`Kerning pair "${k}" must be exactly two characters, e.g. "AV": -40 (thousandths of an em; negative = closer).`);
    if (!Number.isFinite(v)) throw new Error(`Kerning for "${k}" must be a number.`);
  }
}

/**
 * Lay the text out and outline it.
 * spec: { text, size, tracking, kerning, autoKern, ligatures, color, background, padding }
 * Returns { svg, d, width, height, glyphs: [{ char, x, advance, bbox }], gaps }.
 */
export function buildWordmark(font, spec) {
  const { text: str, size = 200, tracking = 0, kerning = {}, autoKern = true, ligatures = false, color = "#111111", background = null, padding = 0.12 } = spec;
  checkPairs(kerning);
  const scale = size / font.unitsPerEm;
  const glyphs = ligatures ? font.stringToGlyphs(str) : Array.from(str).map((ch) => font.charToGlyph(ch));
  const chars = ligatures ? glyphs.map((g) => g.name || (g.unicode ? String.fromCodePoint(g.unicode) : "?")) : Array.from(str);
  const baseline = font.ascender * scale;
  let x = 0;
  const placed = [];
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, baseline, size);
    const bb = p.getBoundingBox();
    placed.push({ char: chars[i], x: +x.toFixed(2), advance: +(g.advanceWidth * scale).toFixed(2), d: pathData(p), bbox: { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 }, empty: !p.commands.length });
    x += g.advanceWidth * scale + (tracking / 1000) * size;
    const next = glyphs[i + 1];
    if (next) {
      if (autoKern) {
        try {
          x += font.getKerningValue(g, next) * scale;
        } catch {
          /* kerning table unreadable: skip */
        }
      }
      const pair = `${chars[i]}${chars[i + 1]}`;
      if (kerning[pair] !== undefined) x += (kerning[pair] / 1000) * size;
    }
  });
  const inked = placed.filter((g) => !g.empty);
  const minX = Math.min(...inked.map((g) => g.bbox.x1));
  const maxX = Math.max(...inked.map((g) => g.bbox.x2));
  const minY = Math.min(...inked.map((g) => g.bbox.y1));
  const maxY = Math.max(...inked.map((g) => g.bbox.y2));
  const pad = padding * size;
  const w = Math.ceil(maxX - minX + 2 * pad);
  const h = Math.ceil(maxY - minY + 2 * pad);
  const dx = pad - minX;
  const dy = pad - minY;
  const paths = placed.filter((g) => !g.empty).map((g) => `<path data-char="${g.char.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}" d="${g.d}"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${background ? `<rect width="${w}" height="${h}" fill="${background}"/>` : ""}<g transform="translate(${+dx.toFixed(2)} ${+dy.toFixed(2)})" fill="${color}">${paths.join("")}</g></svg>`;
  // Gaps between the ink of neighbouring letters, in thousandths of an em.
  const gaps = [];
  for (let i = 0; i < placed.length - 1; i++) {
    const a = placed[i];
    const b = placed[i + 1];
    if (a.empty || b.empty) continue;
    gaps.push({ pair: `${a.char}${b.char}`, gap: Math.round(((b.bbox.x1 - a.bbox.x2) / size) * 1000) });
  }
  return { svg, width: w, height: h, glyphs: placed.map(({ d: _d, ...rest }) => rest), gaps, ink: { w: Math.round(maxX - minX), h: Math.round(maxY - minY) } };
}

/** Pairs that sit clearly looser or tighter than the average gap: where to look first. Bounding boxes only; the eye decides. */
export function gapReport(gaps) {
  if (gaps.length < 3) return { mean: gaps[0]?.gap ?? 0, outliers: [] };
  const mean = Math.round(gaps.reduce((a, g) => a + g.gap, 0) / gaps.length);
  const spread = Math.max(25, Math.round(Math.abs(mean) * 0.45));
  const outliers = gaps.filter((g) => Math.abs(g.gap - mean) > spread).map((g) => ({ ...g, suggest: Math.round((mean - g.gap) / 2 / 5) * 5 }));
  return { mean, outliers };
}

function previewHtml(svg, { color, background, width = 1400 }) {
  const rev = svg.replace(/<rect[^>]*\/>/, "").replace(/fill="[^"]*"(?=>)/, `fill="${background || "#ffffff"}"`);
  const bg = background || "#ffffff";
  const sized = (h) => svg.replace(/width="\d+" height="\d+"/, `style="height:${h}px;width:auto"`);
  const sizedRev = (h) => rev.replace(/width="\d+" height="\d+"/, `style="height:${h}px;width:auto"`);
  return `<div style="width:${width}px;background:${bg};font:12px system-ui;color:#777">
<div style="padding:56px 72px;display:flex;justify-content:center">${sized(220)}</div>
<div style="display:flex;gap:56px;align-items:center;padding:28px 72px;border-top:1px solid #0001">${sized(64)}${sized(32)}${sized(18)}</div>
<div style="display:flex;gap:56px;align-items:center;padding:28px 72px;background:${color || "#111111"}">${sizedRev(64)}${sizedRev(32)}${sizedRev(18)}</div></div>`;
}

export function register(server, ctx) {
  server.registerTool(
    "wordmark_build",
    {
      title: "Build an outlined wordmark with adjustable kerning",
      description:
        "Outlines a name in a real font into an SVG wordmark and keeps an editable spec. You control tracking (thousandths of an em), kerning per pair (\"AV\": -40), ligatures and colours; it reports the gaps between letters (which pairs sit loose or tight) and previews the mark large, small (64/32/18 px) and reversed. " +
        "Saves .drip/wordmarks/<name>/wordmark.svg + wordmark.json + preview.png. To tune: call again with from: \"<name>\" and only what changes (kerning merges). Use fonts_compare first to pick the face; logo_outline is the quick one-off. " +
        'Example: wordmark_build({ name: "bakery", font: "Fraunces", weight: 600, text: "Dawn & Crumb", tracking: -10, kerning: { "w&": 20 } })',
      inputSchema: {
        text: z.string().min(1).max(60).optional().describe("The name (required unless from is given)"),
        font: z.string().optional().describe("Open font family (Fontsource) or a local .ttf/.otf/.woff path"),
        weight: z.number().int().min(100).max(900).optional().describe("Default 700; the nearest weight the family has is used"),
        size: z.number().min(40).max(600).optional().describe("Drawing size in px (default 200); the SVG scales anyway"),
        tracking: z.number().min(-200).max(600).optional().describe("Letter-spacing in thousandths of an em (default 0)"),
        kerning: z.record(z.string(), z.number()).optional().describe('Extra kerning per pair, thousandths of an em: { "AV": -40, "To": -25 }. Adds to the font\'s own kerning'),
        autoKern: z.boolean().optional().describe("Apply the font's own kerning table (default true)"),
        ligatures: z.boolean().optional().describe("Use the font's standard ligatures (fi, fl...) (default false)"),
        color: z.string().optional().describe("Ink colour (default #111111)"),
        background: z.string().optional().describe("Background colour baked into the SVG (default none) and the preview"),
        name: z.string().optional().describe("Folder name under .drip/wordmarks (default: the text)"),
        from: z.string().optional().describe("Start from a saved wordmark's spec; other arguments override it"),
      },
    },
    safe(async (args) => {
      let base = {};
      if (args.from) {
        const f = path.join(wordmarksDir(), slug(args.from), "wordmark.json");
        if (!fs.existsSync(f)) return text(`No saved wordmark "${args.from}" (looked for ${f}). Build it first, or drop "from".`, true);
        base = JSON.parse(fs.readFileSync(f, "utf8"));
      }
      const spec = {
        text: args.text ?? base.text,
        font: args.font ?? base.font,
        weight: args.weight ?? base.weight ?? 700,
        size: args.size ?? base.size ?? 200,
        tracking: args.tracking ?? base.tracking ?? 0,
        kerning: { ...(base.kerning || {}), ...(args.kerning || {}) },
        autoKern: args.autoKern ?? base.autoKern ?? true,
        ligatures: args.ligatures ?? base.ligatures ?? false,
        color: args.color ?? base.color ?? "#111111",
        background: args.background ?? base.background ?? null,
      };
      if (!spec.text || !spec.font) return text("Pass text and font (or from: a saved wordmark).", true);
      checkPairs(spec.kerning);
      const file = await loadFontFile(spec.font, spec.weight);
      const font = parseFont(file.buf);
      const missing = Array.from(spec.text).filter((ch) => ch.trim() && font.charToGlyph(ch).index === 0);
      if (missing.length) return text(`${file.family} has no glyph for: ${[...new Set(missing)].join(" ")}. Pick another font or change the text.`, true);
      const out = buildWordmark(font, spec);
      const name = slug(args.name || args.from || spec.text);
      const dir = ensureDir(path.join(wordmarksDir(), name));
      const saved = { version: 1, ...spec, family: file.family, usedWeight: file.weight, fontFile: file.local ? spec.font : undefined, savedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(dir, "wordmark.svg"), out.svg);
      fs.writeFileSync(path.join(dir, "wordmark.json"), JSON.stringify(saved, null, 2));
      const report = gapReport(out.gaps);
      const lines = [
        `Wordmark "${spec.text}" in ${file.family} ${file.weight}${file.weight !== spec.weight ? ` (nearest to ${spec.weight})` : ""}: ${out.ink.w}x${out.ink.h} px ink at size ${spec.size}.`,
        `Saved ${dir} (wordmark.svg, wordmark.json${"; preview.png below"}).`,
        `Gaps between letters (thousandths of an em, bounding boxes): ${out.gaps.map((g) => `${g.pair} ${g.gap}`).join(", ")}. Mean ${report.mean}.`,
        report.outliers.length
          ? `Look first at: ${report.outliers.map((o) => `${o.pair} (${o.gap}, try ${o.suggest > 0 ? "+" : ""}${o.suggest})`).join(", ")}. Round letters sit closer than straight ones on purpose: judge by squinting at the small sizes, not the numbers.`
          : "No pair stands out by the numbers; check the small sizes by eye.",
        `To adjust: wordmark_build({ from: "${name}", kerning: { "${out.gaps[0]?.pair || "AV"}": -20 } }). Spec: ${JSON.stringify({ font: spec.font, weight: spec.weight, tracking: spec.tracking, kerning: spec.kerning, ligatures: spec.ligatures })}`,
      ];
      const content = [textBlock(lines.join("\n"))];
      try {
        const png = await renderHtml(previewHtml(out.svg, spec), path.join(dir, "preview.png"), { width: 1400, height: 572, config: ctx.config() });
        content.push(imageBlock(await toJpeg(png, 1400, 600, 86)));
      } catch (err) {
        content.push(textBlock(`(No preview: ${String(err.message || err).slice(0, 120)})`));
      }
      return blocks(content);
    }),
  );
}
