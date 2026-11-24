// motion_render: record a page's animation as frames (a contact strip to look at, an animated WebP to ship or share)
// and report the real timings. Two modes:
//   seek  (default) pauses every CSS / Web Animations animation and steps its clock frame by frame: exact, repeatable,
//         independent of how fast this machine renders. Works for CSS animations and transitions and for libraries
//         that use the Web Animations API.
//   live  takes screenshots in real time, for animation driven by requestAnimationFrame / canvas / WebGL. Timing
//         follows what the machine managed; the reported fps says how smooth that was.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { openPage, withTab } from "../../core/browser.mjs";
import { contactSheet, imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe } from "../../core/result.mjs";
import { toUrl } from "../../core/serve.mjs";
import { projectDir } from "../../core/paths.mjs";
import { previewBlock, projectPath, saveFile } from "./raster.mjs";
import { animatedWebp } from "./webp.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Capture `count` frames. seek(i) positions the page for frame i (and may wait). Returns [{ buf, at }] (at = ms since start). */
export async function captureFrames(tab, { count, seek, format = "webp", quality = 78, clip }) {
  const frames = [];
  const t0 = Date.now();
  for (let i = 0; i < count; i++) {
    await seek(i);
    const { data } = await tab.s("Page.captureScreenshot", { format, ...(format !== "png" ? { quality } : {}), ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    frames.push({ buf: Buffer.from(data, "base64"), at: Date.now() - t0 });
  }
  return frames;
}

const PAGE_HELPERS = `(() => {
  const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__motion = {
    raf2,
    collect() {
      const list = document.getAnimations({ subtree: true });
      window.__anims = list;
      const name = (el) => !el ? '?' : (el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.trim().split(/\\s+/)[0] : el.tagName.toLowerCase()));
      return list.map((a) => {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
        const keys = a.effect && a.effect.getKeyframes ? [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))] : [];
        const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
        const ease = t.easing === 'linear' && kf[0] && kf[0].easing && kf[0].easing !== 'linear' ? kf[0].easing : t.easing;
        return { kind: a.constructor.name.replace('CSS', '').replace('Animation', '').toLowerCase() || 'animation', name: a.animationName || a.transitionProperty || a.id || '', target: name(a.effect && a.effect.target), props: keys.slice(0, 6), duration: t.duration, delay: t.delay, easing: ease, iterations: t.iterations, direction: t.direction };
      });
    },
    pause() { (window.__anims || []).forEach((a) => { try { a.pause(); a.currentTime = 0; } catch (e) {} }); },
    async seek(ms) { (window.__anims || []).forEach((a) => { try { a.currentTime = ms; } catch (e) {} }); await raf2(); }
  };
})()`;

/** Longest finite end time (ms) among the animations, for a default duration. */
export function naturalDuration(anims) {
  const ends = anims.filter((a) => Number.isFinite(a.duration) && (a.iterations === 1 || a.iterations === undefined)).map((a) => (a.delay || 0) + a.duration * (a.iterations || 1));
  return ends.length ? Math.max(...ends) : 0;
}

async function pointOf(tab, selector) {
  const { result } = await tab.s("Runtime.evaluate", { expression: `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`, returnByValue: true });
  if (!result.value) throw new Error(`No element matches "${selector}" for the interaction step.`);
  return result.value;
}

async function runStep(tab, step) {
  const { x, y } = await pointOf(tab, step.selector);
  await tab.s("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  if (step.action === "click") {
    await tab.s("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await tab.s("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  await wait(30);
}

export function register(server, ctx) {
  server.registerTool(
    "motion_render",
    {
      title: "Record a page's animation as frames",
      description:
        "Records the animation on a page (URL, local .html, or a dev-server URL) and gives you a contact strip of frames to look at, the real timings (duration, delay, easing, properties of every CSS / Web Animations animation found), and an animated WebP. " +
        "mode seek (default) steps the animation clock frame by frame: exact and repeatable. mode live takes real-time screenshots for requestAnimationFrame / canvas / WebGL motion. " +
        "To record a hover, focus or click transition, pass `before` (the transition starts when the action happens). Example: motion_render({ target: \"http://localhost:5173\", before: [{ action: \"hover\", selector: \".card\" }], duration: 0.6, fps: 30, out: \"public/motion/card-hover.webp\" })",
      inputSchema: {
        target: z.string().describe("URL, or a project .html file or folder"),
        before: z.array(z.object({ action: z.enum(["hover", "click"]), selector: z.string() })).max(4).optional().describe("Interactions to perform right before recording"),
        mode: z.enum(["seek", "live"]).optional(),
        duration: z.number().min(0.1).max(10).optional().describe("Seconds to record (default: the animations' own length, or 2)"),
        fps: z.number().int().min(2).max(60).optional().describe("Default 24 (live mode records what the machine can do)"),
        width: z.number().int().min(200).max(2000).optional(),
        height: z.number().int().min(200).max(1600).optional(),
        selector: z.string().optional().describe("Crop to this element"),
        out: z.string().optional().describe("Project path ending .webp for the animated WebP"),
        keepFrames: z.boolean().optional().describe("Also save every frame next to `out`"),
      },
    },
    safe(async ({ target, before = [], mode = "seek", duration, fps = 24, width = 1280, height = 720, selector, out, keepFrames }) => {
      const url = await toUrl(target);
      const result = await withTab(ctx.config(), async (tab) => {
        await openPage(tab, url, { width, height, settleMs: 400 });
        await tab.s("Runtime.evaluate", { expression: PAGE_HELPERS });
        for (const step of before) await runStep(tab, step);
        const { result: r } = await tab.s("Runtime.evaluate", { expression: "window.__motion.collect()", returnByValue: true });
        const anims = r.value || [];
        let used = mode;
        let note = "";
        if (mode === "seek" && !anims.length) {
          used = "live";
          note = "No CSS or Web Animations animation found (the motion is probably driven by script or a canvas), so it was recorded live. ";
        }
        const natural = naturalDuration(anims);
        const seconds = duration || (used === "seek" && natural ? Math.min(10, natural / 1000 + 0.05) : 2);
        const count = Math.max(2, Math.round(seconds * fps));
        let clip;
        if (selector) {
          const { result: b } = await tab.s("Runtime.evaluate", { expression: `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) }; })()`, returnByValue: true });
          if (!b.value) throw new Error(`No element matches "${selector}".`);
          clip = b.value;
        }
        let frames;
        if (used === "seek") {
          await tab.s("Runtime.evaluate", { expression: "window.__motion.pause()" });
          frames = await captureFrames(tab, { count, clip, seek: (i) => tab.s("Runtime.evaluate", { expression: `window.__motion.seek(${(i * 1000) / fps})`, awaitPromise: true }) });
        } else {
          const t0 = Date.now();
          frames = await captureFrames(tab, { count, clip, seek: async (i) => wait(Math.max(0, t0 + (i * 1000) / fps - Date.now())) });
        }
        return { anims, frames, used, note, seconds, fps };
      });

      const { anims, frames, used, note, seconds } = result;
      const realFps = used === "live" && frames.length > 1 ? +(((frames.length - 1) * 1000) / (frames[frames.length - 1].at - frames[0].at)).toFixed(1) : fps;
      const files = [];
      if (out) {
        const abs = projectPath(out);
        if (!/\.webp$/i.test(abs)) throw new Error("out must end in .webp");
        files.push(saveFile(out, animatedWebp(frames.map((f) => f.buf), { fps: realFps })));
        if (keepFrames) {
          const dir = abs.replace(/\.webp$/i, "-frames");
          fs.mkdirSync(dir, { recursive: true });
          frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(4, "0")}.webp`), f.buf));
          files.push({ rel: path.relative(projectDir(), dir).replace(/\\/g, "/"), kb: 0 });
        }
      }
      const pick = Array.from({ length: Math.min(8, frames.length) }, (_, i) => frames[Math.round((i * (frames.length - 1)) / Math.max(1, Math.min(8, frames.length) - 1))]);
      const sheet = await contactSheet(pick.map((f) => f.buf), { cols: 4, tileW: clipTile(width, 4), tileH: Math.round((clipTile(width, 4) * (selector ? 0.75 : height / width))), fit: "contain" }).catch(() => null);
      const times = pick.map((f, i) => `${i + 1}: ${(frames.indexOf(f) / realFps).toFixed(2)}s`).join("  ");
      const list = anims.length
        ? anims.slice(0, 12).map((a) => `- ${a.kind} ${a.name || ""} on ${a.target}: ${Number.isFinite(a.duration) ? `${Math.round(a.duration)} ms` : "auto"}${a.delay ? `, delay ${Math.round(a.delay)} ms` : ""}, ${a.easing}${a.iterations !== 1 ? `, ${a.iterations === Infinity ? "infinite" : `${a.iterations}x`}` : ""}${a.props.length ? ` · ${a.props.join(", ")}` : ""}`).join("\n")
        : "- none found via the Web Animations API";
      const content = [
        textBlock(
          `${note}Recorded ${frames.length} frames over ${seconds.toFixed(2)} s (${used}${used === "live" ? `, achieved ${realFps} fps` : `, ${fps} fps stepped`}), ${width}x${height}${selector ? `, cropped to ${selector}` : ""}.\nAnimations found (${anims.length}):\n${list}\nStrip frames at ${times}.${files.length ? `\nSaved: ${files.map((f) => f.rel).join(", ")} (animated WebP, ${realFps} fps).` : ""}${used === "seek" && anims.some((a) => a.iterations === Infinity) ? "\nSome animations loop forever; the recording shows the first cycle from t=0." : ""}`,
        ),
      ];
      if (sheet) content.push(imageBlock(sheet));
      else {
        const p = await previewBlock(frames[Math.floor(frames.length / 2)].buf);
        if (p) content.push(p);
      }
      return blocks(content);
    }),
  );
}

const clipTile = (width, cols) => Math.min(480, Math.round((Math.min(width, 1600) - 8 * (cols + 1)) / cols));
