// drip_compare: any 2-6 things side by side, labelled, on one sheet (before / after, build vs comp, us vs
// three competitors, logo A vs B, two crops). board_brand: the brand on one board from a template.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { kitDir, projectDir } from "../../core/paths.mjs";
import { renderHtml, rendersDir, stamp } from "../../core/render.mjs";
import { blocks, safe } from "../../core/result.mjs";
import { toUrl } from "../../core/serve.mjs";
import { loadState } from "../../core/state.mjs";
import { designDoc } from "../../core/skills.mjs";
import { loadBoard } from "../board/store.mjs";
import { screenshot } from "./chrome.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dataUrl = (buf, mime = "image/jpeg") => `data:${mime};base64,${buf.toString("base64")}`;
const mimeOf = (buf) => (buf[0] === 0x89 ? "image/png" : /<svg/i.test(buf.subarray(0, 300).toString()) ? "image/svg+xml" : buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : "image/jpeg");

/** Resolve a compare source to an image buffer. */
async function sourceImage(src, { width, height, config }) {
  const task = loadState().task;
  if (src === "before") {
    if (!task?.before?.url) throw new Error("No 'before' recorded: refs_site({ urls: [<current site>], before: true }) first.");
    src = task.before.url;
  }
  const comp = src.match(/^comp:(.+)$/i);
  if (comp) {
    const board = task?.board?.id && loadBoard(task.board.id);
    const d = board?.directions?.find((x) => x.name.toLowerCase() === comp[1].trim().toLowerCase()) || (comp[1] === "chosen" && board?.directions?.find((x) => x.name === board.chosen));
    if (!d?.tile || !fs.existsSync(d.tile)) throw new Error(`No rendered comp for "${comp[1]}" (board_directions renders them).`);
    return fs.readFileSync(d.tile);
  }
  if (/^https?:/i.test(src) || /\.html?$/i.test(src)) return screenshot(await toUrl(src), { width, height, format: "jpeg", quality: 82, config });
  if (/^data:/.test(src)) return Buffer.from(src.split(",")[1], "base64");
  const abs = path.resolve(projectDir(), src);
  if (fs.existsSync(abs)) return fs.readFileSync(abs);
  return (await fetchImage(src)).buf;
}

export function register(server, ctx) {
  server.registerTool(
    "drip_compare",
    {
      title: "Compare things side by side",
      description:
        "Puts 2-6 things on one labelled sheet so you, the user or the critic can compare them: pages (URL or local .html, shot at the same size), image files, rendered comps (\"comp:<direction>\" or \"comp:chosen\"), " +
        "the redesign's \"before\". Uses: before vs after, build vs the chosen comp, your hero vs 3 competitors, two logo or crop options. Saves the sheet for critic_prepare. " +
        'Example: drip_compare({ items: [{ src: "before", label: "Today" }, { src: "index.html", label: "Redesign" }] })',
      inputSchema: {
        items: z.array(z.object({ src: z.string(), label: z.string().optional(), note: z.string().optional() })).min(2).max(6),
        width: z.number().int().optional().describe("Page shot width (default 1440)"),
        height: z.number().int().optional().describe("Page shot height (default 900: the first viewport)"),
        title: z.string().optional(),
      },
    },
    safe(async ({ items, width = 1440, height = 900, title }) => {
      const config = ctx.config();
      const imgs = await Promise.all(items.map((it) => sourceImage(it.src, { width, height, config }).then((buf) => ({ ...it, buf })).catch((e) => ({ ...it, err: e.message }))));
      const cols = imgs.length <= 3 ? imgs.length : imgs.length === 4 ? 2 : 3;
      const W = 1800;
      const cellW = Math.floor((W - 48 - (cols - 1) * 20) / cols);
      const cellH = Math.round(cellW * (height / width));
      const rows = Math.ceil(imgs.length / cols);
      const H = 48 + (title ? 44 : 0) + rows * (cellH + 70) + 20;
      const html = `<style>body{margin:0;background:#ECEBE7;font:15px system-ui;color:#111;padding:24px}h1{font:600 22px system-ui;margin:0 0 20px}.g{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:20px}figure{margin:0}.i{width:${cellW}px;height:${cellH}px;background:#fff;border-radius:10px;overflow:hidden;display:grid;place-items:center;border:1px solid #d6d3cb}.i img{width:100%;height:100%;object-fit:contain;display:block}figcaption{margin-top:8px}figcaption b{display:inline-block;min-width:22px;background:#111;color:#fff;border-radius:6px;text-align:center;margin-right:6px}.e{color:#b3261e;padding:20px}</style>
${title ? `<h1>${esc(title)}</h1>` : ""}<div class="g">${imgs.map((it, i) => `<figure><div class="i">${it.buf ? `<img src="${dataUrl(it.buf, mimeOf(it.buf))}">` : `<div class="e">${esc(it.err)}</div>`}</div><figcaption><b>${String.fromCharCode(65 + i)}</b>${esc(it.label || it.src)}${it.note ? ` · ${esc(it.note)}` : ""}</figcaption></figure>`).join("")}</div>`;
      const file = path.join(rendersDir("compare"), `compare-${stamp()}.jpg`);
      const sheet = await renderHtml(html, file, { width: W, height: H, format: "jpeg", quality: 85, config });
      return blocks([
        textBlock(`Saved ${file}\n${imgs.map((it, i) => `${String.fromCharCode(65 + i)}. ${it.label || it.src}${it.err ? ` — FAILED: ${it.err}` : ""}`).join("\n")}\nJudge: which one would a stranger remember? What does the winner do that the others don't? Give the critic this file: critic_prepare({ kind: "any", targets: ["${file.replace(/\\/g, "/")}"] }).`),
        imageBlock(sheet),
      ]);
    }),
  );

  server.registerTool(
    "board_brand",
    {
      title: "Brand board",
      description:
        "Renders the brand on one 1600x1000 board from Drip's template (kit/brand-board.html): the mark on its ground, the palette with roles and shares, the type pair at real sizes, 1-4 images, voice lines, do / don't. " +
        "For identity work, a hand-off, or to check that the system holds together before building. Saves HTML + JPG in .drip/brand/. " +
        'Example: board_brand({ name: "Crumb", logo: "brand/mark.svg", palette: [{ hex: "#F3EFE6", role: "ground", share: 60 }, { hex: "#2B1B17", role: "ink", share: 25 }, { hex: "#E8452C", role: "accent", share: 5 }], display: "Fraunces", text: "Inter", headline: "Bread, honestly", voice: ["We say crumb, not artisan."] })',
      inputSchema: {
        name: z.string(),
        tagline: z.string().optional(),
        logo: z.string().optional().describe("SVG markup, or a project path / URL to an SVG or image"),
        palette: z.array(z.object({ hex: z.string(), role: z.string(), share: z.number().optional() })).min(2).max(8),
        display: z.string().describe("Display family (Google Fonts name)"),
        text: z.string().describe("Text family (Google Fonts name)"),
        displayWeight: z.number().int().optional(),
        headline: z.string().optional(),
        body: z.string().optional(),
        images: z.array(z.string()).max(4).optional().describe("Project paths or URLs"),
        voice: z.array(z.string()).max(4).optional(),
        do: z.array(z.string()).max(5).optional(),
        dont: z.array(z.string()).max(5).optional(),
      },
    },
    safe(async (a) => {
      const config = ctx.config();
      const tpl = fs.readFileSync(path.join(kitDir, "brand-board.html"), "utf8");
      const byRole = (r) => a.palette.find((p) => p.role.toLowerCase().includes(r))?.hex;
      const ground = byRole("ground") || byRole("background") || a.palette[0].hex;
      const ink = byRole("ink") || byRole("text") || a.palette[1].hex;
      const lum = (h) => {
        const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
        return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
      };
      let logo = "";
      if (a.logo) {
        if (/^\s*<svg/i.test(a.logo)) logo = a.logo;
        else {
          const abs = path.resolve(projectDir(), a.logo);
          const buf = fs.existsSync(abs) ? fs.readFileSync(abs) : (await fetchImage(a.logo)).buf;
          logo = /<svg/i.test(buf.subarray(0, 400).toString()) ? buf.toString("utf8").replace(/<\?xml[^>]*>/, "") : `<img src="${dataUrl(buf, mimeOf(buf))}">`;
        }
      }
      const total = a.palette.reduce((t, p) => t + (p.share || 10), 0);
      const swatches = a.palette.map((p) => `<div class="sw" style="flex:${p.share || 10};background:${p.hex};color:${lum(p.hex) > 150 ? "#111" : "#fff"}"><b>${esc(p.role)}</b><span>${esc(p.hex.toUpperCase())}${p.share ? ` · ${Math.round(((p.share || 10) / total) * 100)}%` : ""}</span></div>`).join("");
      const imgs = await Promise.all((a.images || []).map(async (src) => {
        const abs = path.resolve(projectDir(), src);
        const buf = fs.existsSync(abs) ? fs.readFileSync(abs) : (await fetchImage(src)).buf;
        return `<img src="${dataUrl(buf, mimeOf(buf))}">`;
      }));
      const fam = (f, w) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@${w}`;
      const fill = {
        fontsLink: `<link href="https://fonts.googleapis.com/css2?${fam(a.display, a.displayWeight || 700)}&${fam(a.text, "400;600")}&display=swap" rel="stylesheet">`,
        displayFamily: `"${a.display}", serif`,
        textFamily: `"${a.text}", sans-serif`,
        ink,
        ground,
        // The mark on the brand's own ground (a coloured mark on a ground of the same colour vanishes).
        markGround: ground,
        markInk: ink,
        logo: logo || `<div style="font:700 120px/1 var(--display);letter-spacing:-0.04em">${esc(a.name)}</div>`,
        name: esc(a.name),
        tagline: esc(a.tagline || ""),
        swatches,
        headline: esc(a.headline || a.tagline || a.name),
        bodyCopy: esc(a.body || "Body copy at 18px in the text face: what a visitor reads after the headline, set at the real size and measure."),
        typeMeta: `${esc(a.display)} ${a.displayWeight || 700} · ${esc(a.text)} 400/600`,
        images: imgs.join("") || `<div style="display:grid;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--ink) 6%,var(--ground));font-size:14px;opacity:.6">Imagery: add 1-4 images</div>`,
        voice: (a.voice || ["Add 2-3 lines in the brand's voice."]).map((v) => `<p>${esc(v)}</p>`).join(""),
        rules: `<div><h4>Do</h4><ul>${(a.do || ["…"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h4>Don't</h4><ul>${(a.dont || ["…"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`,
      };
      const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k] ?? "");
      const dir = rendersDir("brand");
      const base = path.join(dir, `brand-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
      fs.writeFileSync(`${base}.html`, html);
      const jpg = await renderHtml(html, `${base}.jpg`, { width: 1600, height: 1000, format: "jpeg", quality: 88, config });
      const doc = designDoc();
      return blocks([
        textBlock(`Saved ${base}.html and ${base}.jpg.${doc ? "" : ""}\nCheck: does the mark hold on its ground? Do the shares feel like the direction (one committed colour, not five equal chips)? Is the display face doing work at 150px?`),
        imageBlock(jpg),
      ]);
    }),
  );
}
