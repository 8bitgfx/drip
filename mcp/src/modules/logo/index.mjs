// Logo craft tools: a numbered concept sheet, and a stress test (sizes, light/dark, one colour,
// inverse) with construction hints from the SVG paths (node counts, tiny segments = lumpy curves).
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { renderHtml, rendersDir, stamp } from "../../core/render.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadFont, outline } from "./outline.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function loadSvg(src) {
  if (/^\s*<svg/i.test(src)) return src;
  const abs = path.resolve(projectDir(), src);
  if (!fs.existsSync(abs)) throw new Error(`SVG not found: ${src}`);
  return fs.readFileSync(abs, "utf8");
}

const fit = (svg) => svg.replace(/<\?xml[^>]*>/, "").replace(/<svg/, '<svg style="width:100%;height:100%;display:block"');
/** One-colour version: dark/saturated paint becomes `ink`, near-white paint becomes `ground` (knockouts stay knockouts). */
const LIGHT = /^(#f{3}|#f{6}|white|#fff[0-9a-f]{3}|#f[0-9a-f]f[0-9a-f]f[0-9a-f])$/i;
const isLight = (c) => {
  if (LIGHT.test(c)) return true;
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 215;
};
const mono = (svg, ink, ground) =>
  svg
    .replace(/<(linear|radial)Gradient[\s\S]*?<\/\1Gradient>/g, "")
    .replace(/(fill|stroke)="(?!none)([^"]*)"/g, (_, attr, c) => `${attr}="${isLight(c.trim()) ? ground : ink}"`);

/** Rough construction stats per path: commands, short segments (lumpiness), coordinate precision. */
export function pathStats(svg) {
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  return paths.map((d, i) => {
    const cmds = d.match(/[a-zA-Z]/g) || [];
    const nums = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
    let short = 0;
    for (let k = 2; k + 1 < nums.length; k += 2) if (Math.hypot(nums[k] - nums[k - 2], nums[k + 1] - nums[k - 1]) < 1.5) short++;
    const decimals = Math.max(0, ...(d.match(/\.\d+/g) || []).map((x) => x.length - 1));
    const shapes = Math.max(1, cmds.filter((c) => c === "M" || c === "m").length);
    return { path: i + 1, commands: cmds.length, shapes, curves: cmds.filter((c) => /[cCsSqQtTaA]/.test(c)).length, shortSegments: short, decimals };
  });
}

export function register(server, ctx) {
  server.registerTool(
    "logo_outline",
    {
      title: "Outline a wordmark to SVG paths",
      description:
        "Turns text in any open font (Fontsource family name, or a local .ttf/.otf/.woff) into SVG paths, with the font's real metrics (ascender, descender, cap height, x-height, baseline) and per-glyph advances/bounding boxes, " +
        "so you can customise letters and align a mark to the type (e.g. a frame from ascender to baseline). Always outline wordmarks: SVGs in a GitHub <img> can't load fonts. " +
        'Example: logo_outline({ text: "crumb", font: "Bricolage Grotesque", weight: 700, size: 240, letterSpacing: -0.02, out: "brand/wordmark.svg" })',
      inputSchema: {
        text: z.string().min(1).max(40),
        font: z.string().describe("Family name (Fontsource) or a project path to a font file"),
        weight: z.number().int().min(100).max(900).optional(),
        style: z.enum(["normal", "italic"]).optional(),
        size: z.number().min(16).max(2000).optional(),
        letterSpacing: z.number().min(-0.2).max(0.5).optional().describe("In em, e.g. -0.02 for tighter"),
        out: z.string().optional().describe("Project path to save the SVG"),
      },
    },
    safe(async ({ text: str, font, weight = 400, style = "normal", size = 200, letterSpacing = 0, out }) => {
      const f = await loadFont(font, weight, style);
      const o = outline(f, str, { size, letterSpacing });
      let saved = "";
      if (out) {
        const abs = path.resolve(projectDir(), out);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, o.svg);
        saved = `Saved ${out}\n`;
      }
      const m = o.metrics;
      const file = path.join(rendersDir("logo"), `outline-${stamp()}.png`);
      const png = await renderHtml(
        `<div style="padding:40px;background:#fff"><div style="position:relative;width:${o.width}px;height:${o.height}px">${o.svg}
<div style="position:absolute;left:-30px;right:-30px;top:${m.baselineY}px;border-top:1px solid #e8452c"></div>
${m.xHeight ? `<div style="position:absolute;left:-30px;right:-30px;top:${m.baselineY - m.xHeight}px;border-top:1px dashed #2340ff"></div>` : ""}
${m.capHeight ? `<div style="position:absolute;left:-30px;right:-30px;top:${m.baselineY - m.capHeight}px;border-top:1px dashed #999"></div>` : ""}</div></div>`,
        file,
        { width: Math.min(1800, o.width + 80), height: o.height + 80, config: ctx.config() },
      ).catch(() => null);
      return blocks([
        textBlock(
          `${saved}"${str}" in ${f.names.fullName?.en || font} ${weight}: ${o.width}×${o.height}px (size ${size}).\n` +
            `Metrics (px from top): baseline ${m.baselineY} · ascender 0 · cap height ${m.capHeight ?? "?"} (top at ${m.capHeight ? (m.baselineY - m.capHeight).toFixed(1) : "?"}) · x-height ${m.xHeight ?? "?"} (top at ${m.xHeight ? (m.baselineY - m.xHeight).toFixed(1) : "?"}) · descender ${m.descender}\n` +
            `Glyphs: ${o.glyphs.map((g) => `${g.char}@${g.x} w${g.advance}`).join(" · ")}\n` +
            "Now customise like a designer: kern by eye, cut or extend one letter, and make one detail the brand. Then logo_test.\n" +
            `Path data (${o.d.length} chars) is in the saved SVG${out ? "" : " (pass out to save it)"}.`,
        ),
        ...(png ? [imageBlock(await toJpeg(png, 1800, 900))] : []),
      ]);
    }),
  );

  server.registerTool(
    "logo_sheet",
    {
      title: "Concept sheet for logo ideas",
      description:
        "Render 4-24 logo concepts (SVG strings or .svg files) numbered on one sheet, each large on light, on dark, and tiny (32px), so you and the critic can compare ideas side by side. " +
        "Saves the sheet as a file for critic_prepare({ kind: 'logo', targets: [<file>] }). Sketch many rough ideas first; refine only the winners. " +
        'Example: logo_sheet({ title: "Crumb bakery", concepts: [{ name: "Bitten C", svg: "<svg viewBox=\'0 0 100 100\'>…</svg>" }, { name: "Loaf stack", svg: "brand/concepts/loaf.svg" }] })',
      inputSchema: {
        title: z.string(),
        concepts: z.array(z.object({ name: z.string(), svg: z.string().describe("SVG markup or a project path to an .svg") })).min(2).max(24),
        dark: z.string().optional().describe("Dark ground colour (default #111111)"),
      },
    },
    safe(async ({ title, concepts, dark = "#111111" }) => {
      const svgs = concepts.map((c) => ({ ...c, markup: loadSvg(c.svg) }));
      const cols = svgs.length <= 6 ? 3 : 4;
      const cell = (c, i) => `<figure>
  <div class="big light">${fit(c.markup)}</div>
  <div class="row"><div class="small dark">${fit(c.markup)}</div><div class="s64">${fit(c.markup)}</div><div class="tiny">${fit(c.markup)}</div><div class="s16">${fit(c.markup)}</div><div class="tiny">${fit(mono(c.markup, "#111", "#fff"))}</div></div>
  <figcaption><b>${i + 1}</b> ${esc(c.name)}</figcaption></figure>`;
      const html = `<style>body{font:14px system-ui;background:#ECEBE7;color:#111;margin:0;padding:28px}h1{font:600 20px system-ui;margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px}figure{margin:0;background:#fff;border-radius:12px;padding:14px;border:1px solid #d9d7d0}
.big{height:220px;display:grid;place-items:center;padding:24px}.light{background:#fff}.row{display:flex;gap:10px;align-items:center;margin-top:10px}
.small{width:96px;height:96px;padding:12px;border-radius:10px;background:${dark}}.s64{width:64px;height:64px}.tiny{width:32px;height:32px}.s16{width:16px;height:16px}figcaption{margin-top:10px}figcaption b{display:inline-block;min-width:22px;background:#111;color:#fff;border-radius:6px;text-align:center;margin-right:6px}</style>
<h1>${esc(title)} — ${svgs.length} concepts</h1><div class="grid">${svgs.map(cell).join("")}</div>`;
      const rows = Math.ceil(svgs.length / cols);
      const file = path.join(rendersDir("logo"), `sheet-${stamp()}.png`);
      const png = await renderHtml(html, file, { width: cols * 330 + 60, height: rows * 400 + 90, config: ctx.config() });
      return blocks([
        textBlock(`Concept sheet saved: ${file}\nJudge ideas first (one clear thought each, no clichés), then have the critic rank them: critic_prepare({ kind: "logo", targets: ["${file.replace(/\\/g, "/")}"] }). Refine only the top 2-3, then logo_test each.`),
        imageBlock(await toJpeg(png, 1600, 1600)),
      ]);
    }),
  );

  server.registerTool(
    "logo_test",
    {
      title: "Stress-test a logo",
      description:
        "Render one logo (SVG markup or file) at 16, 24, 32, 64, 128 and 512px, on light and dark, in one colour and inverted, on a photo-like busy ground, plus construction stats " +
        "(path count, curve commands, tiny segments that make curves lumpy, coordinate precision). Fix what fails, then test again. Saves a file for the critic.",
      inputSchema: { svg: z.string(), name: z.string().optional(), dark: z.string().optional() },
    },
    safe(async ({ svg: src, name = "logo", dark = "#111111" }) => {
      const svg = loadSvg(src);
      const sizes = [16, 24, 32, 64, 128];
      const strip = (bg, s) => `<div class="strip" style="background:${bg}">${sizes.map((n) => `<div style="width:${n}px;height:${n}px">${fit(s)}</div>`).join("")}</div>`;
      const html = `<style>body{margin:0;padding:24px;font:13px system-ui;background:#ECEBE7}.top{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.hero{height:520px;border-radius:12px;display:grid;place-items:center;padding:60px}.strip{display:flex;gap:22px;align-items:flex-end;padding:18px;border-radius:12px;margin-top:14px}
.label{margin:14px 0 0;color:#555}</style>
<div class="top"><div class="hero" style="background:#fff">${fit(svg)}</div><div class="hero" style="background:${dark}">${fit(svg)}</div></div>
<p class="label">Sizes 16 / 24 / 32 / 64 / 128 — light, dark, one colour, inverse, busy ground</p>
${strip("#fff", svg)}${strip(dark, svg)}${strip("#fff", mono(svg, "#111", "#fff"))}${strip("#111", mono(svg, "#fff", "#111"))}
${strip("repeating-linear-gradient(45deg,#c9b8a0 0 14px,#7d8f7a 14px 28px,#e7e1d3 28px 42px)", svg)}`;
      const file = path.join(rendersDir("logo"), `test-${name.replace(/\W+/g, "-")}-${stamp()}.png`);
      const png = await renderHtml(html, file, { width: 1140, height: 1340, config: ctx.config() });
      const stats = pathStats(svg);
      const hints = [];
      for (const s of stats) {
        if (s.shortSegments > 4) hints.push(`path ${s.path}: ${s.shortSegments} tiny segments; curves will look lumpy. Redraw with fewer, longer Béziers.`);
        if (s.commands / s.shapes > 45) hints.push(`path ${s.path}: ~${Math.round(s.commands / s.shapes)} commands per shape; shapes this complex rarely survive 32px. Simplify.`);
        if (s.decimals > 3) hints.push(`path ${s.path}: ${s.decimals}-decimal coordinates; round to 1-2 decimals (traced/noisy geometry).`);
      }
      return blocks([
        textBlock(
          `Saved ${file}\nPaths: ${stats.length} · ${stats.map((s) => `#${s.path} ${s.commands} cmds/${s.curves} curves`).join(" · ") || "none (text or shapes only)"}\n` +
            (hints.length ? `Construction hints:\n- ${hints.join("\n- ")}\n` : "Construction: no obvious path problems.\n") +
            "Check: does it read at 16-32px? Same weight on dark (optically lighter there)? Survive one colour? Then critic_prepare({ kind: 'logo', targets: [this file] }).",
        ),
        imageBlock(await toJpeg(png, 1140, 1340)),
      ]);
    }),
  );
}
