// art_generate: procedural SVG artwork as an editable layer stack.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { blocks, safe } from "../../core/result.mjs";
import { buildArt, composition, describe, DEFAULTS, LAYER_TYPES, MOODS } from "./art.mjs";
import { optimizeSvg, projectPath, rasterizeSvg, saveFile } from "./raster.mjs";
import { dataUrl, registerViewer, studioResult, studioToolMeta } from "./viewer.mjs";
import { relPath } from "../../core/util.mjs";

// The one or two parameters worth a slider for each layer type, for the MCP Apps preview.
const KNOBS = {
  grain: [["grain", 0, 0.4, 0.02]],
  flow: [["sep", 8, 40, 1], ["strokeWidth", 0.4, 4, 0.1]],
  contours: [["levels", 4, 30, 1], ["strokeWidth", 0.4, 4, 0.1]],
  blobs: [["count", 1, 14, 1], ["blur", 0, 120, 5]],
  truchet: [["cells", 4, 30, 1], ["strokeWidth", 1, 14, 1]],
  halftone: [["size", 6, 30, 1], ["gamma", 0.4, 1.6, 0.05]],
  dither: [["cell", 3, 14, 1]],
  isometric: [["maxHeight", 1, 10, 0.5], ["cols", 4, 20, 1]],
};

const layerSchema = z.object({ type: z.enum(LAYER_TYPES), seed: z.number().int().optional(), params: z.record(z.string(), z.any()).optional() });

export function specOf(art, extra = {}) {
  return { version: 1, ...extra, width: art.width, height: art.height, palette: art.palette, layers: art.layers.map(({ type, seed, params }) => ({ type, seed, params })) };
}

export function register(server, ctx) {
  registerViewer(server);
  server.registerTool(
    "art_generate",
    {
      title: "Generate original artwork (procedural SVG)",
      description:
        "Original, seeded artwork for heroes, section backgrounds and motifs, built from layers: flow-field lines, topographic contours, soft blobs, Truchet tiles, halftone dots, ordered dither, isometric blocks and grain gradients. " +
        "Same seed + params = same picture. It returns the layer stack with every parameter, so you can edit it and pass it back as `layers` (change the density, a colour index, the opacity) or just change `seed` for another arrangement. " +
        "kind: a single layer type, or \"composition\" (default) with a mood (calm, warm, bold, editorial, technical, playful, dark, mono) that stacks several. palette: hex colours, the FIRST is the background, the rest are inks that layers pick by index. " +
        "out: a project path ending .svg (vector), .webp or .png (rendered by the browser); the .svg and an .art.json spec are written next to it. Tint the palette to the brand and keep the area behind text calm (low opacity or sparse layers). " +
        'Example: art_generate({ mood: "editorial", palette: ["#F3EFE6", "#1B1B1B", "#B9532F"], seed: 7, width: 2400, height: 1350, out: "public/img/hero-art.webp" })',
      inputSchema: {
        kind: z.enum(["composition", ...LAYER_TYPES]).optional().describe("A layer type, or composition (default)"),
        mood: z.enum(Object.keys(MOODS)).optional().describe("Picks the layers (and the palette when you pass none)"),
        seed: z.number().int().optional(),
        width: z.number().int().min(200).max(4000).optional().describe("Default 1600"),
        height: z.number().int().min(200).max(4000).optional().describe("Default 900"),
        palette: z.array(z.string()).min(2).max(8).optional().describe("Hex colours; first = background"),
        params: z.record(z.string(), z.any()).optional().describe("Parameters for a single-layer kind (see the returned stack for the names)"),
        layers: z.array(layerSchema).max(8).optional().describe("An explicit layer stack (from an earlier result); replaces kind/mood layers"),
        from: z.string().optional().describe("Project path of an .art.json spec to start from; other arguments override it"),
        out: z.string().optional().describe("Project path: .svg, .webp or .png"),
        rasterizer: z.enum(["browser", "resvg"]).optional().describe("browser (default) or resvg when @resvg/resvg-js is installed"),
        optimize: z.boolean().optional().describe("Run SVGO on the .svg when it is installed (default true)"),
      },
      _meta: studioToolMeta(),
    },
    safe(async (args) => {
      const base = args.from ? JSON.parse(fs.readFileSync(projectPath(args.from), "utf8")) : {};
      const kind = args.kind || "composition";
      const mood = args.mood || base.mood || "calm";
      let layers = args.layers || (kind !== "composition" || !base.layers ? null : base.layers);
      if (!layers) {
        layers = composition(mood, kind);
        if (kind !== "composition" && args.params) layers = [{ type: kind, params: args.params }];
      }
      // a new seed means a new arrangement: layers saved with their own seeds are reseeded from it
      if (args.seed !== undefined && layers) layers = layers.map(({ seed: _seed, ...rest }) => rest);
      const spec = { width: args.width || base.width || 1600, height: args.height || base.height || 900, seed: args.seed ?? base.seed ?? 1, palette: args.palette || base.palette, mood, layers };
      const art = buildArt(spec);
      const lines = [`Artwork ${describe(art)}.`];
      const files = [];
      let optimizedNote = "";
      if (args.out) {
        const abs = projectPath(args.out);
        const ext = path.extname(abs).slice(1).toLowerCase();
        if (!["svg", "webp", "png"].includes(ext)) throw new Error("out must end in .svg, .webp or .png");
        const stem = abs.slice(0, -(ext.length + 1));
        const rel = (p) => relPath(projectDir(), p);
        const opt = args.optimize === false ? { svg: art.svg, optimized: false } : await optimizeSvg(art.svg);
        optimizedNote = opt.optimized ? " (SVGO applied)" : "";
        files.push(saveFile(rel(`${stem}.svg`), opt.svg));
        if (ext !== "svg") files.push(saveFile(rel(abs), await rasterizeSvg(art.svg, { width: art.width, height: art.height, format: ext, rasterizer: args.rasterizer, config: ctx.config() })));
        files.push(saveFile(rel(`${stem}.art.json`), JSON.stringify(specOf(art, { seed: spec.seed, mood }), null, 2)));
        lines.push(`Saved: ${files.map((f) => `${f.rel} (${f.kb} KB)`).join(", ")}${optimizedNote}.`);
      }
      const stack = specOf(art, { seed: spec.seed, mood });
      lines.push(`Layer stack (edit and pass back as layers, or change seed): ${JSON.stringify({ seed: stack.seed, palette: stack.palette, layers: stack.layers.map((l) => ({ type: l.type, seed: l.seed, params: l.params })) })}`);
      lines.push(`SVG size ${Math.round(art.svg.length / 1024)} KB. Optional: SVGO (npm i svgo in ~/.drip/vendor) shrinks it; @resvg/resvg-js rasterises without a browser.`);
      const pw = Math.min(art.width, 1280);
      const ph = Math.round((pw * art.height) / art.width);
      const small = await rasterizeSvg(art.svg, { width: pw, height: ph, format: "jpeg", rasterizer: args.rasterizer, config: ctx.config() }).catch(() => null);
      const content = [textBlock(lines.join("\n"))];
      if (small) content.push(imageBlock(small));
      const controls = [{ key: "seed", label: "Seed", type: "number", value: spec.seed, step: 1 }];
      stack.layers.forEach((l, i) => (KNOBS[l.type] || []).forEach(([k, min, max, step]) => controls.push({ key: `layers.${i}.params.${k}`, label: `${l.type} ${k}`, type: "range", min, max, step, value: l.params[k] ?? DEFAULTS[l.type][k] })));
      const result = { content };
      return small
        ? studioResult(server, result, { tool: "art_generate", args: { ...args, seed: spec.seed, width: art.width, height: art.height, palette: art.palette, layers: stack.layers, kind: undefined, mood: undefined }, title: `Artwork: ${kind === "composition" ? mood : kind}`, summary: describe(art), image: dataUrl(small), controls })
        : blocks(content);
    }),
  );
}
