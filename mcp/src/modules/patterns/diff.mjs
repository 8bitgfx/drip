// Visual diff and accessibility checks for pattern_compare, all in the shared browser.
//  - diffSheet: reference | implementation | diff heatmap per case on one sheet (pixelmatch-style YIQ metric)
//  - runAxe: axe-core injected through CDP (DRIP_AXE_PATH for a local copy, else a pinned jsDelivr file cached in ~/.drip)
import fs from "node:fs";
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { get } from "../../core/http.mjs";
import { ensureDir, homeDripDir } from "../../core/paths.mjs";

export const AXE_VERSION = "4.10.2";
export const AXE_URL = `https://cdn.jsdelivr.net/npm/axe-core@${AXE_VERSION}/axe.min.js`;

/** The axe-core source, or null (with a reason) when neither the local path nor the pinned download is available. */
export async function loadAxe() {
  const local = process.env.DRIP_AXE_PATH;
  if (local) {
    if (fs.existsSync(local)) return { src: fs.readFileSync(local, "utf8"), from: local };
    return { src: null, reason: `DRIP_AXE_PATH points at ${local}, which does not exist` };
  }
  const cached = path.join(ensureDir(path.join(homeDripDir, "vendor")), `axe-core-${AXE_VERSION}.min.js`);
  if (fs.existsSync(cached)) return { src: fs.readFileSync(cached, "utf8"), from: cached };
  try {
    const { body } = await get(AXE_URL, { ttlMs: 0, timeoutMs: 20000, retries: 0 });
    fs.writeFileSync(cached, body);
    return { src: body, from: AXE_URL };
  } catch (e) {
    return { src: null, reason: `axe-core ${AXE_VERSION} could not be downloaded (${e.message}). Set DRIP_AXE_PATH to a local axe.min.js to run it offline` };
  }
}

/** Run axe on `selector` (or the whole page) in an already open tab. Returns { ran, violations?, reason? }. */
export async function runAxe(s, selector) {
  const axe = await loadAxe();
  if (!axe.src) return { ran: false, reason: axe.reason };
  await s("Runtime.evaluate", { expression: axe.src });
  const out = await evalJson(
    s,
    `(async () => {
      if (!window.axe) return { ran: false, reason: 'axe did not load (the page may block eval)' };
      const ctx = ${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document"};
      if (!ctx) return { ran: false, reason: 'selector matched nothing' };
      const r = await axe.run(ctx, { resultTypes: ['violations'] });
      return { ran: true, version: axe.version, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, example: v.nodes[0] && v.nodes[0].target.join(' ') })) };
    })()`,
  );
  return out;
}

/**
 * Compare image pairs [{ label, ref: Buffer, impl: Buffer }]. Returns { sheet: jpeg Buffer, results: [{ label, diffPct, refSize, implSize,
 * sizeMismatch }] }. The two images are aligned at the top-left on the larger canvas (a size difference counts as different).
 */
export async function diffSheet(pairs, { threshold = 0.1, config } = {}) {
  const items = pairs.map((p) => ({ label: p.label, ref: `data:image/png;base64,${p.ref.toString("base64")}`, impl: `data:image/png;base64,${p.impl.toString("base64")}` }));
  return withTab(config, async (tab) => {
    const { s } = tab;
    await openPage(tab, "about:blank", { width: 1560, height: 900, settleMs: 0 });
    const results = await evalJson(
      s,
      `(async () => {
        const items = ${JSON.stringify(items)};
        const T = ${Number(threshold)}, MAXD = 35215 * T * T;
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
        document.body.style.cssText = 'margin:0;background:#ecebe7;font:13px system-ui;color:#111;padding:16px;width:1528px';
        const out = [];
        for (const it of items) {
          const [a, b] = await Promise.all([load(it.ref), load(it.impl)]);
          const W = Math.max(a.naturalWidth, b.naturalWidth), H = Math.max(a.naturalHeight, b.naturalHeight);
          const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
          const ca = mk(), cb = mk(), cd = mk();
          const ga = ca.getContext('2d', { willReadFrequently: true }), gb = cb.getContext('2d', { willReadFrequently: true }), gd = cd.getContext('2d');
          for (const g of [ga, gb]) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
          ga.drawImage(a, 0, 0); gb.drawImage(b, 0, 0);
          const A = ga.getImageData(0, 0, W, H).data, B = gb.getImageData(0, 0, W, H).data;
          const D = gd.createImageData(W, H);
          let diff = 0;
          for (let i = 0; i < A.length; i += 4) {
            const r1 = A[i], g1 = A[i + 1], b1 = A[i + 2], r2 = B[i], g2 = B[i + 1], b2 = B[i + 2];
            const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223;
            const iq = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.2741761 - (b1 - b2) * 0.32180189;
            const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694;
            const delta = 0.5053 * y * y + 0.299 * iq * iq + 0.1957 * q * q;
            if (delta > MAXD) { diff++; D.data[i] = 255; D.data[i + 1] = 40; D.data[i + 2] = 60; D.data[i + 3] = 255; }
            else { const g = 255 - (255 - (0.299 * r1 + 0.587 * g1 + 0.114 * b1)) * 0.18; D.data[i] = D.data[i + 1] = D.data[i + 2] = g; D.data[i + 3] = 255; }
          }
          gd.putImageData(D, 0, 0);
          const pct = +(100 * diff / (W * H)).toFixed(2);
          const row = document.createElement('div'); row.style.cssText = 'margin:0 0 18px';
          const title = document.createElement('div'); title.style.cssText = 'font-weight:600;margin-bottom:6px';
          title.textContent = it.label + ' — ' + pct + '% of pixels differ' + (a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight ? ' (sizes: reference ' + a.naturalWidth + 'x' + a.naturalHeight + ', implementation ' + b.naturalWidth + 'x' + b.naturalHeight + ')' : '');
          const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px';
          [['reference', ca], ['implementation', cb], ['diff', cd]].forEach(([n, c]) => {
            const f = document.createElement('div'); const cap = document.createElement('div'); cap.textContent = n; cap.style.cssText = 'color:#555;margin-bottom:3px';
            c.style.cssText = 'width:100%;height:auto;max-height:480px;object-fit:contain;object-position:top left;background:#fff;border:1px solid #cfccc3;display:block';
            f.append(cap, c); grid.append(f);
          });
          row.append(title, grid); document.body.append(row);
          out.push({ label: it.label, diffPct: pct, refSize: [a.naturalWidth, a.naturalHeight], implSize: [b.naturalWidth, b.naturalHeight], sizeMismatch: a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight });
        }
        return out;
      })()`,
    );
    const h = await evalJson(s, "document.documentElement.scrollHeight");
    const height = Math.min(h + 16, 6000);
    await s("Emulation.setDeviceMetricsOverride", { width: 1560, height, deviceScaleFactor: 1, mobile: false });
    const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 1560, height, scale: 1 } });
    return { sheet: Buffer.from(data, "base64"), results };
  });
}
