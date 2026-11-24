// Small deterministic toolkit for generated art: a seeded random generator, 2D simplex noise, colour mixing and
// path helpers. Everything is pure: the same seed always gives the same numbers, on every machine.

/** mulberry32: a fast 32-bit seeded generator. rng() is in [0, 1). */
export function rng(seed = 1) {
  let a = (Number(seed) >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

/** Derive a child seed from a seed and a label, so layers never share a random stream. */
export function subSeed(seed, label) {
  let h = (Number(seed) >>> 0) ^ 0x9e3779b9;
  for (const ch of String(label)) h = Math.imul(h ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0;
  return h >>> 0 || 1;
}

const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

/** 2D simplex noise in [-1, 1]. Returns noise(x, y). */
export function simplex(seed = 1) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  return (xin, yin) => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const corner = (x, y, gi) => {
      const t0 = 0.5 - x * x - y * y;
      if (t0 < 0) return 0;
      const g = GRAD[gi % 8];
      return t0 * t0 * t0 * t0 * (g[0] * x + g[1] * y);
    };
    return 70 * (corner(x0, y0, perm[ii + perm[jj]]) + corner(x1, y1, perm[ii + i1 + perm[jj + j1]]) + corner(x2, y2, perm[ii + 1 + perm[jj + 1]]));
  };
}

/** Fractal noise: `octaves` layers of simplex, roughly in [-1, 1]. */
export function fbm(noise, x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ---- colour -----------------------------------------------------------------------------------------------

export function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n) || h.length < 6) throw new Error(`Not a hex colour: ${hex}`);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgbToHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** Mix colour a toward b by t (0..1), in sRGB. */
export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}

export const lighten = (c, t) => mix(c, "#ffffff", t);
export const darken = (c, t) => mix(c, "#000000", t);

/** Relative luminance 0..1 (WCAG). */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---- paths ------------------------------------------------------------------------------------------------

const f = (v, d = 1) => {
  const s = v.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};
export const num = f;

/** Polyline "M x y L ..." with `d` decimals. */
export function polyline(points, d = 1) {
  if (points.length < 2) return "";
  let out = `M${f(points[0][0], d)} ${f(points[0][1], d)}`;
  for (let i = 1; i < points.length; i++) out += `L${f(points[i][0], d)} ${f(points[i][1], d)}`;
  return out;
}

/** Smooth closed or open curve through points (Catmull-Rom converted to cubic Beziers). */
export function smoothPath(points, { closed = false, tension = 0.5, d = 1 } = {}) {
  const n = points.length;
  if (n < 3) return polyline(points, d);
  const at = (i) => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let out = `M${f(points[0][0], d)} ${f(points[0][1], d)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const t = tension / 3;
    out += `C${f(p1[0] + (p2[0] - p0[0]) * t, d)} ${f(p1[1] + (p2[1] - p0[1]) * t, d)} ${f(p2[0] - (p3[0] - p1[0]) * t, d)} ${f(p2[1] - (p3[1] - p1[1]) * t, d)} ${f(p2[0], d)} ${f(p2[1], d)}`;
  }
  return closed ? `${out}Z` : out;
}

/** Ramer-Douglas-Peucker: drop points closer than `eps` to the line between their neighbours. */
export function simplify(points, eps = 0.4) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let idx = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((by - ay) * points[i][0] - (bx - ax) * points[i][1] + bx * ay - by * ax) / len;
      if (dist > max) {
        max = dist;
        idx = i;
      }
    }
    if (max > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
