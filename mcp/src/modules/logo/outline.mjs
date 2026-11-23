// Outline text to SVG paths with real font metrics, for wordmarks and lockups.
// Fonts come from Fontsource (any open font, by family name) or a local .ttf/.otf/.woff file.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import { get } from "../../core/http.mjs";
import { projectDir } from "../../core/paths.mjs";

export async function loadFont(font, weight = 400, style = "normal") {
  const local = path.resolve(projectDir(), font);
  if (/\.(ttf|otf|woff)$/i.test(font) && fs.existsSync(local)) {
    const b = fs.readFileSync(local);
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  const id = font.trim().toLowerCase().replace(/\s+/g, "-");
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${weight}-${style}.woff`;
  let body;
  try {
    ({ body } = await get(url, { as: "buffer", ttlMs: 30 * 24 * 3600e3 }));
  } catch {
    throw new Error(`Couldn't fetch "${font}" ${weight} ${style} from Fontsource (${url}). Check the family name with fonts_search, or pass a local .ttf/.otf/.woff path.`);
  }
  return opentype.parse(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
}

/**
 * Outline `text` at `size` px. Returns { svg, d, width, height, metrics, glyphs }.
 * Coordinates: baseline at y = ascender (so the SVG's top is the font's ascender line).
 */
export function outline(font, text, { size = 200, letterSpacing = 0, kerning = true } = {}) {
  const scale = size / font.unitsPerEm;
  const asc = font.ascender * scale;
  const desc = -font.descender * scale;
  const os2 = font.tables.os2 || {};
  const metrics = {
    unitsPerEm: font.unitsPerEm,
    size,
    ascender: +asc.toFixed(2),
    descender: +desc.toFixed(2),
    capHeight: os2.sCapHeight ? +(os2.sCapHeight * scale).toFixed(2) : null,
    xHeight: os2.sxHeight ? +(os2.sxHeight * scale).toFixed(2) : null,
    baselineY: +asc.toFixed(2),
  };
  const glyphs = [];
  let x = 0;
  const parts = [];
  // Glyph per character (no OpenType shaping: some fonts use GSUB formats opentype.js can't apply, and wordmarks are hand-tuned anyway).
  const chars = Array.from(text).map((ch) => font.charToGlyph(ch));
  chars.forEach((g, i) => {
    const p = g.getPath(x, asc, size);
    const bb = p.getBoundingBox();
    parts.push(p.toPathData(2));
    glyphs.push({ char: Array.from(text)[i], x: +x.toFixed(2), advance: +(g.advanceWidth * scale).toFixed(2), bbox: { x1: +bb.x1.toFixed(2), y1: +bb.y1.toFixed(2), x2: +bb.x2.toFixed(2), y2: +bb.y2.toFixed(2) } });
    x += g.advanceWidth * scale + letterSpacing * size;
    if (kerning && chars[i + 1]) {
      try {
        x += font.getKerningValue(g, chars[i + 1]) * scale;
      } catch {
        /* kerning table not readable: skip */
      }
    }
  });
  const width = Math.ceil(x - letterSpacing * size);
  const height = Math.ceil(asc + desc);
  const d = parts.join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${d}" fill="#111111"/></svg>`;
  return { svg, d, width, height, metrics, glyphs };
}
