// shader_hero: Paper Shaders (https://github.com/paper-design/shaders, Apache-2.0) rendered in headless Chrome. The page
// loads the library from a pinned jsDelivr URL, so nothing is installed; you get a still (WebP), optionally a short
// frame sequence / animated WebP, and the React or vanilla snippet that ships the same shader live.
// Presets, their defaults and the uniform mapping follow @paper-design/shaders-react 0.0.80.
import path from "node:path";
import { z } from "zod";
import { openPage, withTab } from "../../core/browser.mjs";
import { contactSheet, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { processImage } from "../../core/imaging.mjs";
import { blocks, safe } from "../../core/result.mjs";
import { previewBlock, saveFile, tempDir, cleanDir } from "./raster.mjs";
import { captureFrames } from "./motion.mjs";
import { dataUrl, registerViewer, studioResult, studioToolMeta } from "./viewer.mjs";
import { animatedWebp } from "./webp.mjs";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const SHADERS_VERSION = "0.0.80";
export const SHADERS_URL = `https://cdn.jsdelivr.net/npm/@paper-design/shaders@${SHADERS_VERSION}/+esm`;

const SIZING_KEYS = ["fit", "scale", "rotation", "offsetX", "offsetY", "originX", "originY", "worldWidth", "worldHeight"];

// fragment: export name in the library · component: shaders-react component · sizing: "object" | "pattern" defaults
// enums: params that are names mapped through an exported table · rename: param -> uniform name · noise: needs the noise texture
export const PRESETS = {
  "mesh-gradient": { component: "MeshGradient", fragment: "meshGradientFragmentShader", sizing: "object", defaults: { speed: 1, colors: ["#e0eaff", "#241d9a", "#f75092", "#9f50d3"], distortion: 0.8, swirl: 0.1, grainMixer: 0, grainOverlay: 0 }, about: "flowing colour spots, soft and organic" },
  "grain-gradient": { component: "GrainGradient", fragment: "grainGradientFragmentShader", sizing: "object", enums: { shape: "GrainGradientShapes" }, noise: true, defaults: { speed: 1, colorBack: "#000000", colors: ["#7300ff", "#eba8ff", "#00bfff", "#2a00ff"], softness: 0.5, intensity: 0.5, noise: 0.25, shape: "corners" }, about: "gradients with film grain; shapes: wave, dots, truchet, corners, ripple, blob, sphere" },
  "static-mesh-gradient": { component: "StaticMeshGradient", fragment: "staticMeshGradientFragmentShader", sizing: "object", defaults: { speed: 0, rotation: 270, colors: ["#ffad0a", "#6200ff", "#e2a3ff", "#ff99fd"], positions: 2, waveX: 1, waveXShift: 0.6, waveY: 1, waveYShift: 0.21, mixing: 0.93, grainMixer: 0, grainOverlay: 0 }, about: "multi-point mesh wallpaper, still" },
  "static-radial-gradient": { component: "StaticRadialGradient", fragment: "staticRadialGradientFragmentShader", sizing: "object", defaults: { speed: 0, scale: 1, colorBack: "#000000", colors: ["#00bbff", "#00ffe1", "#ffffff"], radius: 0.8, focalDistance: 0.99, focalAngle: 0, falloff: 0.24, mixing: 0.5, distortion: 0, distortionShift: 0, distortionFreq: 12, grainMixer: 0, grainOverlay: 0 }, about: "radial glow with a focal point" },
  dithering: { component: "Dithering", fragment: "ditheringFragmentShader", sizing: "pattern", enums: { shape: "DitheringShapes", type: "DitheringTypes" }, rename: { size: "pxSize" }, defaults: { speed: 1, scale: 0.6, colorBack: "#000000", colorFront: "#00b2ff", shape: "sphere", type: "4x4", size: 2 }, about: "two-colour dithering; shapes: simplex, warp, dots, wave, ripple, swirl, sphere" },
  metaballs: { component: "Metaballs", fragment: "metaballsFragmentShader", sizing: "object", noise: true, defaults: { speed: 1, scale: 1, colorBack: "#000000", colors: ["#6e33cc", "#ff5500", "#ffc105", "#ffc800", "#f585ff"], count: 10, size: 0.83 }, about: "gooey blobs that merge" },
  voronoi: { component: "Voronoi", fragment: "voronoiFragmentShader", sizing: "pattern", noise: true, defaults: { speed: 0.5, scale: 0.5, colors: ["#ff8247", "#ffe53d"], stepsPerColor: 3, colorGlow: "#ffffff", colorGap: "#2e0000", distortion: 0.4, gap: 0.04, glow: 0 }, about: "cells with gaps and glow" },
  warp: { component: "Warp", fragment: "warpFragmentShader", sizing: "pattern", enums: { shape: "WarpPatterns" }, noise: true, defaults: { speed: 1, rotation: 0, colors: ["#121212", "#9470ff", "#121212", "#8838ff"], proportion: 0.45, softness: 1, distortion: 0.25, swirl: 0.8, swirlIterations: 10, shapeScale: 0.1, shape: "checks" }, about: "marbled, smoky colour fields; shapes: checks, stripes, edge" },
  "simplex-noise": { component: "SimplexNoise", fragment: "simplexNoiseFragmentShader", sizing: "pattern", defaults: { speed: 0.5, scale: 0.6, colors: ["#4449CF", "#FFD1E0", "#F94446", "#FFD36B", "#FFFFFF"], stepsPerColor: 2, softness: 0 }, about: "smooth curved colour bands" },
  "neuro-noise": { component: "NeuroNoise", fragment: "neuroNoiseFragmentShader", sizing: "pattern", defaults: { speed: 1, colorFront: "#ffffff", colorMid: "#47a6ff", colorBack: "#000000", brightness: 0.05, contrast: 0.3 }, about: "glowing web of fluid lines" },
  "smoke-ring": { component: "SmokeRing", fragment: "smokeRingFragmentShader", sizing: "object", noise: true, defaults: { speed: 0.5, scale: 0.8, colorBack: "#000000", colors: ["#ffffff"], noiseScale: 3, noiseIterations: 8, radius: 0.25, thickness: 0.65, innerShape: 0.7 }, about: "a ring of smoke" },
  "god-rays": { component: "GodRays", fragment: "godRaysFragmentShader", sizing: "object", noise: true, defaults: { speed: 0.75, offsetX: 0, offsetY: -0.55, colorBack: "#000000", colorBloom: "#0000ff", colors: ["#a600ff6e", "#6200fff0", "#ffffff", "#33fff5"], density: 0.3, spotty: 0.3, midIntensity: 0.4, midSize: 0.2, intensity: 0.8, bloom: 0.4 }, about: "light rays from a centre point" },
  swirl: { component: "Swirl", fragment: "swirlFragmentShader", sizing: "object", defaults: { speed: 0.32, colorBack: "#330000", colors: ["#ffd1d1", "#ff8a8a", "#660000"], bandCount: 4, twist: 0.1, center: 0.2, proportion: 0.5, softness: 0, noiseFrequency: 0.4, noise: 0.2 }, about: "twisting colour bands" },
  waves: { component: "Waves", fragment: "wavesFragmentShader", sizing: "pattern", defaults: { scale: 0.6, colorFront: "#ffbb00", colorBack: "#000000", shape: 0, frequency: 0.5, amplitude: 0.5, spacing: 1.2, proportion: 0.1, softness: 0 }, about: "line pattern from zigzag to waves" },
  "perlin-noise": { component: "PerlinNoise", fragment: "perlinNoiseFragmentShader", sizing: "pattern", defaults: { speed: 0.5, colorBack: "#632ad5", colorFront: "#fccff7", proportion: 0.35, softness: 0.1, octaveCount: 1, persistence: 1, lacunarity: 1.5 }, about: "two-colour noise clouds" },
  "dot-grid": { component: "DotGrid", fragment: "dotGridFragmentShader", sizing: "pattern", enums: { shape: "DotGridShapes" }, rename: { size: "dotSize" }, defaults: { colorBack: "#000000", colorFill: "#ffffff", colorStroke: "#ffaa00", size: 2, gapX: 32, gapY: 32, strokeWidth: 0, sizeRange: 0, opacityRange: 0, shape: "circle" }, about: "grid of circles, squares or triangles" },
};

export const PRESET_NAMES = Object.keys(PRESETS);

/** Defaults + user params, checked: unknown names are reported (they would be ignored by the shader). */
export function resolveParams(preset, params = {}) {
  const def = PRESETS[preset];
  if (!def) throw new Error(`Unknown preset "${preset}". Presets: ${PRESET_NAMES.join(", ")}.`);
  const known = new Set([...Object.keys(def.defaults), ...SIZING_KEYS, "frame"]);
  const unknown = Object.keys(params).filter((k) => !known.has(k));
  if (unknown.length) throw new Error(`${preset} has no parameter ${unknown.map((u) => `"${u}"`).join(", ")}. Its parameters: ${[...known].filter((k) => k !== "frame").join(", ")}.`);
  const merged = { ...def.defaults, ...params };
  if (merged.colors && (!Array.isArray(merged.colors) || merged.colors.length < 1)) throw new Error("colors must be a list of colour strings.");
  return merged;
}

/** The self-contained page that draws one preset and exposes window.__seek(ms) for deterministic frames. */
export function shaderPage(preset, params, { width = 1600, height = 900, frame = 0, url = SHADERS_URL } = {}) {
  const def = PRESETS[preset];
  const p = resolveParams(preset, params);
  const spec = { fragment: def.fragment, sizing: def.sizing, enums: def.enums || {}, rename: def.rename || {}, noise: !!def.noise, params: p };
  return `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}#root{width:${width}px;height:${height}px;position:relative;overflow:hidden}</style>
<div id=root></div>
<script type=module>
const spec = ${JSON.stringify(spec)};
window.__ready = (async () => {
  try {
    const S = await import(${JSON.stringify(url)});
    const sizing = spec.sizing === "pattern" ? S.defaultPatternSizing : S.defaultObjectSizing;
    const p = { ...sizing, ...spec.params };
    const u = {};
    for (const [k, v] of Object.entries(p)) {
      if (k === "speed" || k === "frame") continue;
      if (k === "colors") { u.u_colors = v.map(S.getShaderColorFromString); u.u_colorsCount = v.length; }
      else if (k === "fit") u.u_fit = S.ShaderFitOptions[v];
      else if (spec.enums[k]) u["u_" + k] = S[spec.enums[k]][v];
      else if (k.startsWith("color")) u["u_" + k] = S.getShaderColorFromString(v);
      else u["u_" + (spec.rename[k] || k)] = v;
    }
    if (spec.noise) {
      const img = S.getShaderNoiseTexture();
      if (img && !img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
      u.u_noiseTexture = img;
    }
    const mount = new S.ShaderMount(document.getElementById("root"), S[spec.fragment], u, { preserveDrawingBuffer: true }, 0, ${frame});
    const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__seek = async (ms) => { mount.setFrame(ms); await raf2(); await raf2(); };
    await new Promise((r) => setTimeout(r, 500));
    await window.__seek(${frame});
    return true;
  } catch (e) { window.__error = String(e && e.message || e); return false; }
})();
</script>`;
}

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** The code that ships the same shader live: React (shaders-react) and vanilla (shaders). */
export function snippets(preset, params) {
  const def = PRESETS[preset];
  const p = resolveParams(preset, params);
  const props = Object.entries(p)
    .map(([k, v]) => `      ${typeof v === "string" ? `${k}="${v}"` : `${k}={${JSON.stringify(v)}}`}`)
    .join("\n");
  const react = `// npm i @paper-design/shaders-react
import { ${def.component} } from "@paper-design/shaders-react";

export function HeroBackground() {
  return (
    <${def.component}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
${props}
    />
  );
}
// Respect reduced motion: pass speed={0} when matchMedia("(prefers-reduced-motion: reduce)").matches, and show the saved still as the poster before the shader mounts.`;
  const vanilla = `// npm i @paper-design/shaders\nimport { ShaderMount, ${def.fragment}, getShaderColorFromString, ShaderFitOptions, ${def.sizing === "pattern" ? "defaultPatternSizing" : "defaultObjectSizing"} } from "@paper-design/shaders";\n// uniforms are u_<param>; colours go through getShaderColorFromString, "fit" through ShaderFitOptions. See ${camel(preset)} in the package's types.\nnew ShaderMount(document.querySelector("#hero"), ${def.fragment}, uniforms, undefined, ${p.speed ?? 1});`;
  return { react, vanilla };
}

export function register(server, ctx) {
  registerViewer(server);
  server.registerTool(
    "shader_hero",
    {
      title: "Render a Paper Shaders background",
      description:
        "Renders a GPU shader background (Paper Shaders: mesh gradient, grain gradient, dithering, metaballs, voronoi, warp, swirl, god rays, smoke ring, noise, waves, dot grid...) in headless Chrome and returns a still WebP, optionally a short frame sequence or animated WebP, and the React / vanilla code that ships the same shader live. " +
        "Use it for hero backgrounds that need to feel alive; ship the still as the poster and the shader behind it. Pass the direction's colours in `colors` (2-5), tune with the preset's own parameters (distortion, swirl, softness, grain...), and `time` picks the moment for the still. " +
        "Software WebGL is slower than a GPU but gives the same picture. The library loads from a pinned jsDelivr URL, so it needs internet the first time. " +
        'Example: shader_hero({ preset: "grain-gradient", params: { colors: ["#FF5B2E", "#FFB199", "#2B1B17"], colorBack: "#140D0B", shape: "wave", noise: 0.4 }, width: 2400, height: 1350, time: 3, out: "public/img/hero-shader.webp" })',
      inputSchema: {
        preset: z.enum(PRESET_NAMES),
        params: z.record(z.string(), z.any()).optional().describe("The preset's parameters (colors, colorBack, softness, distortion, shape...) and sizing (scale, rotation, fit, offsetX/Y)"),
        width: z.number().int().min(200).max(3000).optional().describe("Default 1600"),
        height: z.number().int().min(200).max(2000).optional().describe("Default 900"),
        time: z.number().min(0).max(60).optional().describe("Seconds into the animation for the still (default 2)"),
        frames: z.number().int().min(0).max(120).optional().describe("0 = a still only. N frames over `duration` for a sequence / animated WebP"),
        duration: z.number().min(0.2).max(10).optional().describe("Seconds the sequence covers (default 3)"),
        out: z.string().optional().describe("Project path of the still: .webp, .png or .jpg. With frames, <name>-loop.webp (animated) is written next to it"),
      },
      _meta: studioToolMeta(),
    },
    safe(async (args) => {
      const { preset, params = {}, width = 1600, height = 900, time = 2, frames = 0, duration = 3, out } = args;
      const html = shaderPage(preset, params, { width, height });
      const dir = tempDir("drip-shader-");
      const file = path.join(dir, "shader.html");
      fs.writeFileSync(file, html);
      try {
        const shot = await withTab(ctx.config(), async (tab) => {
          await openPage(tab, pathToFileURL(file).href, { width, height, settleMs: 200, timeout: 20000 });
          const ok = await tab.s("Runtime.evaluate", { expression: "window.__ready", awaitPromise: true, returnByValue: true });
          if (!ok.result.value) {
            const { result } = await tab.s("Runtime.evaluate", { expression: "window.__error || 'unknown error'", returnByValue: true });
            throw new Error(`The shader did not start: ${result.value}. It needs WebGL in the browser and internet for the pinned library (${SHADERS_URL}).`);
          }
          await tab.s("Runtime.evaluate", { expression: `window.__seek(${Math.round(time * 1000)})`, awaitPromise: true });
          const { data } = await tab.s("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
          let seq = [];
          if (frames > 0) {
            const t0 = Math.round(time * 1000);
            seq = await captureFrames(tab, { count: frames, format: "webp", quality: 80, seek: (i) => tab.s("Runtime.evaluate", { expression: `window.__seek(${t0 + Math.round((i * duration * 1000) / frames)})`, awaitPromise: true }) });
          }
          return { png: Buffer.from(data, "base64"), seq };
        });
        const snip = snippets(preset, params);
        const files = [];
        if (out) {
          const ext = path.extname(out).slice(1).toLowerCase();
          if (!["webp", "png", "jpg", "jpeg"].includes(ext)) throw new Error("out must end in .webp, .png or .jpg");
          const still = ext === "png" ? shot.png : processImage(shot.png, { outputs: [{ name: "", width, format: ext === "webp" ? "webp" : "jpeg" }], focus: { x: 0.5, y: 0.5 }, maxKB: 500, config: ctx.config() }).then((r) => r.files[0].buf);
          files.push(saveFile(out, await still));
          if (shot.seq.length) files.push(saveFile(out.replace(/\.[a-z]+$/i, "-loop.webp"), animatedWebp(shot.seq.map((f) => f.buf), { fps: frames / duration })));
        }
        const small = await previewBlock(shot.png);
        const knobs = Object.entries(resolveParams(preset, params)).filter(([, v]) => typeof v === "number" && v >= 0 && v <= 1).slice(0, 4);
        const content = [
          textBlock(
            `Shader ${preset} (${PRESETS[preset].about}), ${width}x${height}, still at ${time}s${shot.seq.length ? `, ${shot.seq.length}-frame loop over ${duration}s` : ""}.${files.length ? `\nSaved: ${files.map((f) => `${f.rel} (${f.kb} KB)`).join(", ")}.` : ""}\n\nReact:\n${snip.react}\n\nVanilla:\n${snip.vanilla}\n\nLibrary: @paper-design/shaders ${SHADERS_VERSION} (Apache-2.0).`,
          ),
        ];
        if (shot.seq.length > 1) {
          const pick = Array.from({ length: Math.min(6, shot.seq.length) }, (_, i) => shot.seq[Math.round((i * (shot.seq.length - 1)) / Math.max(1, Math.min(6, shot.seq.length) - 1))].buf);
          const sheet = await contactSheet(pick, { cols: 3, tileW: 360, tileH: Math.round((360 * height) / width) }).catch(() => null);
          if (sheet) content.push(imageBlock(sheet));
        }
        if (small) content.push(small);
        const controls = [
          { key: "time", label: "Time (s)", type: "range", min: 0, max: 10, step: 0.1, value: time },
          { key: "preset", label: "Preset", type: "select", options: PRESET_NAMES, value: preset },
          ...knobs.map(([k, v]) => ({ key: `params.${k}`, label: k, type: "range", min: 0, max: 1, step: 0.01, value: v })),
        ];
        const result = { content };
        return small ? studioResult(server, result, { tool: "shader_hero", args: { ...args, params: resolveParams(preset, params), time, width, height }, title: `Shader: ${preset}`, summary: PRESETS[preset].about, image: dataUrl(await toJpeg(shot.png, 960, 960, 80)), controls }) : blocks(content);
      } finally {
        cleanDir(dir);
      }
    }),
  );
}
