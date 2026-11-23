// Icons through Iconify's public API (200k+ icons from 150+ open sets, no key).
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { projectDir } from "../../core/paths.mjs";
import { previewHtml } from "../../core/preview.mjs";
import { blocks, safe, text } from "../../core/result.mjs";

const API = "https://api.iconify.design";

export function register(server, ctx) {
  server.registerTool(
    "icons_search",
    {
      title: "Search icons",
      description:
        "Search icons by meaning ('upload', 'credit card', 'sparkline'). Restrict to the project's ONE icon family with `set` (lucide, ph, tabler, heroicons, radix-icons, iconoir, hugeicons, ri, material-symbols). " +
        "Without `set`, compare families in the preview and pick one for the whole project. Read drip_guide icons first.",
      inputSchema: { query: z.string(), set: z.string().optional(), limit: z.number().int().min(4).max(64).optional(), preview: z.boolean().optional() },
    },
    safe(async ({ query, set, limit = 24, preview = true }) => {
      const url = `${API}/search?query=${encodeURIComponent(query)}&limit=${Math.max(32, limit)}${set ? `&prefix=${encodeURIComponent(set)}` : ""}`;
      const { body } = await get(url, { as: "json", ttlMs: 7 * 24 * 3600e3 });
      const icons = (body.icons || []).slice(0, limit);
      if (!icons.length) return text(`No icons for "${query}"${set ? ` in ${set}` : ""}.`);
      const content = [{ type: "text", text: `${icons.length} icons:\n${icons.join("  ")}\n\nGet SVG / install: icons_get. React: lucide-react / @phosphor-icons/react / @tabler/icons-react, or @iconify/react <Icon icon="set:name" />.` }];
      if (preview) {
        const html = `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:16px;font:11px system-ui;background:#fff">${icons
          .map((i) => `<div style="text-align:center"><img src="${API}/${i.replace(":", "/")}.svg?height=40" width="40" height="40"><div style="margin-top:4px;color:#555;word-break:break-all">${i}</div></div>`)
          .join("")}</div>`;
        const img = await previewHtml(html, { width: 1000, height: 120 + Math.ceil(icons.length / 8) * 80, config: ctx.config() });
        if (img) content.push(img);
      }
      return blocks(content);
    }),
  );

  server.registerTool(
    "icons_get",
    {
      title: "Get icon SVGs",
      description: "Returns SVG markup for icons ('lucide:upload'), optionally saving them as files into the project (`dir`). Uses currentColor so they follow text colour.",
      inputSchema: { icons: z.array(z.string()).min(1).max(40), size: z.number().int().optional(), dir: z.string().optional().describe("Project folder to save .svg files into") },
    },
    safe(async ({ icons, size, dir }) => {
      const out = [];
      for (const name of icons) {
        const [prefix, icon] = name.split(":");
        const { body } = await get(`${API}/${prefix}/${icon}.svg${size ? `?height=${size}` : ""}`, { ttlMs: 30 * 24 * 3600e3 });
        if (dir) {
          const target = path.resolve(projectDir(), dir, `${icon}.svg`);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, body);
        }
        out.push(`${name}:\n${body}`);
      }
      return text(`${dir ? `Saved to ${dir}\n\n` : ""}${out.join("\n\n")}`);
    }),
  );
}
