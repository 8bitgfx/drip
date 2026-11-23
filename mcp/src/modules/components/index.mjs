// Components: the curated catalogue (data/catalogue.json) + live search across shadcn-style registries,
// so Claude installs proven components and restyles them instead of hand-rolling everything.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { dataDir, projectDripDir } from "../../core/paths.mjs";
import { safe, text } from "../../core/result.mjs";

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

async function registryItems(entry) {
  const { body } = await get(entry.registry.index, { as: "json", ttlMs: WEEK, timeoutMs: 30000 });
  const items = Array.isArray(body) ? body : body.items || [];
  return items
    .filter((it) => it.name && !/^(index|utils|style|theme)$/.test(it.name) && it.type !== "registry:style")
    .map((it) => ({ library: entry.id, name: it.name, title: it.title || it.name, description: it.description || "", deps: it.dependencies || [], url: entry.registry.item.replace("{name}", it.name) }));
}

export function register(server) {
  server.registerTool(
    "components_find",
    {
      title: "Find a component to install",
      description:
        "Search the curated libraries AND their live registries (shadcn, coss ui, Kibo, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI) for a component. " +
        "Describe the need: 'data table with filters', 'animated number counter', 'pricing toggle', 'command palette', 'marquee of logos'. Returns install commands. Prefer this over writing components from scratch.",
      inputSchema: { need: z.string(), limit: z.number().int().min(3).max(40).optional() },
    },
    safe(async ({ need, limit = 15 }) => {
      const cat = loadCatalogue();
      const libs = cat.entries
        .map((e) => ({ e, s: score(`${e.name} ${e.what} ${e.useWhen} ${e.category}`, need) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5);
      const all = (await Promise.all(cat.entries.filter((e) => e.registry).map((e) => registryItems(e).catch(() => [])))).flat();
      const items = all
        .map((it) => ({ it, s: score(`${it.name.replace(/[-_]/g, " ")} ${it.title} ${it.description}`, need) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      return text(
        `Libraries that fit "${need}":\n${libs.map(({ e }) => `- ${e.name} (${e.category}, ${e.price}, ${e.license}): ${e.what} Use when: ${e.useWhen}${e.avoidWhen ? ` Avoid: ${e.avoidWhen}` : ""}`).join("\n") || "- none matched by description"}\n\n` +
          `Installable components (${all.length} searched):\n${items.map(({ it }) => `- [${it.library}] ${it.title}: ${it.description.slice(0, 140)}\n    npx shadcn@latest add ${it.url}`).join("\n") || "- none matched; try other words, or components_registries for 500+ more registries"}\n\n` +
          "Read a component's code with components_get before installing. After installing, restyle it to the project's tokens (DESIGN.md); never leave library defaults.",
      );
    }),
  );

  server.registerTool(
    "components_get",
    {
      title: "Read a registry component",
      description: "Fetch a registry component's files, dependencies and install command (library id from components_find, e.g. 'kibo', plus the item name), or pass a full registry item URL.",
      inputSchema: { library: z.string().optional(), item: z.string().describe("Item name, or a full https URL to the item JSON") },
    },
    safe(async ({ library, item }) => {
      let url = item;
      if (!/^https?:/.test(item)) {
        const entry = loadCatalogue().entries.find((e) => e.id === library);
        if (!entry?.registry) return text(`Unknown library "${library}". Libraries with registries: ${loadCatalogue().entries.filter((e) => e.registry).map((e) => e.id).join(", ")}`, true);
        url = entry.registry.item.replace("{name}", item);
      }
      const { body } = await get(url, { as: "json", ttlMs: WEEK });
      const files = (body.files || []).map((f) => `--- ${f.path} ---\n${(f.content || "(no inline content)").slice(0, 7000)}${(f.content || "").length > 7000 ? "\n…(truncated)" : ""}`);
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
}
