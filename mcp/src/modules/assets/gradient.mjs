// Mesh gradients and grain: CSS and SVG you can drop straight into a hero or card.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { projectDir } from "../../core/paths.mjs";
import { previewHtml } from "../../core/preview.mjs";
import { blocks, safe } from "../../core/result.mjs";

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function meshGradient({ colors, base, seed = 7, blobs, softness = 0.6, grain = 0.12, width = 1600, height = 900 }) {
  const r = rng(seed);
  const n = blobs || Math.max(3, colors.length + 1);
  const spots = Array.from({ length: n }, (_, i) => ({
    color: colors[i % colors.length],
    x: Math.round(5 + r() * 90),
    y: Math.round(5 + r() * 90),
    size: Math.round(35 + r() * 35 + softness * 20),
  }));
  const bg = base || colors[colors.length - 1];
  const css = `background-color: ${bg};\nbackground-image:\n${spots.map((s) => `  radial-gradient(at ${s.x}% ${s.y}%, ${s.color} 0px, transparent ${s.size}%)`).join(",\n")};`;
  const blur = Math.round(Math.min(width, height) * (0.08 + softness * 0.12));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <g filter="url(#blur)">
${spots.map((s) => `    <ellipse cx="${(s.x / 100) * width}" cy="${(s.y / 100) * height}" rx="${(s.size / 100) * width * 0.6}" ry="${(s.size / 100) * height * 0.6}" fill="${s.color}"/>`).join("\n")}
  </g>
  ${grain > 0 ? `<rect width="100%" height="100%" filter="url(#grain)" opacity="${grain}" style="mix-blend-mode:overlay"/>` : ""}
</svg>`;
  const grainCss = grain > 0 ? `\n/* grain overlay: put on a ::after with pointer-events:none */\nbackground-image: url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='${grain}'/></svg>`)}");\nmix-blend-mode: overlay;` : "";
  return { css, grainCss, svg };
}

export function register(server, ctx) {
  server.registerTool(
    "gradient_mesh",
    {
      title: "Mesh gradient + grain",
      description:
        "Generates a mesh gradient (soft colour blobs) with optional film grain, as CSS and as an SVG file, with a preview. Use the direction's palette, 2-4 colours, close in hue for calm, " +
        "contrasting for energy. Change `seed` for a different arrangement. Pass `out` (project path ending .svg) to save the SVG.",
      inputSchema: {
        colors: z.array(z.string()).min(2).max(6),
        base: z.string().optional().describe("Background colour under the blobs"),
        seed: z.number().int().optional(),
        softness: z.number().min(0).max(1).optional(),
        grain: z.number().min(0).max(0.5).optional().describe("0 = none, 0.1 subtle, 0.25 strong"),
        out: z.string().optional(),
      },
    },
    safe(async (args) => {
      const g = meshGradient(args);
      let saved = "";
      if (args.out) {
        const file = path.resolve(projectDir(), args.out);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, g.svg);
        saved = `Saved SVG: ${file}\n\n`;
      }
      const content = [{ type: "text", text: `${saved}CSS:\n${g.css}\n${g.grainCss}\n\nSVG (${g.svg.length} chars) ${args.out ? "saved" : "available: pass out to save"}.` }];
      const img = await previewHtml(`<div style="width:1200px;height:675px;${g.css.replace(/\n/g, " ")}"></div>`, { width: 1200, height: 675, config: ctx.config() });
      if (img) content.push(img);
      return blocks(content);
    }),
  );
}
