// motion_trace: how things actually move. A still can't show timing, spacing, easing or choreography, so the
// composition is sampled frame by frame and every element's box and opacity are measured from the DOM. Out come
// a dopesheet (each element a lane: when it moves, how fast, how it fades, against the beats), onion skins of each
// beat (ghosted frames plus the measured path, so spacing and arcs read like an animator's onion skin) and flags
// computed from the numbers (dead stops, linear moves, hitches, everything starting at once, one timing for all).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { serveDir } from "../../core/serve.mjs";
import { PROBE, fmtT, seekExpr } from "./capture.mjs";

// Runs once in the page: choose what to track and tag it. Elements with data-track or an id, else the stage's children.
const PICK = `(() => {
  const bad = (e) => e === document.body || e === document.documentElement || e.id === 'stage' || e.id === 'ui' || e.id === '__dripCv' || e.closest('#ui') || /^(SCRIPT|STYLE|LINK|META|svg|defs)$/i.test(e.tagName);
  let els = [...document.querySelectorAll('[data-track],[id]')].filter((e) => !bad(e));
  if (els.length < 2) {
    const root = document.getElementById('stage') || document.body;
    els = [...root.children, ...[...root.children].flatMap((c) => [...c.children])].filter((e) => !bad(e));
  }
  els = els.slice(0, 24);
  return els.map((e, i) => {
    e.setAttribute('data-drip-k', i);
    const txt = (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18);
    return e.dataset.track || (e.id ? '#' + e.id : e.tagName.toLowerCase() + (txt ? ' "' + txt + '"' : ''));
  });
})()`;

// Runs after every seek: centre, size and effective opacity of each tracked element.
const SAMPLE = `(() => [...document.querySelectorAll('[data-drip-k]')].map((e) => {
  const r = e.getBoundingClientRect();
  let o = 1;
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); o *= +s.opacity; if (s.visibility === 'hidden' || s.display === 'none') o = 0; }
  return [+(r.left + r.width / 2).toFixed(1), +(r.top + r.height / 2).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1), +o.toFixed(3)];
}))()`;

/** Sample a composition: { labels, times, samples: [frame][element] = [cx, cy, w, h, o], ghosts: [{ t, buf }], probe }. */
export async function traceComposition(url, { from = 0, to, fps = 30, width = 1920, height = 1080, ghostTimes = [], config } = {}) {
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, settleMs: 400 });
    const probe = await evalJson(tab.s, PROBE);
    if (!probe) return { probe: null };
    const D = probe.duration || to || 10;
    const end = Math.min(to ?? D, D);
    const labels = await evalJson(tab.s, PICK);
    const n = Math.min(900, Math.max(2, Math.round((end - from) * fps) + 1));
    const dt = (end - from) / (n - 1);
    const times = [];
    const samples = [];
    const want = new Set(ghostTimes.map((t) => Math.round((t - from) / dt)));
    const ghosts = [];
    const thumbs = [];
    for (let i = 0; i < n; i++) {
      const t = +(from + i * dt).toFixed(4);
      await evalJson(tab.s, seekExpr(t));
      times.push(t);
      samples.push(await evalJson(tab.s, SAMPLE));
      // Tiny frames about 4 times a second: canvas visuals (particles, globes, light fields) change pixels, not boxes.
      if (i % Math.max(1, Math.round(fps / 4)) === 0) {
        const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality: 60, clip: { x: 0, y: 0, width, height, scale: Math.min(1, 192 / width) } });
        thumbs.push({ t, buf: Buffer.from(data, "base64") });
      }
      if (want.has(i)) {
        const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality: 78, clip: { x: 0, y: 0, width, height, scale: Math.min(1, 960 / width) } });
        ghosts.push({ t, buf: Buffer.from(data, "base64") });
      }
    }
    return { probe: { ...probe, duration: D }, labels, times, samples, ghosts, thumbs };
  });
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The numbers: per element its moving segments, and the flags. Pure (tested).
 * A segment: { el, from, to, travel, peak, endRatio, linear, hitchAt, overshoot, fade }.
 */
export function analyzeTrace({ labels, times, samples, width = 1920, beats = [], pixels = [] }) {
  const n = times.length;
  if (n < 3) return { segments: [], flags: [], notes: [], speeds: [] };
  const dt = (times[n - 1] - times[0]) / (n - 1);
  const moveThr = Math.max(6, width * 0.006); // px per second below which a thing is at rest
  const speeds = labels.map((_, k) =>
    times.map((_, i) => {
      if (!i) return 0;
      const a = samples[i - 1][k];
      const b = samples[i][k];
      if (!a || !b) return 0;
      // A scale change counts as movement too (half the size change, the edge's travel).
      return (dist(a, b) + 0.5 * (Math.abs(b[2] - a[2]) + Math.abs(b[3] - a[3]))) / dt;
    }),
  );
  const fadeRate = labels.map((_, k) => times.map((_, i) => (i ? Math.abs((samples[i][k]?.[4] ?? 0) - (samples[i - 1][k]?.[4] ?? 0)) / dt : 0)));
  const segments = [];
  for (const [k, sp] of speeds.entries()) {
    const active = sp.map((v, i) => v > moveThr || fadeRate[k][i] > 0.25);
    // Merge gaps of up to 2 samples.
    for (let i = 1; i < n - 1; i++) if (!active[i] && active[i - 1] && (active[i + 1] || active[i + 2])) active[i] = true;
    let i = 1;
    while (i < n) {
      if (!active[i]) {
        i++;
        continue;
      }
      const a = i;
      while (i < n && active[i]) i++;
      const b = i - 1;
      if (b - a < 1) continue;
      const seg = sp.slice(a, b + 1);
      const peak = Math.max(...seg);
      const p0 = samples[a - 1][k];
      const p1 = samples[b][k];
      const travel = dist(p0, p1) + 0.5 * Math.abs(p1[2] - p0[2]);
      const visibleAtEnd = (p1[4] ?? 1) > 0.05;
      const inFrame = p1[0] > 0 && p1[0] < width && p1[1] > 0;
      const s = { el: labels[k], k, from: times[a - 1], to: times[b], travel: Math.round(travel), peak: Math.round(peak), fade: travel < 40 && Math.abs((p1[4] ?? 0) - (p0[4] ?? 0)) > 0.3 };
      // Stops dead: still fast on its last moving frame, and it stays in view (leaving the frame or fading out is fine).
      s.endRatio = peak ? +(seg.at(-1) / peak).toFixed(2) : 0;
      s.dead = travel > 30 && s.endRatio > 0.5 && visibleAtEnd && inFrame && b < n - 1;
      // Linear: a spatial move that keeps one speed through its middle.
      const mid = seg.slice(Math.floor(seg.length * 0.2), Math.ceil(seg.length * 0.8));
      if (travel > 60 && mid.length >= 6) {
        const m = mid.reduce((x, y) => x + y, 0) / mid.length;
        const cv = Math.sqrt(mid.reduce((x, y) => x + (y - m) ** 2, 0) / mid.length) / (m || 1);
        s.linear = cv < 0.08;
      }
      // Hitch: the speed drops below 30% of its peak and comes back above 70% inside one move.
      if (travel > 60) {
        let low = -1;
        for (let j = 1; j < seg.length - 1; j++) {
          if (seg[j] < peak * 0.3 && seg.slice(0, j).some((v) => v > peak * 0.7)) low = j;
          if (low >= 0 && j > low && seg[j] > peak * 0.7) {
            s.hitchAt = times[a + j];
            break;
          }
        }
      }
      // Overshoot along the move's direction, as a share of the travel.
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const L = Math.hypot(dx, dy);
      if (L > 30) {
        let far = 0;
        for (let j = a; j <= b; j++) far = Math.max(far, ((samples[j][k][0] - p0[0]) * dx + (samples[j][k][1] - p0[1]) * dy) / L);
        s.overshoot = Math.max(0, Math.round(((far - L) / L) * 100));
      }
      segments.push(s);
    }
  }
  const flags = [];
  const notes = [];
  const dead = segments.filter((s) => s.dead);
  if (dead.length) flags.push(`stops dead (still moving fast on its last frame, no settle): ${dead.slice(0, 5).map((s) => `${s.el} at ${fmtT(s.to)}`).join(", ")}`);
  const lin = segments.filter((s) => s.linear);
  if (lin.length) flags.push(`constant speed (linear) moves: ${lin.slice(0, 5).map((s) => `${s.el} ${fmtT(s.from)}-${fmtT(s.to)}`).join(", ")}; ease them unless it's a deliberate mechanical feel`);
  const hitch = segments.filter((s) => s.hitchAt != null);
  if (hitch.length) flags.push(`hitch (slows almost to a stop, then speeds up again inside one move): ${hitch.slice(0, 5).map((s) => `${s.el} at ${fmtT(s.hitchAt)}`).join(", ")}`);
  // Everything at once: 4+ elements begin on the same frame.
  const byStart = new Map();
  for (const s of segments) {
    const key = Math.round(s.from / (dt * 1.5));
    byStart.set(key, [...(byStart.get(key) || []), s]);
  }
  for (const group of byStart.values()) if (new Set(group.map((s) => s.k)).size >= 4) flags.push(`${new Set(group.map((s) => s.k)).size} elements start on the same frame at ${fmtT(group[0].from)} (${group.slice(0, 4).map((s) => s.el).join(", ")}…): lead with one, let the others follow`);
  // One timing for everything: 5+ spatial moves share a duration within one frame.
  const spatial = segments.filter((s) => s.travel > 40);
  const durs = new Map();
  for (const s of spatial) {
    const d = Math.round((s.to - s.from) / dt);
    durs.set(d, (durs.get(d) || 0) + 1);
  }
  const [topDur, topCount] = [...durs.entries()].sort((x, y) => y[1] - x[1])[0] || [0, 0];
  if (topCount >= 5 && topCount / spatial.length >= 0.6) flags.push(`${topCount} of ${spatial.length} moves last the same ${(topDur * dt).toFixed(2)}s: weight and role should change the timing`);
  const fades = segments.filter((s) => s.fade);
  if (fades.length >= 4 && fades.length / Math.max(1, segments.length) > 0.6) flags.push(`${fades.length} of ${segments.length} moves are fades or small drifts: most things appear rather than arrive or transform`);
  const over = segments.filter((s) => s.overshoot >= 3);
  if (over.length) notes.push(`overshoot: ${over.slice(0, 6).map((s) => `${s.el} ${s.overshoot}%`).join(", ")}`);
  // Rest: share of the film where nothing moves.
  let still = 0;
  for (let i = 1; i < n; i++) if (speeds.every((sp, k) => sp[i] <= moveThr && fadeRate[k][i] <= 0.25)) still++;
  notes.push(`${Math.round((still / (n - 1)) * 100)}% of the time nothing moves`);
  // Something new: a distinct move starting (any element). Gaps over 2.2 s with nothing new read as "not enough going
  // on"; launch films in the house style start something every ~0.8-1.5 s, with one 1-2 s rest after a peak.
  const starts = [...new Set(segments.filter((x) => x.travel > 12 || x.fade).map((x) => +x.from.toFixed(2)))].sort((p, q) => p - q);
  const span = times[n - 1] - times[0];
  const gaps = [];
  let prevT = times[0];
  for (const t0 of [...starts, times[n - 1]]) {
    if (t0 - prevT > 2.2) gaps.push([prevT, t0]);
    prevT = Math.max(prevT, t0);
  }
  // A gap only counts when the picture is also still: pixels = [{ t, diff }] from tiny frames (canvas visuals move
  // pixels, not element boxes). Without pixel data every gap counts.
  const busy = ([a0, b0]) => pixels.some((p) => p.t > a0 + 0.2 && p.t < b0 - 0.2 && p.diff > 3);
  const longGaps = gaps.filter(([a0, b0]) => b0 - a0 > 2.2 && !busy([a0, b0]));
  if (longGaps.length > 1 || longGaps.some(([a0, b0]) => b0 - a0 > 3.2))
    flags.push(`nothing new starts for ${longGaps.map(([a0, b0]) => `${(b0 - a0).toFixed(1)}s (${fmtT(a0)}-${fmtT(b0)})`).join(", ")}: a launch film starts something every ~0.8-1.5 s (a second element, the camera, a light sweep, a number, a chip) and rests at most once after a peak`);
  if (span > 4) notes.push(`${(starts.length / span).toFixed(2)} new moves a second (the house style aims for about 0.7-1.2 in a launch film)`);
  // Beats with nothing starting near them.
  const quiet = beats.filter((b) => b > times[0] + 0.05 && !segments.some((s) => Math.abs(s.from - b) <= 0.25));
  if (quiet.length) notes.push(`no move starts within 0.25s of the beat at ${quiet.slice(0, 6).map(fmtT).join(", ")}`);
  return { segments, flags, notes, speeds, dt };
}

let workDir = null;
const work = () => (workDir ||= fs.mkdtempSync(path.join(os.tmpdir(), "drip-trace-")));

/** Draw a page in the shared browser: the page sets window.ready (a promise) when its canvas is done. */
export async function drawPage(html, width, height, config) {
  const dir = work();
  const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  fs.writeFileSync(path.join(dir, `${id}.html`), html);
  try {
    const base = await serveDir(dir);
    return await withTab(config, async (tab) => {
      await openPage(tab, `${base}/${id}.html`, { width, height, settleMs: 0 });
      await evalJson(tab.s, "window.ready.then(() => 1)");
      const { data } = await tab.s("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
      return Buffer.from(data, "base64");
    });
  } finally {
    fs.rmSync(path.join(dir, `${id}.html`), { force: true });
  }
}

const COLORS = ["#ff5b3a", "#3a8bff", "#18b67a", "#c552ff", "#f5b800", "#00b8c8", "#ff4f9a", "#8a6cff", "#7fbf2a", "#ff8a1f", "#4bd1ff", "#d94040"];

/** The dopesheet: a lane per element (moving segments as bars, speed as a curve inside, opacity as the bar's fill), beats as lines. */
export async function dopesheet({ labels, times, speeds, segments, samples, beats = [], config }) {
  const active = labels.map((_, k) => k).filter((k) => segments.some((s) => s.k === k)).slice(0, 16);
  const W = 1600;
  const laneH = 46;
  const H = 70 + active.length * laneH + 30;
  const data = {
    W,
    H,
    laneH,
    t0: times[0],
    t1: times.at(-1),
    times,
    beats,
    lanes: active.map((k, i) => ({ label: labels[k], color: COLORS[i % COLORS.length], speed: speeds[k], opacity: samples.map((f) => f[k]?.[4] ?? 0), segs: segments.filter((s) => s.k === k).map((s) => [s.from, s.to, s.dead ? 1 : 0, s.linear ? 1 : 0]) })),
  };
  const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#101012}</style><canvas id=c width=${W} height=${H}></canvas><script>
const D = ${JSON.stringify(data)};
const c = document.getElementById('c'), x = c.getContext('2d');
const L = 190, R = D.W - 20, X = (t) => L + ((t - D.t0) / Math.max(0.001, D.t1 - D.t0)) * (R - L);
x.fillStyle = '#101012'; x.fillRect(0, 0, D.W, D.H);
x.font = '600 15px system-ui'; x.fillStyle = '#eee'; x.fillText('DOPESHEET  (bars = moving · curve = speed · fill = opacity · red edge = stops dead · dashed = linear)', 16, 26);
// time axis
x.font = '12px ui-monospace, monospace'; x.fillStyle = '#888';
const span = D.t1 - D.t0, step = span > 20 ? 2 : span > 8 ? 1 : 0.5;
for (let t = Math.ceil(D.t0 / step) * step; t <= D.t1 + 1e-6; t += step) { x.fillText(t.toFixed(step < 1 ? 1 : 0) + 's', X(t) - 8, 52); x.fillStyle = '#222'; x.fillRect(X(t), 58, 1, D.H - 80); x.fillStyle = '#888'; }
D.lanes.forEach((ln, i) => {
  const y = 64 + i * D.laneH;
  x.fillStyle = i % 2 ? '#16161a' : '#131316'; x.fillRect(0, y, D.W, D.laneH);
  x.fillStyle = '#ddd'; x.font = '13px system-ui'; x.fillText(ln.label.slice(0, 24), 12, y + D.laneH / 2 + 4);
  const peak = Math.max(1, ...ln.speed);
  for (const [a, b, dead, lin] of ln.segs) {
    x.fillStyle = ln.color + '33'; x.fillRect(X(a), y + 6, Math.max(2, X(b) - X(a)), D.laneH - 12);
    if (dead) { x.fillStyle = '#ff2a2a'; x.fillRect(X(b) - 3, y + 4, 4, D.laneH - 8); }
    if (lin) { x.setLineDash([4, 4]); x.strokeStyle = '#fff'; x.strokeRect(X(a), y + 6, X(b) - X(a), D.laneH - 12); x.setLineDash([]); }
  }
  // opacity as a thin line at the lane's foot
  x.strokeStyle = '#777'; x.lineWidth = 1; x.beginPath();
  ln.opacity.forEach((o, j) => { const px = X(D.times[j]), py = y + D.laneH - 5 - o * 8; j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
  // speed curve
  x.strokeStyle = ln.color; x.lineWidth = 2; x.beginPath();
  ln.speed.forEach((v, j) => { const px = X(D.times[j]), py = y + D.laneH - 8 - (v / peak) * (D.laneH - 18); j ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
});
x.setLineDash([6, 5]); x.strokeStyle = '#ffffffaa'; x.lineWidth = 1;
D.beats.forEach((b, i) => { x.beginPath(); x.moveTo(X(b), 58); x.lineTo(X(b), D.H - 22); x.stroke(); x.fillStyle = '#fff'; x.font = '11px system-ui'; x.fillText('beat ' + (i + 2), X(b) + 3, D.H - 8); });
window.ready = Promise.resolve();
</script>`;
  return drawPage(html, W, H, config);
}

/**
 * An onion skin of one stretch: the frames ghosted over each other (older = fainter) and every tracked element's
 * measured centre path dotted on top, one dot per frame. Even spacing = linear; dots bunching at the end = ease-out;
 * a dot past the end and back = overshoot; a straight line where an arc was meant = mechanical.
 */
export async function onionSkin({ ghosts, labels, times, samples, from, to, width = 1920, height = 1080, config }) {
  const W = 960;
  const H = Math.round((960 * height) / width);
  const k = W / width;
  const i0 = times.findIndex((t) => t >= from - 1e-6);
  const i1 = times.findLastIndex((t) => t <= to + 1e-6);
  const paths = labels
    .map((label, e) => ({ label, pts: samples.slice(i0, i1 + 1).map((f) => [f[e][0] * k, f[e][1] * k, f[e][4]]) }))
    .filter((p) => p.pts.some((q, j) => j && Math.hypot(q[0] - p.pts[j - 1][0], q[1] - p.pts[j - 1][1]) > 0.6))
    .slice(0, 10)
    .map((p, i) => ({ ...p, color: COLORS[i % COLORS.length] }));
  const imgs = ghosts.filter((g) => g.t >= from - 1e-6 && g.t <= to + 1e-6).map((g) => `data:image/jpeg;base64,${g.buf.toString("base64")}`);
  const html = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}</style><canvas id=c width=${W} height=${H + 34}></canvas><script>
const imgs = ${JSON.stringify(imgs)}, paths = ${JSON.stringify(paths)};
const c = document.getElementById('c'), x = c.getContext('2d');
window.ready = (async () => {
  const loaded = await Promise.all(imgs.map((s) => { const i = new Image(); i.src = s; return i.decode().then(() => i); }));
  if (loaded.length) {
    x.drawImage(loaded[0], 0, 0, ${W}, ${H});
    const d = x.getImageData(0, 0, 32, 32).data; let m = 0; for (let i = 0; i < d.length; i += 4) m += d[i] + d[i + 1] + d[i + 2]; m /= (d.length / 4) * 3;
    x.globalCompositeOperation = m < 128 ? 'lighten' : 'darken';
    loaded.forEach((im, i) => { x.globalAlpha = 0.25 + 0.75 * (i / Math.max(1, loaded.length - 1)); x.drawImage(im, 0, 0, ${W}, ${H}); });
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  for (const p of paths) {
    x.strokeStyle = p.color; x.lineWidth = 1.5; x.beginPath(); p.pts.forEach((q, j) => (j ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.stroke();
    x.fillStyle = p.color; p.pts.forEach((q) => { x.beginPath(); x.arc(q[0], q[1], 2.6, 0, 7); x.fill(); });
  }
  x.fillStyle = '#000'; x.fillRect(0, ${H}, ${W}, 34);
  x.font = '13px system-ui'; let lx = 10;
  x.fillStyle = '#fff'; x.fillText('${fmtT(from)}-${fmtT(to)}  one dot per frame:', lx, ${H} + 22); lx += 200;
  for (const p of paths) { x.fillStyle = p.color; x.fillText('● ' + p.label.slice(0, 16), lx, ${H} + 22); lx += 20 + x.measureText(p.label.slice(0, 16)).width + 12; if (lx > ${W} - 60) break; }
})();
</script>`;
  return drawPage(html, W, H + 34, config);
}

/** Stretches to onion-skin: the storyboard's beats (capped), else the film in equal parts. */
export function stretches(duration, beats = [], max = 6) {
  const b = beats.filter((x) => x.len > 0).map((x) => [x.at, Math.min(duration, x.at + x.len)]);
  if (b.length) return b.slice(0, max);
  const n = Math.min(max, Math.max(1, Math.round(duration / 3)));
  return Array.from({ length: n }, (_, i) => [(i * duration) / n, ((i + 1) * duration) / n]);
}
