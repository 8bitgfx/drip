// More places to look: award and curated galleries, section libraries, component marketplaces.
//   refs_gallery  search one or several sources, get a numbered contact sheet
//   refs_sources  which sources exist, what they cover, whether they work right now
// Items go through core/seen.mjs, so the numbers work in refs_pick / refs_view / refs_study / board_add
// exactly like Dribbble listings.
import { z } from "zod";
import { contactSheet, fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { rememberListing } from "../../core/seen.mjs";
import { updateState } from "../../core/state.mjs";
import { mixNote, subjectWords } from "./contract.mjs";
import { filmRecord } from "../film/record.mjs";
import { allProviders, getProvider, NOT_USABLE } from "./providers/index.mjs";
import { token as arenaToken } from "./providers/arena.mjs";
import { loadEntries, rankEntries } from "./rank.mjs";

const KINDS = ["site", "section", "component", "motion", "image"];
const recent = new Map(); // provider id -> { ok, at, n, error }

const NEXT =
  "NEXT: the sheet is for choosing. refs_pick the 2-5 that solve THIS brief (tagged numbers like \"L3-7\", one reason each), then refs_view them and refs_study with values. " +
  "Sites here are shipped work (good evidence for Operate and Read surfaces); components and sections are for behaviour and structure: build your own version, take one move, never the whole.";

/** The best gallery for each need: a curated library of exactly that thing beats a search across everything. */
export const ROUTES = {
  hero: ["supahero", "onepagelove"],
  nav: ["navbar"],
  cta: ["cta"],
  mobile: ["loadmore"],
  social: ["posts"],
  motion: ["godly", "recentdesign"],
  "design-md": ["getdesign"],
  fresh: ["recentdesign", "inspora", "godly"],
};

/** Providers searched when `source` is not given: working ones for this kind (key-gated ones only with a key). */
export function defaultSources(kind) {
  return allProviders().filter((p) => p.kinds.includes(kind) && p.status === "works" && (!p.needsKey || (p.id === "arena" ? arenaToken() : true)));
}

function resolveSources(source, kind) {
  if (!source || source === "all") return { list: defaultSources(kind), unknown: [] };
  const names = Array.isArray(source) ? source : String(source).split(/[,\s]+/).filter(Boolean);
  const list = [];
  const unknown = [];
  for (const n of names) {
    const p = getProvider(n);
    if (p) list.push(p);
    else unknown.push(n);
  }
  return { list, unknown };
}

/** Mix results from several sources one by one, so no single source fills the sheet. */
export function interleave(lists, limit) {
  const out = [];
  const seen = new Set();
  for (let i = 0; out.length < limit && lists.some((l) => i < l.length); i++)
    for (const l of lists) {
      const it = l[i];
      if (!it || seen.has(it.key) || out.length >= limit) continue;
      seen.add(it.key);
      out.push(it);
    }
  return out;
}

export function toSeenItem(it, { query, kind }) {
  const id = it.key.slice(it.key.indexOf(":") + 1);
  return {
    key: it.key,
    source: it.source,
    id,
    title: it.title,
    url: it.url,
    image: it.image,
    ...(it.images ? { images: it.images } : {}),
    designer: it.author,
    designerUrl: it.author,
    tags: it.tags || [],
    refKind: it.kind,
    ...(it.feed ? { feed: true } : {}),
    ...(it.live ? { live: it.live } : {}),
    ...(it.copy ? { copy: it.copy } : {}),
    from: { kind: "gallery", query: query || "", tag: it.source, category: it.kind === "component" ? "product-design" : "web-design", wanted: kind },
  };
}

export function register(server, ctx) {
  server.registerTool(
    "refs_gallery",
    {
      title: "Search design galleries",
      description:
        "Search curated galleries beyond Dribbble: Awwwards, One Page Love (sites and cropped sections), Minimal Gallery, 21st.dev (components), feeds (Httpster, Dark Mode Design, Godly), and libraries of one thing reached with need: hero (Supahero), nav (Navbar Gallery), cta (CTA Gallery), mobile (Loadmo.re), social (Posts.design), motion (Godly, Recent.design), design-md (getdesign.ai), fresh (Recent.design, Inspora). " +
        "For one part of the page, pass need: it is the quickest way to the best examples of exactly that. " +
        "Returns a numbered list AND a contact sheet; the numbers work in refs_pick, refs_view, refs_study and board_add. Without `source` it asks every working source for that kind and mixes the results. " +
        "kind: site (default: shipped pages), section (pricing tables, FAQs, footers... One Page Love), component (21st.dev), motion (Godly). " +
        'Example: refs_gallery({ query: "fintech dashboard dark", limit: 24 }) or refs_gallery({ source: "onepagelove", kind: "section", query: "pricing table" }). ' +
        "refs_sources shows what each source is good for and whether it works right now.",
      inputSchema: {
        query: z.string().optional().describe("1-3 words naming WHAT the product is: \"coffee\", \"ai tool\", \"gaming\", \"fintech\". Not the task sentence, not the client's domain. Empty = the source's latest"),
        source: z.union([z.string(), z.array(z.string())]).optional().describe('One id or several ("awwwards", ["landbook", "lapaninja"]) or "all". See refs_sources'),
        kind: z.enum(KINDS).optional().describe("What to look for (default site)"),
        need: z.enum(Object.keys(ROUTES)).optional().describe("The one thing you need, routed to the gallery made for it: hero (Supahero, One Page Love), nav (Navbar Gallery), cta (CTA Gallery), mobile (Loadmo.re), social (Posts.design), motion (Godly, Recent.design), design-md (getdesign.ai), fresh (Recent.design, Inspora, Godly: this month's best). Their latest picks count even without a subject match"),
        limit: z.number().int().min(4).max(48).optional().describe("Items on the sheet (default 24)"),
        page: z.number().int().min(1).max(20).optional(),
        sheet: z.boolean().optional().describe("Include the contact sheet image (default true)"),
      },
    },
    safe(async ({ query: asked = "", source, kind = "site", need, limit = 12, page = 1, sheet = true }) => {
      if (need && !source) source = ROUTES[need];
      // Galleries match the subject. A task sentence ("redesign vizzbees.com landing and main screen") matches nothing and
      // every source then answers with its latest posts: random references. Search the subject words, or say what's missing.
      const words = subjectWords(asked);
      if (asked.trim() && !words.length)
        return text(
          `"${asked}" names no subject: galleries search by what the product IS. Use 1-3 words for its category or world, e.g. "ai tool", "gaming", "coffee", "fintech", "portfolio". ` +
            "For a redesign, look at the current site first (refs_site with before: true) and name what it is.",
          true,
        );
      const query = words.join(" ");
      const { list, unknown } = resolveSources(source, kind);
      if (!list.length) return text(`No source to search${unknown.length ? ` (unknown: ${unknown.join(", ")})` : ""}. Run refs_sources to see the ids.`, true);
      const config = ctx.config();
      const perSource = Math.min(48, Math.max(6, Math.ceil((limit * 1.5) / list.length)));
      const results = await Promise.all(
        list.map(async (p) => {
          try {
            const items = await p.search(query, { kind: p.kinds.includes(kind) ? kind : p.kinds[0], limit: perSource, page, config });
            recent.set(p.id, { ok: true, at: Date.now(), n: items.length });
            return { p, items: items.filter((i) => i.image && i.title) };
          } catch (err) {
            const error = String(err?.message || err).slice(0, 160);
            recent.set(p.id, { ok: false, at: Date.now(), error });
            return { p, items: [], error };
          }
        }),
      );
      // With a query, only real matches: a source's latest posts are not references for this subject.
      // A curated library of one thing (need) is good evidence even unmatched: keep its latest picks, matches first.
      const strict = query && !need;
      const dropped = strict ? results.reduce((n, r) => n + r.items.filter((i) => i.feed).length, 0) : 0;
      const items = interleave(results.map((r) => (strict ? r.items.filter((i) => !i.feed) : [...r.items.filter((i) => !i.feed), ...r.items.filter((i) => i.feed)])), limit);
      const thin = query && items.length < Math.min(8, limit / 3);
      const notes = results.filter((r) => r.error).map((r) => `${r.p.label}: ${r.error}`);
      const feedNote = results.filter((r) => r.p.status === "feed" && r.items.length).map((r) => r.p.label);
      if (!items.length) return text(`No gallery matches for "${query}"${dropped ? ` (the sources only had unrelated latest posts, left out)` : ""}. Try one broader word for the category ("saas", "food", "gaming", "fashion") or Dribbble: refs_search("${query} landing page").${notes.length ? `
Problems: ${notes.join(" · ")}` : ""}`, true);
      if (!items.length) return text(`No results for "${query}" (${list.map((p) => p.label).join(", ")}).${notes.length ? `\nProblems: ${notes.join(" · ")}` : ""}\nTry other words, another kind or source (refs_sources).`, !!notes.length);

      const seen = items.map((it) => toSeenItem(it, { query, kind }));
      const tag = rememberListing(seen, { kind: "gallery", query, tag: list.map((p) => p.id).join("+"), category: kind === "component" ? "product-design" : "web-design" });
      updateState((st) => {
        if (st.task) {
          st.task.refs.searches += 1;
          st.task.refs.seen += seen.length;
        }
      });
      const lines = seen.map((it, i) => {
        const bits = [it.refKind !== "site" ? it.refKind : "", it.tags.slice(0, 3).join(", "), it.feed ? "latest, no match" : ""].filter(Boolean).join(" · ");
        return `${tag}-${i + 1}. ${it.title} — ${it.designer || "?"} · ${it.source}${bits ? ` · ${bits}` : ""}${it.copy ? `\n      ${String(it.copy).slice(0, 140)}` : ""}\n      ${it.live || it.url}`;
      });
      const head =
        `Listing ${tag}: ${kind}s for "${query || "latest"}" from ${list.map((p) => p.label).join(", ")} — page ${page}, ${seen.length} items. Sheet numbers = ${tag}-<n>.\n`;
      const content = [
        textBlock(
          head +
            lines.join("\n") +
            (asked && query !== asked.trim().toLowerCase() ? `\nSearched the subject words "${query}" (from "${asked}").` : "") +
            (mixNote(asked, "refs_gallery") ? `\n${mixNote(asked, "refs_gallery")}` : "") +
            (dropped ? `\nLeft out ${dropped} unrelated latest posts from sources that found no match.` : "") +
            (thin ? `\nFew matches: also try one broader category word, or Dribbble refs_search("${query} landing page").` : "") +
            (feedNote.length ? `\nNote: ${feedNote.join(", ")} ha${feedNote.length > 1 ? "ve" : "s"} no text search: matched by title and tags.` : "") +
            (notes.length ? `\nSkipped: ${notes.join(" · ")}` : "") +
            (unknown.length ? `\nUnknown source: ${unknown.join(", ")}` : "") +
            `\nMore: same call with page ${page + 1}.\n${NEXT}`,
        ),
      ];
      let bufs = [];
      if (sheet) {
        bufs = await Promise.all(seen.map((it) => fetchImage(it.image).then((r) => r.buf).catch(() => Buffer.alloc(0))));
        content.push(imageBlock(await contactSheet(bufs, { cols: seen.length > 30 ? 8 : 6, tileW: seen.length > 30 ? 240 : 300, tileH: seen.length > 30 ? 180 : 225 })));
      }
      // The film shows the first few as references looked at (the whole sheet would bury the story).
      seen.slice(0, 6).forEach((it, i) => filmRecord("ref", { title: it.title, url: it.live || it.url || null, from: "refs_gallery", query: query || need || "" }, bufs[i]?.length ? bufs[i] : it.image, { tool: "refs_gallery" }));
      return blocks(content);
    }),
  );

  server.registerTool(
    "refs_sources",
    {
      title: "Reference sources and their status",
      description:
        "Lists every reference source Drip can search (id, what it returns, whether it needs a key, whether it worked this session) and the ones that were tried and cannot be used without a login. " +
        "Dribbble is searched with refs_search / refs_tag; shipped sites are opened with refs_site. Example: refs_sources({})",
      inputSchema: {},
    },
    safe(async () => {
      const rows = allProviders().map((p) => {
        const r = recent.get(p.id);
        const state = p.needsKey ? (p.id === "arena" ? (arenaToken() ? "key set" : `needs key ${p.needsKey}`) : `needs key ${p.needsKey}`) : p.status === "feed" ? "feed (no text search)" : "works";
        const seenNow = r ? (r.ok ? `, last call ok (${r.n} items)` : `, last call failed: ${r.error}`) : "";
        return `- ${p.id} — ${p.label}: ${p.kinds.join("/")} · ${state}${seenNow}`;
      });
      const blocked = NOT_USABLE.map((b) => `- ${b.id} — ${b.label}: ${b.why}`);
      return text(`Sources for refs_gallery (source: "<id>"):\n${rows.join("\n")}\n\nTried, not usable from here:\n${blocked.join("\n")}\n\nAlso: Dribbble (refs_search, refs_tag, refs_feed, refs_designer) and any shipped site (refs_site).`);
    }),
  );

  server.registerTool(
    "catalogue_rank",
    {
      title: "Rank the curated libraries for this project",
      description:
        "Ranks Drip's curated component and animation libraries by the project's stack, the design fit you need (saas, dashboard, editorial, playful, dark, motion, accessible, minimal, landing...) and quality. " +
        "Use it before components_find when you are choosing a foundation, not hunting one component. " +
        'Example: catalogue_rank({ stack: ["react", "tailwind"], fit: ["saas", "dashboard"], limit: 8 })',
      inputSchema: {
        stack: z.array(z.string()).optional().describe("react, vue, svelte, tailwind, html, motion..."),
        fit: z.array(z.string()).optional().describe("Design-fit words, e.g. editorial, dark, playful, data, accessible"),
        category: z.string().optional().describe("foundation, complex, motion, micro, blocks, charts, animation-lib, texture"),
        limit: z.number().int().min(3).max(25).optional(),
      },
    },
    safe(async ({ stack = [], fit = [], category, limit = 10 }) => {
      const ranked = rankEntries(loadEntries(), { stack, fit, category }).slice(0, limit);
      if (!ranked.length) return text("Nothing in the catalogue matches that stack and category. Loosen stack or category.", true);
      return text(
        `Ranked for ${stack.join("+") || "any stack"} / ${fit.join(", ") || "any fit"}:\n` +
          ranked.map(({ entry: e, why }, i) => `${i + 1}. ${e.name} (${e.category}) — ${e.what} ${why}. ${e.install ? `Install: ${e.install}` : e.url}`).join("\n") +
          "\n\nThen components_find for the specific component, components_get to read its code.",
      );
    }),
  );
}
