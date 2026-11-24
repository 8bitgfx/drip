// Mesh gradients and grain, generated locally (no service, no licence question): CSS to paste, an SVG,
// or a WebP/PNG rendered by the browser. A calm zone keeps the area behind the headline quiet.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { processImage } from "../../core/imaging.mjs";
import { imageBlock } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { renderHtml, rendersDir, stamp } from "../../core/render.mjs";
import { blocks, safe } from "../../core/result.mjs";

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Where blobs may go for each calm zone (x and y ranges in %): the zone itself stays the base colour.
const ZONES = {
  none: [[5, 95], [5, 95]],
  left: [[45, 100], [0, 100]],
  right: [[0, 55], [0, 100]],
  center: null, // ring around the middle
  top: [[0, 100], [50, 100]],
  bottom: [[0, 100], [0, 50]],
};

export function meshGradient({ colors, base, seed = 7, blobs, softness = 0.6, grain = 0.12, calm = "none", style = "mesh", width = 1600, height = 900 }) {
  const r = rng(seed);
  const n = blobs || Math.max(3, colors.length + 1);
  const zone = ZONES[calm];
  const place = () => {
    if (!zone) {
      const a = r() * Math.PI * 2;
      return [50 + Math.cos(a) * (38 + r() * 12), 50 + Math.sin(a) * (38 + r() * 12)];
    }
    return [zone[0][0] + r() * (zone[0][1] - zone[0][0]), zone[1][0] + r() * (zone[1][1] - zone[1][0])];
  };
  const spots = Array.from({ length: n }, (_, i) => {
    const [x, y] = place();
    return { color: colors[i % colors.length], x: Math.round(x), y: Math.round(y), size: Math.round((calm === "none" ? 35 : 28) + r() * 30 + softness * 20), rx: style === "aurora" ? 1.8 + r() : 1, angle: Math.round(-30 + r() * 60) };
  });
  const bg = base || colors[colors.length - 1];
  const grad = (s) => (style === "aurora" ? `radial-gradient(${Math.round(s.size * s.rx)}% ${Math.round(s.size * 0.45)}% at ${s.x}% ${s.y}%, ${s.color} 0%, transparent 100%)` : `radial-gradient(at ${s.x}% ${s.y}%, ${s.color} 0px, transparent ${s.size}%)`);
  const css = `background-color: ${bg};\nbackground-image:\n${spots.map((s) => `  ${grad(s)}`).join(",\n")};`;
  const blur = Math.round(Math.min(width, height) * (0.08 + softness * 0.12));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g filter="url(#blur)">
${spots.map((s) => `    <ellipse cx="${(s.x / 100) * width}" cy="${(s.y / 100) * height}" rx="${(s.size / 100) * width * 0.6 * s.rx}" ry="${(s.size / 100) * height * (style === "aurora" ? 0.3 : 0.6)}" fill="${s.color}" transform="rotate(${style === "aurora" ? s.angle : 0} ${(s.x / 100) * width} ${(s.y / 100) * height})"/>`).join("\n")}
  </g>
  ${grain > 0 ? `<rect width="100%" height="100%" filter="url(#grain)" opacity="${grain}" style="mix-blend-mode:overlay"/>` : ""}
</svg>`;
  const noise = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
  const grainCss = grain > 0 ? `/* grain: on the same element */\n.hero-bg::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: ${noise}; opacity: ${grain}; mix-blend-mode: overlay; }` : "";
  return { css, grainCss, svg, noise, bg };
}

export function register(server, ctx) {
  server.registerTool(
    "gradient_mesh",
    {
      title: "Mesh gradient + grain",
      description:
        "Generates a mesh (soft colour blobs) or aurora (long soft streaks) gradient with optional film grain, as CSS, an SVG, or a WebP/PNG rendered at any size, with a preview. Local and licence-free. " +
        "Use the direction's palette: 2-4 colours, close in hue for calm, contrasting for energy. calm keeps the zone behind your headline quiet (base colour). " +
        "animate adds a slow drift (CSS, respects reduced motion). Change seed for another arrangement. " +
        'Example: gradient_mesh({ colors: ["#FF5B2E", "#FFB199", "#2B1B17"], base: "#140D0B", calm: "left", grain: 0.14, out: "public/img/hero-bg.webp" })',
      inputSchema: {
        colors: z.array(z.string()).min(2).max(6),
        base: z.string().optional().describe("Background colour under the blobs (and in the calm zone)"),
        style: z.enum(["mesh", "aurora"]).optional(),
        calm: z.enum(["none", "left", "right", "center", "top", "bottom"]).optional().describe("Keep this zone quiet for text"),
        seed: z.number().int().optional(),
        softness: z.number().min(0).max(1).optional(),
        grain: z.number().min(0).max(0.5).optional().describe("0 = none, 0.1 subtle, 0.25 strong"),
        animate: z.boolean().optional(),
        width: z.number().int().min(200).max(4000).optional().describe("Raster/SVG width (default 2400)"),
        height: z.number().int().min(200).max(4000).optional().describe("Default 1350"),
        out: z.string().optional().describe("Project path: .svg (vector), .webp or .png (rendered by the browser, grain included)"),
      },
    },
    safe(async (args) => {
      const width = args.width || 2400;
      const height = args.height || 1350;
      const g = meshGradient({ ...args, width, height });
      const anim = args.animate
        ? `\n/* slow drift */\n.hero-bg { background-size: 160% 160%; animation: drip-mesh 24s ease-in-out infinite alternate; }\n@keyframes drip-mesh { to { background-position: 100% 60%; } }\n@media (prefers-reduced-motion: reduce) { .hero-bg { animation: none; } }`
        : "";
      const div = (w, h) => `<div style="position:relative;width:${w}px;height:${h}px;${g.css.replace(/\n/g, " ")}">${args.grain ?? 0.12 ? `<div style="position:absolute;inset:0;background-image:${g.noise.replace(/"/g, "'")};opacity:${args.grain ?? 0.12};mix-blend-mode:overlay"></div>` : ""}</div>`;
      let saved = "";
      if (args.out) {
        const file = path.resolve(projectDir(), args.out);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (/\.svg$/i.test(file)) fs.writeFileSync(file, g.svg);
        else {
          const png = await renderHtml(div(width, height), path.join(rendersDir("gradients"), `mesh-${stamp()}.png`), { width, height, config: ctx.config() });
          if (/\.png$/i.test(file)) fs.writeFileSync(file, png);
          else {
            const r = await processImage(png, { outputs: [{ name: "", width, format: "webp" }], focus: { x: 0.5, y: 0.5 }, maxKB: 300, config: ctx.config() });
            fs.writeFileSync(file, r.files[0].buf);
          }
        }
        saved = `Saved ${args.out} (${Math.round(fs.statSync(file).size / 1024)} KB, ${width}x${height}).\n\n`;
      }
      const content = [{ type: "text", text: `${saved}CSS (put on .hero-bg, position: relative):\n${g.css}\n${g.grainCss}${anim}` }];
      const preview = await renderHtml(div(1200, Math.round((1200 * height) / width)), path.join(rendersDir("gradients"), `preview-${stamp()}.jpg`), { width: 1200, height: Math.round((1200 * height) / width), format: "jpeg", config: ctx.config() }).catch(() => null);
      if (preview) content.push(imageBlock(preview));
      return blocks(content);
    }),
  );
}
