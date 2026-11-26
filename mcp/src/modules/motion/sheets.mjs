// Contact sheets of a film: what motion_frames shows the director and critic_prepare shows the critic.
import fs from "node:fs";
import path from "node:path";
import { sheetInBrowser } from "../../core/imaging.mjs";
import { projectDir } from "../../core/paths.mjs";
import { toUrl } from "../../core/serve.mjs";
import { fmtT, judgeFrames, measureFrames, sampleVideo, shootComposition } from "./capture.mjs";

export const isVideo = (t) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(t));

/** A composition target (file or URL) to a URL the browser can open. */
export async function compositionUrl(target) {
  if (/^https?:/i.test(target)) return target;
  const abs = path.resolve(projectDir(), target);
  if (!fs.existsSync(abs)) throw new Error(`Not found: ${target}`);
  return toUrl(abs);
}

/** Tile size for a sheet: 480px wide, the film's own aspect. */
const tile = (w, h) => ({ tileW: 480, tileH: Math.round((480 * (h || 1080)) / (w || 1920)) });

/**
 * Shoot a composition (or sample a video) at `times` and lay the frames out in sheets of `per` tiles.
 * Returns { sheets: [Buffer], times, probe, judge, measures, errors, clipped }.
 */
export async function filmSheets(target, { times = {}, width, height, per = 16, cols = 4, dense = false, config } = {}) {
  let frames;
  let probe = null;
  let errors = [];
  if (isVideo(target)) {
    const src = /^https?:/i.test(target) ? target : path.resolve(projectDir(), target);
    const r = await sampleVideo(src, { every: times.every, max: times.count || 24, config });
    if (!r.frames.length) throw new Error(`Could not play ${target} in the browser (no duration).`);
    frames = r.frames;
    probe = { via: "video", duration: r.duration };
  } else {
    const url = await compositionUrl(target);
    const W = width || 1920;
    const H = height || 1080;
    const r = await shootComposition(url, { times, width: W, height: H, scale: Math.min(1, 640 / W), config });
    if (!r.probe) throw new Error("No clock in the page. A composition must be seekable: window.__drip = { duration, fps, width, height, seek(t) } (drip_kit template \"motion\"), window.seek(t), a paused GSAP timeline as window.__tl, or HyperFrames' window.__timelines.");
    frames = r.frames;
    probe = r.probe;
    errors = r.errors;
  }
  const ts = frames.map((f) => f.t);
  const measures = await measureFrames(frames.map((f) => f.buf), { config });
  const judge = judgeFrames(ts, measures, { dense });
  const clipped = frames.filter((f) => f.clipped?.length).map((f) => `${fmtT(f.t)}: "${f.clipped[0]}"`);
  const { tileW, tileH } = tile(width || 1920, height || 1080);
  const sheets = [];
  for (let i = 0; i < frames.length; i += per) {
    const part = frames.slice(i, i + per);
    sheets.push(await sheetInBrowser(part.map((f) => f.buf), { cols: Math.min(cols, part.length), tileW, tileH, labels: part.map((f) => fmtT(f.t)), fit: "contain", quality: 80, config }));
  }
  return { sheets, times: ts, probe, judge, measures, errors, clipped };
}
