// Reference providers (stubbed HTTP, fixtures), refs_gallery numbering through the real tool registry, and the type
// tools (fonts_compare metrics, wordmark_build kerning). Offline; live checks run only with DRIP_NET=1.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import opentype from "opentype.js";

const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-inspire-"));
process.env.DRIP_PROJECT_DIR = project;
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-inspire-home-"));
delete process.env.ARENA_TOKEN;

const { findChrome } = await import("../src/modules/fitcheck/chrome.mjs");
const galleries = await import("../src/modules/inspire/providers/galleries.mjs");
const { parseOpl, toFilters, sectionType, callTool } = await import("../src/modules/inspire/providers/onepagelove.mjs");
const { parseTwentyFirst } = await import("../src/modules/inspire/providers/twentyfirst.mjs");
const { parseArena } = await import("../src/modules/inspire/providers/arena.mjs");
const { registerProvider, unregisterProvider, allProviders } = await import("../src/modules/inspire/providers/index.mjs");
const { interleave, defaultSources } = await import("../src/modules/inspire/index.mjs");
const { rankByQuery, getHtml, decode } = await import("../src/modules/inspire/contract.mjs");
const { rankEntries, loadEntries } = await import("../src/modules/inspire/rank.mjs");
const { collectTools } = await import("../src/core/registry.mjs");
const { fontMetrics, parseFont, sheetHtml, metricsTable } = await import("../src/modules/assets/typecompare.mjs");
const { buildWordmark, gapReport, checkPairs, pathData } = await import("../src/modules/assets/wordmark.mjs");
const { createBoard, loadBoard, saveBoard } = await import("../src/modules/board/store.mjs");

const NET = process.env.DRIP_NET === "1";
const hasChrome = !!findChrome({});
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args, {});
  return { r, t: (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: (r.content || []).filter((c) => c.type === "image").length };
};

// ---- parsers on fixtures --------------------------------------------------------------------------------------

test("Awwwards cards are read from their JSON attribute", () => {
  const model = JSON.stringify({ collectableIdentifier: "rocket-saas", id: 1, images: { thumbnail: "submissions/2025/08/a.jpg" }, slug: "rocket-saas", title: "Rocket SaaS", createdAt: 1755938889, tags: ["Technology", "Dark & Moody"], type: "submission" }).replace(/"/g, "&quot;").replace(/&(?!quot;)/g, "&amp;");
  const html = `<ul><li class="col-3 js-collectable" data-controller="collectable" data-collectable-model-value="${model}"><div class="card-site"><a class="figure-rollover__bt"
 href="https://rocket-saas.io/" target="_blank">Visit</a></div></li></ul>`;
  const [it] = galleries.parseAwwwards(html);
  assert.equal(it.key, "awwwards:rocket-saas");
  assert.equal(it.title, "Rocket SaaS");
  assert.equal(it.url, "https://www.awwwards.com/sites/rocket-saas");
  assert.match(it.image, /thumb_880_660\/submissions\/2025\/08\/a\.jpg$/);
  assert.equal(it.author, "rocket-saas.io");
  assert.ok(it.tags.includes("Dark & Moody"));
  assert.equal(it.kind, "site");
});

test("Minimal Gallery REST posts, Httpster, Dark Mode Design and Godly parse", () => {
  const [m] = galleries.parseMinimalGallery([{ slug: "studio-plato", link: "https://minimal.gallery/studio-plato/", title: { rendered: "Studio &amp; Plato" }, _embedded: { "wp:featuredmedia": [{ source_url: "https://x/y.jpg" }], "wp:term": [[{ name: "Portfolio" }]] } }, { slug: "no-image", link: "https://x/" }]);
  assert.equal(m.title, "Studio & Plato");
  assert.deepEqual(m.tags, ["Portfolio"]);
  const [h] = galleries.parseHttpster(`<article class="Preview" data-date="x"><figure class="Preview__figure"><img class="Preview__img" loading="lazy" src="/assets/a.webp" alt width="300"/></figure><div class="Preview__meta"><a class="Preview__title" href="/website/making/">Making Software</a><a class="Preview__ext" href="https://www.making.com/?ref=httpster.net">Visit</a></div></article>`);
  assert.equal(h.key, "httpster:making");
  assert.equal(h.image, "https://httpster.net/assets/a.webp");
  assert.equal(h.live, "https://www.making.com/");
  const [d] = galleries.parseDarkMode(`<div role="listitem" class="collectionitem w-dyn-item"><a href="https://limeduo.com" target="_blank" class="container screenshot"><div class="thumbcontainer"><img alt="Lime Duo" src="https://cdn/x.webp" loading="lazy" class="thumb"/></div></a></div>`);
  assert.equal(d.title, "Lime Duo");
  assert.ok(d.tags.includes("dark"));
  const [g] = galleries.parseGodly(`<article data-presence-anchor="item:a:media"><div data-slot="feed-media-card"><img alt="" src="https://cdn.recent.design/items/f5w/0/poster/1200.webp"/><a aria-label="View post: Animated Menu Icon" href="/i/f5w-animated-menu-icon"></a></div></article><article><div data-slot="feed-sponsor-card"><img src="https://cdn.recent.design/sponsors/x.webp"/><a aria-label="Visit Mobbin" href="/go/x"></a></div></article>`);
  assert.equal(g.title, "Animated Menu Icon");
  assert.equal(g.kind, "motion");
  assert.equal(galleries.parseGodly("<article><div data-slot=\"feed-sponsor-card\"></div></article>").length, 0, "sponsor cards are skipped");
});

test("One Page Love MCP text blocks parse, sections included; filters are pulled from the query", () => {
  const items = parseOpl([
    { type: "text", text: "![Congrue](https://assets.onepagelove.com/x/a.jpg)\n**Congrue** · https://www.congrue.ai · https://onepagelove.com/congrue/\nHeadline: Sell the system, not the SKU.\nSubtext: Congrue reads every bid.\nCTAs: Book a demo" },
    { type: "text", text: "![Fonting](https://assets.onepagelove.com/x/b.jpg)\n**Fonting** · Pricing Table section · genre: Landing Page, App · https://www.fonting.co · https://onepagelove.com/fonting/" },
    { type: "text", text: "not a result" },
  ], "site");
  assert.equal(items.length, 2);
  assert.equal(items[0].key, "onepagelove:congrue");
  assert.equal(items[0].live, "https://www.congrue.ai");
  assert.match(items[0].copy, /Sell the system/);
  assert.ok(items[1].tags.includes("Pricing Table section") && items[1].tags.includes("App"));
  assert.deepEqual(toFilters("dark saas landing page ui"), { color: "dark", genre: "saas", query: "landing page ui" });
  assert.equal(sectionType("pricing table for a saas"), "pricing-table");
  assert.equal(sectionType("something else"), "cta");
});

test("One Page Love MCP call reads an event-stream reply and caches it", async () => {
  let calls = 0;
  const fetchFn = async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.method, "tools/call");
    return new Response(`event: message\ndata: ${JSON.stringify({ result: { content: [{ type: "text", text: "hi" }] }, jsonrpc: "2.0", id: 1 })}\n\n`, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  const a = await callTool("search_inspiration", { query: "x", limit: 1 }, { endpoint: "https://stub.test/mcp", fetchFn });
  const b = await callTool("search_inspiration", { query: "x", limit: 1 }, { endpoint: "https://stub.test/mcp", fetchFn });
  assert.equal(a[0].text, "hi");
  assert.equal(calls, 1);
  assert.ok(b);
  await assert.rejects(callTool("t", {}, { endpoint: "https://stub.test/err", fetchFn: async () => new Response("{}", { status: 500 }) }), /HTTP 500/);
});

test("21st.dev listing JSON (escaped inside the page) gives components with author and preview", () => {
  const demo = (id, name, slug, comp, user, extra = "") =>
    `{"id":${id},"name":"${name}","demo_slug":"${slug}","preview_url":"https://cdn.21st.dev/${user}/${comp}/${slug}/preview.1.png","component_data":{"id":9,"revision":1,"name":"Pricing Cards","component_slug":"${comp}","description":"A toggle between plans.","downloads_count":24,"likes_count":3,"user":{"id":"user_1","username":"${user}"}${extra}}}`;
  const json = `[${demo(1, "Default.tsx", "default", "pricing-7", "diarmuradi")},${demo(1, "Default.tsx", "default", "pricing-7", "diarmuradi")},${demo(2, "Compare Two.tsx", "compare-two", "compare", "clevision", ',"pro_preview_image_url":"https://cdn.21st.dev/pro.png"')}]`;
  const html = `<script>self.__next_f.push([1,"${json.replace(/"/g, '\\"')}"])</script>`;
  const items = parseTwentyFirst(html);
  assert.equal(items.length, 2, "duplicates collapse");
  assert.equal(items[0].key, "21st:diarmuradi/pricing-7/default");
  assert.equal(items[0].title, "Pricing Cards");
  assert.equal(items[0].url, "https://21st.dev/community/components/diarmuradi/pricing-7/default");
  assert.equal(items[0].kind, "component");
  assert.equal(items[1].title, "Pricing Cards: Compare Two");
  assert.ok(items[1].pro);
});

test("Are.na reads v3 and v2 shaped blocks", () => {
  const v3 = parseArena({ data: [{ id: 5, title: "Grid", image: { display: { url: "https://i/5.jpg" } }, source: { url: "https://x.com" }, user: { name: "Ana" } }, { id: 6, title: "text only" }] });
  assert.equal(v3.length, 1);
  assert.equal(v3[0].author, "Ana");
  assert.equal(parseArena({ blocks: [{ id: 7, image: { display: { url: "https://i/7.jpg" } } }] })[0].key, "arena:7");
});

test("feed providers rank by title match; blocked pages give a clear error", async () => {
  const items = ["Coffee roaster", "Bank app", "Dark bank"].map((title, i) => ({ key: `f:${i}`, title, tags: [], author: "" }));
  const ranked = rankByQuery(items, "bank");
  assert.deepEqual(ranked.slice(0, 2).map((i) => i.title), ["Bank app", "Dark bank"]);
  assert.ok(!ranked[0].feed && ranked[2].feed);
  await assert.rejects(getHtml("https://blocked.test/x", {}, { fetchPage: async () => { throw Object.assign(new Error("HTTP 403"), { status: 403 }); } }), /refuses scripted requests/);
  await assert.rejects(getHtml("https://moment.test/x", {}, { fetchPage: async () => ({ body: "<html><head><title>Just a moment...</title>" }) }), /human check/);
  assert.equal(decode("Fish &amp; chips &#8211; &#x27;a&#x27;"), "Fish & chips – 'a'");
});

// ---- refs_gallery through the registry; numbers work in the existing refs/board tools ------------------------

const stubItems = (n) =>
  Array.from({ length: n }, (_, i) => ({ key: `stub:item-${i + 1}`, title: `Stub site ${i + 1}`, url: `https://stub.test/${i + 1}`, image: path.join(project, "none.png"), author: `studio${(i % 3) + 1}.test`, source: "stub", tags: ["fintech", "dark"], kind: "site", copy: i === 0 ? "A headline that sells" : undefined }));

test("refs_gallery lists with tagged numbers that refs_pick, refs_view, refs_study and board_add accept", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  registerProvider({ id: "stub", label: "Stub gallery", kinds: ["site"], status: "works", search: async (q, { limit }) => stubItems(8).slice(0, limit) });
  registerProvider({ id: "stub2", label: "Second stub", kinds: ["site"], status: "works", search: async () => stubItems(3).map((i) => ({ ...i, key: `stub2:${i.key.slice(5)}`, source: "stub2", title: `Other ${i.title}` })) });
  try {
    const { t, images } = await call("refs_gallery", { query: "fintech", source: ["stub", "stub2"], limit: 8, sheet: false });
    assert.equal(images, 0);
    assert.match(t, /Listing L\d+: sites for "fintech" from Stub gallery, Second stub/);
    const tag = t.match(/Listing (L\d+)/)[1];
    assert.match(t, new RegExp(`${tag}-1\\. Stub site 1 — studio1\\.test · stub`));
    assert.match(t, /A headline that sells/);
    assert.match(t, new RegExp(`${tag}-2\\. Other Stub site 1`), "sources are interleaved");

    const pick = await call("refs_pick", { picks: [{ shot: `${tag}-1`, why: "dark fintech hero with a type-led headline" }] });
    assert.match(pick.t, /Picked 1/);
    const view = await call("refs_view", { shots: [`${tag}-1`] });
    assert.match(view.t, /Stub site 1/);
    const study = await call("refs_study", { studies: [{ shot: `${tag}-1`, layout: "12-col, headline spans cols 1-8, picture bleeds right at 55%", type: "condensed grotesk caps ~140px, body 18px", color: "#141414 ground, #2340FF accent on the CTA only", density: "~30 words above the fold", detail: "nav in the body face at 15px, aligned to the h1 baseline", take: "the single accent", leave: "the stock 3D render", fits: "a fintech product for the same buyers, in the dark type-led look the brief asks for" }] });
    assert.match(study.t, /Stub site 1/);
    assert.equal(study.r.isError, undefined);

    const board = createBoard("Inspire test", "brief");
    saveBoard(board);
    // board_add guesses the kind from the ref: a tagged number needs kind "shot"; a bare number is the last listing.
    const add = await call("board_add", { board: board.id, items: [{ ref: `${tag}-3`, kind: "shot", note: "the 8px grid with hairline dividers between sections" }, { ref: "4", note: "headline and form sharing one baseline in the hero" }] });
    assert.match(add.t, /Added 2/);
    const saved = loadBoard(board.id);
    assert.equal(saved.items.length, 2);
    assert.ok(saved.items.every((i) => i.kind === "shot" && /^stub2?:item-[0-9]$/.test(i.key) && /Stub site|Other/.test(i.title) && i.image), "listed items, with their pictures, are on the board");
    assert.deepEqual(saved.items.map((i) => i.key).sort(), ["stub2:item-2", "stub:item-2"].sort(), "L-3 is the third mixed item, 4 the fourth");
  } finally {
    globalThis.fetch = realFetch;
    unregisterProvider("stub");
    unregisterProvider("stub2");
  }
});

test("refs_gallery draws a contact sheet and reports a failing source without failing the call", { skip: !hasChrome && "no Chrome/Edge" }, async () => {
  const { Jimp } = await import("jimp");
  const png = path.join(project, "none.png");
  await new Jimp({ width: 320, height: 240, color: 0x336699ff }).write(png);
  registerProvider({ id: "good", label: "Good", kinds: ["site"], status: "works", search: async () => stubItems(4).map((i) => ({ ...i, key: `good:${i.key.slice(5)}`, source: "good" })) });
  registerProvider({ id: "bad", label: "Bad", kinds: ["site"], status: "works", search: async () => { throw new Error("blocked by the site"); } });
  try {
    const { t, images } = await call("refs_gallery", { source: ["good", "bad"], limit: 4 });
    assert.equal(images, 1);
    assert.match(t, /Skipped: Bad: blocked by the site/);
  } finally {
    unregisterProvider("good");
    unregisterProvider("bad");
  }
});

test("refs_sources lists every provider with its status; defaults skip feeds and key-gated sources", async () => {
  const { t } = await call("refs_sources");
  for (const id of ["awwwards", "onepagelove", "minimalgallery", "21st", "arena", "httpster", "godly"]) assert.match(t, new RegExp(`- ${id} `));
  assert.match(t, /arena .*needs key ARENA_TOKEN/);
  assert.match(t, /Tried, not usable/);
  const site = defaultSources("site").map((p) => p.id);
  assert.ok(site.includes("awwwards") && site.includes("onepagelove"));
  assert.ok(!site.includes("httpster") && !site.includes("arena"));
  assert.deepEqual(defaultSources("component").map((p) => p.id), ["21st"]);
  assert.ok(allProviders().every((p) => typeof p.search === "function" && p.kinds.length));
  assert.deepEqual(interleave([[{ key: "a" }, { key: "b" }], [{ key: "c" }]], 3).map((i) => i.key), ["a", "c", "b"]);
});

test("a provider that needs a key says so instead of failing silently", async () => {
  const { t, r } = await call("refs_gallery", { source: "arena", query: "interface" });
  assert.equal(r.isError, true);
  assert.match(t, /ARENA_TOKEN/);
});

// ---- catalogue ranking ------------------------------------------------------------------------------------------

test("catalogue entries carry fit tags and quality and rank by stack and fit", () => {
  const entries = loadEntries();
  assert.ok(entries.length >= 40 && entries.every((e) => Array.isArray(e.fit) && e.quality >= 1 && e.quality <= 5), "every entry ranked");
  assert.ok(entries.every((e) => e.id && e.name && e.url && e.category), "existing fields intact for components_find");
  const top = rankEntries(entries, { stack: ["react", "tailwind"], fit: ["saas", "dashboard"] });
  assert.equal(top[0].entry.id, "shadcn");
  assert.ok(!rankEntries(entries, { stack: ["svelte"] }).some((r) => r.entry.id === "shadcn"), "stack filter applies");
});

// ---- type: metrics and wordmarks on a synthetic font ----------------------------------------------------------------

function rect(p, x1, y1, x2, y2, reverse = false) {
  const pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  if (reverse) pts.reverse();
  p.moveTo(...pts[0]);
  for (const q of pts.slice(1)) p.lineTo(...q);
  p.close();
}

function syntheticFont() {
  const glyph = (name, unicode, advance, draw) => {
    const path2 = new opentype.Path();
    draw?.(path2);
    return new opentype.Glyph({ name, unicode, advanceWidth: advance, path: path2 });
  };
  const glyphs = [glyph(".notdef", 0, 600)];
  for (const c of "abcdefghijklmnopqrstuvwxyz") glyphs.push(glyph(c, c.charCodeAt(0), 500, c === "x" ? (p) => rect(p, 50, 0, 450, 500) : c === "o" ? (p) => { rect(p, 0, 0, 400, 500); rect(p, 80, 40, 320, 460, true); } : c === "l" ? (p) => rect(p, 100, 0, 180, 750) : null));
  glyphs.push(glyph("H", 72, 700, (p) => rect(p, 0, 0, 600, 700)));
  glyphs.push(glyph("T", 84, 500, (p) => rect(p, 0, 0, 500, 700)));
  glyphs.push(glyph("space", 32, 250, null));
  return new opentype.Font({ familyName: "Synth", styleName: "Regular", unitsPerEm: 1000, ascender: 800, descender: -200, glyphs });
}

const fontFile = path.join(project, "synth.otf");
fs.writeFileSync(fontFile, Buffer.from(syntheticFont().toArrayBuffer()));

test("font metrics: x-height, cap height, stem and stroke contrast come from the outlines", () => {
  const m = fontMetrics(parseFont(fs.readFileSync(fontFile)));
  assert.equal(m.xHeight, 0.5);
  assert.equal(m.capHeight, 0.7);
  assert.equal(m.stem, 0.08);
  assert.equal(m.contrast, 2);
  assert.equal(m.contrastClass, "moderate contrast");
  assert.equal(m.xToCap, 0.71);
  assert.ok(m.avgWidth > 0.45 && m.avgWidth < 0.55);
});

test("the font sheet page embeds each face and shows its numbers", () => {
  const buf = fs.readFileSync(fontFile);
  const card = { label: "Synth", files: [{ weight: 400, format: "otf", buf }, { weight: 700, format: "otf", buf }], metrics: fontMetrics(parseFont(buf)), category: "serif" };
  const html = sheetHtml([card], { headline: "Hello <b>", body: "Body", sizes: [56, 18] });
  assert.match(html, /@font-face\{font-family:"c0";font-weight:700/);
  assert.match(html, /Hello &lt;b&gt;/);
  assert.match(html, /x-height 0\.5/);
  assert.match(metricsTable([card]), /Synth \| 400\/700 \| 0\.5 \| 0\.7/);
});

test("wordmark kerning: the pair gap moves by exactly the amount asked; bad pairs are rejected", () => {
  const font = parseFont(fs.readFileSync(fontFile));
  const base = buildWordmark(font, { text: "Hl", size: 200, autoKern: false });
  assert.equal(base.gaps[0].gap, 200); // H ink ends at 600, l ink starts 700 + 100
  const tight = buildWordmark(font, { text: "Hl", size: 200, autoKern: false, kerning: { Hl: -50 } });
  assert.equal(tight.gaps[0].gap, 150);
  const tracked = buildWordmark(font, { text: "Hl", size: 200, autoKern: false, tracking: 30 });
  assert.equal(tracked.gaps[0].gap, 230);
  assert.match(base.svg, /^<svg[^>]*viewBox="0 0 \d+ \d+"/);
  assert.equal((base.svg.match(/<path /g) || []).length, 2);
  assert.ok(!/NaN/.test(base.svg));
  assert.throws(() => checkPairs({ ABC: 5 }), /exactly two characters/);
  assert.equal(pathData({ commands: [{ type: "M", x: 1, y: 2.345 }, { type: "L", x: 3, y: 4 }, { type: "Z" }] }), "M1 2.35L3 4Z");
  assert.deepEqual(gapReport([{ pair: "ab", gap: 40 }, { pair: "bc", gap: 42 }, { pair: "cd", gap: 38 }, { pair: "de", gap: 120 }]).outliers.map((o) => o.pair), ["de"]);
});

test("wordmark_build saves an editable spec and merges kerning when tuned with from", async () => {
  const a = await call("wordmark_build", { name: "synth mark", font: "synth.otf", text: "TlH", weight: 400, autoKern: false });
  assert.notEqual(a.r.isError, true, a.t);
  const dir = path.join(project, ".drip", "wordmarks", "synth-mark");
  assert.ok(fs.existsSync(path.join(dir, "wordmark.svg")));
  const spec1 = JSON.parse(fs.readFileSync(path.join(dir, "wordmark.json"), "utf8"));
  assert.equal(spec1.text, "TlH");
  assert.equal(spec1.version, 1);
  await call("wordmark_build", { from: "synth mark", kerning: { Tl: -30 } });
  await call("wordmark_build", { from: "synth mark", kerning: { lH: 10 } });
  const spec2 = JSON.parse(fs.readFileSync(path.join(dir, "wordmark.json"), "utf8"));
  assert.deepEqual(spec2.kerning, { Tl: -30, lH: 10 });
  assert.equal(spec2.autoKern, false, "other settings carry over");
  const missing = await call("wordmark_build", { font: "synth.otf", text: "Q" });
  assert.equal(missing.r.isError, true);
  assert.match(missing.t, /no glyph for: Q/);
  assert.equal((await call("wordmark_build", { from: "nope" })).r.isError, true);
});

test("fonts_compare sets local fonts on one sheet", { skip: !hasChrome && "no Chrome/Edge", timeout: 60000 }, async () => {
  const { t, images } = await call("fonts_compare", { fonts: ["synth.otf"], text: "Hello", weights: [400] });
  assert.equal(images, 1);
  assert.match(t, /Synth \| 400 \| 0\.5 \| 0\.7/);
  const bad = await call("fonts_compare", { fonts: ["missing.otf"] });
  assert.equal(bad.r.isError, true);
});

// ---- live checks (DRIP_NET=1): each provider answers right now -----------------------------------------------------

test("live: every working provider returns items", { skip: !NET && "set DRIP_NET=1", timeout: 120000 }, async () => {
  const { loadConfig } = await import("../src/core/config.mjs");
  const config = loadConfig();
  const report = [];
  for (const p of allProviders().filter((x) => !x.needsKey)) {
    try {
      const items = await p.search("saas", { kind: p.kinds[0], limit: 6, page: 1, config });
      report.push(`${p.id}: ${items.length}`);
      assert.ok(items.length > 0, `${p.id} returned nothing`);
      assert.ok(items.every((i) => i.key.startsWith(`${p.id}:`) && i.title && i.image && i.url), `${p.id} item shape`);
    } catch (err) {
      assert.fail(`${p.id}: ${err.message}`);
    }
  }
  console.log(report.join(", "));
});

test.after(async () => {
  const { closeBrowser } = await import("../src/core/browser.mjs");
  await closeBrowser();
});

test("Imageory gallery records are read from the page data, premium ones left out", async () => {
  const { parseImageory } = await import("../src/modules/assets/images.mjs");
  const rec = (id, premium) => `{\\"id\\":\\"${id}\\",\\"slug\\":\\"s-${id.slice(0, 4)}\\",\\"title\\":\\"Surreal Canyon\\",\\"src\\":\\"https://x.r2.dev/a/1.webp\\",\\"width\\":1672,\\"height\\":941,\\"prompt\\":\\"A surreal canyon {at dawn}\\",\\"tags\\":[\\"surreal\\"],\\"premium\\":${premium}}`;
  const html = `<script>self.__next_f.push([1,"${rec("11111111-1111-1111-1111-111111111111", false)},${rec("22222222-2222-2222-2222-222222222222", true)}"])</script>`;
  const out = parseImageory(html);
  assert.equal(out.length, 1);
  assert.equal(out[0].prompt, "A surreal canyon {at dawn}");
  assert.equal(out[0].width, 1672);
});
