// Image work in the shared headless browser: decode anything Chrome can (jpg, png, webp, avif, gif, svg),
// crop to a ratio around a focal point, resize with high-quality smoothing, encode WebP/JPEG/PNG under a
// size budget, and measure shapes (optical centre). Native code: far faster than pure-JS image libraries.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withTab, openPage } from "./browser.mjs";
import { serveDir } from "./serve.mjs";

let workDir = null;
async function stage(buf, ext) {
  if (!workDir) workDir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-img-"));
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  fs.writeFileSync(path.join(workDir, `${name}.${ext}`), buf);
  fs.writeFileSync(path.join(workDir, `${name}.html`), "<!doctype html><meta charset=utf-8><body style=margin:0>");
  const base = await serveDir(workDir);
  return { page: `${base}/${name}.html`, src: `${base}/${name}.${ext}`, cleanup: () => [`${name}.${ext}`, `${name}.html`].forEach((f) => fs.rmSync(path.join(workDir, f), { force: true })) };
}

const sniff = (buf) => {
  const h = buf.subarray(0, 32).toString("latin1");
  if (h.startsWith("\x89PNG")) return "png";
  if (h.startsWith("\xff\xd8")) return "jpg";
  if (h.startsWith("RIFF") && h.includes("WEBP")) return "webp";
  if (h.startsWith("GIF")) return "gif";
  if (/ftyp(avif|avis)/.test(h)) return "avif";
  if (/<svg|<\?xml/i.test(buf.subarray(0, 400).toString("utf8"))) return "svg";
  return "img";
};

async function inPage(buf, script, config) {
  const st = await stage(buf, sniff(buf));
  try {
    return await withTab(config, async (tab) => {
      await openPage(tab, st.page, { width: 800, height: 600, settleMs: 50 });
      const expression = `(async () => {
        const img = new Image(); img.decoding = 'async'; img.src = ${JSON.stringify(st.src)};
        await img.decode();
        const W = img.naturalWidth || 1024, H = img.naturalHeight || 1024;
        ${script}
      })()`;
      const { result, exceptionDetails } = await tab.s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split("\n")[0] || "image script failed");
      return result.value;
    });
  } finally {
    st.cleanup();
  }
}

/** Page-side helper: the focal point of an image as fractions, from edge energy (where the detail is). */
const FOCUS_JS = `
  const focusOf = (img, W, H) => {
    const n = 64, c = document.createElement('canvas'); c.width = n; c.height = Math.max(1, Math.round(n * H / W));
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data; const L = (x, y) => { const i = (y * c.width + x) * 4; return 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; };
    let sx = 0, sy = 0, sw = 0;
    for (let y = 1; y < c.height - 1; y++) for (let x = 1; x < c.width - 1; x++) {
      const e = Math.abs(L(x + 1, y) - L(x - 1, y)) + Math.abs(L(x, y + 1) - L(x, y - 1)); const w = e * e;
      sx += w * x; sy += w * y; sw += w;
    }
    return sw ? { x: sx / sw / c.width, y: sy / sw / c.height } : { x: 0.5, y: 0.5 };
  };`;

/**
 * Web-ready copies of an image. outputs: [{ name, ar?: "16:9" | number, width, format: "webp"|"jpeg"|"png" }].
 * focus: "auto" | { x, y } (0-1). maxKB: lowers quality until each file fits (never below 0.5).
 * Returns { width, height, focus, files: [{ name, buf, width, height, format, kb }] }.
 */
export async function processImage(buf, { outputs, focus = "auto", quality = 0.82, maxKB = 400, config } = {}) {
  const spec = JSON.stringify({ outputs, focus, quality, maxKB });
  const out = await inPage(
    buf,
    `${FOCUS_JS}
    const spec = ${spec};
    const f = spec.focus === 'auto' ? focusOf(img, W, H) : spec.focus || { x: 0.5, y: 0.5 };
    const res = [];
    for (const o of spec.outputs) {
      const ar = typeof o.ar === 'string' ? (o.ar.split(':')[0] / o.ar.split(':')[1]) : (o.ar || W / H);
      let cw = W, ch = W / ar; if (ch > H) { ch = H; cw = H * ar; }
      const cx = Math.min(Math.max(f.x * W - cw / 2, 0), W - cw), cy = Math.min(Math.max(f.y * H - ch / 2, 0), H - ch);
      const tw = Math.round(Math.min(o.width || cw, cw)), th = Math.round(tw / ar);
      // Downscale in halving steps for quality, then the last step.
      let src = img, sx = cx, sy = cy, sw = cw, sh = ch;
      while (sw / 2 > tw) {
        const t = document.createElement('canvas'); t.width = Math.round(sw / 2); t.height = Math.round(sh / 2);
        const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, sx, sy, sw, sh, 0, 0, t.width, t.height);
        src = t; sx = 0; sy = 0; sw = t.width; sh = t.height;
      }
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th);
      const type = 'image/' + (o.format || 'webp');
      let q = spec.quality, url = c.toDataURL(type, q);
      while (type !== 'image/png' && url.length * 0.75 / 1024 > spec.maxKB && q > 0.5) { q -= 0.06; url = c.toDataURL(type, q); }
      res.push({ name: o.name, data: url.split(',')[1], width: tw, height: th, format: o.format || 'webp', q: +q.toFixed(2) });
    }
    return { width: W, height: H, focus: f, files: res };`,
    config,
  );
  out.files = out.files.map((x) => ({ ...x, buf: Buffer.from(x.data, "base64"), kb: Math.round((x.data.length * 0.75) / 1024), data: undefined }));
  return out;
}

/** Render an image (incl. SVG) to PNGs at square sizes, centred and contained. */
export async function rasterSizes(buf, sizes, { bg = null, padding = 0, config } = {}) {
  const out = await inPage(
    buf,
    `const res = [];
    for (const s of ${JSON.stringify(sizes)}) {
      const c = document.createElement('canvas'); c.width = s; c.height = s; const g = c.getContext('2d');
      ${bg ? `g.fillStyle = ${JSON.stringify(bg)}; g.fillRect(0, 0, s, s);` : ""}
      const pad = s * ${padding}; const k = Math.min((s - 2 * pad) / W, (s - 2 * pad) / H);
      g.imageSmoothingQuality = 'high'; g.drawImage(img, (s - W * k) / 2, (s - H * k) / 2, W * k, H * k);
      res.push(c.toDataURL('image/png').split(',')[1]);
    }
    return res;`,
    config,
  );
  return out.map((d) => Buffer.from(d, "base64"));
}

/**
 * Where the eye puts the centre of a shape. Three answers, in fractions of the image:
 *  - box: the bounding box centre (what maths says),
 *  - mass: the centroid of all ink (pulled by heavy details),
 *  - body: the centroid of the main body once thin details (drips, antennae, tails, sparkles, outlines
 *    sticking out) are removed by a morphological opening, i.e. what a viewer calls "the thing".
 * Plus the body's own box, and an overlay PNG marking all three.
 */
export async function opticalCenter(buf, { detail = 0.06, config } = {}) {
  const out = await inPage(
    buf,
    `const n = 384, k = Math.min(n / W, n / H), w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data;
    // Background = the most common corner colour; ink = anything that differs from it (or is opaque on transparent).
    const px = (i) => [d[i], d[i + 1], d[i + 2], d[i + 3]];
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4].map(px);
    const bg = corners[0]; const transparent = corners.every((p) => p[3] < 16);
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const p = px(i * 4);
      ink[i] = transparent ? (p[3] > 40 ? 1 : 0) : (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60 && p[3] > 40 ? 1 : 0);
    }
    const r = Math.max(1, Math.round(Math.min(w, h) * ${detail}));
    const morph = (src, erode) => { // separable square erosion/dilation
      const tmp = new Uint8Array(w * h), dst = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = erode ? 1 : 0; for (let t = -r; t <= r; t++) { const xx = x + t; const s = xx < 0 || xx >= w ? 0 : src[y * w + xx]; if (erode ? !s : s) { v = erode ? 0 : 1; break; } } tmp[y * w + x] = v; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = erode ? 1 : 0; for (let t = -r; t <= r; t++) { const yy = y + t; const s = yy < 0 || yy >= h ? 0 : tmp[yy * w + x]; if (erode ? !s : s) { v = erode ? 0 : 1; break; } } dst[y * w + x] = v; }
      return dst;
    };
    let body = morph(morph(ink, true), false);
    // Keep the largest connected piece of the opened shape: the body.
    const lab = new Int32Array(w * h); let best = 0, bestN = 0, id = 0;
    for (let i = 0; i < w * h; i++) if (body[i] && !lab[i]) { id++; let cnt = 0; const st = [i]; lab[i] = id; while (st.length) { const j = st.pop(); cnt++; const x = j % w, y = (j / w) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx; if (body[q] && !lab[q]) { lab[q] = id; st.push(q); } } } if (cnt > bestN) { bestN = cnt; best = id; } }
    const stats = (mask) => { let x0 = w, y0 = h, x1 = -1, y1 = -1, sx = 0, sy = 0, s = 0; for (let i = 0; i < w * h; i++) if (mask(i)) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); sx += x; sy += y; s++; } return s ? { box: { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h }, c: { x: (sx / s + 0.5) / w, y: (sy / s + 0.5) / h }, area: s / (w * h) } : null; };
    const all = stats((i) => ink[i]); const bod = stats((i) => best && lab[i] === best) || all;
    if (!all) return { empty: true };
    // Overlay: ink grey, body tinted, marks for box (red), mass (blue), body (green).
    const o = document.createElement('canvas'); o.width = w * 2; o.height = h * 2; const og = o.getContext('2d');
    og.fillStyle = '#fff'; og.fillRect(0, 0, o.width, o.height); og.globalAlpha = 0.35; og.drawImage(img, 0, 0, o.width, o.height); og.globalAlpha = 1;
    og.fillStyle = 'rgba(0,160,90,0.25)'; for (let i = 0; i < w * h; i++) if (best && lab[i] === best) og.fillRect((i % w) * 2, ((i / w) | 0) * 2, 2, 2);
    const box = all.box, bc = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
    og.strokeStyle = '#e5322d'; og.setLineDash([6, 4]); og.strokeRect(box.x0 * o.width, box.y0 * o.height, (box.x1 - box.x0) * o.width, (box.y1 - box.y0) * o.height); og.setLineDash([]);
    og.strokeStyle = '#0a9d5a'; og.strokeRect(bod.box.x0 * o.width, bod.box.y0 * o.height, (bod.box.x1 - bod.box.x0) * o.width, (bod.box.y1 - bod.box.y0) * o.height);
    const mark = (p, col, rr) => { og.strokeStyle = col; og.lineWidth = 3; og.beginPath(); og.moveTo(p.x * o.width - rr, p.y * o.height); og.lineTo(p.x * o.width + rr, p.y * o.height); og.moveTo(p.x * o.width, p.y * o.height - rr); og.lineTo(p.x * o.width, p.y * o.height + rr); og.stroke(); og.beginPath(); og.arc(p.x * o.width, p.y * o.height, rr * 0.6, 0, 7); og.stroke(); };
    mark(bc, '#e5322d', 16); mark(all.c, '#2b50ff', 12); mark(bod.c, '#0a9d5a', 20);
    return { size: { w: W, h: H }, box: bc, bbox: box, mass: all.c, body: bod.c, bodyBox: bod.box, bodyArea: bod.area, inkArea: all.area, detailPx: r / k, overlay: o.toDataURL('image/png').split(',')[1] };`,
    config,
  );
  if (out.overlay) out.overlay = Buffer.from(out.overlay, "base64");
  return out;
}

/** A numbered grid of images, laid out and encoded by the browser. Returns a JPEG buffer. */
export async function sheetInBrowser(buffers, { cols = 6, tileW = 300, tileH = 225, gap = 8, first = 1, labels = null, fit = "cover", quality = 78, config } = {}) {
  if (!workDir) workDir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-img-"));
  const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const names = buffers.map((b, i) => {
    if (!b?.length) return null;
    const n = `${id}-${i}.${sniff(b)}`;
    fs.writeFileSync(path.join(workDir, n), b);
    return n;
  });
  const rows = Math.ceil(buffers.length / cols);
  const W = cols * tileW + (cols + 1) * gap;
  const H = rows * tileH + (rows + 1) * gap;
  const cells = names
    .map((n, i) => {
      const label = labels ? labels[i] : first + i; // labels: one per tile; null leaves a tile unnumbered
      return `<div class=c>${n ? `<img src="${n}">` : ""}${label == null ? "" : `<b>${label}</b>`}</div>`;
    })
    .join("");
  fs.writeFileSync(
    path.join(workDir, `${id}.html`),
    `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#f2f2f2}.g{display:grid;grid-template-columns:repeat(${cols},${tileW}px);grid-auto-rows:${tileH}px;gap:${gap}px;padding:${gap}px}.c{position:relative;background:#ddd;overflow:hidden}img{width:100%;height:100%;object-fit:${fit};display:block}b{position:absolute;left:6px;top:6px;font:700 15px/1 system-ui;color:#fff;background:#111;padding:4px 6px;border-radius:3px}</style><div class=g>${cells}</div>`,
  );
  try {
    const base = await serveDir(workDir);
    return await withTab(config, async (tab) => {
      await openPage(tab, `${base}/${id}.html`, { width: W, height: H, settleMs: 200 });
      await tab.s("Runtime.evaluate", { expression: "Promise.all([...document.images].map((i) => i.decode().catch(() => {})))", awaitPromise: true });
      const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
      return Buffer.from(data, "base64");
    });
  } finally {
    for (const n of [...names.filter(Boolean), `${id}.html`]) fs.rmSync(path.join(workDir, n), { force: true });
  }
}
