// Drip Motion's eyes and hands: seek a composition to any time and shoot it, sample a reference video,
// measure the frames (blank, held, cut, flicker), and encode frames to a video.
// A composition is any HTML page that can be put at time t. Drip finds the clock in this order:
//   1. window.__drip.seek(t)          (Drip's kit template; any renderer can expose it)
//   1b. window.seek(t)                (the plain convention several motion skills and FrameVelo use)
//   2. window.__timelines            (HyperFrames: a map of GSAP timelines)
//   3. a paused GSAP master timeline  (window.__tl or window.tl)
//   4. CSS / Web Animations           (document.getAnimations(), paused and set to t)
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { serveDir } from "../../core/serve.mjs";
import { vendorResolve } from "../../core/vendor.mjs";
import { get } from "../../core/http.mjs";
import { vendoredFfmpeg } from "./renderers.mjs";
import { fetchSiteVideo, isPlatformVideo } from "./sitevideo.mjs";

/** Runs in the page: the composition's clock, or null. */
export const PROBE = `(() => {
  const d = window.__drip;
  if (d && typeof d.seek === 'function') return { via: 'drip', duration: +d.duration || null, fps: +d.fps || null, width: +d.width || null, height: +d.height || null };
  if (typeof window.seek === 'function') return { via: 'seek', duration: +(window.DURATION || window.duration) || null };
  if (window.__timelines && typeof window.__timelines === 'object') {
    const tls = Object.values(window.__timelines).filter((t) => t && typeof t.seek === 'function');
    if (tls.length) return { via: 'hyperframes', duration: Math.max(...tls.map((t) => (t.duration ? t.duration() : 0))) || null };
  }
  const tl = window.__tl || window.tl;
  if (tl && typeof tl.seek === 'function') return { via: 'gsap', duration: tl.duration ? tl.duration() : null };
  const anims = document.getAnimations ? document.getAnimations() : [];
  if (anims.length) {
    const ends = anims.map((a) => { const t = a.effect && a.effect.getComputedTiming(); return t && isFinite(t.endTime) ? t.endTime / 1000 : 0; });
    return { via: 'css', duration: Math.max(0, ...ends) || null };
  }
  return null;
})()`;

/** Runs in the page: put everything at time t (seconds), then wait two frames for layout and paint. */
export const seekExpr = (t) => `(async () => {
  const t = ${Number(t)};
  // Frozen UIs (DripVisuals.uiFrame) and anything else the film registered load before the first frame.
  if (window.__dripWait && window.__dripWait.length) await Promise.race([Promise.all(window.__dripWait), new Promise((r) => setTimeout(r, 10000))]);
  const d = window.__drip;
  if (d && typeof d.seek === 'function') await d.seek(t);
  else if (typeof window.seek === 'function') await window.seek(t);
  else if (window.__timelines) for (const tl of Object.values(window.__timelines)) { if (tl && tl.seek) { tl.pause && tl.pause(); tl.seek(t, false); } }
  else if ((window.__tl || window.tl) && (window.__tl || window.tl).seek) { const tl = window.__tl || window.tl; tl.pause && tl.pause(); tl.seek(t, false); }
  if (document.getAnimations) for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t * 1000; } catch (e) {} }
  for (const v of document.querySelectorAll('video')) { try { v.pause(); if (Math.abs(v.currentTime - t) > 0.02) { v.currentTime = t; await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); }); } } catch (e) {} }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // Images that appeared with this frame (a card grid, a React piece mounting <img>) must be decoded before the shot,
  // or the same time gives two pictures. Fonts too. Capped so a broken image can't hang a render.
  const pending = [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()));
  if (pending.length || (document.fonts && document.fonts.status !== 'loaded')) {
    await Promise.race([Promise.all([...pending, document.fonts ? document.fonts.ready : null]), new Promise((r) => setTimeout(r, 4000))]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  // Text that pokes out of the frame while visible (a common render-only flaw).
  const W = innerWidth, H = innerHeight, out = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,li,a,strong,em,b,div')) {
    if (out.length > 3) break;
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    const inside = r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
    const gone = r.right < 0 || r.left > W || r.bottom < 0 || r.top > H;
    if (inside || gone) continue;
    // Only text someone can see counts: opacity multiplies down the tree, and text under a clip-path, a mask (a
    // reveal in progress) or a container that crops it inside the frame is hidden on purpose.
    let op = 1, hidden = false;
    for (let n = el; n && n.nodeType === 1 && !hidden; n = n.parentElement) {
      const s = getComputedStyle(n);
      op *= +s.opacity;
      if (s.display === 'none' || s.visibility === 'hidden') hidden = true;
      if ((s.clipPath && s.clipPath !== 'none') || (s.maskImage && s.maskImage !== 'none') || (s.webkitMaskImage && s.webkitMaskImage !== 'none')) hidden = true;
      if (n !== el && /(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) {
        const b = n.getBoundingClientRect();
        if (b.left >= -1 && b.top >= -1 && b.right <= W + 1 && b.bottom <= H + 1) hidden = true;
      }
    }
    if (hidden || op < 0.2) continue;
    out.push(el.textContent.trim().slice(0, 40));
  }
  return { clipped: out };
})()`;

export const fmtT = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

/** The times to shoot: explicit times, a window around each cut, a dense range, or an even sweep. */
export function planTimes({ duration, times, around, from, to, step, count = 16 }) {
  const D = Math.max(0.1, duration || 10);
  const clamp = (t) => Math.min(Math.max(0, t), Math.max(0, D - 1 / 60));
  if (times?.length) return [...new Set(times.map(clamp))].sort((a, b) => a - b);
  if (around?.length) {
    const out = [];
    for (const c of around) for (const o of [-0.25, -0.1, 0, 0.1, 0.25]) out.push(clamp(c + o));
    return [...new Set(out.map((t) => +t.toFixed(3)))].sort((a, b) => a - b);
  }
  if (from != null || to != null) {
    const a = clamp(from ?? 0);
    const b = clamp(to ?? D);
    const st = step || Math.max(1 / 30, (b - a) / 15);
    const out = [];
    for (let t = a; t <= b + 1e-6 && out.length < 60; t += st) out.push(+t.toFixed(3));
    return out;
  }
  const n = Math.max(2, Math.min(48, count));
  return Array.from({ length: n }, (_, i) => +clamp((i * D) / (n - 1)).toFixed(3));
}

/**
 * Open a composition and shoot it at each time. Returns { probe, frames: [{ t, buf, clipped }], errors }.
 * Page errors and failed requests are collected: a missing font or image is a render bug.
 */
export async function shootComposition(url, { times, duration, width = 1920, height = 1080, scale = 0.5, quality = 82, config } = {}) {
  return withTab(config, async (tab) => {
    const errors = [];
    const onMsg = (msg) => {
      if (msg.sessionId !== tab.sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") errors.push(`script error: ${msg.params?.exceptionDetails?.exception?.description?.split("\n")[0] || msg.params?.exceptionDetails?.text}`);
      else if (msg.method === "Network.loadingFailed" && !msg.params?.canceled) errors.push(`failed to load (${msg.params?.errorText})`);
      else if (msg.method === "Network.responseReceived" && msg.params?.response?.status >= 400 && !/\/favicon\.ico(\?|$)/.test(msg.params.response.url)) errors.push(`${msg.params.response.status}: ${msg.params.response.url}`);
    };
    tab.listeners.add(onMsg);
    try {
      await tab.s("Runtime.enable");
      await tab.s("Network.enable");
      await openPage(tab, url, { width, height, settleMs: 400 });
      const probe = await evalJson(tab.s, PROBE);
      if (!probe) return { probe: null, frames: [], errors };
      const D = duration || probe.duration || 10;
      const ts = planTimes({ duration: D, ...times });
      const frames = [];
      for (const t of ts) {
        const r = await evalJson(tab.s, seekExpr(t));
        const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality, clip: { x: 0, y: 0, width, height, scale } });
        frames.push({ t, buf: Buffer.from(data, "base64"), clipped: r?.clipped || [] });
      }
      return { probe: { ...probe, duration: D }, frames, errors: [...new Set(errors)].slice(0, 12) };
    } finally {
      tab.listeners.delete(onMsg);
    }
  });
}

let workDir = null;
const work = () => (workDir ||= fs.mkdtempSync(path.join(os.tmpdir(), "drip-motion-")));

/**
 * Measure frames in the browser: per frame the luminance spread (0 = one flat colour) and the mean change
 * from the previous frame (0-255), on 64x36 thumbnails. Cheap and dependency-free.
 */
export async function measureFrames(bufs, { config } = {}) {
  if (!bufs.length) return [];
  const dir = work();
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const names = bufs.map((b, i) => {
    const n = `${id}-${i}.jpg`;
    fs.writeFileSync(path.join(dir, n), b);
    return n;
  });
  fs.writeFileSync(
    path.join(dir, `${id}.html`),
    `<!doctype html><meta charset=utf-8><script>
window.run = async () => {
  const names = ${JSON.stringify(names)};
  const c = document.createElement('canvas'); c.width = 64; c.height = 36;
  const x = c.getContext('2d', { willReadFrequently: true });
  let prev = null; const out = [];
  for (const n of names) {
    const img = new Image(); img.src = n; await img.decode();
    x.drawImage(img, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data;
    const L = new Float32Array(64 * 36);
    let sum = 0;
    for (let i = 0; i < L.length; i++) { L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]; sum += L[i]; }
    const mean = sum / L.length;
    let v = 0; for (let i = 0; i < L.length; i++) v += (L[i] - mean) ** 2;
    let diff = null, block = null;
    if (prev) {
      diff = 0; for (let i = 0; i < L.length; i++) diff += Math.abs(L[i] - prev[i]); diff /= L.length;
      block = 0;
      for (let by = 0; by < 6; by++) for (let bx = 0; bx < 8; bx++) {
        let b = 0;
        for (let y = by * 6; y < by * 6 + 6; y++) for (let x = bx * 8; x < bx * 8 + 8; x++) b += Math.abs(L[y * 64 + x] - prev[y * 64 + x]);
        block = Math.max(block, b / 48);
      }
    }
    // Fill: the share of the frame that isn't the background (the most common colour, coarsely bucketed).
    const buckets = new Map();
    for (let i = 0; i < L.length; i++) { const k = ((d[i * 4] >> 4) << 8) | ((d[i * 4 + 1] >> 4) << 4) | (d[i * 4 + 2] >> 4); buckets.set(k, (buckets.get(k) || 0) + 1); }
    let modeK = 0, modeN = -1; for (const [k, n] of buckets) if (n > modeN) { modeN = n; modeK = k; }
    const mr = ((modeK >> 8) & 15) * 16 + 8, mg = ((modeK >> 4) & 15) * 16 + 8, mb = (modeK & 15) * 16 + 8;
    // On a dark ground (an ink brand) dark UI differs from it by small steps: the threshold follows the ground's
    // brightness, and any edge (text, a hairline border) counts as something on screen.
    const gL = 0.2126 * mr + 0.7152 * mg + 0.0722 * mb;
    const thr = gL < 40 ? 16 : gL < 90 ? 30 : 48;
    let filled = 0;
    for (let i = 0; i < L.length; i++) {
      const off = Math.abs(d[i * 4] - mr) + Math.abs(d[i * 4 + 1] - mg) + Math.abs(d[i * 4 + 2] - mb) > thr;
      const edge = (i % 64 && Math.abs(L[i] - L[i - 1]) > 10) || (i >= 64 && Math.abs(L[i] - L[i - 64]) > 10);
      if (off || edge) filled++;
    }
    out.push({ mean: +mean.toFixed(1), spread: +Math.sqrt(v / L.length).toFixed(1), diff: diff == null ? null : +diff.toFixed(1), block: block == null ? null : +block.toFixed(1), fill: +(filled / L.length).toFixed(3) });
    prev = L;
  }
  return out;
};
</script>`,
  );
  try {
    const base = await serveDir(dir);
    return await withTab(config, async (tab) => {
      await openPage(tab, `${base}/${id}.html`, { width: 200, height: 120, settleMs: 0 });
      return evalJson(tab.s, "window.run()");
    });
  } finally {
    for (const n of [...names, `${id}.html`]) fs.rmSync(path.join(dir, n), { force: true });
  }
}

/**
 * What the numbers say about a sampled film. `dense` = frames are 1/fps apart (flicker is only visible then).
 * Thresholds are on a 0-255 luminance scale.
 */
export function judgeFrames(times, m, { dense = false } = {}) {
  const issues = [];
  const notes = [];
  // An empty first or last frame is a fade from or to the ground: worth a note, not a fault.
  const empty = m.map((x) => !!x && x.spread < 2.5);
  let lead = 0;
  while (lead < empty.length && empty[lead]) lead++;
  let tail = empty.length;
  while (tail > lead && empty[tail - 1]) tail--;
  const blank = times.filter((t, i) => empty[i] && i >= lead && i < tail);
  if (lead) notes.push(`opens on an empty frame until ${fmtT(times[Math.min(lead, times.length - 1)])} (fine for a fade or an entrance from off-frame; a hook usually has something on screen within the first second)`);
  if (tail < empty.length && lead < empty.length) notes.push(`ends on an empty frame from ${fmtT(times[tail])}`);
  if (blank.length) issues.push(`blank frame${blank.length > 1 ? "s" : ""} (one flat colour) at ${blank.slice(0, 6).map(fmtT).join(", ")}`);
  const cuts = [];
  for (let i = 1; i < m.length; i++) if (m[i]?.diff != null && m[i].diff > 38) cuts.push(times[i]);
  // Held stretches: nothing changes across several samples. Rest is good; a long dead hold usually isn't.
  let run = 0;
  let runStart = 0;
  const holds = [];
  for (let i = 1; i <= m.length; i++) {
    const still = i < m.length && m[i]?.diff != null && m[i].diff < 0.6;
    if (still) {
      if (!run) runStart = times[i - 1];
      run++;
    } else if (run) {
      const len = times[i - 1] - runStart;
      if (len >= 2) holds.push([runStart, times[i - 1]]);
      run = 0;
    }
  }
  if (dense) {
    for (let i = 1; i < m.length - 1; i++) {
      const a = m[i]?.diff;
      const b = m[i + 1]?.diff;
      if (a > 14 && b > 14 && Math.abs((m[i - 1]?.mean ?? 0) - (m[i + 1]?.mean ?? 0)) < 2) issues.push(`possible flicker at ${fmtT(times[i])} (the frame differs from both neighbours, which match)`);
    }
  }
  if (cuts.length) notes.push(`big picture changes between samples (a cut or a fast camera move; not counted as cuts here) at ${cuts.slice(0, 10).map(fmtT).join(", ")}${cuts.length > 10 ? ` (+${cuts.length - 10})` : ""}`);
  if (holds.length) notes.push(`still stretches: ${holds.slice(0, 6).map(([a, b]) => `${fmtT(a)}-${fmtT(b)}`).join(", ")}`);
  // Mostly empty frames: under 12% of the picture is anything but background. A rest can be spare; a film that is
  // mostly empty frames reads as unfinished ("not enough going on").
  const sparse = times.filter((t, i) => i >= lead && i < tail && m[i] && m[i].fill != null && m[i].fill < 0.12 && m[i].spread >= 2.5);
  const filledShare = m.filter((x) => x?.fill != null).map((x) => x.fill);
  const meanFill = filledShare.length ? filledShare.reduce((x, y) => x + y, 0) / filledShare.length : null;
  if (sparse.length >= 3 && sparse.length / Math.max(1, tail - lead) > 0.25)
    issues.push(`mostly empty frames (under 12% of the picture has anything on it) at ${sparse.slice(0, 6).map(fmtT).join(", ")}${sparse.length > 6 ? ` (+${sparse.length - 6})` : ""}: add a living background (light field, glow, grain), scale the subject up, or layer a second element`);
  if (meanFill != null) notes.push(`frames are ${Math.round(meanFill * 100)}% filled on average`);
  const energy = m.slice(1).map((x) => x?.diff ?? 0);
  return { issues: [...new Set(issues)], notes, cuts, holds, energy };
}

/** A one-line sparkline of how much changes over time (the film's rhythm). */
export function sparkline(values) {
  const bars = "▁▂▃▄▅▆▇█";
  const max = Math.max(1, ...values);
  return values.map((v) => bars[Math.min(7, Math.round((v / max) * 7))]).join("");
}

/**
 * Sample a reference video (local file, direct video URL, or a page with a <video>) by seeking its element.
 * Returns { duration, frames: [{ t, buf }] }. Pages that lazy-load the video get a click on it first.
 */
export async function sampleVideo(source, { every, times, fractions = false, max = 120, width = 1280, height = 720, config } = {}) {
  // YouTube, X, Vimeo, Instagram, TikTok…: fetched as an MP4 first (their pages don't play for a logged-out tab).
  if (isPlatformVideo(source)) return sampleVideo(await fetchSiteVideo(source), { every, times, fractions, max, width, height, config });
  const isFile = !/^https?:/i.test(source);
  if (isFile || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(source)) {
    // The video plays from memory (a blob), so it seeks whether or not its host serves byte ranges.
    let buf;
    let ext;
    if (isFile) {
      const abs = path.resolve(source);
      if (!fs.existsSync(abs)) throw new Error(`Video not found: ${source}`);
      buf = fs.readFileSync(abs);
      ext = path.extname(abs).slice(1) || "mp4";
    } else {
      buf = (await get(source, { as: "buffer", ttlMs: 7 * 24 * 3600e3, timeoutMs: 120000 })).body;
      ext = (source.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) || ["", "mp4"])[1].toLowerCase();
    }
    if (buf.length > 200 * 1024 * 1024) throw new Error(`The video is ${Math.round(buf.length / 1048576)} MB: use a shorter clip or a preview (under 200 MB).`);
    const dir = work();
    const id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    fs.writeFileSync(path.join(dir, `${id}.${ext}`), buf);
    fs.writeFileSync(
      path.join(dir, `${id}.html`),
      `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}video{width:100vw;height:100vh;object-fit:contain;display:block}</style><video muted playsinline preload="auto"></video>` +
        `<script>fetch('${id}.${ext}').then((r) => r.blob()).then((b) => { document.querySelector('video').src = URL.createObjectURL(b); });</script>`,
    );
    const base = await serveDir(dir);
    try {
      return await sampleVideoAt(`${base}/${id}.html`, { every, times, fractions, max, width, height, config });
    } finally {
      for (const f of [`${id}.${ext}`, `${id}.html`]) fs.rmSync(path.join(dir, f), { force: true });
    }
  }
  const seen = await sampleVideoAt(source, { every, times, fractions, max, width, height, config });
  if (seen.duration) return seen;
  // No playable <video> on the page: yt-dlp's generic extractor finds embedded players (Vimeo, Wistia, JW…).
  let local;
  try {
    local = await fetchSiteVideo(source);
  } catch {
    return seen;
  }
  return sampleVideo(local, { every, times, fractions, max, width, height, config });
}

async function sampleVideoAt(url, { every, times, fractions, max, width, height, config }) {
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, settleMs: 800 });
    const info = await evalJson(
      tab.s,
      `(async () => {
        const pick = () => [...document.querySelectorAll('video')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
        let v = pick();
        if (!v) return null;
        v.muted = true;
        for (let i = 0; i < 40 && !(v.duration > 0 && isFinite(v.duration)); i++) { try { await v.play(); } catch (e) {} await new Promise((r) => setTimeout(r, 150)); v = pick(); }
        try { v.pause(); } catch (e) {}
        v.scrollIntoView({ block: 'center' });
        const r = v.getBoundingClientRect();
        return { duration: v.duration, x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.width), h: Math.min(innerHeight, r.height) };
      })()`,
    );
    if (!info || !(info.duration > 0) || !isFinite(info.duration)) return { duration: null, frames: [] };
    const D = info.duration;
    const step = every || Math.max(0.25, D / max);
    const frames = [];
    // times: seconds; fractions of the video's own length when every value is below 1 and fractions is set.
    const plan = times?.length ? (fractions ? times.map((f) => +(f * D).toFixed(3)) : times).filter((x) => x < D) : null;
    for (let k = 0, t = plan ? plan[0] : 0; plan ? k < plan.length : t < D && frames.length < max; k++, t = plan ? plan[k] : t + step) {
      // A paused video in a headless tab often doesn't repaint after a seek: draw the decoded frame onto a canvas
      // laid over it (drawing a cross-origin video is allowed; only reading its pixels isn't), and shoot that.
      await evalJson(
        tab.s,
        `(async () => {
          const v = [...document.querySelectorAll('video')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
          let c = document.getElementById('__dripCv');
          if (!c) {
            c = document.createElement('canvas'); c.id = '__dripCv';
            const r = v.getBoundingClientRect();
            Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 2147483647, background: '#000' });
            c.width = Math.round(r.width); c.height = Math.round(r.height);
            document.body.appendChild(c);
          }
          const shown = new Promise((r) => { if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => r()); setTimeout(r, 700); });
          v.currentTime = ${t};
          await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 2500); });
          await shown;
          const x = c.getContext('2d');
          const k = Math.min(c.width / (v.videoWidth || c.width), c.height / (v.videoHeight || c.height));
          const w = (v.videoWidth || c.width) * k, h = (v.videoHeight || c.height) * k;
          x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(v, (c.width - w) / 2, (c.height - h) / 2, w, h);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return 1;
        })()`,
      );
      const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality: 72, clip: { x: info.x, y: info.y, width: info.w, height: info.h, scale: Math.min(1, 640 / info.w) } });
      frames.push({ t: +t.toFixed(3), buf: Buffer.from(data, "base64") });
    }
    return { duration: D, frames };
  });
}

/** ffmpeg: on PATH, or the optional ffmpeg-static (drip doctor --install ffmpeg). Null when neither. */
export async function findFfmpeg() {
  const tryBin = (bin) =>
    new Promise((r) => {
      execFile(bin, ["-version"], { windowsHide: true, timeout: 8000 }, (err) => r(err ? null : bin));
    });
  if (process.env.DRIP_FFMPEG && (await tryBin(process.env.DRIP_FFMPEG))) return process.env.DRIP_FFMPEG;
  if (await tryBin("ffmpeg")) return "ffmpeg";
  // Kinetograph carries its own FFmpeg (installed by the first film's renderer setup).
  const carried = vendoredFfmpeg();
  if (carried && (await tryBin(carried))) return carried;
  const entry = vendorResolve("ffmpeg");
  if (entry) {
    const bin = path.join(path.dirname(entry), process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
    if (fs.existsSync(bin) && (await tryBin(bin))) return bin;
  }
  return null;
}

/**
 * Render a composition frame by frame and pipe the frames to ffmpeg. Deterministic: every frame is a seek,
 * never wall-clock playback. Returns { file, frames, seconds }.
 */
export async function renderComposition(url, { out, fps = 30, width = 1920, height = 1080, from = 0, to, duration, audio, mix, alpha = false, crf = 18, ffmpeg, config, onProgress } = {}) {
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, settleMs: 400 });
    if (alpha) await tab.s("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const probe = await evalJson(tab.s, PROBE);
    if (!probe) throw new Error("No clock found in the page: expose window.__drip = { duration, fps, seek(t) } (drip_kit template \"motion\" has it), or a paused GSAP timeline as window.__tl.");
    const D = duration || probe.duration;
    if (!D) throw new Error("The composition has no duration: set window.__drip.duration (seconds).");
    const end = Math.min(to ?? D, D);
    const n = Math.max(1, Math.round((end - from) * fps));
    const args = ["-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-"];
    // mix: { files: [...], graph } from the film's sound (music ducked under narration, cues); audio: one plain track.
    const withMix = mix?.files?.length && mix.graph;
    if (withMix) for (const f of mix.files) args.push("-i", f);
    else if (audio) args.push("-ss", String(from), "-i", audio);
    if (withMix) args.push("-filter_complex", mix.graph, "-map", "0:v", "-map", "[aout]");
    if (alpha) args.push("-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30");
    else args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(crf), "-preset", "medium", "-movflags", "+faststart");
    if (withMix || audio) args.push("-c:a", alpha ? "libopus" : "aac", "-b:a", "192k", "-shortest");
    args.push(out);
    const proc = spawn(ffmpeg, args, { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => (err = (err + d).slice(-4000)));
    // ffmpeg can exit early (a bad argument, a build without a needed format): stop feeding it and report why,
    // never leave a rejected promise unhandled (it would take the whole server down).
    let exited = false;
    const done = new Promise((res, rej) =>
      proc.on("close", (code) => {
        exited = true;
        code === 0 ? res() : rej(new Error(`ffmpeg failed (${code}): ${err.split("\n").slice(-4).join(" ")}`));
      }),
    );
    done.catch(() => {});
    proc.on("error", () => (exited = true));
    proc.stdin.on("error", () => {}); // EPIPE once ffmpeg is gone; `done` carries the real reason
    const t0 = Date.now();
    for (let i = 0; i < n && !exited; i++) {
      const t = from + i / fps;
      await evalJson(tab.s, seekExpr(t));
      const { data } = await tab.s("Page.captureScreenshot", alpha ? { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } } : { format: "jpeg", quality: 95, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const buf = Buffer.from(data, "base64");
      if (exited) break;
      if (!proc.stdin.write(buf)) await new Promise((r) => (exited ? r() : (proc.stdin.once("drain", r), proc.once("close", r))));
      if (onProgress && i % fps === 0) onProgress(i, n);
    }
    proc.stdin.end();
    await done;
    return { file: out, frames: n, seconds: (Date.now() - t0) / 1000 };
  });
}

/**
 * How far a rendered video strays from what Chrome shows for the same composition: mean pixel difference (0-255,
 * on 64x36 thumbnails) at a few moments. Another renderer may not support every browser feature (SVG filters,
 * some fonts); a difference above ~10 means the video is not the film that was reviewed.
 */
export async function fidelity(videoFile, url, { fractions = [0.12, 0.37, 0.62, 0.87], width, height, config } = {}) {
  const v = await sampleVideo(videoFile, { times: fractions, fractions: true, config });
  const times = v.frames.map((f) => f.t);
  const c = await shootComposition(url, { times: { times }, width, height, scale: Math.min(1, 640 / width), config });
  const pairs = Math.min(v.frames.length, c.frames.length);
  if (!pairs) return { ok: false, diffs: [], why: "no frames to compare" };
  const bufs = [];
  for (let i = 0; i < pairs; i++) bufs.push(c.frames[i].buf, v.frames[i].buf);
  const m = await measureFrames(bufs, { config });
  // The worst region, not the average: a wrong-coloured object or a missing number is local.
  const diffs = Array.from({ length: pairs }, (_, i) => m[2 * i + 1]?.block ?? 99);
  const worst = Math.max(...diffs);
  return { ok: worst <= 28, diffs, worst, at: times[diffs.indexOf(worst)] };
}
