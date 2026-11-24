// README work and plain HTML renders.
//   render_html   any HTML (string or file) -> PNG at 2x (or more), full page, optional transparent background.
//                 The shared browser waits for fonts and layout, so the file is complete when the call returns.
//   readme_check  judges a README's IMAGES where GitHub shows them: the 830px desktop column and the ~309px phone
//                 column, in light and dark. GitHub strips CSS and sets its own type, so page-type audits don't apply.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { openPage, settle, withTab } from "../../core/browser.mjs";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { rendersDir, stamp } from "../../core/render.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { toUrl } from "../../core/serve.mjs";
import { artifactRev } from "../../core/evidence.mjs";
import { updateState } from "../../core/state.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif" };

export async function shoot(url, { width, height, scale, transparent, dark, fullPage, config }) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    await openPage(tab, url, { width, height, dark, settleMs: 400 });
    // An image, not a phone: narrow widths must not switch on mobile emulation (980px layout viewport, touch).
    await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await s("Emulation.setTouchEmulationEnabled", { enabled: false });
    if (transparent) await s("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    let h = height;
    if (fullPage) {
      // The content's own height (not the viewport's): art 300px tall becomes a 300px image.
      const { result } = await s("Runtime.evaluate", {
        expression: "Math.ceil(Math.max(document.body.scrollHeight, ...[...document.body.querySelectorAll('*')].map((e) => e.getBoundingClientRect().bottom + scrollY)))",
        returnByValue: true,
      });
      h = Math.min(Math.max(result.value || height, 1), 12000);
    }
    await s("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: scale, mobile: false });
    await settle(s, 300);
    const { data } = await s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: h, scale: 1 } });
    return { buf: Buffer.from(data, "base64"), height: h };
  });
}

/** Image references in a README: markdown images, <img>, and <picture> sources with their colour scheme. */
export function readmeImages(md) {
  const out = [];
  const pics = [...md.matchAll(/<picture>([\s\S]*?)<\/picture>/gi)];
  const inPicture = new Set();
  for (const [whole, body] of pics) {
    const dark = body.match(/<source[^>]*prefers-color-scheme:\s*dark[^>]*srcset=["']([^"'\s]+)/i)?.[1] || body.match(/<source[^>]*srcset=["']([^"'\s]+)["'][^>]*prefers-color-scheme:\s*dark/i)?.[1];
    const img = body.match(/<img[^>]*>/i)?.[0] || "";
    const src = img.match(/src=["']([^"']+)/i)?.[1];
    const alt = img.match(/alt=["']([^"']*)/i)?.[1];
    if (src) out.push({ src, dark: dark || null, alt: alt ?? null, picture: true });
    inPicture.add(whole);
  }
  let rest = md;
  for (const p of inPicture) rest = rest.replace(p, "");
  for (const m of rest.matchAll(/<img[^>]*>/gi)) {
    const src = m[0].match(/src=["']([^"']+)/i)?.[1];
    if (src && !/shields\.io|badge\.svg|badgen\.net/i.test(src)) out.push({ src, dark: null, alt: m[0].match(/alt=["']([^"']*)/i)?.[1] ?? null, picture: false });
  }
  for (const m of rest.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) if (!/shields\.io|badge\.svg|badgen\.net/i.test(m[2])) out.push({ src: m[2], dark: null, alt: m[1] || null, picture: false });
  return out;
}

function localData(src, base) {
  if (/^(https?:)?\/\//i.test(src)) return { url: src, bytes: null };
  const file = path.resolve(base, src.replace(/^\.?\//, ""));
  if (!fs.existsSync(file)) return { url: null, bytes: null, missing: file };
  const buf = fs.readFileSync(file);
  return { url: `data:${MIME[path.extname(file).toLowerCase()] || "image/png"};base64,${buf.toString("base64")}`, bytes: buf.length };
}

export function register(server, ctx) {
  server.registerTool(
    "render_html",
    {
      title: "Render HTML to a PNG",
      description:
        "Renders an HTML file or string to a PNG at 2x (retina) in Drip's shared browser, after its web fonts and layout are ready: the file is complete when the call returns. " +
        "Full page by default; transparent: true keeps the background clear (for art on GitHub's light and dark themes). Use it for README art, social cards, diagrams and comps. " +
        'Example: render_html({ file: ".drip/art/hero.html", out: "docs/hero.png", width: 830, scale: 2 })',
      inputSchema: {
        file: z.string().optional().describe("HTML file (relative assets and fonts load from its folder)"),
        html: z.string().optional().describe("Or the HTML itself"),
        out: z.string().describe("PNG path to write, relative to the project"),
        width: z.number().int().min(100).max(4000).optional().describe("CSS px (default 830: GitHub's README column)"),
        height: z.number().int().min(50).max(12000).optional().describe("CSS px; with fullPage the page's own height wins"),
        scale: z.number().min(1).max(4).optional().describe("Pixel ratio (default 2)"),
        fullPage: z.boolean().optional(),
        transparent: z.boolean().optional(),
        dark: z.boolean().optional().describe("prefers-color-scheme: dark"),
      },
    },
    safe(async ({ file, html, out, width = 830, height = 600, scale = 2, fullPage = true, transparent = false, dark = false }) => {
      if (!file && !html) return text("Pass file or html.", true);
      let src = file && path.resolve(projectDir(), file);
      if (!src) {
        src = path.join(rendersDir(`html-${stamp()}`), "page.html");
        fs.writeFileSync(src, /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style></head><body>${html}</body></html>`);
      }
      if (!fs.existsSync(src)) return text(`No such file: ${file}`, true);
      const { buf, height: h } = await shoot(await toUrl(src), { width, height, scale, transparent, dark, fullPage, config: ctx.config() });
      const dest = path.resolve(projectDir(), out);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      const preview = await toJpeg(buf, 1200, 1600, 80);
      return blocks([textBlock(`Wrote ${out}: ${width * scale}x${Math.round(h * scale)} px (${width}x${h} CSS px at ${scale}x), ${Math.round(buf.length / 1024)} KB${transparent ? ", transparent background" : ""}.`), imageBlock(preview)]);
    }),
  );

  server.registerTool(
    "readme_check",
    {
      title: "Check a README's images",
      description:
        "The fit check for README work. Shows every image in the README where GitHub shows it: the 830px desktop column and the ~309px phone column, on GitHub's light and dark grounds, " +
        "with the dark variant where a <picture> has one. Flags images too small for retina (under 1660px wide), missing dark variants, missing alt text, heavy files and mermaid blocks. " +
        "GitHub strips CSS and uses its own type, so it never judges GitHub's headings. Counts as the fit-check shot for a README task. Example: readme_check({ file: \"README.md\" })",
      inputSchema: { file: z.string().optional().describe("Default README.md") },
    },
    safe(async ({ file = "README.md" }) => {
      const abs = path.resolve(projectDir(), file);
      if (!fs.existsSync(abs)) return text(`No README at ${file}.`, true);
      const md = fs.readFileSync(abs, "utf8");
      const imgs = readmeImages(md);
      const base = path.dirname(abs);
      const findings = [];
      if (/```mermaid/i.test(md)) findings.push({ level: "warn", msg: "mermaid block: GitHub draws it in its own style (and it renders blank in screenshots). An image you design reads better as a hero diagram." });
      const rows = imgs.map((im, i) => {
        const light = localData(im.src, base);
        const dark = im.dark ? localData(im.dark, base) : null;
        if (light.missing) findings.push({ level: "error", msg: `image ${i + 1}: ${im.src} does not exist` });
        if (dark?.missing) findings.push({ level: "error", msg: `image ${i + 1}: dark variant ${im.dark} does not exist` });
        if (!im.alt) findings.push({ level: "error", msg: `image ${i + 1} (${im.src}): no alt text. Say what the picture shows.` });
        if (light.bytes > 1.5e6) findings.push({ level: "warn", msg: `image ${i + 1} (${im.src}): ${(light.bytes / 1e6).toFixed(1)} MB; aim under 1 MB (WebP, or a smaller PNG palette)` });
        return { i: i + 1, src: im.src, alt: im.alt, light: light.url, dark: dark?.url || null };
      });
      if (!rows.length) return text(`${file} has no images. A README is a landing page in a narrow column: the first screen needs a picture of the thing (drip_guide readme).`, true);
      const cell = (r, theme, w) => `<div class="c" style="width:${w}px;background:${theme === "dark" ? "#0d1117" : "#ffffff"}"><img data-i="${r.i}" data-t="${theme}" src="${theme === "dark" && r.dark ? r.dark : r.light || ""}"></div>`;
      const page = `<!doctype html><html><head><meta charset="utf-8"><style>
        body{margin:0;background:#8b8f96;font:13px/1.3 system-ui;color:#111} .row{display:flex;gap:16px;align-items:flex-start;padding:16px;border-bottom:2px solid #6e737a}
        .lab{width:130px;color:#fff;font-weight:600} .c{padding:12px;box-sizing:content-box} .c img{width:100%;display:block}
      </style></head><body>${rows
        .map((r) => `<div class="row"><div class="lab">${r.i}. ${path.basename(r.src)}<br><span style="font-weight:400">830 light · 830 dark · 309 phone</span></div>${cell(r, "light", 830)}${cell(r, "dark", 830)}${cell(r, "light", 309)}</div>`)
        .join("")}</body></html>`;
      const dir = rendersDir(`readme-${stamp()}`);
      const pageFile = path.join(dir, "check.html");
      fs.writeFileSync(pageFile, page);
      const config = ctx.config();
      const { sizes, buf } = await withTab(config, async (tab) => {
        const { s } = tab;
        await openPage(tab, await toUrl(pageFile), { width: 2200, height: 900, settleMs: 600 });
        const { result } = await s("Runtime.evaluate", {
          expression: "Promise.all([...document.images].map(i => i.decode().catch(()=>0))).then(() => [...document.images].map(i => ({ i: +i.dataset.i, t: i.dataset.t, w: i.naturalWidth, h: i.naturalHeight })))",
          awaitPromise: true,
          returnByValue: true,
        });
        const h = (await s("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value;
        await s("Emulation.setDeviceMetricsOverride", { width: 2200, height: Math.min(h, 9000), deviceScaleFactor: 1, mobile: false });
        await settle(s, 200);
        const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality: 78, captureBeyondViewport: true, clip: { x: 0, y: 0, width: 2200, height: Math.min(h, 9000), scale: 1 } });
        return { sizes: result.value, buf: Buffer.from(data, "base64") };
      });
      for (const r of rows) {
        const sz = sizes.find((x) => x.i === r.i && x.t === "light");
        if (sz && sz.w && sz.w < 1660) findings.push({ level: "warn", msg: `image ${r.i} (${r.src}): ${sz.w}px wide, soft on retina in the 830px column; export at 1660px or more (render_html scale: 2)` });
        if (sz && !sz.w) findings.push({ level: "error", msg: `image ${r.i} (${r.src}): did not load` });
        if (!r.dark) findings.push({ level: "info", msg: `image ${r.i} (${r.src}): one variant for both themes; check its edges and text on the dark ground in the sheet (or add a <picture> with a prefers-color-scheme: dark source)` });
      }
      const sheet = path.join(dir, "readme-check.jpg");
      fs.writeFileSync(sheet, buf);
      const errors = findings.filter((f) => f.level === "error");
      updateState((st) => {
        if (!st.task || st.task.surface !== "readme") return;
        st.task.fitcheck.shots += 1;
        st.task.fitcheck.lastShotAt = new Date().toISOString();
        st.task.fitcheck.shotRev = artifactRev(st.task);
        st.task.fitcheck.blockers = errors.map((f) => f.msg);
        st.task.fitcheck.files = [sheet];
      });
      return blocks([
        textBlock(
          `${rows.length} image(s) in ${file}. Sheet: ${sheet}\n` +
            (findings.length ? findings.map((f) => `- [${f.level}] ${f.msg}`).join("\n") : "No measured problems.") +
            "\n\nNow judge the sheet: can you read every word at 309px? Do edges and text hold on the dark ground? Does the first image show the real thing? Fix, run readme_check again, then the critic and fitcheck_done.",
        ),
        imageBlock(await toJpeg(buf, 1600, 2400, 78)),
      ]);
    }),
  );
}
