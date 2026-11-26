// Music for films: understand a track before choreographing to it. Decoded and analysed in the shared browser
// (Web Audio), no Python: tempo, beat grid, bars, an energy curve, sections, builds and drops, plus a chart.
// The numbers are estimates from the signal (a soft intro can fool the tempo); the chart shows what they're based on.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { get } from "../../core/http.mjs";
import { serveDir } from "../../core/serve.mjs";
import { fmtT } from "./capture.mjs";

let workDir = null;
const work = () => (workDir ||= fs.mkdtempSync(path.join(os.tmpdir(), "drip-music-")));

// Runs in the page: decode, then features at a 512-sample hop. Returns arrays small enough to send back.
const ANALYSE = (src) => `(async () => {
  const buf = await (await fetch(${JSON.stringify(src)})).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const sr = audio.sampleRate, n = audio.length, ch = audio.numberOfChannels;
  const mono = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = audio.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  const hop = 512, frames = Math.floor(n / hop);
  const rms = new Float32Array(frames), hi = new Float32Array(frames), lo = new Float32Array(frames);
  let lp = 0, prev = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0, h = 0, l = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      const x = mono[i];
      lp += 0.02 * (x - lp);            // ~140 Hz one-pole low-pass: kick and bass
      const d = x - prev; prev = x;      // first difference: hats, clicks, transients
      e += x * x; h += d * d; l += lp * lp;
    }
    rms[f] = Math.sqrt(e / hop); hi[f] = Math.sqrt(h / hop); lo[f] = Math.sqrt(l / hop);
  }
  return { sr, hop, duration: n / sr, rms: Array.from(rms, (v) => +v.toFixed(5)), hi: Array.from(hi, (v) => +v.toFixed(5)), lo: Array.from(lo, (v) => +v.toFixed(5)) };
})()`;

const db = (v) => 20 * Math.log10(Math.max(1e-5, v));

/** From frame features to musical structure. Pure (tested with synthetic input). */
export function structure({ sr, hop, duration, rms, hi, lo }) {
  const fps = sr / hop;
  const N = rms.length;
  // Onset strength: rises in log energy across the low and high bands.
  const onset = new Float32Array(N);
  for (let i = 1; i < N; i++) onset[i] = Math.max(0, db(lo[i]) - db(lo[i - 1])) + Math.max(0, db(hi[i]) - db(hi[i - 1])) * 0.7;
  // Tempo: autocorrelation of the onset envelope between 70 and 180 BPM, weighted toward ~115 BPM.
  let best = { bpm: 0, score: -1 };
  const scores = [];
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = (60 / bpm) * fps;
    const l0 = Math.floor(lag);
    const fr = lag - l0;
    let s = 0;
    for (let i = 0; i + l0 + 1 < N; i++) s += onset[i] * (onset[i + l0] * (1 - fr) + onset[i + l0 + 1] * fr);
    s *= Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2);
    scores.push(s);
    if (s > best.score) best = { bpm, score: s };
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const confidence = best.score > 0 ? Math.min(1, (best.score / (mean || 1) - 1) / 2) : 0;
  const period = 60 / best.bpm;
  // Phase: the offset whose beats sit on the most onset energy.
  let phase = 0;
  let pbest = -1;
  for (let k = 0; k < 64; k++) {
    const off = (k / 64) * period;
    let s = 0;
    for (let t = off; t < duration; t += period) s += onset[Math.round(t * fps)] || 0;
    if (s > pbest) {
      pbest = s;
      phase = off;
    }
  }
  const beats = [];
  for (let t = phase; t < duration; t += period) beats.push(+t.toFixed(3));
  // Downbeat: of the four beat positions in a bar, the one with the most low-band onset.
  let down = 0;
  let dbest = -1;
  for (let k = 0; k < 4; k++) {
    let s = 0;
    for (let j = k; j < beats.length; j += 4) s += Math.max(0, db(lo[Math.round(beats[j] * fps)] || 1e-5) + 60);
    if (s > dbest) {
      dbest = s;
      down = k;
    }
  }
  const bars = beats.filter((_, j) => j >= down && (j - down) % 4 === 0);
  // Energy per bar (dB of RMS), the backbone of sections, builds and drops.
  const barE = bars.map((b, i) => {
    const a = Math.round(b * fps);
    const e = Math.round((bars[i + 1] ?? duration) * fps);
    let s = 0;
    for (let f = a; f < e; f++) s += rms[f] ** 2;
    return +db(Math.sqrt(s / Math.max(1, e - a))).toFixed(1);
  });
  const peak = Math.max(...barE);
  // Sections: a new one where the bar energy moves 4 dB or more from the running level.
  const sections = [];
  let start = 0;
  let level = barE[0];
  for (let i = 1; i < bars.length; i++) {
    if (Math.abs(barE[i] - level) >= 4 && i - start >= 2) {
      sections.push({ from: bars[start], to: bars[i], level: +(level - peak).toFixed(1) });
      start = i;
      level = barE[i];
    } else level = (level * (i - start) + barE[i]) / (i - start + 1);
  }
  if (bars.length) sections.push({ from: bars[start], to: duration, level: +(level - peak).toFixed(1) });
  // Drops: a bar at least 6 dB above the two before it, landing near the track's peak level.
  const drops = [];
  for (let i = 2; i < bars.length; i++) {
    const before = Math.max(barE[i - 1], barE[i - 2]);
    if (barE[i] - before >= 6 && barE[i] >= peak - 6) drops.push(bars[i]);
  }
  // A drop that lands mid-bar splits its jump over two bars: a section that rises 6 dB or more to near the peak
  // is a drop too (at the section's first bar).
  for (let i = 1; i < sections.length; i++)
    if (sections[i].level - sections[i - 1].level >= 6 && sections[i].level >= -6 && !drops.some((d) => Math.abs(d - sections[i].from) < period * 8)) drops.push(sections[i].from);
  drops.sort((a, b) => a - b);
  // Builds: four or more bars rising steadily into a drop or a louder section.
  const builds = [];
  for (const d of drops) {
    const i = bars.indexOf(d);
    let j = i - 1;
    while (j > 0 && barE[j] >= barE[j - 1] - 0.5) j--;
    if (i - j >= 3) builds.push([bars[j], d]);
  }
  // Quiet moments: bars 12 dB or more under the peak (rests the picture can use).
  const quiet = bars.filter((_, i) => barE[i] <= peak - 12);
  return { duration: +duration.toFixed(2), bpm: best.bpm, confidence: +confidence.toFixed(2), beat: +period.toFixed(3), beats, bars, barEnergy: barE, sections, drops, builds, quiet };
}

/** Load (download if needed) and analyse a track. */
export async function analyseMusic(source, { config } = {}) {
  let buf;
  let ext;
  if (/^https?:/i.test(source)) {
    buf = (await get(source, { as: "buffer", ttlMs: 7 * 24 * 3600e3, timeoutMs: 120000 })).body;
    ext = (source.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|webm)(\?|$)/i) || ["", "mp3"])[1];
  } else {
    if (!fs.existsSync(source)) throw new Error(`Audio not found: ${source}`);
    buf = fs.readFileSync(source);
    ext = path.extname(source).slice(1) || "mp3";
  }
  const dir = work();
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  fs.writeFileSync(path.join(dir, `${id}.${ext}`), buf);
  fs.writeFileSync(path.join(dir, `${id}.html`), "<!doctype html><meta charset=utf-8><p>analysing</p>");
  try {
    const base = await serveDir(dir);
    const feats = await withTab(config, async (tab) => {
      await openPage(tab, `${base}/${id}.html`, { width: 200, height: 100, settleMs: 0 });
      return evalJson(tab.s, ANALYSE(`${id}.${ext}`));
    });
    return { ...structure(feats), rms: feats.rms, fps: feats.sr / feats.hop };
  } finally {
    for (const f of [`${id}.${ext}`, `${id}.html`]) fs.rmSync(path.join(dir, f), { force: true });
  }
}

/** The track as a picture: the energy curve, bars, sections, builds and drops, and the storyboard's beats on top. */
export function musicChartHtml(a, { beats = [] } = {}) {
  const W = 1600;
  const H = 300;
  const step = Math.max(1, Math.round(a.fps / 20)); // ~20 points a second
  const env = [];
  for (let i = 0; i < a.rms.length; i += step) env.push(+a.rms.slice(i, i + step).reduce((m, v) => Math.max(m, v), 0).toFixed(4));
  const data = { W, H, D: a.duration, env, bars: a.bars, sections: a.sections, drops: a.drops, builds: a.builds, beats, bpm: a.bpm };
  return `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#101012}</style><canvas id=c width=${W} height=${H}></canvas><script>
const D = ${JSON.stringify(data)};
const x = document.getElementById('c').getContext('2d');
const L = 50, R = D.W - 20, T = 40, B = D.H - 40, X = (t) => L + (t / D.D) * (R - L);
x.fillStyle = '#101012'; x.fillRect(0, 0, D.W, D.H);
x.fillStyle = '#eee'; x.font = '600 14px system-ui';
x.fillText('MUSIC  ' + D.bpm + ' BPM · bars (grey) · sections (bands) · builds (amber) · drops (red) · storyboard beats (white dashes)', 16, 24);
D.sections.forEach((s, i) => { x.fillStyle = i % 2 ? '#1b1b22' : '#16161c'; x.fillRect(X(s.from), T, X(s.to) - X(s.from), B - T); x.fillStyle = '#777'; x.font = '11px system-ui'; x.fillText(s.level + ' dB', X(s.from) + 4, T + 12); });
D.builds.forEach(([a, b]) => { const g = x.createLinearGradient(X(a), 0, X(b), 0); g.addColorStop(0, '#f5b80000'); g.addColorStop(1, '#f5b80066'); x.fillStyle = g; x.fillRect(X(a), T, X(b) - X(a), B - T); });
x.fillStyle = '#2a2a33'; D.bars.forEach((b) => x.fillRect(X(b), T, 1, B - T));
const peak = Math.max(...D.env, 1e-4), mid = (T + B) / 2;
x.fillStyle = '#6ea8ff';
D.env.forEach((v, i) => { const t = (i / D.env.length) * D.D, h = (v / peak) * (B - T) * 0.48; x.fillRect(X(t), mid - h, Math.max(1, (R - L) / D.env.length), h * 2); });
x.fillStyle = '#ff3b3b'; D.drops.forEach((d) => { x.fillRect(X(d) - 1, T - 6, 3, B - T + 12); x.font = '12px system-ui'; x.fillText('drop', X(d) + 4, T - 8); });
x.setLineDash([5, 4]); x.strokeStyle = '#fff'; D.beats.forEach((b) => { x.beginPath(); x.moveTo(X(b), T); x.lineTo(X(b), B); x.stroke(); }); x.setLineDash([]);
x.fillStyle = '#888'; x.font = '12px ui-monospace, monospace';
for (let t = 0; t <= D.D; t += D.D > 60 ? 10 : 5) x.fillText(Math.floor(t / 60) + ':' + String(Math.round(t % 60)).padStart(2, '0'), X(t) - 12, D.H - 18);
window.ready = Promise.resolve();
</script>`;
}

/** How far each storyboard beat sits from the nearest bar line (and whether the big moment meets a drop). */
export function alignToMusic(storyBeats, a) {
  const near = (t, grid) => grid.reduce((m, g) => (Math.abs(g - t) < Math.abs(m - t) ? g : m), grid[0] ?? t);
  return storyBeats.map((t) => {
    const bar = near(t, a.bars);
    const beat = near(t, a.beats);
    return { at: t, bar, offBarMs: Math.round((t - bar) * 1000), beat, offBeatMs: Math.round((t - beat) * 1000) };
  });
}

/** A controlled prompt for a generated track: everything the film needs, nothing left to chance. */
export function musicPrompt({ mood, genre, bpm, seconds, structure: parts = [], instruments = [], avoid = [], reference }) {
  const lines = [
    `Instrumental ${genre || "modern electronic"} track for a motion-design film, ${mood || "confident, clean, modern"}.`,
    bpm ? `Tempo ${bpm} BPM, steady, quantised to the grid (picture cuts land on bar lines).` : "",
    seconds ? `Exactly ${seconds} seconds, with a real ending (no fade-out cut mid-phrase).` : "",
    parts.length ? `Structure: ${parts.map((p) => `${p.from}-${p.to}s ${p.what}`).join("; ")}.` : "",
    instruments.length ? `Instruments: ${instruments.join(", ")}.` : "",
    reference ? `Feel close to: ${reference} (feel only, not a copy).` : "",
    `No vocals, no spoken words${avoid.length ? `, no ${avoid.join(", no ")}` : ""}. Clean mix with room for a voice over the top.`,
  ];
  return lines.filter(Boolean).join(" ");
}

export const fmtBars = (a, n = 8) => a.bars.slice(0, n).map(fmtT).join(", ");
