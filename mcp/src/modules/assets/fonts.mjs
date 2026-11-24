// Fonts: search every open font (Fontsource API, no key), curated pairings, and a rendered preview.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { updateState } from "../../core/state.mjs";
import { get } from "../../core/http.mjs";
import { dataDir } from "../../core/paths.mjs";
import { previewHtml } from "../../core/preview.mjs";
import { blocks, safe, text } from "../../core/result.mjs";

const LIST = "https://api.fontsource.org/v1/fonts";

function pairs() {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, "font-pairs.json"), "utf8")).pairs;
  } catch {
    return [];
  }
}

const gf = (families) => `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`).join("&")}&display=swap`;

function specimen(display, body, sample) {
  return `<link rel="stylesheet" href="${gf([...new Set([display, body])])}">
<div style="padding:40px 48px;background:#fbfaf7;color:#16140f;width:1100px">
  <div style="font:600 64px/1.05 '${display}';letter-spacing:-0.02em;max-width:900px">${sample}</div>
  <div style="font:400 19px/1.6 '${body}';max-width:640px;margin-top:20px;color:#3d3a33">Body text in ${body}. The quick brown fox jumps over the lazy dog. Pricing starts at $29/month — 1,234,567.89 · 0123456789.</div>
  <div style="font:500 13px/1 '${body}';margin-top:20px;color:#77716a;letter-spacing:.04em">${display} + ${body}</div>
</div>`;
}

/** fonts_search / fonts_pair / fonts_compare count as font research (board_directions asks for it). */
export function noteFontResearch() {
  try {
    updateState((st) => {
      if (st.task) st.task.fonts = { searched: (st.task.fonts?.searched || 0) + 1, at: new Date().toISOString() };
    });
  } catch {
    /* advisory */
  }
}

// Faces the playbook refuses as the display voice (rule 10); they rank last as a display pick.
const BANNED_VOICE = ["Inter", "Geist", "Space Grotesk"];

export function register(server, ctx) {
  server.registerTool(
    "fonts_search",
    {
      title: "Search open fonts",
      description: "Search all open-source fonts (Fontsource: every Google font and more) by name or category (serif, sans-serif, display, handwriting, monospace), optionally variable-only.",
      inputSchema: { query: z.string().optional(), category: z.string().optional(), variable: z.boolean().optional(), limit: z.number().int().min(5).max(60).optional() },
    },
    safe(async ({ query, category, variable, limit = 25 }) => {
      const { body } = await get(LIST, { as: "json", ttlMs: 7 * 24 * 3600e3 });
      noteFontResearch();
      const q = (query || "").toLowerCase();
      const hits = body
        .filter((f) => (!q || f.family.toLowerCase().includes(q) || f.id.includes(q)) && (!category || f.category === category) && (variable === undefined || !!f.variable === variable))
        .slice(0, limit);
      return text(
        `${hits.length} fonts${body.length ? ` (of ${body.length})` : ""}:\n${hits.map((f) => `- ${f.family} (${f.category}${f.variable ? ", variable" : ""}) weights ${f.weights.join("/")} · ${f.license} · npm @fontsource${f.variable ? "-variable" : ""}/${f.id}`).join("\n")}\n\nSee it before choosing: fonts_preview.`,
      );
    }),
  );

  server.registerTool(
    "fonts_pair",
    {
      title: "Font pairings for a mood",
      description: "Curated display + text (+ mono) pairings ranked by mood words from the direction ('editorial premium', 'playful bold', 'developer minimal'). Shows a specimen of the top pick.",
      inputSchema: { mood: z.string(), preview: z.boolean().optional() },
    },
    safe(async ({ mood, preview = true }) => {
      noteFontResearch();
      const words = mood.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const ranked = pairs()
        .map((p) => ({ p, s: p.moods.filter((m) => words.some((w) => m.includes(w) || w.includes(m))).length - (p.overused ? 1 : 0) - (BANNED_VOICE.includes(p.display) ? 3 : 0) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 6);
      const content = [{ type: "text", text: ranked.map(({ p }, i) => `${i + 1}. ${p.display} + ${p.text}${p.mono ? ` (+ ${p.mono})` : ""} — ${p.moods.join(", ")}${BANNED_VOICE.includes(p.display) ? " · NOT AS THE VOICE (playbook 10): fine as a text face" : p.overused ? " · OVERUSED: only with a subject reason" : ""}\n   ${p.note}`).join("\n") }];
      if (preview && ranked[0]) {
        const img = await previewHtml(specimen(ranked[0].p.display, ranked[0].p.text, "Design that earns its place"), { width: 1100, height: 330, config: ctx.config() });
        if (img) content.push(img);
      }
      return blocks(content);
    }),
  );

  server.registerTool(
    "fonts_preview",
    {
      title: "Preview a font pairing",
      description: "Renders a specimen (headline + body + numbers) for a display/text pairing with your own sample line, so you can judge it with your eyes.",
      inputSchema: { display: z.string(), text: z.string(), sample: z.string().optional() },
    },
    safe(async ({ display, text: body, sample }) => {
      const img = await previewHtml(specimen(display, body, sample || "Ship the product, not the template"), { width: 1100, height: 330, config: ctx.config() });
      return img ? blocks([{ type: "text", text: `${display} + ${body}` }, img]) : text("No browser available for previews (set fitcheck.chromePath).", true);
    }),
  );
}
