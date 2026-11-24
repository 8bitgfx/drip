// mockup_render: real device mockups with MockStudio (github.com/lenxism/mockstudio, Apache-2.0): real device models
// (CC-BY, credited next to every render), the screenshot conformed to the real screen, HDRI studio lighting, colour-true
// tone mapping, curated looks and camera moves, stills and video.
//
// `drip doctor --install mockstudio` clones a pinned version into ~/.drip/vendor/mockstudio, builds its static site,
// saves its Look / Camera / Motion presets as JSON, then removes the build dependencies. Rendering needs no Node packages:
// Drip serves the built site and drives its render bridge in the shared browser, waiting until the model and the
// lighting have loaded (MockStudio's own CLI captures before that and gets black devices).
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { openPage, withTab } from "../../core/browser.mjs";
import { fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { serveDir, toUrl } from "../../core/serve.mjs";
import { shoot } from "../fitcheck/readme.mjs";
import { vendorDir } from "../../core/vendor.mjs";
import { projectPath, saveFile } from "./raster.mjs";

export const MOCKSTUDIO = {
  repo: "https://github.com/lenxism/mockstudio",
  sha: "98bf0ebf513aaa075bd4ba17a79afd924c3342a2",
  pnpm: "pnpm@9.15.0",
  devices: ["iphone-17-pro", "studio-display"],
  looks: ["studio", "hero", "cinematic", "retro", "noir", "clean"],
  cameras: ["head-on", "three-quarter", "hero", "top-down", "wide"],
  motions: ["orbit", "dolly-in", "reveal", "drift"],
  environments: ["studio", "daylight", "city", "neon", "sunset", "warm"],
  aspects: ["16:9", "9:16", "1:1", "4:5", "3:2", "4:3", "match-frame"],
};
// The size an HTML screen is rendered at before it goes on the device (CSS px, pixel ratio).
const SCREEN = { "iphone-17-pro": { width: 402, height: 874, scale: 3 }, "studio-display": { width: 1600, height: 900, scale: 2 }, slab: { width: 1440, height: 900, scale: 2 } };

export const mockstudioDir = () => path.join(vendorDir(), "mockstudio");
const presetsDir = () => path.join(mockstudioDir(), "drip-presets");
export const mockstudioReady = () => fs.existsSync(path.join(mockstudioDir(), "dist", "index.html")) && fs.existsSync(path.join(presetsDir(), "look.studio.json"));

// ---- install -----------------------------------------------------------------------------------------------------

function run(file, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 900000, windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...opts }, (err, stdout, stderr) =>
      err ? reject(new Error(`${path.basename(file)} ${args.slice(0, 3).join(" ")} failed: ${String(stderr || err.message).trim().split("\n").slice(-4).join(" ")}`)) : resolve(stdout),
    );
  });
}

/** npx from the npm that ships with this Node, run without a shell. */
function npx() {
  const bin = path.dirname(process.execPath);
  for (const p of [path.join(bin, "node_modules", "npm", "bin", "npx-cli.js"), path.join(bin, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js")]) if (fs.existsSync(p)) return [process.execPath, [p]];
  return [process.platform === "win32" ? "npx.cmd" : "npx", []];
}

/** Minimal RFC 7396 merge patch from `base` to `next` (objects recurse; arrays and values are replaced). */
export function diffPatch(base, next) {
  const out = {};
  for (const k of Object.keys(next)) {
    const a = base?.[k];
    const b = next[k];
    if (b && typeof b === "object" && !Array.isArray(b) && a && typeof a === "object" && !Array.isArray(a)) {
      const d = diffPatch(a, b);
      if (Object.keys(d).length) out[k] = d;
    } else if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = b;
  }
  for (const k of Object.keys(base || {})) if (!(k in next)) out[k] = null;
  return out;
}

export function mergePatch(target, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const out = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}

export async function installMockstudio(log = () => {}) {
  const dir = mockstudioDir();
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  if (!fs.existsSync(path.join(dir, ".git"))) {
    log(`Cloning MockStudio ${MOCKSTUDIO.sha.slice(0, 7)} ...`);
    await run("git", ["clone", "--filter=blob:none", "--quiet", MOCKSTUDIO.repo, dir]);
  }
  await run("git", ["-C", dir, "fetch", "--quiet", "origin", MOCKSTUDIO.sha]).catch(() => {});
  await run("git", ["-C", dir, "checkout", "--quiet", "--force", MOCKSTUDIO.sha]);
  const [npxFile, npxPre] = npx();
  const env = { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1", CI: "1" };
  log("Installing its build dependencies (temporary) ...");
  await run(npxFile, [...npxPre, "-y", MOCKSTUDIO.pnpm, "install", "--frozen-lockfile"], { cwd: dir, env });
  log("Building the static site ...");
  await run(npxFile, [...npxPre, "-y", MOCKSTUDIO.pnpm, "build"], { cwd: dir, env });
  log("Saving the Look / Camera / Motion presets ...");
  const pd = presetsDir();
  fs.mkdirSync(pd, { recursive: true });
  const cli = path.join(dir, "bin", "mockstudio.mjs");
  const compose = async (args, name) => {
    const out = path.join(pd, `${name}.json`);
    await run(process.execPath, [cli, "compose", ...args, "--out", out], { cwd: dir, env });
    return JSON.parse(fs.readFileSync(out, "utf8"));
  };
  const base = await compose(["--default"], "default");
  for (const l of MOCKSTUDIO.looks) await compose(["--look", l], `look.${l}`);
  for (const c of MOCKSTUDIO.cameras) fs.writeFileSync(path.join(pd, `camera.${c}.json`), JSON.stringify(diffPatch(base, await compose(["--default", "--camera", c], `tmp`))));
  for (const m of MOCKSTUDIO.motions) fs.writeFileSync(path.join(pd, `motion.${m}.json`), JSON.stringify(diffPatch(base, await compose(["--default", "--motion", m], `tmp`))));
  fs.rmSync(path.join(pd, "tmp.json"), { force: true });
  log("Removing the build dependencies (the built site is all Drip needs) ...");
  fs.rmSync(path.join(dir, "node_modules"), { recursive: true, force: true });
  return { dir, ok: mockstudioReady() };
}

// ---- render ------------------------------------------------------------------------------------------------------

const ASPECT = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "4:3": 4 / 3 };

/** The Scene Document for one render: a Look, then Camera / Motion presets, then Drip's choices, then the user's patch. */
export function buildDocument(o, presets = (n) => JSON.parse(fs.readFileSync(path.join(presetsDir(), `${n}.json`), "utf8"))) {
  let doc = presets(`look.${o.look || "studio"}`);
  if (o.camera) doc = mergePatch(doc, presets(`camera.${o.camera}`));
  if (o.motion) doc = mergePatch(doc, presets(`motion.${o.motion}`));
  const device = o.device || "iphone-17-pro";
  const p = { frame: device === "slab" ? { kind: "slab", slab: { ...(o.slabMaterial ? { material: o.slabMaterial } : {}) } } : { kind: "device", device: { model: device } }, artboard: { aspect: o.aspect || (device === "studio-display" ? "16:9" : "4:5") } };
  if (o.finish) p.image = { finish: o.finish };
  const bg = o.background;
  if (bg) p.stage = { background: bg === "transparent" ? { kind: "transparent" } : typeof bg === "string" ? { kind: "solid", solid: bg } : { kind: "gradient", gradient: { from: bg.from, to: bg.to, shape: bg.shape || "radial", angle: bg.angle ?? 0 } } };
  if (o.environment) p.stage = { ...(p.stage || {}), environment: { id: o.environment, ...(o.light !== undefined ? { intensity: o.light } : {}) } };
  doc = mergePatch(doc, p);
  if (o.patch) doc = mergePatch(doc, o.patch);
  return doc;
}

/** The NOTICE table row for the device model used (CC-BY asks for the credit next to the work). */
function credits(device) {
  const lines = [`Rendered with MockStudio (Apache-2.0) ${MOCKSTUDIO.repo}`];
  if (device === "slab") return lines;
  try {
    const notice = fs.readFileSync(path.join(mockstudioDir(), "public", "models", "NOTICE"), "utf8");
    const row = notice.split(/\r?\n/).find((l) => l.startsWith("|") && l.split("|")[1]?.trim() === device);
    const [, , , title, author, license, source] = row.split("|").map((c) => c.trim());
    lines.push(`3D model: "${title}" by ${author}, ${license}, ${source}`);
  } catch {
    lines.push(`3D model: ${device}, CC-BY 4.0 (see ${path.join(mockstudioDir(), "public", "models", "NOTICE")})`);
  }
  return lines;
}

async function screenBytes(image, device, config) {
  if (/\.html?$/i.test(image)) {
    const s = SCREEN[device] || SCREEN.slab;
    const { buf } = await shoot(await toUrl(projectPath(image)), { width: s.width, height: s.height, scale: s.scale, transparent: false, dark: false, fullPage: false, config });
    return { buf, mime: "image/png", name: "screen.png" };
  }
  const buf = /^https?:/i.test(image) ? (await fetchImage(image)).buf : fs.readFileSync(projectPath(image));
  const ext = path.extname(image.split("?")[0]).toLowerCase();
  return { buf, mime: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png", name: `screen${ext || ".png"}` };
}

export function register(server, ctx) {
  server.registerTool(
    "mockup_render",
    {
      title: "Render a device mockup (real models)",
      description:
        "The tool for device mockups: your screenshot (or an HTML screen, rendered for you at the device's size) on a REAL device model (iPhone 17 Pro, Studio Display) or a clean slab frame, " +
        "conformed to the real screen (rounded corners, Dynamic Island), lit by an HDRI studio with colour-true tone mapping, in a curated look (studio, hero, cinematic, retro, noir, clean) and camera (head-on, three-quarter, hero, top-down, wide). " +
        "Use this instead of building devices from shapes or HTML. Stills (png/jpg/webp) or a short clip with motion (orbit, dolly-in, reveal, drift → .mp4/.webm). The model credit is written next to the file. " +
        "Needs MockStudio once: `drip doctor --install mockstudio` (a few minutes). " +
        'Example: mockup_render({ image: "shots/home.png", device: "iphone-17-pro", look: "hero", camera: "three-quarter", background: "#0D0E12", aspect: "4:5", out: "public/img/phone.png" })',
      inputSchema: {
        image: z.string().describe("Screenshot (project path or URL), or an .html file rendered at the device's screen size"),
        device: z.enum([...MOCKSTUDIO.devices, "slab"]).optional().describe("Default iphone-17-pro"),
        look: z.enum(MOCKSTUDIO.looks).optional(),
        camera: z.enum(MOCKSTUDIO.cameras).optional(),
        motion: z.enum(MOCKSTUDIO.motions).optional().describe("A camera move; with an .mp4/.webm out it renders a clip"),
        aspect: z.enum(MOCKSTUDIO.aspects).optional().describe("Output frame (default 4:5 for a phone, 16:9 for a display)"),
        background: z.union([z.string(), z.object({ from: z.string(), to: z.string(), shape: z.enum(["linear", "radial"]).optional(), angle: z.number().optional() })]).optional().describe("#hex, transparent, or a gradient"),
        environment: z.enum(MOCKSTUDIO.environments).optional().describe("HDRI lighting"),
        light: z.number().min(0).max(4).optional().describe("Environment intensity (default from the look)"),
        finish: z.enum(["glass", "flat"]).optional().describe("Screen finish: glass reflects the studio, flat shows the pixels exactly"),
        slabMaterial: z.enum(["matte-black", "space-gray", "silver", "glass"]).optional(),
        width: z.number().int().min(400).max(4096).optional().describe("Output width in px (default 1600)"),
        seconds: z.number().min(1).max(20).optional().describe("Clip length (motion only)"),
        patch: z.record(z.string(), z.any()).optional().describe("Advanced: a JSON merge patch on MockStudio's Scene Document (effects, camera tilt, bloom, grain…)"),
        out: z.string().describe("File to write: .png, .jpg, .webp, .mp4 or .webm"),
      },
    },
    safe(async (o) => {
      if (!mockstudioReady()) return text("MockStudio isn't installed yet. Run `drip doctor --install mockstudio` once (it clones a pinned version into ~/.drip/vendor and builds it; a few minutes), then call mockup_render again.", true);
      const config = ctx.config();
      const device = o.device || "iphone-17-pro";
      const ext = path.extname(o.out).toLowerCase().slice(1);
      const video = ["mp4", "webm"].includes(ext);
      if (video && !o.motion) return text("A clip needs a motion (orbit, dolly-in, reveal, drift).", true);
      const doc = buildDocument(o);
      if (video && o.seconds && doc.animation) doc.animation.duration = o.seconds;
      const screen = await screenBytes(o.image, device, config);
      const W = o.width || 1600;
      const aspect = ASPECT[doc.artboard?.aspect] || (device === "iphone-17-pro" ? 9 / 19.5 : 16 / 10);
      const H = Math.round(W / aspect / 2) * 2;
      const base = await serveDir(path.join(mockstudioDir(), "dist"));
      const t0 = Date.now();
      const b64 = await withTab(config, async (tab) => {
        await openPage(tab, `${base}/?render`, { width: 1280, height: 900, settleMs: 100 });
        const expr = `(async () => {
          for (let i = 0; i < 300 && !window.__mockstudio; i++) await new Promise((r) => setTimeout(r, 50));
          const b = window.__mockstudio;
          if (!b) throw new Error("MockStudio's render page did not start");
          const loaded = b.loadDocument(${JSON.stringify(JSON.stringify(doc))});
          if (loaded.recovered) throw new Error("MockStudio rejected the scene (check patch): it fell back to defaults");
          const bytes = Uint8Array.from(atob(${JSON.stringify(screen.buf.toString("base64"))}), (c) => c.charCodeAt(0));
          await b.bindSourceMediaBytes({ data: bytes.buffer, name: ${JSON.stringify(screen.name)}, mimeType: ${JSON.stringify(screen.mime)} });
          await b.whenReady();
          // whenReady() resolves before the device model and the HDRI have loaded: wait until nothing new has loaded for 700 ms.
          let last = -1, stable = 0;
          for (let i = 0; i < 150 && stable < 7; i++) {
            await new Promise((r) => setTimeout(r, 100));
            const n = performance.getEntriesByType("resource").filter((e) => e.responseEnd > 0).length;
            stable = n === last ? stable + 1 : 0;
            last = n;
          }
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const req = ${video} ? { kind: "video", width: ${W}, height: ${H}, fps: 30, format: ${JSON.stringify(ext)} } : { kind: "image", width: ${W}, height: ${H}, format: ${JSON.stringify(ext === "jpg" ? "jpeg" : ext)}, transparent: ${o.background === "transparent"} };
          const res = await b.capture(req);
          const u8 = new Uint8Array(res.data);
          let s = "";
          for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode(...u8.subarray(i, i + 32768));
          return btoa(s);
        })()`;
        const { result, exceptionDetails } = await tab.s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 600000 });
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split("\n")[0] || exceptionDetails.text);
        return result.value;
      });
      const buf = Buffer.from(b64, "base64");
      const file = saveFile(o.out, buf);
      const credit = credits(device);
      saveFile(o.out.replace(/\.[a-z0-9]+$/i, ".credits.txt"), `${credit.join("\n")}\n`);
      saveFile(o.out.replace(/\.[a-z0-9]+$/i, ".mock.json"), JSON.stringify(doc, null, 2));
      const head = `${video ? "Clip" : "Mockup"} ${W}x${H} (${device}, ${o.look || "studio"} look${o.camera ? `, ${o.camera} camera` : ""}${o.motion ? `, ${o.motion}` : ""}) in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${file.rel} (${file.kb} KB)\nCredit (keep it with the image): ${credit.slice(1).join("; ") || "none needed"}\nScene saved as .mock.json next to it: change one thing with patch and render again.`;
      return video ? text(head) : blocks([textBlock(head), imageBlock(await toJpeg(buf, 1200, 1200, 82))]);
    }),
  );
}
