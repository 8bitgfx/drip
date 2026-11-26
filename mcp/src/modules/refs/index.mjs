// Reference tools: search, browse, scan (contact sheets) and study shots.
// Every listing is numbered and comes with a contact sheet, so Claude can look at 24-48 designs
// in one image and open the good ones by number.
import { Jimp } from "jimp";
import { z } from "zod";
import { addItem, loadBoard, makeProvenance, updateBoard } from "../board/store.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, remember, rememberListing, resolve, siteKey } from "../../core/seen.mjs";
import fs from "node:fs";
import path from "node:path";
import { capture, formatAudit, formatBrand } from "../../core/cdp.mjs";
import { rendersDir, stamp } from "../../core/render.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import * as dribbble from "./dribbble.mjs";
import { hostOf, mixNote } from "../inspire/contract.mjs";

const NEXT_STUDY =
  "NEXT: the sheet is only for choosing. refs_pick the 2-5 that solve THIS brief best (use the tagged numbers, e.g. \"L3-7\"; one reason each), " +
  "then refs_view each: the ORIGINAL full-size images, every section of the page; study the whole design, then refs_study with values and a role (style, competitor, page). " +
  "refs_zoom is optional, for one small detail. Fan out with refs_tag and refs_designer. Target: 6-12 studied from 3+ designers, most of them real examples of what you're building.";

// Pages that are almost never good design references: docs, wikis, package registries, repo pages.
const DULL_SITE = /(^|\/\/|\.)(docs?|developer|developers|wiki|api|reference|readthedocs|gitbook|mintlify)\.|readthedocs\.io|gitbook\.io|github\.com|gitlab\.com|npmjs\.com|pypi\.org|wikipedia\.org|\/docs?(\/|$)/i;

/** A study is a TASTE reference (galleries, Dribbble: ideas, ambition) or a REALITY reference (a shipped site, measured: real sizes). */
export const passOf = (key) => (String(key).startsWith("site:") ? "reality" : "taste");

/** Does this reference show the kind of thing being built (a page, a screen), not print or objects? */
export function onSurface(item) {
  const hay = `${item.title || ""} ${(item.tags || []).join(" ")} ${item.from?.category || ""} ${item.from?.query || ""} ${item.from?.tag || ""}`.toLowerCase();
  return /\b(web|website|landing|hero|homepage|home page|site|portfolio|saas|dashboard|app|ui|ux|interface|product design|mobile|screen|page)\b/.test(hay) && !/\b(print|poster|packaging|book|editorial print|label|logo only|illustration)\b/.test(`${item.from?.category || ""}`);
}

function toItem(card) {
  return { key: `dribbble:${card.id}`, source: "dribbble", id: card.id, title: card.title, url: card.url, image: card.image, designer: card.designer, designerUrl: card.designerUrl, likes: card.likes, views: card.views };
}

async function sheetFor(items, opts) {
  // Thumbnails come from Dribbble's CDN, fetched in parallel (core/http pools them).
  const bufs = await Promise.all(items.map((it) => fetchImage(dribbble.thumbUrl(it.image)).then((r) => r.buf).catch(() => Buffer.alloc(0))));
  return contactSheet(bufs, opts);
}

async function listingResult(kind, params, ctx, label) {
  const config = ctx.config();
  let { url, cards } = await dribbble.listing(kind, params, config);
  // Category-filtered searches often return nothing for multi-word queries; retry without the filter.
  if (kind === "search" && params.category && !cards.some((c) => c.image)) {
    ({ url, cards } = await dribbble.listing(kind, { ...params, category: undefined }, config));
    label = `${label} (no results in ${params.category}; showing all categories)`;
  }
  let fresh = cards.filter((c) => c.image);
  // Searches and tags mix studio work with 5-like practice shots, and the sheet shows them the same size.
  // Keep the shots people actually liked, when enough are left.
  const minLikes = params.minLikes ?? (kind === "search" || kind === "tag" ? 25 : 0);
  const liked = fresh.filter((c) => (c.likes ?? 0) >= minLikes);
  const lowDropped = minLikes && liked.length >= 10 ? fresh.length - liked.length : 0;
  if (lowDropped) fresh = liked;
  if (!fresh.length) return text(`No shots for ${label} (page ${params.page || 1}). Try other words, a tag (refs_tag) or a category feed (refs_feed).`);
  const items = fresh.map(toItem);
  const tag = rememberListing(items, { kind, query: params.query || params.username || "", tag: params.tag || "", category: params.category || "" });
  updateState((st) => {
    if (st.task) {
      st.task.refs.searches += 1;
      st.task.refs.seen += items.length;
    }
  });
  const lines = items.map((it, i) => `${tag}-${i + 1}. ${it.title} — ${it.designer || "?"} (@${it.designerUrl || "?"}) · ${it.likes || "?"} likes · ${it.views || "?"} views · id ${it.id}`);
  const capped = kind === "search" && (params.page || 1) >= 2;
  const content = [
    textBlock(
      `Listing ${tag}: ${label} — page ${params.page || 1}, ${items.length} shots (${url}). Sheet numbers = ${tag}-<n>.\n` +
        (lowDropped ? `Left out ${lowDropped} shots with under ${minLikes} likes (minLikes: 0 shows them).\n` : "") +
        (kind === "search" && mixNote(params.query) ? `${mixNote(params.query)}\n` : "") +
        `${lines.join("\n")}\n\n` +
        (capped ? "Note: logged-out keyword search stops after about 2 pages. Go deeper with refs_tag / refs_feed / refs_designer.\n" : `More: same call with page ${(params.page || 1) + 1}.\n`) +
        NEXT_STUDY,
    ),
  ];
  if (params.sheet !== false) content.push(imageBlock(await sheetFor(items, { cols: items.length > 30 ? 8 : 6, tileW: items.length > 30 ? 240 : 300, tileH: items.length > 30 ? 180 : 225 })));
  return blocks(content);
}

const SITE_MEMO = new Map();

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
      title: "View the originals of 1-4 shots",
      description:
        "Open the ORIGINALS of 1-4 shots at once (viewing counts as picking): title, designer, tags, palette, notes, and the images at full width; long pages are split into readable top-to-bottom sections. " +
        "Then refs_study them (several in one call). Example: refs_view({ shots: [\"L3-7\", \"L3-12\", \"L4-2\"] })",
      inputSchema: {
        shots: z.array(z.string()).min(1).max(4).optional().describe("Tagged numbers (e.g. 'L3-7') or shot ids"),
        shot: z.string().optional().describe("A single shot (same as shots: [shot])"),
        maxImages: z.number().int().min(1).max(8).optional().describe("Images per shot (default 2 for one shot, 1 each for several)"),
        full: z.boolean().optional().describe("Every image separately at full width (to read small details). Default: several images come back as ONE numbered sheet"),
      },
    },
    safe(async ({ shots, shot, maxImages, full }) => {
      const list = shots?.length ? shots : shot ? [shot] : [];
      if (!list.length) return text("Pass shots: [\"L3-7\", …] (or shot).", true);
      const per = maxImages || (list.length === 1 ? 2 : 1);
      const out = [];
      // Shot pages still queue 2 s apart (Dribbble rate limits); image downloads and resizing overlap that wait.
      const views = await Promise.all(list.map((one) => viewOne(one, per).catch((err) => ({ info: `${one}: ${err.message}`, imgs: [] }))));
      const all = views.flatMap((r) => r.imgs);
      if (full || all.length <= 1) for (const r of views) out.push(textBlock(r.info), ...r.imgs);
      else {
        // One image for the whole call: the pictures numbered in order, shot by shot.
        let n = 0;
        for (const r of views) out.push(textBlock(`${r.info}
(sheet tiles ${r.imgs.length ? `${n + 1}-${(n += r.imgs.length)}` : "none"})`));
        const cols = all.length <= 4 ? 2 : 3;
        out.push(imageBlock(await contactSheet(all.map((b) => Buffer.from(b.data, "base64")), { cols, tileW: Math.floor(1540 / cols), tileH: Math.floor(1540 / cols * 0.75), fit: "contain", gap: 6 })));
      }
      if (list.length > 1) out.push(textBlock(`NEXT: refs_study (with role: "competitor", "page", "style" or "before") all ${list.length} in one call: refs_study({ studies: [{ shot, layout, type, color, density, detail, take, leave }, …] }).`));
      return blocks(out);
    }),
  );

  async function viewOne(shot, maxImages) {
    {
      const key = resolve(shot);
      if (key.startsWith("site:")) return { info: `${shot}: a shipped site; open it with refs_site (already counts as viewed once it has been).`, imgs: [] };
      const id = key.split(":")[1];
      let s;
      let degraded = "";
      const listed = lookup(key);
      const foreign = listed?.source && listed.source !== "dribbble"; // a gallery source (refs_gallery): no Dribbble page to open
      if (foreign) s = { id, url: listed.url, title: listed.title, designer: listed.designer || listed.author, designerUrl: listed.designerUrl, likes: null, saves: null, views: null, tags: listed.tags || [], palette: [], description: "", images: listed.images?.length ? listed.images : [listed.image].filter(Boolean), videos: [], isVideo: false };
      else try {
        s = await dribbble.shot(id, ctx.config());
      } catch (err) {
        // Shot pages are rate-limited much harder than listings. The image CDN is not, and the listing
        // already told us title, designer and image: show that instead of failing the study.
        const known = lookup(key);
        if (!known?.image) throw err;
        s = { id, url: known.url, title: known.title, designer: known.designer, designerUrl: known.designerUrl, postedOn: null, likes: known.likes, saves: null, views: known.views, tags: [], palette: [], description: "", images: [known.image], videos: [], isVideo: false };
        degraded = `\n(Details unavailable: ${String(err.message).includes("429") ? "Dribbble rate-limited the shot page" : "shot page failed"}; showing the cover image from the listing. Space out refs_view calls.)`;
      }
      remember({ key, source: foreign ? listed.source : "dribbble", id: s.id, title: s.title, url: s.url, image: s.images[0] || lookup(key)?.image, images: s.images, designer: s.designer || lookup(key)?.designer, designerUrl: s.designerUrl, tags: s.tags, palette: s.palette });
      updateState((st) => {
        if (st.task && !st.task.refs.viewed.includes(key)) st.task.refs.viewed.push(key);
        if (st.task && !st.task.refs.picked.includes(key)) st.task.refs.picked.push(key);
      });
      // Originals at 1600px wide. Tall images (full landing pages) are cut into ~4:3 sections so each one is
      // readable at full width instead of being shrunk to fit one tile. At most 8 images in total.
      const imgs = [];
      const fetched = await Promise.all(s.images.slice(0, maxImages).map((url) => fetchImage(foreign ? url : dribbble.fullUrl(url, 1600)).catch(() => null)));
      for (const f of fetched) {
        if (!f || imgs.length >= 8) continue;
        const { buf, mime } = f;
        try {
          const img = await Jimp.read(buf);
          const sectionH = Math.round(img.width * 0.8);
          if (img.height > img.width * 1.6) {
            const parts = Math.min(4, Math.ceil(img.height / sectionH));
            for (let p = 0; p < parts && imgs.length < 8; p++) {
              const y = Math.round((p * (img.height - sectionH)) / Math.max(1, parts - 1));
              const piece = img.clone().crop({ x: 0, y, w: img.width, h: Math.min(sectionH, img.height - y) });
              if (piece.width > 1600) piece.resize({ w: 1600, h: Math.round((piece.height * 1600) / piece.width) });
              imgs.push(imageBlock(await piece.getBuffer("image/jpeg", { quality: 84 })));
            }
          } else if (/^image\/(jpeg|png|webp|gif)$/.test(mime) && img.width <= 1600 && img.height <= 1600) imgs.push(imageBlock(buf, mime));
          else imgs.push(imageBlock(await toJpeg(buf, 1600, 1600, 86)));
        } catch {
          /* skip broken image */
        }
      }
      const info =
        `${s.title} — ${s.designer} (@${s.designerUrl})  ${s.url}\n` +
        `Posted ${s.postedOn || "?"} · ${s.likes ?? "?"} likes · ${s.saves ?? "?"} saves · ${s.views ?? "?"} views\n` +
        `Palette: ${s.palette.join(" ") || "—"}\n` +
        `Tags: ${s.tags.join(", ") || "—"}\n` +
        `Images: ${s.images.length} originals (showing ${imgs.length} pictures; tall pages split into top-to-bottom sections)${s.videos.length ? ` · ${s.videos.length} video(s), still frame shown` : ""}\n` +
        (s.description ? `\nDesigner's notes:\n${s.description.slice(0, 1500)}\n` : "") +
        `Study the whole design (every section), then refs_study with values and a role (style, competitor, page). More from this designer: refs_designer("${s.designerUrl}").${degraded}`;
      return { info, imgs };
    }
  }

  server.registerTool(
    "refs_site",
    {
      title: "Study shipped sites",
      description:
        "Opens 1-4 real, shipped websites in a headless browser and shows their first screens at 1440x900 on ONE numbered sheet (a row per site, like refs_gallery; the numbers work in refs_pick, refs_view, refs_study), with MEASURED facts: h1, h2 and body px, the number of sizes, families, the biggest picture in the first screen. " +
        "The REALITY pass: real type sizes, real density, at real scale. Take the idea from galleries and Dribbble (refs_gallery, refs_tag), the sizes from here. Pick sites known for their design, in the category or a notch above it; never docs, wikis or GitHub pages. " +
        "Waits for app content to load (network idle) and warns when the shot still shows skeletons. Also reads each site's brand as shipped: logo (img src or inline SVG), fonts, colours. " +
        "For a REDESIGN, pass the current site with before: true first: it becomes the 'before' and its logo, fonts and colours go into the brief. " +
        "Counts as viewed and as a real example of the surface; then refs_study them (shot = the url). Example: refs_site({ urls: [\"https://linear.app\", \"https://www.figma.com\"] })",
      inputSchema: {
        urls: z.array(z.string()).min(1).max(4),
        screens: z.number().int().min(1).max(4).optional().describe("Screens per site from the top (default 2)"),
        before: z.boolean().optional().describe("The first url is the client's current site (redesign): saved as the 'before', its brand recorded on the task"),
      },
    },
    safe(async ({ urls, screens = 2, before = false }) => {
      const config = ctx.config();
      const surface = loadState().task?.surface;
      const dull = before ? [] : urls.filter((u) => DULL_SITE.test(u) && !(surface === "readme" && /github\.com/i.test(u)));
      if (dull.length)
        return text(
          `Not references: ${dull.join(", ")}. Docs, wikis, package pages and GitHub repos show what a default looks like, not what good looks like. ` +
            "For taste use refs_gallery (Awwwards, Godly, One Page Love, Minimal Gallery…) or refs_tag on Dribbble; for real sizes use 2 shipped product or brand sites that are known for their design.",
          true,
        );
      const dir = rendersDir(`sites-${stamp()}`);
      const results = await Promise.all(
        urls.map(async (raw) => {
          const url = /^https?:/i.test(raw) ? raw : `https://${raw}`;
          try {
            // Shipped sites don't change within a session: repeat calls are instant.
            const memo = `${url}|${screens}`;
            const hit = SITE_MEMO.get(memo);
            const r = hit && Date.now() - hit.at < 30 * 60000 ? hit.r : await capture(url, { width: 1440, height: 900, maxSlices: screens, idle: true, brand: true, slicing: "top", config });
            if (r.blocked) throw new Error(`${url} answered with a bot check ("${r.blocked}"), not the page: it can't be a reference. Pick another site.`);
            SITE_MEMO.set(memo, { r, at: Date.now() });
            const key = siteKey(url);
            const slug = key.slice(5).replace(/[^a-z0-9]+/gi, "-");
            const files = r.slices.map((sl, i) => {
              const f = path.join(dir, `${slug}-${i + 1}.jpg`);
              fs.writeFileSync(f, sl.buf);
              return f;
            });
            const host = key.slice(5).split("/")[0];
            remember({ key, source: "site", id: host, title: r.audit.title || host, url, image: files[0], images: files, designer: host, designerUrl: host, tags: ["website"], from: { category: "web-design" } });
            updateState((st) => {
              if (st.task && !st.task.refs.viewed.includes(key)) st.task.refs.viewed.push(key);
              if (st.task && !st.task.refs.picked.includes(key)) st.task.refs.picked.push(key);
            });
            return { ok: true, url, key, audit: r.audit, slices: r.slices, total: r.sliceCount };
          } catch (err) {
            return { ok: false, url, err: String(err.message || err) };
          }
        }),
      );
      const out = [];
      const ok = results.filter((r) => r.ok);
      // A numbered listing, like refs_gallery: the numbers work in refs_pick, refs_view, refs_study and board_add.
      const tag = ok.length ? rememberListing(ok.map((r) => lookup(r.key)).filter(Boolean), { kind: "site", query: "", tag: "sites", category: "web-design" }) : null;
      for (const r of results) {
        if (!r.ok) {
          out.push(textBlock(`${r.url}: could not open (${r.err}).`));
          continue;
        }
        const n = ok.indexOf(r) + 1;
        out.push(textBlock(`=== ${tag}-${n}. ${r.audit.title || r.url} (${r.url}) · ${r.slices.length} of ${r.total} screens${before && r === results[0] ? " · THE BEFORE" : ""}\n${formatAudit(r.audit, { blockers: [], warnings: [] })}\n${formatBrand(r.audit.brand)}`));
      }
      // ONE sheet for every site, one row each (its first screens side by side), numbered like a gallery listing. Every
      // image stays in the director's context for the whole task; the full screens are on disk for refs_view / refs_zoom.
      if (ok.length) {
        const cols = Math.max(...ok.map((r) => r.slices.length), 1);
        const tileW = Math.min(480, Math.floor(1000 / cols));
        const tiles = [];
        const labels = [];
        ok.forEach((r, i) => {
          for (let c = 0; c < cols; c++) {
            tiles.push(r.slices[c]?.buf || Buffer.alloc(0));
            labels.push(c === 0 ? i + 1 : null);
          }
        });
        out.push(textBlock(`Sheet ${tag}: one row per site, its screens left to right from the top (${ok.map((r, i) => `${i + 1} ${hostOf(r.url)}`).join(", ")}).`));
        out.push(imageBlock(await contactSheet(tiles, { cols, tileW, tileH: Math.round(tileW * 0.625), labels, fit: "contain", gap: 6 })));
      }
      if (before && results[0]?.ok) {
        const b = results[0];
        updateState((st) => {
          if (st.task) st.task.before = { url: b.url, files: b.slices.length, brand: b.audit.brand, at: new Date().toISOString() };
        });
        const logo = b.audit.brand?.logos?.[0];
        out.push(textBlock(`Recorded ${b.url} as the BEFORE (the critic compares against it). Keep what the brand owns: ${logo ? (logo.kind === "img" ? `save the logo with images_save({ url: "${logo.src}", out: "public/logo${/\.svg/i.test(logo.src) ? ".svg" : ".png"}" })` : "the logo is inline SVG: copy it from the page source") : "no logo found in the header; ask the user for the file"}, its fonts (${b.audit.brand?.fonts?.join(", ") || "?"}) unless the user wants new ones.`));
      }
      if (ok.length)
        out.push(
          textBlock(
            `NEXT: refs_study ${ok.length > 1 ? `the ones that fit, all in one call` : "it"} with the measured numbers (shot = ${ok.map((r, i) => `"${tag}-${i + 1}"`).join(", ")}; refs_view one for its screens full size): ` +
              "the hero's h1 px and column span, the picture's share of the first screen, what each section shows. Note what is bigger and emptier than you would dare.",
          ),
        );
      return blocks(out);
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
      const item = lookup(key);
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
  const STUDY_EXAMPLE = {
    layout: '"12-col, headline spans cols 1-8, picture bleeds right at 55% width"',
    type: '"condensed grotesk caps ~140px, body 18px, ratio ~8:1"',
    color: '"#F3EFE6 ground, #141414 ink, one #2340FF accent on the CTA only"',
    density: '"~30 words above the fold, 1 section per screen"',
    detail: '"nav in the body face at 15px, aligned to the h1 baseline"',
    take: '"the 8:1 type ratio and the single accent"',
    leave: '"the stock 3D render and the tracked caps labels"',
  };
  const CONCRETE = /(\d|#[0-9a-f]{3,6}\b|px|%|ratio|col|grid|serif|sans|mono|weight|caps|uppercase|lowercase|italic|leading|tracking)/i;

  server.registerTool(
    "refs_study",
    {
      title: "Record what a reference teaches",
      description:
        "Structured study notes for a reference you viewed (refs_view). Each field needs specifics: sizes, ratios, counts, hex values, named fonts or classes. Vague words are rejected. " +
        "Counts toward the references the plugin requires, and goes on the moodboard automatically (now, or when you board_create). " +
        'Study several in ONE call: refs_study({ studies: [{ shot: "L3-7", layout: "centred 2-line headline ~56px over a product dashboard mockup 1100px wide that bleeds off the bottom, logo strip between", type: "crisp grotesk 500, display:body ~3.5:1, 15px nav", color: "near-black #08090C ground, a soft blue radial glow behind the mockup, white pill CTA", density: "~25 words above fold", detail: "nav links in the body face, aligned to the headline baseline", take: "the 10:1 type ratio", leave: "the stock 3D render", fits: "the same kind of product (a sales CRM) for the same buyers, and the calm dark look the user asked for" }, …] })',
      inputSchema: {
        studies: z.array(z.object(STUDY_SHAPE)).min(1).max(8).optional(),
        ...Object.fromEntries(Object.entries(STUDY_SHAPE).map(([k, v]) => [k, v.optional()])),
      },
    },
    safe(async (args) => {
      const list = args.studies?.length ? args.studies : args.shot ? [args] : [];
      if (!list.length) return text("Pass studies: [{ shot, layout, type, color, density, detail, take, leave, fits }, …].", true);
      const lines = [];
      let bad = 0;
      for (const n of list) {
        const r = await studyOne(n);
        if (!r.ok) bad++;
        lines.push(`${r.ok ? "✓" : "✗"} ${r.msg}`);
      }
      const t = loadState().task;
      const count = t ? `\n${t.refs.studied.length} studied from ${new Set(t.refs.studied.map((x) => x.designer)).size} designers (${t.refs.studied.filter((x) => x.onSurface).length} real examples of the surface).` : "";
      return text(lines.join("\n") + count, bad === list.length);
    }),
  );

  async function studyOne(n) {
    {
      const key = resolve(n.shot);
      const item = lookup(key);
      if (!item) return { ok: false, msg: `${n.shot}: unknown shot. Use a tagged number (L3-7) or an id.` };
      const st0 = loadState();
      if (st0.task && !st0.task.refs.viewed.includes(key)) return { ok: false, msg: `${n.shot}: look at it first with refs_view. Studying from a thumbnail doesn't count.` };
      const fields = ["layout", "type", "color", "density", "detail", "take", "leave"];
      const weak = fields.filter((f) => !n[f] || n[f].trim().length < 12 || VAGUE.test(n[f].trim()));
      const concrete = fields.filter((f) => CONCRETE.test(n[f] || "")).length;
      if (weak.length || concrete < 3)
        return {
          ok: false,
          msg:
            `${n.shot}: too vague. ` +
            weak.map((f) => `${f}: ${!n[f] ? "missing" : VAGUE.test(n[f].trim()) ? `"${n[f].trim()}" is a vibe, not a fact` : `"${n[f].trim()}" is too short (min 12 chars)`}; e.g. ${STUDY_EXAMPLE[f]}`).join(" · ") +
            (concrete < 3 ? `${weak.length ? " · " : ""}only ${concrete} field(s) have a number, hex, px, ratio or named type class; give at least 3 (e.g. density: ${STUDY_EXAMPLE.density})` : ""),
        };
      // A reference the build will follow closely needs the reason it fits, in words the user can check.
      if (n.role !== "before" && (!n.fits || n.fits.trim().length < 15 || VAGUE.test(n.fits.trim())))
        return { ok: false, msg: `${n.shot}: fits: say why this reference fits this brief (the same kind of product, the audience, the look asked for, a layout that suits the content), in a sentence. The build follows it closely and the user sees why.` };
      const note = `${n.take} · layout: ${n.layout} · type: ${n.type} · colour: ${n.color} · density: ${n.density} · detail: ${n.detail} · leave: ${n.leave}`;
      const surface = st0.task?.surface;
      const studyRec = { ...n, at: new Date().toISOString(), surface, onSurface: onSurface(item), pass: passOf(key), role: n.role };
      remember({ ...item, study: studyRec });
      const st = updateState((s) => {
        if (!s.task) return;
        s.task.refs.studied = (s.task.refs.studied || []).filter((x) => x.key !== key);
        // terms: what the reference is about (title, address, notes), so the competitor gate can tell whether it is the same product type.
        const terms = [item.title, item.url, item.designer, n.take, n.layout].filter(Boolean).join(" ").slice(0, 600);
        // take and motion travel on: builders get what was taken from where, the critic how the page is meant to behave.
        s.task.refs.studied.push({ key, role: n.role, pass: passOf(key), designer: item.designer || item.designerUrl, onSurface: onSurface(item), terms, take: String(n.take).slice(0, 240), motion: n.motion ? String(n.motion).slice(0, 240) : undefined, fits: n.fits ? String(n.fits).slice(0, 240) : undefined, layout: String(n.layout).slice(0, 300), detail: String(n.detail).slice(0, 200), type: String(n.type).slice(0, 160), color: String(n.color).slice(0, 160), image: item.images?.[0] || item.image || undefined, source: item.url || item.title || key, at: new Date().toISOString() });
      });
      let boardNote = "It will be added to the moodboard when you board_create.";
      const bid = st.task?.board?.id;
      if (bid) {
        const board = loadBoard(bid);
        if (board) {
          // Same source again refreshes its study (the user's stars and notes stay); a new one is added with its provenance.
          updateBoard(
            bid,
            (b) => {
              const existing = b.items.find((x) => x.key === key);
              if (existing) Object.assign(existing, { note, study: studyRec });
              else addItem(b, { ...item, kind: "shot", note, study: studyRec }, { provenance: makeProvenance({ source: "reference", label: item.designer || item.title || "", url: item.url || item.image || null, by: { task: st.task?.id || null } }), status: "inspiration" });
            },
            { op: "study", summary: item.title || key },
          );
          boardNote = `Added to board "${board.name}".`;
        }
      }
      return { ok: true, msg: `${item.title} — ${item.designer}. ${boardNote}` };
    }
  }
}

const STUDY_SHAPE = {
  shot: z.string(),
  role: z.enum(["style", "competitor", "page", "before"]).describe("Why it's here: style = the look you're aiming for; competitor = a similar product (its shipped site); page = the same kind of page you're making (a landing page, an app home screen); before = the current version being redesigned"),
  layout: z.string(),
  type: z.string(),
  color: z.string(),
  density: z.string(),
  detail: z.string().describe("ONE specific move worth stealing"),
  take: z.string().describe("What this reference lends the design"),
  leave: z.string().describe("What not to copy / Dribbble fiction"),
  motion: z.string().optional().describe("How it moves and behaves: what hover, scroll, click or load does (an accordion gallery that widens the hovered panel, cards that lift, a marquee). Stills can't show this, so write it down"),
  fits: z.string().optional().describe("Why this one fits THIS brief: the same kind of product, the same audience, the look the user asked for, a layout that suits the content. Required: the user sees it, and the build follows this reference closely"),
};
