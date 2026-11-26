// Components: the curated catalogue (content/data/catalogue.json) + live search across shadcn-style registries,
// so Claude installs proven components and restyles them instead of hand-rolling everything.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { dataDir, projectDripDir } from "../../core/paths.mjs";
import { safe, text } from "../../core/result.mjs";
import { register as registerLocal } from "./local.mjs";
import { previewUrl } from "../parts/pieces.mjs";
import { contactSheet, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks } from "../../core/result.mjs";
import { CLEAR_OVERLAYS } from "../../core/cdp.mjs";
import { Jimp } from "jimp"; // static: a dynamic import of a bundled module reorders zod's init in the bundle
import { homeDripDir } from "../../core/paths.mjs";
import { loadPieces } from "../parts/pieces.mjs";

// ---- Availability: a registry lists Pro and private items next to free ones (Aceternity's Pro blocks answer 401), and
// some items have no page to look at. Check before offering; remember the answer for a week (failures included).
const AVAIL_FILE = path.join(homeDripDir, "cache", "piece-availability.json");
let avail = null;
function availStore() {
  if (!avail) {
    try {
      avail = JSON.parse(fs.readFileSync(AVAIL_FILE, "utf8"));
    } catch {
      avail = {};
    }
  }
  return avail;
}
function availSave() {
  try {
    fs.mkdirSync(path.dirname(AVAIL_FILE), { recursive: true });
    fs.writeFileSync(AVAIL_FILE, JSON.stringify(avail));
  } catch {
    /* a cache */
  }
}
async function check(key, fn) {
  const s = availStore();
  const hit = s[key];
  if (hit && Date.now() - hit.at < WEEK) return hit.ok;
  let ok = false;
  try {
    ok = await fn();
  } catch {
    ok = false;
  }
  s[key] = { ok, at: Date.now() };
  return ok;
}
/** The item installs without a login: its registry JSON answers 200. */
export const installable = (url) => check(`item:${url}`, async () => (await fetch(url, { signal: AbortSignal.timeout(12000) })).ok);
/** The preview page exists (not a 404 or a login wall). */
export const viewable = (url) =>
  check(`page:${url}`, async () => {
    const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return false;
    const body = (await r.text()).slice(0, 4000).toLowerCase();
    return !/<title>[^<]*(404|not found|page not found)/.test(body);
  });

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

// A light stem: "comparison" finds "compare", "uploading" finds "upload".
const stem = (w) => (w.length >= 6 ? w.slice(0, Math.max(5, w.length - 4)) : w);

function score(hay, query) {
  const h = hay.toLowerCase();
  return words(query).reduce((n, w) => {
    if (h.includes(w)) return n + (h.includes(` ${w}`) ? 2 : 1);
    return n + (h.includes(stem(w)) ? 1 : 0);
  }, 0);
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
  media: "image gallery carousel video lens zoom compare masonry slider marquee logos player voice audio",
  // App screens
  dashboard: "dashboard sidebar shell layout app inset header nav dock",
  table: "table data grid rows sort filter pagination list tree",
  chart: "chart area bar line pie donut radar graph contribution stacked bars ticker sparkline",
  form: "form field input select combobox checkbox radio switch toggle slider otp code date picker tags label signature color",
  auth: "login signup sign auth password otp one-time",
  board: "kanban gantt calendar board schedule timeline todo checklist",
  upload: "dropzone upload file image crop attachment",
  feedback: "toast sonner alert dialog empty state progress spinner skeleton like reactions emoji notification",
  ai: "chat message prompt generate context meter bubble attachment voice ai assistant",
};

// efferd's registry lists its Pro blocks too; only the ones its llms.txt marks Free install without a token.
async function efferdFree() {
  try {
    const { body } = await get("https://efferd.com/llms.txt", { ttlMs: WEEK, timeoutMs: 20000 });
    return new Set([...String(body).matchAll(/^- \[([a-z0-9-]+)\]\([^)]*\): .*?\bFree\./gm)].map((m) => m[1]));
  } catch {
    return null;
  }
}

/** React Bits' pages (it needs a category in the URL), from its llms.txt. */
export async function reactbitsPaths() {
  try {
    const { body } = await get("https://reactbits.dev/llms.txt", { ttlMs: WEEK, timeoutMs: 20000 });
    return [...new Set([...String(body).matchAll(/reactbits\.dev\/([a-z-]+\/[a-z0-9-]+)/g)].map((m) => `https://reactbits.dev/${m[1]}`))];
  } catch {
    return [];
  }
}

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

// Find the piece itself on a docs page: the panel the "Preview" tab shows (shadcn-style docs: Magic UI, Cult UI, Kibo,
// React Bits, Smooth UI, bencho...), else the biggest canvas / video / iframe. Returns its box in page coordinates,
// below the tab bar, or null for a page that is the piece alone (shadcn and efferd /view, live previews).
const FIND_PIECE = `(() => {
  const box = (el, top) => { el.setAttribute('data-drip-piece', ''); const r = el.getBoundingClientRect(); const y = Math.max(r.top, top ?? r.top); return { x: r.left + scrollX, y: y + scrollY, w: r.width, h: Math.min(r.bottom - y, 900) }; };
  const media = (el) => el.querySelector('canvas,video,iframe,img,svg,[style*="background"]');
  // The first preview-sized frame under the tab bar, inside a panel that may run on for the whole page (React Bits).
  const frame = (root, top) => {
    const q = [root];
    while (q.length) {
      const el = q.shift();
      for (const c of el.children) {
        const r = c.getBoundingClientRect();
        if (r.bottom < top || r.top > top + 500 || r.width < 300) continue;
        if (r.height >= 200 && r.height <= 950 && media(c)) return c;
        if (r.height > 950) q.push(c);
      }
    }
    return null;
  };
  const tabs = [...document.querySelectorAll('button,[role=tab],a,span,div')].filter((e) => e.childElementCount <= 2 && /^\\s*preview\\s*$/i.test(e.textContent || '') && e.offsetParent);
  for (const t of tabs) {
    const tr = t.getBoundingClientRect();
    let a = t;
    for (let i = 0; i < 9 && a; i++) {
      a = a.parentElement;
      if (!a) break;
      const r = a.getBoundingClientRect();
      if (r.height > 1600 || r.width > innerWidth * 0.98) {
        const f = frame(a, tr.bottom);
        if (f) return box(f);
        break;
      }
      if (r.height > tr.height + 220 && r.width > 320 && media(a)) return box(a, tr.bottom + 4);
    }
  }
  const big = [...document.querySelectorAll('canvas,video,iframe')].map((e) => [e, e.getBoundingClientRect()]).filter(([, r]) => r.width > 300 && r.height > 200).sort((a, b) => b[1].width * b[1].height - a[1].width * a[1].height)[0];
  return big ? box(big[0]) : null;
})()`;

// Promo modals, gift widgets and chat bubbles that survive the overlay clearer: close or hide anything fixed that floats
// over the page (dialogs, fixed boxes), never the page itself.
const HIDE_FLOATERS = `(() => {
  const piece = document.querySelector('[data-drip-piece]');
  const keeps = (el) => piece && (el.contains(piece) || piece.contains(el));
  for (const d of document.querySelectorAll('dialog[open]')) if (!keeps(d)) try { d.close(); } catch {}
  for (const b of document.querySelectorAll('button,[role=button]')) {
    const t = (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase();
    if (/^(×|✕|x|close|dismiss|close dialog|close modal)$/.test(t) && b.closest('[role=dialog],[aria-modal=true],[data-state=open]') && !keeps(b.closest('[role=dialog],[aria-modal=true],[data-state=open]'))) try { b.click(); } catch {}
  }
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (keeps(el)) continue;
    const r = el.getBoundingClientRect();
    const floats = el.matches('[role=dialog],[aria-modal=true],[data-state=open]') || (cs.position === 'fixed' && r.width * r.height > 0.02 * innerWidth * innerHeight && r.top > 40);
    if (floats || /backdrop|overlay/.test(String(el.className))) el.style.setProperty('display', 'none', 'important');
  }
  document.documentElement.style.overflow = document.body.style.overflow = 'auto';
})()`;

// Wait until what is in the box has loaded: fonts, every image decoded, canvases drawn (a frame or two of WebGL).
const SETTLE = `(async () => {
  await document.fonts?.ready;
  await Promise.all([...document.images].filter((i) => !i.complete).slice(0, 40).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, document.querySelector('canvas') ? 1500 : 500));
})()`;

/** A JPEG that is (nearly) one flat colour: the piece hasn't drawn yet. */
async function looksBlank(buf) {
  try {
    const img = await Jimp.read(buf);
    img.resize({ w: 48, h: 30 });
    const v = [];
    img.scan(0, 0, img.width, img.height, (x, y, i) => v.push(img.bitmap.data[i] * 0.3 + img.bitmap.data[i + 1] * 0.59 + img.bitmap.data[i + 2] * 0.11));
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) < 4;
  } catch {
    return false;
  }
}

/** Just the piece, loaded: overlays closed, scrolled to it, cropped to its own preview panel (no site chrome). */
async function previewShot(url, config) {
  const { openPage, withTab } = await import("../../core/browser.mjs");
  const [width, height] = [1280, 900];
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, timeout: 15000, settleMs: 1500 });
    const run = async (expression, awaitPromise = false) => (await tab.s("Runtime.evaluate", { expression, awaitPromise, returnByValue: true }).catch(() => null))?.result?.value;
    // A page that is the piece alone (shadcn, efferd and Eldora /view/...): shoot it whole, no crop.
    const alone = /\/view\//.test(new URL(url).pathname);
    const find = () => (alone ? null : run(FIND_PIECE));
    await run(CLEAR_OVERLAYS, true);
    await new Promise((r) => setTimeout(r, 600)); // promos open a beat after load
    await find(); // marks the piece first, so the floater sweep spares a piece shown in a dialog (bencho)
    await run(HIDE_FLOATERS);
    const hash = decodeURIComponent(new URL(url).hash.slice(1));
    if (hash) await run(`(async()=>{const el=document.getElementById(${JSON.stringify(hash)});if(!el)return;for(let i=0;i<10;i++){el.scrollIntoView({block:"start"});await new Promise(r=>setTimeout(r,150));}})()`, true);
    const shoot = async () => {
      let b = await find();
      if (b) {
        await run(`scrollTo(0, ${Math.max(0, Math.round(b.y - 40))})`);
        await run(SETTLE, true);
        b = (await find()) || b; // it may have moved once things loaded
      } else await run(SETTLE, true);
      await run(CLEAR_OVERLAYS, true);
      await run(HIDE_FLOATERS);
      // Many pieces only come alive under the pointer (holographic, spotlight, tilt, glare, magnetic): sweep a pointer
      // across the piece and leave it resting a little off-centre, the way a visitor would look at it.
      const area = b ? { x: b.x - (await run("scrollX")), y: b.y - (await run("scrollY")), w: b.w, h: b.h } : { x: 0, y: 0, w: width, h: height };
      for (let i = 0; i <= 8; i++) {
        const fx = 0.2 + (0.45 * i) / 8;
        const fy = 0.3 + (0.15 * i) / 8;
        await tab.s("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(area.x + area.w * fx), y: Math.round(area.y + Math.min(area.h, height) * fy) }).catch(() => {});
        await new Promise((r) => setTimeout(r, 40));
      }
      await new Promise((r) => setTimeout(r, 450)); // let the hover state ease in
      const clip = b ? { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.w, width), height: Math.max(200, b.h), scale: 1 } : { x: 0, y: 0, width, height, scale: 1 };
      const { data } = await tab.s("Page.captureScreenshot", { format: "jpeg", quality: 82, clip, captureBeyondViewport: true });
      return { buf: Buffer.from(data, "base64"), cropped: !!b };
    };
    let shot = await shoot();
    if (await looksBlank(shot.buf)) {
      await new Promise((r) => setTimeout(r, 4000)); // slow WebGL or a lazy island: one more chance
      shot = await shoot();
      shot.blank = await looksBlank(shot.buf);
    }
    return shot;
  });
}

const HEAVY =/^(three|@react-three\/.+|ogl|gsap|matter-js|@paper-design\/.+|postprocessing|lenis|cobe|p5)$/;

export function register(server, ctx) {
  server.registerTool(
    "components_find",
    {
      title: "Find a component to install",
      description:
        "Search ~3,300 free components across 14 live registries (shadcn and its blocks, coss ui, Kibo, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI, Smooth UI, Eldora, efferd's free blocks, bencho, sakuga-vfx) for landing pages AND app screens. " +
        "Describe the need: 'image comparison', 'data table with filters', 'kanban', 'animated number counter', 'pricing toggle', 'command palette', 'marquee of logos', 'voice note'. Returns install URLs and a page to see each one. Prefer this over writing components from scratch.",
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
      const [lists, free, rb] = await Promise.all([Promise.all(cat.entries.filter((e) => e.registry && e.price !== "paid").map((e) => registryItems(e).catch(() => []))), efferdFree(), reactbitsPaths()]);
      const all = lists.flat().filter((it) => it.library !== "efferd" || !free || free.has(it.name));
      // Rank: the words, then craft signals (a piece Drip already curated, the library's quality), then check the best
      // candidates really install without a login and have a page to look at; drop the ones that don't.
      const curated = new Set(loadPieces().map((p) => `${p.lib}/${p.name}`));
      const quality = Object.fromEntries(cat.entries.map((e) => [e.id, e.quality || 3]));
      const ranked = all
        .map((it) => {
          const words = score(`${it.base.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")} ${it.title} ${it.description}`, need) + (rawNeed ? score(`${it.base} ${it.title} ${it.description}`, rawNeed) * 2 : 0);
          return { it, s: words ? words + (curated.has(`${it.library}/${it.name}`) ? 3 : 0) + ((quality[it.library] || 3) - 3) * 0.75 : 0 };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit * 3);
      const checked = await Promise.all(
        ranked.map(async (x) => {
          const see = previewUrl({ lib: x.it.library, name: x.it.name }, { cats: cat.entries, reactbitsPaths: rb });
          const [inst, view] = await Promise.all([x.it.html ? true : installable(x.it.url), see && !/\/gallery\/?$|^https:\/\/[^/]+\/?$/.test(see) ? viewable(see) : false]);
          return { ...x, inst, see: view ? see : null, s: x.s + (view ? 1 : -1) };
        }),
      );
      availSave();
      const locked = checked.filter((x) => !x.inst).length;
      const items = checked.filter((x) => x.inst).sort((a, b) => b.s - a.s).slice(0, limit);
      return text(
        `Libraries that fit "${rawNeed || kind}":\n${libs.map(({ e }) => `- ${e.name} (${e.category}, ${e.price}, ${e.license}): ${e.what} Use when: ${e.useWhen}${e.avoidWhen ? ` Avoid: ${e.avoidWhen}` : ""}`).join("\n") || "- none matched by description"}\n\n` +
          `Installable components (${all.length} searched${kind ? `, kind ${kind}` : ""}; ${locked ? `${locked} Pro or private ones left out` : "all checked"}; best first, curated pieces and stronger libraries ranked up):\n${items.map(({ it, see }) => {
            const heavy = it.deps.filter((d) => HEAVY.test(d));
            return `- [${it.library}] ${it.title}${it.description ? `: ${it.description.slice(0, 120)}` : ""}${heavy.length ? ` · needs ${heavy.join(", ")} (heavy: lazy-load it, give a static fallback)` : it.deps.length ? ` · deps ${it.deps.slice(0, 3).join(", ")}` : ""}\n    ${it.html ? `plain HTML: download ${it.url} into the page and load it with a script tag` : `install: ${it.url}`}${see ? ` · see: ${see}` : " · (no page to preview: read it with components_get)"}`;
          }).join("\n") || "- none matched; try other words, or components_registries for 500+ more registries"}\n\n` +
          (kind === "background" || kind === "hero" ? "A background is a material, not the idea: tint it to the palette, keep the text zone calm, cap it to the hero, pause it off-screen and under reduced motion. For a static, licence-free one: gradient_mesh.\n" : "") +
          "Licences: React Bits is MIT + Commons Clause (use in the product, never redistribute the source); Aceternity's free items allow commercial end products, not resale.\n" +
          "Look before you choose: pieces_preview({ items: [{ library, item }, ...] }) puts up to 8 on one sheet. Install with pieces_install (a React page) or npx shadcn@latest add <url>. After installing, restyle it to the page's tokens; never leave library defaults.",
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
    "pieces_preview",
    {
      title: "See library pieces before choosing",
      description:
        "Screenshots each piece's own live page (its docs or demo page) and returns them numbered on ONE sheet, so you can compare up to 8 before choosing. " +
        'Example: pieces_preview({ items: [{ library: "bencho", item: "image-compare" }, { library: "kibo", item: "image-zoom" }, { library: "magicui", item: "lens" }] })',
      inputSchema: {
        items: z.array(z.object({ library: z.string(), item: z.string() })).max(8).optional(),
        urls: z.array(z.string().url()).max(8).optional().describe("Or the pages to shoot directly"),
      },
    },
    safe(async ({ items = [], urls = [] }) => {
      const cat = loadCatalogue().entries;
      const rb = items.some((i) => i.library === "reactbits") ? await reactbitsPaths() : [];
      const targets = [
        ...items.map((i) => ({ label: `${i.library} ${i.item}`, url: previewUrl({ lib: i.library, name: i.item }, { cats: cat, reactbitsPaths: rb }) })),
        ...urls.map((u) => ({ label: u, url: u })),
      ].slice(0, 8);
      if (!targets.length) return text("Pass items: [{ library, item }] (from components_find or PIECES ON OFFER) or urls.", true);
      const shots = await Promise.all(
        targets.map(async (t) => {
          if (!t.url) return { ...t, err: "no page to show it" };
          if (!(await viewable(t.url))) return { ...t, err: "no public page (a Pro or private item, or a wrong name): pick another, or read it with components_get" };
          try {
            const s = await previewShot(t.url, ctx.config());
            return s.blank ? { ...t, err: "didn't render in 10 s (WebGL or a login wall): open the page to see it" } : { ...t, buf: s.buf };
          } catch (e) {
            return { ...t, err: e.message.slice(0, 120) };
          }
        }),
      );
      const ok = shots.filter((s) => s.buf);
      const lines = shots.map((s, i) => `${i + 1}. ${s.label}${s.url ? ` · ${s.url}` : ""}${s.err ? ` (not shown: ${s.err})` : ""}`);
      const n = ok.length;
      const content = [textBlock(`${lines.join("\n")}\nThe sheet numbers the shown ones in order, each cropped to the piece. It shows the library's own colours: on the page it takes yours.`)];
      if (n) {
        const sheet = n === 1 ? await toJpeg(ok[0].buf, 960, 960, 78) : await contactSheet(ok.map((s) => s.buf), { cols: 2, tileW: 480, tileH: 300, gap: 8, fit: "contain" }); // small: it stays in the director's context
        content.push(imageBlock(sheet));
      }
      return blocks(content);
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
