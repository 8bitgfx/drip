// Components: the curated catalogue (data/catalogue.json) + live search across shadcn-style registries,
// so Claude installs proven components and restyles them instead of hand-rolling everything.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { dataDir, projectDripDir } from "../../core/paths.mjs";
import { safe, text } from "../../core/result.mjs";
import { register as registerLocal } from "./local.mjs";

const WEEK = 7 * 24 * 3600e3;
const DIRECTORY = "https://ui.shadcn.com/r/registries.json";

export function loadCatalogue() {
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      return {};
    }
  };
  const base = read(path.join(dataDir, "catalogue.json"));
  const extra = read(path.join(projectDripDir(), "catalogue.json"));
  return { ...base, entries: [...(base.entries || []), ...(extra.entries || [])] };
}

const words = (s) => (s || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

function score(hay, query) {
  const h = hay.toLowerCase();
  return words(query).reduce((n, w) => n + (h.includes(w) ? (h.includes(` ${w}`) ? 2 : 1) : 0), 0);
}

// What each kind of component is called across the libraries (names are often the only text there is).
export const KINDS = {
  background: "background backgrounds aurora beams particles grid waves wave noise gradient shader silk iridescence chrome galaxy threads lightning orb squares dots ballpit hyperspeed plasma prism ripple meteors spotlight lamp vortex sparkles starfield stars dither liquid balatro veil rays light pixel glitch globe flickering mesh blob smoke fog field lines boxes warp shape grain halftone",
  hero: "hero header landing splash intro headline above fold showcase spotlight lamp parallax scroll macbook container scroll",
  text: "text type typing typewriter scramble shuffle split blur rotate rotating flip morph gradient shiny glitch decrypt countup counter number ticker marquee velocity curved circular highlight word letter fuzzy",
  "3d": "3d three webgl canvas globe model cube card tilt perspective orbit lanyard ballpit fluid",
  cursor: "cursor pointer follow magnet magnetic trail splash crosshair blob ribbons",
  cards: "card cards bento grid tilt spotlight stack deck masonry gallery",
  scroll: "scroll parallax reveal sticky stack velocity progress timeline marquee infinite",
  button: "button cta shimmer rainbow ripple pulse magnetic star border glow",
  nav: "nav navbar menu dock tabs sidebar header floating",
  media: "image gallery carousel video lens zoom compare masonry slider marquee logos",
};

async function registryItems(entry) {
  const { body } = await get(entry.registry.index, { as: "json", ttlMs: WEEK, timeoutMs: 30000 });
  const items = Array.isArray(body) ? body : body.items || [];
  const seen = new Map();
  for (const it of items) {
    if (!it.name || /^(index|utils|style|theme)$/.test(it.name) || /^registry:(style|example|theme|lib|hook)$/.test(it.type || "") || /(^|-)(demo|example|examples)(-\d+)?$/i.test(it.name)) continue;
    // React Bits and others publish one item per variant (JS/TS x CSS/Tailwind): keep one, prefer TS + Tailwind.
    const m = it.name.match(/^(.*?)-(JS|TS)-(CSS|TW)$/i);
    const base = m ? m[1] : it.name;
    const rank = m ? (m[2].toUpperCase() === "TS" ? 2 : 0) + (m[3].toUpperCase() === "TW" ? 1 : 0) : 3;
    const prev = seen.get(base);
    if (prev && prev.rank >= rank) {
      prev.variants++;
      continue;
    }
    seen.set(base, { rank, variants: (prev?.variants || 0) + 1, library: entry.id, license: entry.license, name: it.name, base, title: it.title || base.replace(/([a-z])([A-Z])/g, "$1 $2"), description: it.description || "", deps: it.dependencies || [], url: entry.registry.item.replace("{name}", it.name), html: !(entry.stack || []).includes("react") });
  }
  return [...seen.values()];
}

const HEAVY = /^(three|@react-three\/.+|ogl|gsap|matter-js|@paper-design\/.+|postprocessing|lenis|cobe|p5)$/;

export function register(server, ctx) {
  server.registerTool(
    "components_find",
    {
      title: "Find a component to install",
      description:
        "Search the curated libraries AND their live registries (shadcn, coss ui, Kibo, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI, Smooth UI, Eldora, efferd, sakuga-vfx) for a component. " +
        "Describe the need: 'data table with filters', 'animated number counter', 'pricing toggle', 'command palette', 'marquee of logos'. Returns install commands. Prefer this over writing components from scratch.",
      inputSchema: {
        need: z.string().optional().describe("What it should do or look like. Optional with kind"),
        kind: z.enum(Object.keys(KINDS)).optional().describe("background (aurora, beams, shaders, grids...), hero, text effects, 3d, cursor, cards, scroll, button, nav, media. Widens the search to everything of that kind"),
        limit: z.number().int().min(3).max(40).optional(),
      },
    },
    safe(async ({ need: rawNeed = "", kind, limit = 15 }) => {
      if (!rawNeed && !kind) return text("Pass need, kind, or both.", true);
      const need = `${rawNeed} ${kind ? KINDS[kind] : ""}`.trim();
      const cat = loadCatalogue();
      const libs = cat.entries
        .map((e) => ({ e, s: score(`${e.name} ${e.what} ${e.useWhen} ${e.category}`, need) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5);
      const all = (await Promise.all(cat.entries.filter((e) => e.registry).map((e) => registryItems(e).catch(() => [])))).flat();
      const items = all
        .map((it) => ({ it, s: score(`${it.base.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")} ${it.title} ${it.description}`, need) + (rawNeed ? score(`${it.base} ${it.title} ${it.description}`, rawNeed) * 2 : 0) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      return text(
        `Libraries that fit "${rawNeed || kind}":\n${libs.map(({ e }) => `- ${e.name} (${e.category}, ${e.price}, ${e.license}): ${e.what} Use when: ${e.useWhen}${e.avoidWhen ? ` Avoid: ${e.avoidWhen}` : ""}`).join("\n") || "- none matched by description"}\n\n` +
          `Installable components (${all.length} searched${kind ? `, kind ${kind}` : ""}):\n${items.map(({ it }) => {
            const heavy = it.deps.filter((d) => HEAVY.test(d));
            return `- [${it.library}] ${it.title}${it.description ? `: ${it.description.slice(0, 120)}` : ""}${heavy.length ? ` · needs ${heavy.join(", ")} (heavy: lazy-load it, give a static fallback)` : it.deps.length ? ` · deps ${it.deps.slice(0, 3).join(", ")}` : ""}\n    ${it.html ? `plain HTML: download ${it.url} into the page and load it with a script tag` : `npx shadcn@latest add ${it.url}`}`;
          }).join("\n") || "- none matched; try other words, or components_registries for 500+ more registries"}\n\n` +
          (kind === "background" || kind === "hero" ? "A background is a material, not the idea: tint it to the palette, keep the text zone calm, cap it to the hero, pause it off-screen and under reduced motion. For a static, licence-free one: gradient_mesh.\n" : "") +
          "Licences: React Bits is MIT + Commons Clause (use in the product, never redistribute the source); Aceternity's free items allow commercial end products, not resale.\n" +
          "Read a component's code with components_get before installing. After installing, restyle it to the project's tokens (DESIGN.md); never leave library defaults.",
      );
    }),
  );

  server.registerTool(
    "components_get",
    {
      title: "Read a registry component",
      description: "Fetch a registry component's files, dependencies and install command (library id from components_find, e.g. 'kibo', plus the item name), or pass a full registry item URL.",
      inputSchema: {
        library: z.string().optional(),
        item: z.string().describe("Item name, or a full https URL to the item JSON"),
        filesOnly: z.boolean().optional().describe("List the files and deps without their code"),
        maxChars: z.number().int().min(500).max(20000).optional().describe("Code shown per file (default 6000)"),
      },
    },
    safe(async ({ library, item, filesOnly = false, maxChars = 6000 }) => {
      let url = item;
      if (!/^https?:/.test(item)) {
        const entry = loadCatalogue().entries.find((e) => e.id === library);
        if (!entry?.registry) return text(`Unknown library "${library}". Libraries with registries: ${loadCatalogue().entries.filter((e) => e.registry).map((e) => e.id).join(", ")}`, true);
        url = entry.registry.item.replace("{name}", item);
      }
      const { body } = await get(url, { as: "json", ttlMs: WEEK });
      const all = body.files || [];
      const files = (filesOnly ? [] : all).map((f) => `--- ${f.path} ---\n${(f.content || "(no inline content)").slice(0, maxChars)}${(f.content || "").length > maxChars ? "\n…(truncated)" : ""}`);
      if (filesOnly) files.push(`Files: ${all.map((f) => `${f.path} (${(f.content || "").length} chars)`).join(", ")}`);
      return text(
        `${body.title || body.name}: ${body.description || ""}\nInstall: npx shadcn@latest add ${url}\nDependencies: ${(body.dependencies || []).join(", ") || "none"}\nRegistry deps: ${(body.registryDependencies || []).join(", ") || "none"}\n\n${files.join("\n\n")}`,
      );
    }),
  );

  server.registerTool(
    "components_registries",
    {
      title: "Search 500+ component registries",
      description: "Search the official shadcn registry directory (hundreds of third-party registries) by what they offer. Use when the curated libraries don't have what you need.",
      inputSchema: { query: z.string() },
    },
    safe(async ({ query }) => {
      const { body } = await get(DIRECTORY, { as: "json", ttlMs: WEEK });
      const hits = body
        .map((r) => ({ r, s: score(`${r.name} ${r.description} ${r.homepage}`, query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20);
      return text(
        hits.length
          ? `${hits.map(({ r }) => `- ${r.name} — ${r.description}\n    ${r.homepage} · items: ${r.url}`).join("\n")}\n\nInstall an item: npx shadcn@latest add <url with {name} replaced>.`
          : `No registries match "${query}".`,
      );
    }),
  );

  server.registerTool(
    "components_catalogue",
    {
      title: "The curated catalogue",
      description: "Lists Drip's curated libraries by category (foundation, complex, motion, micro, blocks, charts, animation-lib, texture, directory), plus icon sets and reference sites.",
      inputSchema: { category: z.string().optional() },
    },
    safe(async ({ category }) => {
      const cat = loadCatalogue();
      const list = cat.entries.filter((e) => !category || e.category === category);
      const groups = {};
      for (const e of list) (groups[e.category] ||= []).push(`  - ${e.name} — ${e.what} [${e.price}; ${e.license}] ${e.url}`);
      return text(
        Object.entries(groups).map(([g, l]) => `${g}:\n${l.join("\n")}`).join("\n\n") +
          (category ? "" : `\n\nicons (via icons_search):\n${cat.icons.map((i) => `  - ${i.name} (${i.iconify}): ${i.style}; ${i.license}`).join("\n")}\n\nreference sites:\n${cat.references.map((r) => `  - ${r.name}: ${r.what} (${r.access})`).join("\n")}`),
      );
    }),
  );

  // This project's own components: index, find, plan, preview, audit, save, and drip_check (local.mjs).
  registerLocal(server, ctx);
}
