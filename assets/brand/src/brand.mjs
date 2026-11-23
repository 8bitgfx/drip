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

// Mark space: the selection box is 0..S on both axes; paint bulges BAND below it and runs into drips.
export const S = 480;
const BAND = 24;
const DRIPS = [
  { x: 116, w: 66, len: 124, r: 38, f: 0.95 },
  { x: 238, w: 36, len: 52, r: 20, f: 0.8 },
  { x: 334, w: 86, len: 210, r: 50, f: 0.95 },
];
export const MARK_BOUNDS = { x: -24, y: -24, w: S + 48, h: S + BAND + 210 + 24 }; // incl. handles

function paintPath() {
  const YB = S + BAND, rc = 30;
  let d = `M0,0 H${S} V${YB - rc} Q${S},${YB} ${S - rc},${YB}`;
  const ds = [...DRIPS].sort((a, b) => b.x - a.x);
  // Shoulders may overlap their neighbours (the fill hides it) but never run past the bottom corners.
  ds.forEach(({ x: cx, w, len, r, f }) => {
    const n = w / 2, nn = n * 0.9, cy = YB + len - r;
    const fl = Math.min(w * f, S - rc - (cx + n), cx - n - rc);
    const top = Math.min(YB + fl, cy - r * 1.25); // where the shoulder turns vertical
    const mid = cy - r * 0.95; // narrowest point of the neck
    const pinch = mid - top > 8;
    // right side, going down: shoulder, neck (S-curve), bulb; every join has a vertical tangent
    d += ` L${r1(cx + n + fl)},${YB}`;
    d += ` C${r1(cx + n + fl * 0.4)},${YB} ${r1(cx + n)},${r1(YB + (top - YB) * 0.45)} ${r1(cx + n)},${r1(top)}`;
    const nx = pinch ? nn : n, ny = pinch ? mid : top;
    if (pinch) d += ` C${r1(cx + n)},${r1(top + (mid - top) * 0.5)} ${r1(cx + nn)},${r1(mid - (mid - top) * 0.5)} ${r1(cx + nn)},${r1(mid)}`;
    d += ` C${r1(cx + nx)},${r1(ny + (cy - ny) * 0.45)} ${r1(cx + r)},${r1(cy - r * 0.55)} ${r1(cx + r)},${r1(cy)}`;
    d += ` A${r},${r} 0 0 1 ${r1(cx - r)},${r1(cy)}`;
    // left side, going up: mirror
    d += ` C${r1(cx - r)},${r1(cy - r * 0.55)} ${r1(cx - nx)},${r1(ny + (cy - ny) * 0.45)} ${r1(cx - nx)},${r1(ny)}`;
    if (pinch) d += ` C${r1(cx - nn)},${r1(mid - (mid - top) * 0.5)} ${r1(cx - n)},${r1(top + (mid - top) * 0.5)} ${r1(cx - n)},${r1(top)}`;
    d += ` C${r1(cx - n)},${r1(YB + (top - YB) * 0.45)} ${r1(cx - n - fl * 0.4)},${YB} ${r1(cx - n - fl)},${YB}`;
  });
  return `${d} L${rc},${YB} Q0,${YB} 0,${YB - rc} Z`;
}

/** The mark (no background) in mark space. */
export function mark({ frame = COLORS.frameOnDark, handleFill = "#fff", hs = 40, sw = 6 } = {}) {
  const handles = [[0, 0], [S / 2, 0], [S, 0], [0, S / 2], [S, S / 2], [0, S], [S, S]]
    .map(([x, y]) => `<rect x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="5" fill="${handleFill}" stroke="${COLORS.blue}" stroke-width="${sw}"/>`)
    .join("");
  const big = DRIPS[2], cy = S + BAND + big.len - big.r, gr = big.r;
  const glint = `<path d="M${r1(big.x - gr * 0.55)},${r1(cy - gr * 0.05)} A${gr * 0.6},${gr * 0.6} 0 0 1 ${r1(big.x - gr * 0.05)},${r1(cy - gr * 0.55)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${r1(gr * 0.18)}" stroke-linecap="round"/>`;
  return `<path d="M0,${S} H${S}" stroke="${frame}" stroke-width="${sw}"/>`
    + `<path d="${paintPath()}" fill="${COLORS.blue}"/>${glint}`
    + `<path d="M0,${S} V0 H${S} V${S}" fill="none" stroke="${frame}" stroke-width="${sw}"/>${handles}`;
}

/** App / plugin icon, 1024 square. */
export function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.inkTop}"/><stop offset="1" stop-color="${COLORS.ink}"/></linearGradient></defs>
<rect width="1024" height="1024" rx="232" fill="url(#bg)"/>
<rect x="2" y="2" width="1020" height="1020" rx="230" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="4"/>
<g transform="translate(272 172)">${mark()}</g>
</svg>`;
}

/** Standalone mark, transparent. */
export function markSvg(theme = "light") {
  const b = MARK_BOUNDS;
  const frame = theme === "dark" ? COLORS.frameOnDark : COLORS.frameOnLight;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">${mark({ frame })}</svg>`;
}

const glyphs = JSON.parse(fs.readFileSync(new URL("./glyphs.json", import.meta.url), "utf8"));

/** Horizontal lockup: frame top on the ascender, frame bottom on the baseline, drips hang like a descender. */
export function wordmarkSvg(theme = "light", { pad = 40 } = {}) {
  const dark = theme === "dark";
  const k = -glyphs.ascender / S; // mark scale: frame height = ascender height
  const gap = 64, tx = S * k + gap;
  const top = glyphs.ascender - 24 * k, bottom = glyphs.ascender + (S + BAND + 210) * k;
  const w = tx + glyphs.width, h = bottom - top;
  const vb = `${-24 * k - pad} ${top - pad} ${w + 24 * k + pad * 2} ${h + pad * 2}`;
  const [, , vw, vh] = vb.split(" ").map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${r1(vw)}" height="${r1(vh)}">
<g transform="translate(0 ${glyphs.ascender}) scale(${r1(k * 1000) / 1000})">${mark({ frame: dark ? COLORS.frameOnDark : COLORS.frameOnLight, hs: 44, sw: 8 })}</g>
<path transform="translate(${r1(tx)} 0)" d="${glyphs.d}" fill="${dark ? COLORS.paper : COLORS.ink}"/>
</svg>`;
}
