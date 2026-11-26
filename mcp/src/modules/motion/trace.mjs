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
  // The camera, when the film marks it (data-camera, data-track="camera" or #camera): tracked first, and every element
  // records whether it sits inside it (its screen motion then includes the camera's).
  const cam = document.querySelector('[data-camera], [data-track="camera"], #camera');
  if (cam && !els.includes(cam)) els.unshift(cam);
  els = els.slice(0, 24);
  const labels = els.map((e, i) => {
    e.setAttribute('data-drip-k', i);
    const txt = (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18);
    return e.dataset.track || (e.id ? '#' + e.id : e.tagName.toLowerCase() + (txt ? ' "' + txt + '"' : ''));
  });
  return { labels, cam: cam ? els.indexOf(cam) : -1, inCam: els.map((e) => !!cam && e !== cam && cam.contains(e)) };
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
    const picked = await evalJson(tab.s, PICK);
    const labels = picked.labels;
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
    return { probe: { ...probe, duration: D }, labels, times, samples, ghosts, thumbs, cam: picked.cam, inCam: picked.inCam };
  });
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The numbers: per element its moving segments, and the flags. Pure (tested).
 * A segment: { el, from, to, travel, peak, endRatio, linear, hitchAt, overshoot, fade }.
 */
/**
 * Separate the camera from the choreography. Each frame, fit one shared move (zoom s and pan t) to every visible
 * element's centre; when most elements follow it, that is the camera, and each element's own motion is what is left
 * over. Returns { samples: corrected (as if the camera stood still), camera: [{ i, s, tx, ty }] for frames where it
 * moved }. Pure (tested).
 */
export function removeCamera(samples, { width = 1920, cam = -1, inCam = null } = {}) {
  const n = samples.length;
  if (n < 2) return { samples, camera: [] };
  const tol = Math.max(2, width * 0.004);
  const out = [samples[0].map((p) => (p ? [...p] : p))];
  const camera = [];
  const fit = (pairs) => {
    const k = pairs.length;
    let mx = 0, my = 0, nx = 0, ny = 0;
    for (const [a, b] of pairs) {
      mx += a[0] / k; my += a[1] / k; nx += b[0] / k; ny += b[1] / k;
    }
    let num = 0, den = 0;
    for (const [a, b] of pairs) {
      num += (a[0] - mx) * (b[0] - nx) + (a[1] - my) * (b[1] - ny);
      den += (a[0] - mx) ** 2 + (a[1] - my) ** 2;
    }
    const s = den > 1 ? num / den : 1;
    return { s, tx: nx - s * mx, ty: ny - s * my };
  };
  for (let i = 1; i < n; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    const pairs = [];
    for (let k = 0; k < cur.length; k++) if (prev[k] && cur[k] && (prev[k][4] ?? 1) > 0.05 && (cur[k][4] ?? 1) > 0.05) pairs.push([prev[k], cur[k], k]);
    let T = { s: 1, tx: 0, ty: 0 };
    const markedCam = cam >= 0 && prev[cam] && cur[cam] && prev[cam][2] > 0;
    if (markedCam) {
      const s0 = cur[cam][2] / prev[cam][2];
      const f = { s: s0, tx: cur[cam][0] - s0 * prev[cam][0], ty: cur[cam][1] - s0 * prev[cam][1] };
      if (Math.abs(f.s - 1) > 0.002 || Math.hypot(f.tx, f.ty) > 0.8) {
        T = f;
        camera.push({ i, ...f });
      }
    } else if (pairs.length >= 6) {
      // Unmarked: guess the camera only when most of a busy frame (6+ visible elements, 75%) moves as one.
      let f = fit(pairs);
      const res = (p) => Math.hypot(p[1][0] - (f.s * p[0][0] + f.tx), p[1][1] - (f.s * p[0][1] + f.ty));
      const inl = pairs.filter((p) => res(p) < tol);
      if (inl.length >= Math.max(5, pairs.length * 0.75)) {
        f = fit(inl);
        const moved = Math.abs(f.s - 1) > 0.002 || Math.hypot(f.tx, f.ty) > 0.8;
        if (moved) {
          T = f;
          camera.push({ i, ...f });
        }
      }
    }
    // Corrected position = last corrected position + the element's own move (what the camera doesn't explain).
    const row = cur.map((p, k) => {
      if (!p) return p;
      // A marked camera moves only what is inside it (and itself); everything else keeps its screen motion.
      const Tk = markedCam && inCam && !inCam[k] && k !== cam ? { s: 1, tx: 0, ty: 0 } : T;
      const q = prev[k];
      const c = out[i - 1][k];
      if (!q || !c) return [...p];
      const ex = Tk.s * q[0] + Tk.tx;
      const ey = Tk.s * q[1] + Tk.ty;
      const sw = Tk.s ? p[2] / Tk.s : p[2];
      const sh = Tk.s ? p[3] / Tk.s : p[3];
      return [c[0] + (p[0] - ex), c[1] + (p[1] - ey), c[2] * (q[2] ? sw / q[2] : 1), c[3] * (q[3] ? sh / q[3] : 1), p[4]];
    });
    out.push(row);
  }
  return { samples: out, camera };
}

export function analyzeTrace({ labels, times, samples: raw, width = 1920, beats = [], pixels = [], cam = -1, inCam = null }) {
  const n = times.length;
  if (n < 3) return { segments: [], flags: [], notes: [], speeds: [] };
  const dt = (times[n - 1] - times[0]) / (n - 1);
  // The camera moves everything at once; that's not choreography. Measure each element's own motion.
  const { samples, camera } = removeCamera(raw, { width, cam, inCam });
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
      // Motion nobody can see (an element at opacity 0 waiting for its scene) is not choreography.
      let vis = 0;
      for (let j = a - 1; j <= b; j++) vis = Math.max(vis, samples[j]?.[k]?.[4] ?? 0);
      if (vis < 0.05) continue;
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
  // Elements that move rigidly together (a container, a frame growing to fill the screen) are one move, not many:
  // count units, where a unit is a set of elements whose relative layout holds over the next frames.
  const units = (ks, i0) => {
    const i1 = Math.min(n - 1, i0 + 4);
    const a = Math.max(0, i0 - 1);
    const pts = ks.filter((k) => raw[a]?.[k] && raw[i1]?.[k]);
    if (pts.length < 4) return ks.length;
    const { samples: rel } = removeCamera([pts.map((k) => raw[a][k]), pts.map((k) => raw[i1][k])], { width });
    const still = pts.filter((_, j) => Math.hypot(rel[1][j][0] - rel[0][j][0], rel[1][j][1] - rel[0][j][1]) < Math.max(3, width * 0.004));
    return still.length >= 3 ? ks.length - still.length + 1 : ks.length;
  };
  for (const group of byStart.values()) {
    const ks = [...new Set(group.map((s) => s.k))];
    if (ks.length < 4) continue;
    const i0 = times.findIndex((t) => t >= group[0].from - 1e-6);
    const u = units(ks, Math.max(1, i0));
    if (u >= 4) flags.push(`${u} separate moves start on the same frame at ${fmtT(group[0].from)} (${group.slice(0, 4).map((s) => s.el).join(", ")}…): lead with one, let the others follow`);
  }
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
  // Report the camera as camera: spans of frames where one shared move carried everything.
  const camSpans = [];
  for (const c of camera) {
    const t0 = times[c.i - 1];
    const last = camSpans.at(-1);
    if (last && t0 - last.to <= dt * 2.5) {
      last.to = times[c.i];
      last.zoom *= c.s;
    } else camSpans.push({ from: t0, to: times[c.i], zoom: c.s });
  }
  const camLong = camSpans.filter((c) => c.to - c.from >= dt * 2);
  if (camLong.length)
    notes.push(`camera moves (one shared move for everything, not counted as choreography): ${camLong.slice(0, 6).map((c) => `${fmtT(c.from)}-${fmtT(c.to)}${Math.abs(c.zoom - 1) > 0.02 ? ` ${c.zoom > 1 ? "push in" : "pull out"} x${c.zoom.toFixed(2)}` : " pan"}`).join(", ")}`);
  return { segments, flags, notes, speeds, dt, camera: camSpans };
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
