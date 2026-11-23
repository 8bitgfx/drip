// Palettes: OKLCH ramps from a seed, contrast checks, palettes pulled from reference images.
import { Jimp } from "jimp";
import { z } from "zod";
import { fetchImage } from "../../core/images.mjs";
import { previewHtml } from "../../core/preview.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { contrast, hexToOklch, oklabToRgb, ramp, rgbToHex, rgbToOklab, rotateHue, wcag } from "./color.mjs";

const hex = z.string().regex(/^#?[0-9a-fA-F]{3,6}$/, "hex colour like #E8452C");
const norm = (h) => `#${h.replace("#", "").toUpperCase()}`;

function swatchHtml(groups) {
  return `<div style="font:13px system-ui;padding:20px;background:#fff">${groups
    .map(
      (g) =>
        `<div style="margin-bottom:14px"><div style="font-weight:600;margin-bottom:6px">${g.name}</div><div style="display:flex">${g.ramp
          .map((s) => `<div style="flex:1;height:64px;background:${s.hex};display:flex;align-items:flex-end;padding:4px;color:${contrast(s.hex, "#000") > 7 ? "#000" : "#fff"};font-size:11px">${s.step}<br>${s.hex}</div>`)
          .join("")}</div></div>`,
    )
    .join("")}</div>`;
}

export function register(server, ctx) {
  server.registerTool(
    "palette_generate",
    {
      title: "Generate a colour system",
      description:
        "Builds a full palette from a brand/accent seed: 11-step OKLCH ramps for accent and a tinted neutral, plus success/warning/danger, light and dark semantic tokens, CSS variables and a Tailwind v4 @theme block. " +
        "Use the chosen direction's palette as the seed. Read drip_guide color first.",
      inputSchema: {
        accent: hex.describe("Main accent / brand colour"),
        neutralTint: z.number().min(0).max(0.04).optional().describe("How much of the accent hue to put in the greys (0 = pure grey, default 0.012)"),
        name: z.string().optional().describe("Token prefix for the accent, default 'accent'"),
      },
    },
    safe(async ({ accent, neutralTint = 0.012, name = "accent" }) => {
      const a = norm(accent);
      const o = hexToOklch(a);
      const groups = [
        { name, ramp: ramp(a) },
        { name: "neutral", ramp: ramp(rotateHue(a, 0, { c: neutralTint })) },
        { name: "success", ramp: ramp(rotateHue("#1F9D55", 0)) },
        { name: "warning", ramp: ramp("#D99A00") },
        { name: "danger", ramp: ramp("#D93B2B") },
      ];
      const n = Object.fromEntries(groups[1].ramp.map((s) => [s.step, s.hex]));
      const ac = Object.fromEntries(groups[0].ramp.map((s) => [s.step, s.hex]));
      // Same role names as drip_guide system/tokens.
      const lightAccent = o.l > 0.7 ? 700 : 600;
      const light = { bg: n[50], surface: "#FFFFFF", "surface-raised": n[100], text: n[950], "text-muted": n[600], border: n[200], "border-strong": n[300], accent: ac[lightAccent], "accent-hover": ac[lightAccent + 100], "accent-subtle": ac[50], "on-accent": "#FFFFFF" };
      const dark = { bg: n[950], surface: n[900], "surface-raised": n[800], text: n[50], "text-muted": n[400], border: n[800], "border-strong": n[700], accent: ac[400], "accent-hover": ac[300], "accent-subtle": ac[900], "on-accent": n[950] };
      const vars = (obj) => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join("\n");
      const rampVars = groups.flatMap((g) => g.ramp.map((s) => `  --color-${g.name}-${s.step}: ${s.oklch};`)).join("\n");
      const checks = [
        ["light text/bg", light.text, light.bg],
        ["light text-muted/bg", light["text-muted"], light.bg],
        ["light on-accent/accent", light["on-accent"], light.accent],
        ["light accent/bg (links)", light.accent, light.bg],
        ["dark text/bg", dark.text, dark.bg],
        ["dark text-muted/bg", dark["text-muted"], dark.bg],
        ["dark on-accent/accent", dark["on-accent"], dark.accent],
        ["dark accent/bg (links)", dark.accent, dark.bg],
      ].map(([label, f, b]) => `${label}: ${contrast(f, b).toFixed(2)} ${wcag(contrast(f, b))}`);
      const content = [
        {
          type: "text",
          text:
            `Seed ${a} = oklch(${(o.l * 100).toFixed(1)}% ${o.c.toFixed(3)} ${o.h.toFixed(0)})\n\n` +
            groups.map((g) => `${g.name}: ${g.ramp.map((s) => `${s.step} ${s.hex}`).join(" · ")}`).join("\n") +
            `\n\nContrast:\n${checks.join("\n")}\n\n` +
            `/* Tailwind v4 */\n@theme {\n${rampVars}\n}\n\n/* Semantic tokens */\n:root {\n${vars(light)}\n}\n.dark, [data-theme="dark"] {\n${vars(dark)}\n}\n\n` +
            "Use ONE accent. Neutrals carry 90% of the UI. Put these in DESIGN.md and the token file; never sprinkle raw hex in components.",
        },
      ];
      const img = await previewHtml(swatchHtml(groups), { width: 1100, height: 470, config: ctx.config() });
      if (img) content.push(img);
      return blocks(content);
    }),
  );

  server.registerTool(
    "palette_check",
    {
      title: "Check contrast",
      description: "WCAG contrast for foreground/background pairs. Body text needs 4.5 (AA), large text and UI parts 3. Check every text colour on every surface it sits on.",
      inputSchema: { pairs: z.array(z.object({ fg: hex, bg: hex, label: z.string().optional() })).min(1) },
    },
    safe(async ({ pairs }) =>
      text(
        pairs
          .map((p) => {
            const r = contrast(norm(p.fg), norm(p.bg));
            return `${p.label ? `${p.label}: ` : ""}${norm(p.fg)} on ${norm(p.bg)} = ${r.toFixed(2)}:1 ${wcag(r)}`;
          })
          .join("\n"),
      ),
    ),
  );

  server.registerTool(
    "palette_from_image",
    {
      title: "Pull a palette from an image",
      description: "Extracts the main colours (with share of the image) from a reference image URL, in OKLCH-aware clusters. Use on a reference the user loves, then palette_generate from its accent.",
      inputSchema: { url: z.string(), colors: z.number().int().min(3).max(10).optional() },
    },
    safe(async ({ url, colors = 6 }) => {
      const { buf } = await fetchImage(url);
      const img = await Jimp.read(buf);
      img.resize({ w: 64, h: Math.max(1, Math.round((64 * img.height) / img.width)) });
      const px = [];
      img.scan(0, 0, img.width, img.height, (x, y, idx) => {
        const d = img.bitmap.data;
        if (d[idx + 3] > 200) px.push(rgbToOklab([d[idx] / 255, d[idx + 1] / 255, d[idx + 2] / 255]));
      });
      // k-means in OKLab
      let centers = Array.from({ length: colors }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / colors)]);
      let assign = [];
      for (let it = 0; it < 12; it++) {
        assign = px.map((p) => centers.reduce((best, c, i) => (Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < Math.hypot(p[0] - centers[best][0], p[1] - centers[best][1], p[2] - centers[best][2]) ? i : best), 0));
        centers = centers.map((c, i) => {
          const mine = px.filter((_, k) => assign[k] === i);
          return mine.length ? [0, 1, 2].map((d) => mine.reduce((s, p) => s + p[d], 0) / mine.length) : c;
        });
      }
      const out = centers
        .map((c, i) => ({ hex: rgbToHex(oklabToRgb(c)), share: assign.filter((a) => a === i).length / px.length }))
        .sort((a, b) => b.share - a.share);
      return text(`${out.map((o) => `${o.hex}  ${(o.share * 100).toFixed(0)}%`).join("\n")}\n\nThe biggest shares are usually background/neutral; the accent is often a small share with high chroma.`);
    }),
  );
}
