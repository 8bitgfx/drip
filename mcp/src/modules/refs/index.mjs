// Reference tools: search, browse, scan (contact sheets) and study shots.
// Every listing is numbered and comes with a contact sheet, so Claude can look at 24-48 designs
// in one image and open the good ones by number.
import { Jimp } from "jimp";
import { z } from "zod";
import { loadBoard, saveBoard } from "../board/store.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, remember, rememberListing, resolve } from "../../core/seen.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import * as dribbble from "./dribbble.mjs";

const NEXT_STUDY =
  "NEXT: don't stop at the sheet. refs_pick the 2-5 numbers that solve THIS brief best (one reason each; not just the prettiest), " +
  "then for each: refs_view (full size) -> refs_zoom on the detail that matters -> refs_study (structured notes). " +
  "Fan out with refs_tag on tags you see in good shots and refs_designer on designers whose work fits. Target: 6-12 studied from 3+ designers.";

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
      remember({ key, source: "dribbble", id: s.id, title: s.title, url: s.url, image: s.images[0] || lookup(key)?.image, images: s.images, designer: s.designer || lookup(key)?.designer, designerUrl: s.designerUrl, tags: s.tags, palette: s.palette });
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
        `\nNEXT: look closely (refs_zoom on a region, e.g. the nav, a card, the type), then refs_study("${s.id}", …) with specific values. More from this designer: refs_designer("${s.designerUrl}"). Related: refs_tag on a tag above.${degraded}`;
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

  server.registerTool(
    "refs_pick",
    {
      title: "Shortlist references to study",
      description:
        "Pick the shots from the last sheet worth studying, each with the reason it fits THIS brief. Picking is how you commit to looking closer instead of skimming. " +
        'Example: refs_pick({ picks: [{ shot: "7", why: "type-led hero at huge scale, no imagery: fits the bold editorial feel" }, { shot: "19", why: "only one using motion trails as structure" }] })',
      inputSchema: { picks: z.array(z.object({ shot: z.string(), why: z.string().min(12) })).min(1).max(12) },
    },
    safe(async ({ picks }) => {
      const done = [];
      const unknown = [];
      for (const p of picks) {
        const key = resolve(p.shot);
        const item = lookup(key);
        if (!item) {
          unknown.push(p.shot);
          continue;
        }
        remember({ ...item, pickedWhy: p.why });
        done.push(`${item.title} — ${item.designer} (${key})`);
        updateState((st) => {
          if (st.task && !st.task.refs.picked.includes(key)) st.task.refs.picked.push(key);
        });
      }
      return text(`Picked ${done.length}:\n- ${done.join("\n- ")}${unknown.length ? `\nUnknown (not in a listing): ${unknown.join(", ")}` : ""}\n\nNEXT: refs_view each, refs_zoom where the detail matters, then refs_study.`);
    }),
  );

  const REGIONS = { top: [0, 0, 100, 40], middle: [0, 30, 100, 40], bottom: [0, 60, 100, 40], left: [0, 0, 50, 100], right: [50, 0, 50, 100], center: [20, 20, 60, 60], "top-left": [0, 0, 55, 55], "top-right": [45, 0, 55, 55], "bottom-left": [0, 45, 55, 55], "bottom-right": [45, 45, 55, 55] };

  server.registerTool(
    "refs_zoom",
    {
      title: "Zoom into part of a reference",
      description:
        "Crop a region of a shot at high resolution to study details: the nav, a pricing card, the type, an icon, a chart. Use it on every picked shot for the part that matters. " +
        'Region: a name (top, middle, bottom, left, right, center, top-left, top-right, bottom-left, bottom-right) or percentages {x,y,w,h}. Example: refs_zoom({ shot: "7", region: "top-left" })',
      inputSchema: {
        shot: z.string(),
        region: z.union([z.enum(Object.keys(REGIONS)), z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })]),
        image: z.number().int().min(1).max(8).optional().describe("Which of the shot's images (default 1)"),
      },
    },
    safe(async ({ shot, region, image = 1 }) => {
      const key = resolve(shot);
      let item = lookup(key);
      let images = item?.images;
      if (!images?.length) {
        try {
          const s = await dribbble.shot(key.split(":")[1], ctx.config());
          images = s.images;
          remember({ ...(item || {}), key, images });
        } catch {
          images = item?.image ? [item.image] : [];
        }
      }
      const src = images?.[image - 1] || item?.image;
      if (!src) return text("No image for that shot. List it first (refs_search / refs_tag) or refs_view it.", true);
      const { buf } = await fetchImage(item?.source === "dribbble" || key.startsWith("dribbble:") ? dribbble.fullUrl(src, 2000) : src);
      const img = await Jimp.read(buf);
      const [x, y, w, h] = Array.isArray(region) ? region : typeof region === "string" ? REGIONS[region] : [region.x, region.y, region.w, region.h];
      const px = (v, total) => Math.max(0, Math.min(total, Math.round((v / 100) * total)));
      img.crop({ x: px(x, img.width), y: px(y, img.height), w: Math.max(8, px(w, img.width)), h: Math.max(8, px(h, img.height)) });
      return blocks([textBlock(`Zoom ${typeof region === "string" ? region : JSON.stringify(region)} of ${item?.title || key} (image ${image}).`), imageBlock(await toJpeg(await img.getBuffer("image/png"), 1400, 1400, 88))]);
    }),
  );

  const VAGUE = /^(clean|modern|nice|good|great|minimal|sleek|cool|beautiful|simple|bold|elegant)\.?$/i;
  const CONCRETE = /(\d|#[0-9a-f]{3,6}\b|px|%|ratio|col|grid|serif|sans|mono|weight|caps|uppercase|lowercase|italic|leading|tracking)/i;

  server.registerTool(
    "refs_study",
    {
      title: "Record what a reference teaches",
      description:
        "Structured study notes for a reference you viewed (refs_view). Each field needs specifics: sizes, ratios, counts, hex values, named fonts or classes. Vague words are rejected. " +
        "Counts toward the references the plugin requires, and goes on the moodboard automatically (now, or when you board_create). " +
        'Example: refs_study({ shot: "7", layout: "12-col, headline spans cols 1-9 at ~180px, image bleeds off right edge", type: "condensed grotesk caps, display:body ~10:1, tight -2% tracking", color: "#0E0E0E ground, one acid #D4FF3A accent on CTA only (<3%)", density: "~25 words above fold, 3 sections per screen-height", detail: "nav items numbered 01-04 in mono, aligned to the grid baseline", take: "the 10:1 type ratio and single acid accent", leave: "the stock 3D render" })',
      inputSchema: {
        shot: z.string(),
        layout: z.string(),
        type: z.string(),
        color: z.string(),
        density: z.string(),
        detail: z.string().describe("ONE specific move worth stealing"),
        take: z.string().describe("What this reference lends the design"),
        leave: z.string().describe("What not to copy / Dribbble fiction"),
        motion: z.string().optional(),
      },
    },
    safe(async (n) => {
      const key = resolve(n.shot);
      const item = lookup(key);
      if (!item) return text("Unknown shot. Use a number from the last listing or an id.", true);
      const st0 = loadState();
      if (st0.task && !st0.task.refs.viewed.includes(key)) return text(`Look at it first: refs_view("${n.shot}") (and refs_zoom on its key detail). Studying from a thumbnail doesn't count.`, true);
      const fields = ["layout", "type", "color", "density", "detail", "take", "leave"];
      const weak = fields.filter((f) => !n[f] || n[f].trim().length < 12 || VAGUE.test(n[f].trim()));
      const concrete = fields.filter((f) => CONCRETE.test(n[f] || "")).length;
      if (weak.length || concrete < 3)
        return text(`Too vague to count. ${weak.length ? `Rewrite: ${weak.join(", ")}. ` : ""}${concrete < 3 ? "Give at least 3 fields concrete values (sizes, ratios, hex, counts, named type classes). " : ""}Look again with refs_zoom if needed.`, true);
      const note = `${n.take} · layout: ${n.layout} · type: ${n.type} · colour: ${n.color} · density: ${n.density} · detail: ${n.detail} · leave: ${n.leave}`;
      remember({ ...item, study: { ...n, at: new Date().toISOString() } });
      const st = updateState((s) => {
        if (!s.task) return;
        s.task.refs.studied = (s.task.refs.studied || []).filter((x) => x.key !== key);
        s.task.refs.studied.push({ key, designer: item.designer || item.designerUrl, at: new Date().toISOString() });
      });
      let boardNote = "It will be added to the moodboard when you board_create.";
      const bid = st.task?.board?.id;
      if (bid) {
        const board = loadBoard(bid);
        if (board) {
          const existing = board.items.find((x) => x.key === key);
          if (existing) Object.assign(existing, { note, study: n });
          else board.items.push({ ...item, kind: "shot", note, study: n, addedAt: new Date().toISOString() });
          saveBoard(board);
          boardNote = `Added to board "${board.name}".`;
        }
      }
      const t = st.task;
      const count = t ? `${t.refs.studied.length} studied from ${new Set(t.refs.studied.map((x) => x.designer)).size} designers.` : "";
      return text(`Studied: ${item.title} — ${item.designer}. ${boardNote} ${count}`);
    }),
  );
}
