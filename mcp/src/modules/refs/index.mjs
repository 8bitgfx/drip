// Reference tools: search, browse, scan (contact sheets) and study shots.
// Every listing is numbered and comes with a contact sheet, so Claude can look at 24-48 designs
// in one image and open the good ones by number.
import { z } from "zod";
import { contactSheet, fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, remember, rememberListing, resolve } from "../../core/seen.mjs";
import { updateState } from "../../core/state.mjs";
import * as dribbble from "./dribbble.mjs";

const NEXT_STUDY =
  "Scan the sheet. Pick the 2-4 strongest (not just the prettiest: the ones that solve THIS brief well) and open them with refs_view. " +
  "Fan out with refs_tag on the tags you see in good shots and refs_designer on designers whose work fits. Aim for 8-15 studied picks across at least 3 searches.";

function toItem(card) {
  return { key: `dribbble:${card.id}`, source: "dribbble", id: card.id, title: card.title, url: card.url, image: card.image, designer: card.designer, designerUrl: card.designerUrl, likes: card.likes, views: card.views };
}

async function sheetFor(items, opts) {
  const bufs = await Promise.all(items.map((it) => fetchImage(dribbble.thumbUrl(it.image)).then((r) => r.buf).catch(() => Buffer.alloc(0))));
  return contactSheet(bufs, opts);
}

async function listingResult(kind, params, ctx, label) {
  const config = ctx.config();
  const { url, cards } = await dribbble.listing(kind, params, config);
  const fresh = cards.filter((c) => c.image);
  if (!fresh.length) return text(`No shots for ${label} (page ${params.page || 1}). Try other words, a tag (refs_tag) or a category feed (refs_feed).`);
  const items = fresh.map(toItem);
  rememberListing(items);
  updateState((st) => {
    if (st.task) {
      st.task.refs.searches += 1;
      st.task.refs.seen += items.length;
    }
  });
  const lines = items.map((it, i) => `${i + 1}. ${it.title} — ${it.designer || "?"} (@${it.designerUrl || "?"}) · ${it.likes || "?"} likes · ${it.views || "?"} views · id ${it.id}`);
  const capped = kind === "search" && (params.page || 1) >= 2;
  const content = [
    textBlock(
      `${label} — page ${params.page || 1}, ${items.length} shots (${url})\n` +
        `${lines.join("\n")}\n\n` +
        (capped ? "Note: logged-out keyword search stops after about 2 pages. Go deeper with refs_tag / refs_feed / refs_designer.\n" : `More: same call with page ${(params.page || 1) + 1}.\n`) +
        NEXT_STUDY,
    ),
  ];
  if (params.sheet !== false) content.push(imageBlock(await sheetFor(items, { cols: items.length > 30 ? 8 : 6, tileW: items.length > 30 ? 240 : 300, tileH: items.length > 30 ? 180 : 225 })));
  return blocks(content);
}

export function register(server, ctx) {
  const page = z.number().int().min(1).max(50).optional().describe("Page number, starts at 1");
  const sheet = z.boolean().optional().describe("Include the contact sheet image (default true)");
  const category = z.enum(dribbble.CATEGORIES).optional();

  server.registerTool(
    "refs_search",
    {
      title: "Search design references",
      description:
        "Search Dribbble shots by keywords. Returns a numbered list AND a contact sheet image of all results. " +
        "Write queries like a designer: subject + qualities ('fintech dashboard dark', 'pricing page minimal', 'onboarding mobile illustration'). " +
        "Run 3+ different queries per task. Logged-out search gives about 2 pages; go deeper with refs_tag, refs_feed and refs_designer.",
      inputSchema: { query: z.string(), sort: z.enum(["popular", "recent"]).optional(), category, page, sheet },
    },
    safe(async ({ query, sort, category, page, sheet }) => listingResult("search", { query, sort, category, page, sheet }, ctx, `Search "${query}"${category ? ` in ${category}` : ""}`)),
  );

  server.registerTool(
    "refs_tag",
    {
      title: "Browse a tag",
      description: "Browse Dribbble shots with a tag (e.g. 'dashboard', 'saas', 'mobile app', 'landing page'). Pages deeply (20+ pages), unlike keyword search. Numbered list + contact sheet.",
      inputSchema: { tag: z.string(), page, sheet },
    },
    safe(async ({ tag, page, sheet }) => listingResult("tag", { tag, page, sheet }, ctx, `Tag "${tag}"`)),
  );

  server.registerTool(
    "refs_feed",
    {
      title: "Browse popular or recent work",
      description: "Browse Dribbble's popular or recent feed, optionally in one category. Good for current taste and for wide exploration. Numbered list + contact sheet.",
      inputSchema: { sort: z.enum(["popular", "recent"]).optional(), category, timeframe: z.enum(["week", "month", "year", "ever"]).optional(), page, sheet },
    },
    safe(async ({ sort = "popular", category, timeframe, page, sheet }) => listingResult("feed", { sort, category, timeframe, page, sheet }, ctx, `${sort} feed${category ? ` / ${category}` : ""}`)),
  );

  server.registerTool(
    "refs_designer",
    {
      title: "Browse a designer's shots",
      description: "All shots by one designer or studio (their Dribbble username, shown as @name in listings). Use it when a designer's work fits the brief: their other shots are usually consistent.",
      inputSchema: { username: z.string(), page, sheet },
    },
    safe(async ({ username, page, sheet }) => listingResult("designer", { username: username.replace(/^@/, ""), page, sheet }, ctx, `@${username.replace(/^@/, "")}`)),
  );

  server.registerTool(
    "refs_sheet",
    {
      title: "Contact sheet of chosen shots",
      description: "A bigger contact sheet of specific shots (numbers from the last listing like '3', or ids), to compare a shortlist side by side.",
      inputSchema: { shots: z.array(z.string()).min(1).max(24) },
    },
    safe(async ({ shots }) => {
      const items = shots.map((s) => lookup(resolve(s))).filter(Boolean);
      if (!items.length) return text("None of those shots are known yet. Use numbers from the last listing or ids from a listing.", true);
      const sheetBuf = await sheetFor(items, { cols: items.length > 9 ? 4 : 3, tileW: 480, tileH: 360 });
      return blocks([textBlock(items.map((it, i) => `${i + 1}. ${it.title} — ${it.designer} · id ${it.id}`).join("\n")), imageBlock(sheetBuf)]);
    }),
  );

  server.registerTool(
    "refs_view",
    {
      title: "Study a shot full size",
      description:
        "Open one shot to study it: title, designer, tags, palette, the designer's description, stats, and the actual images full size. " +
        "Counts toward the references the plugin requires before UI is written. After looking, write down WHAT it does well (layout, type, colour, density, motion, a specific detail) — then board_add it with that note.",
      inputSchema: {
        shot: z.string().describe("Number from the last listing (e.g. '7'), or a shot id"),
        maxImages: z.number().int().min(1).max(8).optional().describe("How many of its images to return (default 3)"),
      },
    },
    safe(async ({ shot, maxImages = 3 }) => {
      const key = resolve(shot);
      const id = key.split(":")[1];
      let s;
      let degraded = "";
      try {
        s = await dribbble.shot(id, ctx.config());
      } catch (err) {
        // Shot pages are rate-limited much harder than listings. The image CDN is not, and the listing
        // already told us title, designer and image: show that instead of failing the study.
        const known = lookup(key);
        if (!known?.image) throw err;
        s = { id, url: known.url, title: known.title, designer: known.designer, designerUrl: known.designerUrl, postedOn: null, likes: known.likes, saves: null, views: known.views, tags: [], palette: [], description: "", images: [known.image], videos: [], isVideo: false };
        degraded = `\n(Details unavailable: ${String(err.message).includes("429") ? "Dribbble rate-limited the shot page" : "shot page failed"}; showing the cover image from the listing. Space out refs_view calls.)`;
      }
      remember({ key, source: "dribbble", id: s.id, title: s.title, url: s.url, image: s.images[0] || lookup(key)?.image, designer: s.designer, designerUrl: s.designerUrl, tags: s.tags, palette: s.palette });
      updateState((st) => {
        if (st.task && !st.task.refs.viewed.includes(key)) st.task.refs.viewed.push(key);
      });
      const imgs = [];
      for (const url of s.images.slice(0, maxImages)) {
        try {
          const { buf } = await fetchImage(dribbble.fullUrl(url));
          imgs.push(imageBlock(await toJpeg(buf, 1400, 1800)));
        } catch {
          /* skip broken image */
        }
      }
      const info =
        `${s.title} — ${s.designer} (@${s.designerUrl})  ${s.url}\n` +
        `Posted ${s.postedOn || "?"} · ${s.likes ?? "?"} likes · ${s.saves ?? "?"} saves · ${s.views ?? "?"} views\n` +
        `Palette: ${s.palette.join(" ") || "—"}\n` +
        `Tags: ${s.tags.join(", ") || "—"}\n` +
        `Images: ${s.images.length} (showing ${imgs.length})${s.videos.length ? ` · ${s.videos.length} video(s), still frame shown` : ""}\n` +
        (s.description ? `\nDesigner's notes:\n${s.description.slice(0, 1500)}\n` : "") +
        `\nStudy it, then board_add("${s.id}", note: what exactly to take from it). More from this designer: refs_designer("${s.designerUrl}"). Related: refs_tag on a tag above.${degraded}`;
      return blocks([textBlock(info), ...imgs]);
    }),
  );

  server.registerTool(
    "refs_related",
    {
      title: "Related tags for a query",
      description: "Finds the tags designers use on the top shots for a query, ranked. Use them with refs_tag to go deeper than keyword search allows.",
      inputSchema: { query: z.string(), sample: z.number().int().min(2).max(10).optional().describe("How many top shots to read (default 5)") },
    },
    safe(async ({ query, sample = 5 }) => {
      const config = ctx.config();
      const { cards } = await dribbble.listing("search", { query, page: 1 }, config);
      const counts = new Map();
      for (const c of cards.slice(0, sample)) {
        try {
          const s = await dribbble.shot(c.id, config);
          for (const t of s.tags) counts.set(t.trim().toLowerCase(), (counts.get(t.trim().toLowerCase()) || 0) + 1);
        } catch {
          /* skip */
        }
      }
      const ranked = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 30);
      return text(`Tags on the top ${sample} shots for "${query}":\n${ranked.map(([t, n]) => `${t} (${n})`).join(", ")}\n\nBrowse any of them with refs_tag.`);
    }),
  );
}
