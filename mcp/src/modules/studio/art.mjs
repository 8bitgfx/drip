// Procedural artwork: seeded SVG layers (flow fields, topographic contours, blobs, Truchet tiles, halftone, dither,
// isometric blocks, grain gradients) stacked into heroes, section backgrounds and motifs. Everything is a pure
// function of (layer type, seed, params, palette, size): the result is a layer stack you can read, edit and re-run.
import { meshGradient } from "../assets/gradient.mjs";
import { darken, fbm, hexToRgb, lighten, luminance, num, rng, simplex, simplify, smoothPath, subSeed } from "./rng.mjs";

export const MOODS = {
  calm: ["#0f1b1d", "#2e6f72", "#8fc9bd", "#e6f0e6", "#f3d9a4"],
  warm: ["#1a0f0b", "#c4472d", "#f08a4b", "#f6d6a8", "#fff3e0"],
  bold: ["#f4efe6", "#e8452c", "#1f3bff", "#111111", "#ffd23f"],
  editorial: ["#f3efe6", "#1b1b1b", "#6b6257", "#b9532f", "#d9d2c3"],
  technical: ["#0b1220", "#5ad1ff", "#2a5bd7", "#9db4d6", "#e6edf7"],
  playful: ["#fff4d6", "#ff6b6b", "#4d96ff", "#6bcb77", "#ffd93d"],
  dark: ["#0a0a0f", "#6e56cf", "#3dd6f5", "#e6e6f0", "#ff6b9d"],
  mono: ["#f5f5f2", "#111111", "#555555", "#999999", "#cccccc"],
};

// Which layers a composition stacks for each mood. The result is an ordinary layer list: edit it and pass it back as `layers`.
export const COMPOSITIONS = {
  calm: [["grain", { calm: "none", grain: 0.1 }], ["contours", { levels: 14, opacity: 0.35, colors: [3] }], ["blobs", { count: 3, blur: 60, opacity: 0.45, colors: [1, 2] }]],
  warm: [["grain", { calm: "left", grain: 0.14 }], ["flow", { sep: 20, strokeWidth: 1, opacity: 0.4, colors: [4, 3] }]],
  bold: [["blobs", { count: 4, size: [0.25, 0.5], opacity: 1, colors: [1, 2, 4] }], ["truchet", { style: "fills", cells: 8, opacity: 0.9, colors: [3, 2] }]],
  editorial: [["halftone", { field: "radial", size: 14, colors: [1] }], ["flow", { sep: 24, strokeWidth: 0.8, opacity: 0.5, colors: [2, 3] }]],
  technical: [["contours", { levels: 18, opacity: 0.5, colors: [1, 3] }], ["dither", { field: "radial", cell: 6, opacity: 0.25, colors: [1] }]],
  playful: [["blobs", { count: 9, size: [0.08, 0.2], opacity: 1, colors: [1, 2, 3, 4], blur: 0 }], ["truchet", { style: "arcs", cells: 14, strokeWidth: 5, opacity: 0.85, colors: [2, 1] }]],
  dark: [["grain", { calm: "none", grain: 0.16 }], ["flow", { sep: 18, strokeWidth: 0.9, opacity: 0.5, colors: [2, 3] }]],
  mono: [["halftone", { field: "linear", size: 12, colors: [1] }]],
};

export const LAYER_TYPES = ["grain", "flow", "contours", "blobs", "truchet", "halftone", "dither", "isometric"];

export function resolvePalette(palette, mood = "calm") {
  const list = palette?.length >= 2 ? palette : MOODS[mood] || MOODS.calm;
  list.forEach((c) => hexToRgb(c)); // throws a clear error on a bad colour
  return { all: list, bg: list[0], inks: list.slice(1) };
}

const ink = (pal, c, fallback = 0) => {
  if (typeof c === "string") return c;
  const i = Number.isInteger(c) ? c : fallback;
  return pal.all[((i % pal.all.length) + pal.all.length) % pal.all.length];
};
const inkList = (pal, colors, fallback) => (colors?.length ? colors : fallback).map((c) => ink(pal, c));

/** A value field 0..1 over the canvas: radial, linear (angle), noise or a mix. */
function fieldFn({ width, height, noise }, kind = "radial", { scale = 0.0016, angle = 35, invert = false } = {}) {
  const cx = width / 2;
  const cy = height / 2;
  const maxD = Math.hypot(cx, cy);
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const span = Math.abs(width * dx) + Math.abs(height * dy);
  const fn =
    kind === "linear"
      ? (x, y) => ((x - cx) * dx + (y - cy) * dy) / span + 0.5
      : kind === "noise"
        ? (x, y) => (fbm(noise, x * scale, y * scale, 4) + 1) / 2
        : (x, y) => 1 - Math.hypot(x - cx, y - cy) / maxD;
  return (x, y) => {
    const v = Math.max(0, Math.min(1, fn(x, y)));
    return invert ? 1 - v : v;
  };
}

const wrap = (inner, { opacity = 1, blend } = {}) => `<g${opacity < 1 ? ` opacity="${num(opacity, 2)}"` : ""}${blend && blend !== "normal" ? ` style="mix-blend-mode:${blend}"` : ""}>${inner}</g>`;

// ---- layers: each returns { svg, defs? } -------------------------------------------------------------------

function flow(ctx, p) {
  const { width, height, rnd, noise, pal } = ctx;
  const { sep, steps, step, scale, octaves, curl, strokeWidth, opacity, colors, blend } = p;
  const cols = Math.ceil(width / sep) + 1;
  const rows = Math.ceil(height / sep) + 1;
  const grid = new Int32Array(cols * rows);
  const cell = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? -1 : Math.floor(y / sep) * cols + Math.floor(x / sep));
  const angle = (x, y) => fbm(noise, x * scale, y * scale, octaves) * Math.PI * 2 * curl;
  const seeds = [];
  const spacing = sep * 1.6;
  for (let y = 0; y < height; y += spacing) for (let x = 0; x < width; x += spacing) seeds.push([x + rnd() * spacing, y + rnd() * spacing]);
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
  }
  const palette = inkList(pal, colors, [1, 2]);
  const byColor = palette.map(() => []);
  let id = 1;
  for (const [sx, sy] of seeds) {
    if (cell(sx, sy) < 0 || grid[cell(sx, sy)]) continue;
    const mine = id++;
    const trace = (dir) => {
      const pts = [];
      let x = sx;
      let y = sy;
      for (let s = 0; s < steps; s++) {
        const c = cell(x, y);
        if (c < 0) break;
        if (grid[c] && grid[c] !== mine && s > 1) break;
        grid[c] = mine;
        pts.push([x, y]);
        const a = angle(x, y);
        x += Math.cos(a) * step * dir;
        y += Math.sin(a) * step * dir;
      }
      return pts;
    };
    const back = trace(-1).reverse();
    const fwd = trace(1);
    const pts = simplify([...back, ...fwd.slice(1)], 0.35);
    if (pts.length < 5) continue;
    byColor[(rnd() * palette.length) | 0].push(smoothPath(pts, { d: 1 }));
  }
  const svg = byColor
    .map((paths, i) => (paths.length ? `<path d="${paths.join("")}" fill="none" stroke="${palette[i]}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>` : ""))
    .join("");
  return { svg: wrap(svg, { opacity, blend }), info: { lines: byColor.reduce((a, l) => a + l.length, 0) } };
}

function marching(vals, cols, rows, res, level) {
  const segs = [];
  const pt = (kind, i, j) => {
    // interpolated point on the grid edge: "h" = (i,j)-(i+1,j), "v" = (i,j)-(i,j+1)
    const [a, b] = kind === "h" ? [vals[j * cols + i], vals[j * cols + i + 1]] : [vals[j * cols + i], vals[(j + 1) * cols + i]];
    const t = (level - a) / (b - a || 1e-9);
    return kind === "h" ? { k: `h${i},${j}`, x: (i + t) * res, y: j * res } : { k: `v${i},${j}`, x: i * res, y: (j + t) * res };
  };
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < cols - 1; i++) {
      const tl = vals[j * cols + i];
      const tr = vals[j * cols + i + 1];
      const br = vals[(j + 1) * cols + i + 1];
      const bl = vals[(j + 1) * cols + i];
      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const top = () => pt("h", i, j);
      const bottom = () => pt("h", i, j + 1);
      const left = () => pt("v", i, j);
      const right = () => pt("v", i + 1, j);
      const add = (a, b) => segs.push([a(), b()]);
      switch (idx) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(top, left); break;
        case 5: case 10: {
          const centre = (tl + tr + br + bl) / 4 > level;
          if ((idx === 5) === centre) {
            add(top, left);
            add(bottom, right);
          } else {
            add(top, right);
            add(left, bottom);
          }
          break;
        }
        default:
      }
    }
  return segs;
}

function joinSegments(segs) {
  const ends = new Map();
  segs.forEach((s, i) => s.forEach((p) => (ends.get(p.k) || ends.set(p.k, []).get(p.k)).push(i)));
  const used = new Uint8Array(segs.length);
  const lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line = [segs[i][0], segs[i][1]];
    const extend = (atEnd) => {
      for (;;) {
        const tip = atEnd ? line[line.length - 1] : line[0];
        const next = (ends.get(tip.k) || []).find((j) => !used[j]);
        if (next === undefined) return;
        used[next] = 1;
        const [a, b] = segs[next];
        const other = a.k === tip.k ? b : a;
        if (atEnd) line.push(other);
        else line.unshift(other);
        if (other.k === (atEnd ? line[0].k : line[line.length - 1].k)) return; // closed loop
      }
    };
    extend(true);
    extend(false);
    lines.push(line.map((p) => [p.x, p.y]));
  }
  return lines;
}

function chaikin(points, closed) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n - (closed ? 0 : 1); i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  return out;
}

function contours(ctx, p) {
  const { width, height, noise, pal } = ctx;
  const { levels, res, scale, octaves, falloff, strokeWidth, opacity, colors, indexEvery, blend } = p;
  const cols = Math.ceil(width / res) + 2;
  const rows = Math.ceil(height / res) + 2;
  const vals = new Float32Array(cols * rows);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = i * res;
      const y = j * res;
      let v = fbm(noise, x * scale, y * scale, octaves);
      if (falloff) v -= falloff * Math.hypot((x - width / 2) / width, (y - height / 2) / height);
      vals[j * cols + i] = v;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  const palette = inkList(pal, colors, [1]);
  const out = [];
  for (let l = 1; l <= levels; l++) {
    const level = lo + ((hi - lo) * l) / (levels + 1);
    const lines = joinSegments(marching(vals, cols, rows, res, level));
    const d = lines
      .filter((pts) => pts.length > 3)
      .map((pts) => {
        const closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < res * 0.2;
        return smoothPath(simplify(chaikin(pts, closed), 0.3), { closed, d: 1 });
      })
      .join("");
    if (!d) continue;
    const major = indexEvery && l % indexEvery === 0;
    out.push(`<path d="${d}" fill="none" stroke="${palette[(l - 1) % palette.length]}" stroke-width="${num(major ? strokeWidth * 2 : strokeWidth, 2)}" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  return { svg: wrap(out.join(""), { opacity, blend }), info: { levels: out.length } };
}

function blobs(ctx, p, index) {
  const { width, height, rnd, noise, pal } = ctx;
  const { count, size, wobble, opacity, colors, blur, blend } = p;
  const palette = inkList(pal, colors, [1, 2]);
  const shapes = [];
  for (let i = 0; i < count; i++) {
    const r = Math.min(width, height) * rnd.range(size[0], size[1]);
    const cx = rnd.range(0, width);
    const cy = rnd.range(0, height);
    const ox = rnd() * 100;
    const oy = rnd() * 100;
    const n = 40;
    const pts = Array.from({ length: n }, (_, k) => {
      const t = (k / n) * Math.PI * 2;
      const rr = r * (1 + wobble * noise(Math.cos(t) * 0.9 + ox, Math.sin(t) * 0.9 + oy));
      return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr];
    });
    shapes.push(`<path d="${smoothPath(pts, { closed: true, d: 1 })}" fill="${palette[i % palette.length]}"/>`);
  }
  const fid = `blur${index}`;
  const defs = blur ? `<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur}"/></filter>` : "";
  return { svg: wrap(blur ? `<g filter="url(#${fid})">${shapes.join("")}</g>` : shapes.join(""), { opacity, blend }), defs };
}

function truchet(ctx, p) {
  const { width, height, rnd, pal } = ctx;
  const { cells, style, strokeWidth, opacity, colors, blend } = p;
  const s = width / cells;
  const h = s / 2;
  const palette = inkList(pal, colors, [1]);
  const byColor = palette.map(() => []);
  for (let j = 0; j * s < height; j++)
    for (let i = 0; i < cells; i++) {
      const x = i * s;
      const y = j * s;
      const t = rnd() < 0.5 ? 0 : 1;
      const dst = byColor[(rnd() * palette.length) | 0];
      if (style === "diagonals") dst.push(t ? `M${num(x + s)} ${num(y)}L${num(x)} ${num(y + s)}` : `M${num(x)} ${num(y)}L${num(x + s)} ${num(y + s)}`);
      else if (style === "fills") {
        // two quarter discs per tile
        dst.push(
          t
            ? `M${num(x + s)} ${num(y)}L${num(x + h)} ${num(y)}A${num(h)} ${num(h)} 0 0 0 ${num(x + s)} ${num(y + h)}ZM${num(x)} ${num(y + s)}L${num(x + h)} ${num(y + s)}A${num(h)} ${num(h)} 0 0 1 ${num(x)} ${num(y + h)}Z`
            : `M${num(x)} ${num(y)}L${num(x + h)} ${num(y)}A${num(h)} ${num(h)} 0 0 1 ${num(x)} ${num(y + h)}ZM${num(x + s)} ${num(y + s)}L${num(x + s)} ${num(y + h)}A${num(h)} ${num(h)} 0 0 0 ${num(x + h)} ${num(y + s)}Z`,
        );
      } else
        dst.push(
          t
            ? `M${num(x + h)} ${num(y)}A${num(h)} ${num(h)} 0 0 0 ${num(x + s)} ${num(y + h)}M${num(x)} ${num(y + h)}A${num(h)} ${num(h)} 0 0 1 ${num(x + h)} ${num(y + s)}`
            : `M${num(x + h)} ${num(y)}A${num(h)} ${num(h)} 0 0 1 ${num(x)} ${num(y + h)}M${num(x + s)} ${num(y + h)}A${num(h)} ${num(h)} 0 0 0 ${num(x + h)} ${num(y + s)}`,
        );
    }
  const filled = style === "fills";
  const svg = byColor
    .map((paths, i) => (paths.length ? `<path d="${paths.join("")}" ${filled ? `fill="${palette[i]}"` : `fill="none" stroke="${palette[i]}" stroke-width="${strokeWidth}" stroke-linecap="round"`}/>` : ""))
    .join("");
  return { svg: wrap(svg, { opacity, blend }) };
}

function halftone(ctx, p) {
  const { width, height, pal } = ctx;
  const { size, angle, field, scale, invert, gamma, maxRadius, opacity, colors, blend } = p;
  const f = fieldFn(ctx, field, { scale, angle: p.fieldAngle, invert });
  const a = (angle * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const reach = Math.hypot(width, height) / 2;
  const n = Math.ceil(reach / size) + 1;
  const color = inkList(pal, colors, [1])[0];
  const d = [];
  for (let v = -n; v <= n; v++)
    for (let u = -n; u <= n; u++) {
      const x = width / 2 + (u * ca - v * sa) * size;
      const y = height / 2 + (u * sa + v * ca) * size;
      if (x < -size || y < -size || x > width + size || y > height + size) continue;
      const r = size * maxRadius * Math.pow(f(x, y), gamma);
      if (r < 0.35) continue;
      d.push(`M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0`);
    }
  return { svg: wrap(`<path d="${d.join("")}" fill="${color}"/>`, { opacity, blend }), info: { dots: d.length } };
}

const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];

function dither(ctx, p) {
  const { width, height, pal } = ctx;
  const { cell, field, scale, invert, opacity, colors, blend, bias } = p;
  const f = fieldFn(ctx, field, { scale, angle: p.fieldAngle, invert });
  const color = inkList(pal, colors, [1])[0];
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const d = [];
  for (let j = 0; j < rows; j++) {
    let run = -1;
    for (let i = 0; i <= cols; i++) {
      const on = i < cols && f((i + 0.5) * cell, (j + 0.5) * cell) + bias > (BAYER[(j % 8) * 8 + (i % 8)] + 0.5) / 64;
      if (on && run < 0) run = i;
      if (!on && run >= 0) {
        d.push(`M${num(run * cell)} ${num(j * cell)}h${num((i - run) * cell)}v${num(cell)}h${num(-(i - run) * cell)}z`);
        run = -1;
      }
    }
  }
  return { svg: wrap(`<path d="${d.join("")}" fill="${color}"/>`, { opacity, blend }), info: { runs: d.length } };
}

function isometric(ctx, p) {
  const { width, height, noise, pal } = ctx;
  const { cols, rows, tile, maxHeight, scale, opacity, colors, blend, gap } = p;
  // Fit the whole block field, tallest columns included, inside the canvas.
  const tall = maxHeight * 0.8;
  const tw = tile || Math.min((width * 0.92 * 2) / (cols + rows), (height * 0.92 * 4) / ((cols + rows) / 2 + tall) / 2);
  const th = tw / 2;
  const palette = inkList(pal, colors, [1, 2, 3]);
  const cubes = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const hgt = Math.max(0.15, ((fbm(noise, i * scale * 40, j * scale * 40, 3) + 1) / 2) * maxHeight);
      cubes.push({ i, j, hgt, color: palette[(i + j * 3) % palette.length] });
    }
  cubes.sort((a, b) => a.i + a.j - (b.i + b.j));
  const ox = width / 2;
  const extent = ((cols + rows) / 2 + tall) * th;
  const oy = (height - extent) / 2 + tall * th;
  const g = gap * tw;
  const out = cubes.map(({ i, j, hgt, color }) => {
    const x = ox + (i - j) * (tw / 2);
    const y = oy + (i + j) * (th / 2);
    const z = hgt * th;
    const a = tw / 2 - g;
    const b = th / 2 - g / 2;
    const top = `${num(x)},${num(y - z - b)} ${num(x + a)},${num(y - z)} ${num(x)},${num(y - z + b)} ${num(x - a)},${num(y - z)}`;
    const left = `${num(x - a)},${num(y - z)} ${num(x)},${num(y - z + b)} ${num(x)},${num(y + b)} ${num(x - a)},${num(y)}`;
    const right = `${num(x + a)},${num(y - z)} ${num(x)},${num(y - z + b)} ${num(x)},${num(y + b)} ${num(x + a)},${num(y)}`;
    return `<polygon points="${left}" fill="${darken(color, 0.22)}"/><polygon points="${right}" fill="${darken(color, 0.42)}"/><polygon points="${top}" fill="${lighten(color, 0.12)}"/>`;
  });
  return { svg: wrap(out.join(""), { opacity, blend }), info: { blocks: cubes.length } };
}

function grain(ctx, p, index) {
  const { width, height, pal } = ctx;
  const colors = inkList(pal, p.colors, [1, 2, 3]);
  const g = meshGradient({ colors, base: p.base || pal.bg, seed: p.meshSeed ?? ctx.seed, softness: p.softness, grain: p.grain, calm: p.calm, style: p.style, blobs: p.blobs, width, height });
  const svg = g.svg.replace(/id="blur"/, `id="blur${index}"`).replace(/url\(#blur\)/, `url(#blur${index})`).replace(/id="grain"/, `id="grain${index}"`).replace(/url\(#grain\)/, `url(#grain${index})`);
  return { svg: wrap(svg, { opacity: p.opacity, blend: p.blend }), solid: true };
}

export const DEFAULTS = {
  grain: { calm: "none", grain: 0.12, softness: 0.6, style: "mesh", blobs: 0, meshSeed: null, colors: [1, 2, 3], opacity: 1 },
  flow: { sep: 16, steps: 110, step: 4, scale: 0.0016, octaves: 2, curl: 1, strokeWidth: 1.1, opacity: 0.6, colors: [1, 2] },
  contours: { levels: 14, res: 10, scale: 0.0014, octaves: 4, falloff: 0, strokeWidth: 1, opacity: 0.6, colors: [1], indexEvery: 5 },
  blobs: { count: 4, size: [0.15, 0.35], wobble: 0.35, opacity: 0.8, colors: [1, 2], blur: 0 },
  truchet: { cells: 10, style: "arcs", strokeWidth: 6, opacity: 1, colors: [1] },
  halftone: { size: 14, angle: 45, field: "radial", fieldAngle: 35, scale: 0.0016, invert: false, gamma: 0.8, maxRadius: 0.56, opacity: 1, colors: [1] },
  dither: { cell: 6, field: "radial", fieldAngle: 35, scale: 0.0016, invert: false, bias: 0, opacity: 1, colors: [1] },
  isometric: { cols: 12, rows: 12, tile: 0, maxHeight: 5, scale: 0.05, gap: 0.03, opacity: 1, colors: [1, 2, 3] },
};

const FNS = { grain, flow, contours, blobs, truchet, halftone, dither, isometric };

/**
 * Build the SVG for a spec: { width, height, seed, palette (hex list, first = background), layers: [{ type, seed?, params? }] }.
 * Returns { svg, layers (with every default filled in), info }.
 */
export function buildArt(spec) {
  const width = spec.width || 1600;
  const height = spec.height || 900;
  const pal = resolvePalette(spec.palette, spec.mood);
  const seed = spec.seed ?? 1;
  const resolved = [];
  const parts = [];
  const defs = [];
  let paintedBg = false;
  (spec.layers || []).forEach((layer, index) => {
    const type = layer.type;
    if (!FNS[type]) throw new Error(`Unknown layer type "${type}". Use one of: ${LAYER_TYPES.join(", ")}.`);
    const params = { ...DEFAULTS[type], ...(layer.params || {}) };
    const layerSeed = layer.seed ?? subSeed(seed, `${type}${index}`);
    const ctx = { width, height, pal, seed: layerSeed, rnd: rng(layerSeed), noise: simplex(layerSeed) };
    const out = FNS[type](ctx, params, index);
    if (out.defs) defs.push(out.defs);
    if (out.solid && index === 0) paintedBg = true;
    parts.push(out.svg);
    resolved.push({ type, seed: layerSeed, params, ...(out.info ? { info: out.info } : {}) });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice">${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${paintedBg ? "" : `<rect width="${width}" height="${height}" fill="${pal.bg}"/>`}${parts.join("")}</svg>`;
  return { svg, layers: resolved, palette: pal.all, width, height };
}

/** The layer list a composition (mood) stacks, ready to edit. */
export function composition(mood = "calm", kind = "composition") {
  if (kind !== "composition") return [{ type: kind, params: {} }];
  const list = COMPOSITIONS[mood] || COMPOSITIONS.calm;
  return list.map(([type, params]) => ({ type, params }));
}

/** Text a designer can read: layer stack, palette contrast of the ink on the background. */
export function describe(art) {
  const bgL = luminance(art.palette[0]);
  return `${art.width}x${art.height}, palette ${art.palette.join(" ")} (background ${bgL < 0.2 ? "dark" : "light"}), layers: ${art.layers.map((l) => `${l.type}${l.info ? ` (${Object.entries(l.info).map(([k, v]) => `${v} ${k}`).join(", ")})` : ""}`).join(" + ")}`;
}

