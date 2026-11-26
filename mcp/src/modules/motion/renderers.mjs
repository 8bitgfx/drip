// Renderers for films. Chosen once per machine, by the agent, never asked of the user: the first /drip:motion
// installs them into ~/.drip/vendor (large, so never at Drip install time), test-renders a one-second clip with each,
// keeps the fastest that works, and remembers it in ~/.drip/motion-renderer.json.
//   kinetograph  (npm, Apache-2.0 from 0.4.0-rc.1; GPU, no browser; carries its own FFmpeg)   preferred
//   framevelo    (github gnipbao/framevelo, Apache-2.0; Chrome + hardware encoder)            fallback
//   hyperframes  (npm, Apache-2.0; headless Chrome per frame)                                  fallback
//   drip         (Drip's own Chrome capture piped to ffmpeg)                                   last resort
// Compositions are HyperFrames-style HTML + GSAP, so every renderer plays the same file.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { homeDripDir, kitDir } from "../../core/paths.mjs";
import { vendorDir } from "../../core/vendor.mjs";

// ffmpeg-static and ffprobe-static: full builds. Kinetograph's own FFmpeg is minimal (raw video in, WAV only), so the
// sound mix, Drip's capture, HyperFrames (needs ffprobe) and FrameVelo use these, put on PATH for every renderer.
export const PACKAGES = { kinetograph: "kinetograph@>=0.4.0-rc.1", hyperframes: "hyperframes@0.9.72", framevelo: "github:gnipbao/framevelo", "ffmpeg-static": "ffmpeg-static@5", "ffprobe-static": "ffprobe-static@3" };
const stateFile = () => path.join(process.env.DRIP_HOME || homeDripDir, "motion-renderer.json");
const isWin = process.platform === "win32";
const exe = (n) => (isWin ? `${n}.exe` : n);

/** The full ffmpeg and ffprobe installed by the setup (or null each). */
export function mediaTools() {
  const nm = path.join(vendorDir(), "node_modules");
  const ffmpeg = path.join(nm, "ffmpeg-static", exe("ffmpeg"));
  const ffprobe = path.join(nm, "ffprobe-static", "bin", process.platform, process.arch, exe("ffprobe"));
  return { ffmpeg: fs.existsSync(ffmpeg) ? ffmpeg : null, ffprobe: fs.existsSync(ffprobe) ? ffprobe : null };
}

/** PATH with the vendored ffmpeg and ffprobe first: the renderers look for them there. */
function toolEnv() {
  const t = mediaTools();
  const dirs = [t.ffmpeg, t.ffprobe].filter(Boolean).map((f) => path.dirname(f));
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") || "PATH";
  return { ...process.env, [key]: [...dirs, process.env[key] || ""].join(path.delimiter) };
}

function run(cmd, args, { cwd, timeout = 15 * 60e3, env } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    execFile(cmd, args, { cwd, timeout, env, windowsHide: true, maxBuffer: 16 << 20, shell: isWin && /\.cmd$/i.test(cmd) }, (err, so, se) => resolve({ ok: !err, code: err?.code, out: `${so}\n${se}`.trim(), ms: Date.now() - t0 }));
  });
}

/**
 * Remember that a renderer's video of THIS film didn't match Chrome, so the next export of the same film skips it.
 * Per film, not per machine: a mismatch usually comes from one film's content (an SVG filter, a canvas, images a
 * renderer seeks too early), and the renderer may be perfect for the next film.
 */
export function noteDistrust(engine, film) {
  const c = readChoice();
  if (!c) return;
  const key = String(film || "").replace(/\\/g, "/").toLowerCase();
  const per = c.distrustFilms || {};
  per[key] = [...new Set([...(per[key] || []), engine])];
  c.distrustFilms = per;
  fs.writeFileSync(stateFile(), JSON.stringify(c, null, 2));
}

/** Renderers that didn't match Chrome on this film before. */
export function distrustedFor(film) {
  const key = String(film || "").replace(/\\/g, "/").toLowerCase();
  return new Set((readChoice()?.distrustFilms || {})[key] || []);
}

export function readChoice() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {
    return null;
  }
}

/** A package's CLI entry inside the vendor folder, run with node (no .cmd shims, no PATH). */
export function binOf(pkg, name) {
  const dir = path.join(vendorDir(), "node_modules", pkg);
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    const rel = typeof pj.bin === "string" ? pj.bin : pj.bin?.[name || pkg] || Object.values(pj.bin || {})[0];
    return rel ? path.join(dir, rel) : null;
  } catch {
    return null;
  }
}

/**
 * The full ffmpeg the setup installed, or null. Never Kinetograph's own FFmpeg: that build reads raw video and WAV
 * only (no image pipes, no MP3/OGG, no mixing filters), which breaks Drip's capture and the sound mix.
 */
export function vendoredFfmpeg() {
  return mediaTools().ffmpeg;
}

/** How each engine renders `entry` (an .html composition) to `out`. Returns { cmd, args, cwd } or null when missing. */
export function engineCommand(engine, entry, out) {
  const cwd = path.dirname(entry);
  if (engine === "kinetograph") {
    const bin = binOf("kinetograph");
    return bin ? { cmd: process.execPath, args: [bin, "render", path.basename(entry), "-o", out], cwd } : null;
  }
  if (engine === "framevelo") {
    const bin = binOf("framevelo");
    return bin ? { cmd: process.execPath, args: [bin, "render", path.basename(entry), "--no-hyperframes", "-o", out], cwd } : null;
  }
  if (engine === "hyperframes") {
    const bin = binOf("hyperframes");
    return bin ? { cmd: process.execPath, args: [bin, "render", "--output", out], cwd } : null;
  }
  return null;
}

let pending = null;

/**
 * Install (once) and pick the renderer. Safe to call often: the first call does the work, later calls return the
 * stored choice. `renderDrip(entry, out)` is Drip's own capture, passed in to avoid an import cycle.
 */
export function ensureRenderers({ renderDrip, log = () => {}, force = false } = {}) {
  // force: test again (a new GPU or driver, a renderer update); the stored choice is replaced.
  const have = force ? null : readChoice();
  if (have?.engine) return Promise.resolve(have);
  if (pending) return pending;
  pending = (async () => {
    const vdir = vendorDir();
    fs.mkdirSync(vdir, { recursive: true });
    if (!fs.existsSync(path.join(vdir, "package.json"))) fs.writeFileSync(path.join(vdir, "package.json"), JSON.stringify({ name: "drip-vendor", private: true }, null, 2));
    const npm = isWin ? "npm.cmd" : "npm";
    const installed = {};
    for (const [name, spec] of Object.entries(PACKAGES)) {
      if (binOf(name) || fs.existsSync(path.join(vdir, "node_modules", name, "package.json"))) {
        installed[name] = "already there";
        continue;
      }
      log(`installing ${spec}`);
      const r = await run(npm, ["install", "--no-audit", "--no-fund", "--save", spec], { cwd: vdir, timeout: 20 * 60e3 });
      installed[name] = r.ok ? "installed" : `failed: ${r.out.split("\n").slice(-3).join(" ").slice(0, 300)}`;
    }
    // One-second test clip from the kit composition.
    const tdir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-rtest-"));
    const entry = path.join(tdir, "index.html");
    fs.writeFileSync(
      entry,
      fs
        .readFileSync(path.join(kitDir, "motion.html"), "utf8")
        // Big and long enough to measure rendering, not start-up: 2 s at 1280x720 (60 frames).
        .replace("duration: 8 }", "duration: 2 }")
        .replace('data-duration="8"', 'data-duration="2"')
        .replace(/width: 1920, height: 1080/, "width: 1280, height: 720")
        .replace('data-width="1920" data-height="1080"', 'data-width="1280" data-height="720"'),
    );
    const tests = {};
    for (const engine of ["kinetograph", "framevelo", "hyperframes"]) {
      const out = path.join(tdir, `${engine}.mp4`);
      const c = engineCommand(engine, entry, out);
      if (!c) {
        tests[engine] = { ok: false, why: "not installed" };
        continue;
      }
      log(`test render: ${engine}`);
      const r = await run(c.cmd, c.args, { cwd: c.cwd, timeout: 5 * 60e3, env: toolEnv() });
      const ok = r.ok && fs.existsSync(out) && fs.statSync(out).size > 1000;
      tests[engine] = { ok, ms: r.ms, why: ok ? undefined : r.out.split("\n").slice(-3).join(" ").slice(0, 300) };
    }
    if (renderDrip) {
      const out = path.join(tdir, "drip.mp4");
      const t0 = Date.now();
      try {
        await renderDrip(entry, out);
        tests.drip = { ok: fs.existsSync(out) && fs.statSync(out).size > 1000, ms: Date.now() - t0 };
      } catch (e) {
        tests.drip = { ok: false, why: e.message.slice(0, 300) };
      }
    }
    const working = Object.entries(tests).filter(([, t]) => t.ok).sort((a, b) => a[1].ms - b[1].ms);
    const choice = { engine: working[0]?.[0] || null, order: working.map(([e]) => e), tests, installed, ffmpeg: vendoredFfmpeg(), at: new Date().toISOString() };
    if (choice.engine) {
      fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
      fs.writeFileSync(stateFile(), JSON.stringify(choice, null, 2));
    }
    try {
      fs.rmSync(tdir, { recursive: true, force: true });
    } catch {
      /* temp */
    }
    pending = null;
    return choice;
  })();
  return pending;
}

/** Render with one engine. Returns { ok, ms, why }. */
export async function renderWith(engine, entry, out) {
  const c = engineCommand(engine, entry, out);
  if (!c) return { ok: false, why: `${engine} is not installed` };
  const r = await run(c.cmd, c.args, { cwd: c.cwd, timeout: 60 * 60e3, env: toolEnv() });
  const ok = r.ok && fs.existsSync(out) && fs.statSync(out).size > 1000;
  return { ok, ms: r.ms, why: ok ? undefined : r.out.split("\n").slice(-6).join("\n").slice(0, 800) };
}

/** Put the film's mixed sound under a rendered (silent or not) video: one ffmpeg pass, video stream copied. */
export function muxArgs(video, mix, out) {
  const args = ["-y", "-i", video];
  for (const f of mix.files) args.push("-i", f);
  // mixGraph numbers audio inputs from 1, video is input 0: the same layout as here.
  args.push("-filter_complex", mix.graph, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out);
  return args;
}

export async function mux(ffmpeg, video, mix, out) {
  const r = await run(ffmpeg, muxArgs(video, mix, out), { timeout: 10 * 60e3 });
  if (!r.ok) throw new Error(`ffmpeg mix failed: ${r.out.split("\n").slice(-4).join(" ")}`);
}
