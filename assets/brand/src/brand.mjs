// Drip brand geometry: "Out of bounds".
// A design tool's selection box around a block of ultramarine paint that won't stay inside it.
// Pure functions that return SVG strings; no dependencies. render.mjs turns them into files.
import fs from "node:fs";

export const COLORS = {
  blue: "#2340FF", // Drip ultramarine: the paint
  ink: "#0D0E12",
  inkTop: "#1B1D26",
  paper: "#F5F2EC",
  frameOnDark: "#93A2FF",
  frameOnLight: "#2340FF",
};

const r1 = (n) => +n.toFixed(1);

// Mark space: the selection box is 0..S on both axes; the paint fills it and runs out of the bottom edge.
// Drips: a concave fillet where they leave the box, a neck that swells slightly into a round tip.
export const S = 480;
const FILLET = 34;
const SWELL = 1.14; // the tip is a little wider than the neck, so it reads as liquid, not a bar
const DRIPS = [
  { x: 112, w: 64, len: 160 },
  { x: 240, w: 40, len: 78, s: 1.04 },
  { x: 372, w: 84, len: 240 },
];
const MAXLEN = Math.max(...DRIPS.map((d) => d.len)) + 8;
export const MARK_BOUNDS = { x: -24, y: -24, w: S + 48, h: S + MAXLEN + 48 }; // incl. handles

/** Paint filling a W x H box and dripping out of its bottom edge (README panels reuse it at other sizes). */
export function paint(W = S, H = S, drips = DRIPS, f = FILLET) {
  // f: shoulder fillet radius (the mark uses FILLET)
  let d = `M0,0 H${W} V${H}`;
  [...drips].sort((a, b) => b.x - a.x).forEach(({ x, w, len, s = SWELL }) => {
    const n = w / 2, t = n * s, cy = H + len - t, y0 = H + f, h = cy - y0;
    d += ` H${r1(x + n + f)} A${f},${f} 0 0 0 ${r1(x + n)},${y0}`;
    d += ` C${r1(x + n)},${r1(y0 + h * 0.55)} ${r1(x + t)},${r1(cy - h * 0.3)} ${r1(x + t)},${r1(cy)}`;
    d += ` A${r1(t)},${r1(t)} 0 0 1 ${r1(x - t)},${r1(cy)}`;
    d += ` C${r1(x - t)},${r1(cy - h * 0.3)} ${r1(x - n)},${r1(y0 + h * 0.55)} ${r1(x - n)},${y0}`;
    d += ` A${f},${f} 0 0 0 ${r1(x - n - f)},${H}`;
  });
  return `${d} H0 Z`;
}
const paintPath = () => paint();

/** The mark (no background) in mark space. */
export function mark({ frame = COLORS.frameOnDark, handleFill = "#fff", hs = 40, sw = 6 } = {}) {
  const handles = [[0, 0], [S / 2, 0], [S, 0], [0, S / 2], [S, S / 2], [0, S], [S, S]]
    .map(([x, y]) => `<rect x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="5" fill="${handleFill}" stroke="${COLORS.blue}" stroke-width="${sw}"/>`)
    .join("");
  return `<path d="${paintPath()}" fill="${COLORS.blue}"/>`
    + `<path d="M0,0 H${S} V${S} H0 Z" fill="none" stroke="${frame}" stroke-width="${sw}"/>${handles}`;
}

/** App / plugin icon, 1024 square. */
// Optical centring: the selection box is the body, so the box (not the box + drips) is centred.
// The box sits a touch above the tile's centre; the drips hang below it as detail.
const ICON_SCALE = 0.86, ICON_BOX_CY = 500;
export function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.inkTop}"/><stop offset="1" stop-color="${COLORS.ink}"/></linearGradient></defs>
<rect width="1024" height="1024" rx="232" fill="url(#bg)"/>
<rect x="2" y="2" width="1020" height="1020" rx="230" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="4"/>
<g transform="translate(${r1(512 - (S / 2) * ICON_SCALE)} ${r1(ICON_BOX_CY - (S / 2) * ICON_SCALE)}) scale(${ICON_SCALE})">${mark()}</g>
</svg>`;
}

/** Standalone mark, transparent. The viewBox is padded above by the drip length so the box sits at its centre:
 *  anything that centres the file centres the box, and the drips hang below. */
export function markSvg(theme = "light") {
  const b = { x: MARK_BOUNDS.x, y: -(MAXLEN + 24), w: MARK_BOUNDS.w, h: S + 2 * (MAXLEN + 24) };
  const frame = theme === "dark" ? COLORS.frameOnDark : COLORS.frameOnLight;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">${mark({ frame })}</svg>`;
}

const glyphs = JSON.parse(fs.readFileSync(new URL("./glyphs.json", import.meta.url), "utf8"));
/** Where the lockup's body (frame top = ascender to baseline) sits inside wordmarkSvg's viewBox, for optical layout. */
export function wordmarkBand({ pad = 40 } = {}) {
  const k = -glyphs.ascender / S;
  return { top: pad + 24 * k, bottom: pad + 24 * k + S * k, height: (S + MAXLEN + 48) * k + pad * 2 };
}

/** Horizontal lockup: frame top on the ascender, frame bottom on the baseline, drips hang like a descender. */
export function wordmarkSvg(theme = "light", { pad = 40 } = {}) {
  const dark = theme === "dark";
  const k = -glyphs.ascender / S; // mark scale: frame height = ascender height
  const gap = 64, tx = S * k + gap;
  const top = glyphs.ascender - 24 * k, bottom = glyphs.ascender + (S + MAXLEN + 24) * k;
  const w = tx + glyphs.width, h = bottom - top;
  const vb = `${-24 * k - pad} ${top - pad} ${w + 24 * k + pad * 2} ${h + pad * 2}`;
  const [, , vw, vh] = vb.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${r1(vw)}" height="${r1(vh)}">
<g transform="translate(0 ${glyphs.ascender}) scale(${r1(k * 1000) / 1000})">${mark({ frame: dark ? COLORS.frameOnDark : COLORS.frameOnLight, hs: 44, sw: 8 })}</g>
<path transform="translate(${r1(tx)} 0)" d="${glyphs.d}" fill="${dark ? COLORS.paper : COLORS.ink}"/>
</svg>`;
}
