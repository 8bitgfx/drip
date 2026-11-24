// refs_extract: a structured spec of a component, section or page, measured from the live page.
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { serveDir } from "../../core/serve.mjs";
import { SIZES, captureAt, resolveTarget } from "./run.mjs";

const strip = (st) => ({ do: st.do, selector: st.selector, text: st.text, label: st.label });

/**
 * Measure `target` ({ url | file | html... } resolved by resolveTarget). Returns { spec, shots } where `shots`
 * holds the PNG buffers (per size: base + states) for evidence; the spec has none.
 */
export async function extractSpec(target, { selector, states = [], sizes = SIZES, config, source = {}, axe = false } = {}) {
  const t = target.kind ? target : await resolveTarget(target);
  if (t.kind === "screenshot") return inferFromImage(t.file, { config, source });
  const widths = [...new Set(sizes)].sort((a, b) => a - b);
  const desktop = widths[widths.length - 1];
  const phone = widths[0];
  const runs = await Promise.all(
    widths.map((w) =>
      captureAt(t.url, {
        width: w,
        selector,
        states: w === desktop || (w === phone && widths.length > 1) ? states : [],
        withSpec: w === desktop,
        keyboard: w === desktop,
        axe: axe && w === desktop,
        config,
      }),
    ),
  );
  const byW = Object.fromEntries(runs.map((r) => [r.width, r]));
  const d = byW[desktop];
  const spec = {
    schema: 1,
    kind: t.kind,
    inferred: false,
    source: { ...source, url: source.url || t.url, file: t.file ? t.file : undefined, selector: selector || undefined, capturedAt: new Date().toISOString() },
    ...d.spec,
    states: d.states.map((s, i) => ({
      label: s.label,
      step: strip(s.step),
      changes: s.changes,
      appeared: s.appeared,
      disappeared: s.disappeared,
      activeElement: s.active,
      error: s.error || undefined,
      phone: byW[phone] !== d && byW[phone].states[i] ? { changes: byW[phone].states[i].changes.length, appeared: byW[phone].states[i].appeared.length, error: byW[phone].states[i].error || undefined } : undefined,
    })),
    observedMotion: d.states.filter((s) => s.motion && (s.motion.animations.length || s.motion.traces.length)).map((s) => ({ state: s.label, ...s.motion })),
    responsive: Object.fromEntries(runs.map((r) => [r.width, r.responsive])),
    keyboard: d.keyboard,
    a11y: d.a11y,
  };
  spec.motion = { ...spec.motion, observed: spec.observedMotion };
  delete spec.observedMotion;
  const shots = Object.fromEntries(runs.map((r) => [r.width, { base: r.base.png, states: r.states.map((s) => ({ label: s.label, png: s.png })) }]));
  return { spec, shots };
}

/** A screenshot has no DOM: palette, size and content bands, all marked as inferred. */
async function inferFromImage(file, { config, source }) {
  const base = await serveDir(path.dirname(file));
  const src = `${base}/${encodeURIComponent(path.basename(file))}`;
  const data = await withTab(config, async (tab) => {
    await openPage(tab, `${base}/__drip_blank__`, { width: 800, height: 600, settleMs: 50 });
    return evalJson(
      tab.s,
      `(async () => {
        const img = new Image(); img.src = ${JSON.stringify(src)}; await img.decode();
        const W = img.naturalWidth, H = img.naturalHeight, k = Math.min(1, 480 / W);
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const hex = (r, gg, b) => '#' + [r, gg, b].map((v) => v.toString(16).padStart(2, '0')).join('');
        const q = new Map();
        for (let i = 0; i < d.length; i += 4) { const r = d[i] >> 4 << 4, gg = d[i + 1] >> 4 << 4, b = d[i + 2] >> 4 << 4; const key = hex(r | 8, gg | 8, b | 8); q.set(key, (q.get(key) || 0) + 1); }
        const total = c.width * c.height;
        const palette = [...q.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([h, n]) => ({ hex: h, share: +(n / total).toFixed(3) }));
        const bg = palette[0].hex; const bgv = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
        const differs = (i) => Math.abs(d[i] - bgv[0]) + Math.abs(d[i + 1] - bgv[1]) + Math.abs(d[i + 2] - bgv[2]) > 60;
        const rows = [];
        for (let y = 0; y < c.height; y++) { let n = 0; for (let x = 0; x < c.width; x++) if (differs((y * c.width + x) * 4)) n++; rows.push(n > c.width * 0.004); }
        const bands = []; let start = -1;
        rows.forEach((on, y) => { if (on && start < 0) start = y; if ((!on || y === rows.length - 1) && start >= 0) { bands.push({ y: Math.round(start / k), h: Math.round((y - start) / k) }); start = -1; } });
        let x1 = c.width, x2 = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (differs((y * c.width + x) * 4)) { if (x < x1) x1 = x; if (x > x2) x2 = x; }
        return { W, H, palette, bg, bands: bands.slice(0, 24), content: { x: Math.round(x1 / k), w: Math.round((x2 - x1) / k) } };
      })()`,
    );
  });
  const spec = {
    schema: 1,
    kind: "screenshot",
    inferred: true,
    note: "Measured from pixels only. Type, spacing, radii, motion, keyboard and ARIA are NOT known: everything here is inferred. Study the live page or source for the rest.",
    source: { ...source, file, capturedAt: new Date().toISOString() },
    root: { rect: { x: 0, y: 0, w: data.W, h: data.H }, background: data.bg },
    colors: { roles: { background: data.bg }, palette: data.palette.map((p) => ({ hex: p.hex, uses: Math.round(p.share * 1000), roles: [], share: p.share })) },
    layoutBands: data.bands,
    contentColumn: data.content,
    states: [],
  };
  return { spec, shots: {} };
}
