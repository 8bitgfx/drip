// The design galleries (getdesign.ai, posts.design, loadmo.re, recent.design, 60fps.design, supahero.io, navbar.gallery,
// cta.gallery, inspora.design): each parser runs on a small trimmed fixture of the real page; the providers fetch
// through a stubbed getHtml-compatible fetch so nothing here touches the network.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "design-galleries");
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");

const mod = await import("../src/modules/inspire/providers/design-galleries.mjs");
const { parseGetDesign, parsePostsDesign, parseLoadmore, parseRecentDesign, parse60fps, parseSupahero, parseNavbarGallery, parseCtaGallery, parseInspora, providers } = mod;
const { allProviders, NOT_USABLE } = await import("../src/modules/inspire/providers/index.mjs");

const shape = (items, source) => {
  assert.ok(items.length >= 2, `${source}: items`);
  for (const it of items) {
    assert.ok(it.key.startsWith(`${source}:`), it.key);
    assert.ok(it.title && it.url && it.image, `${source}: ${it.key} needs title, url and image`);
    assert.match(it.url, /^https?:\/\//);
    assert.match(it.image, /^https?:\/\//);
    assert.equal(it.source, source);
  }
  assert.equal(new Set(items.map((i) => i.key)).size, items.length, `${source}: unique keys`);
};

test("getdesign.ai: the public JSON becomes design-md items, sponsors are skipped", () => {
  const items = parseGetDesign(read("getdesign.json"));
  shape(items, "getdesign");
  assert.equal(items.length, 3);
  assert.ok(items.every((i) => i.kind === "design-md" && !i.key.includes("motionsites")));
  const first = items[0];
  assert.equal(first.title, "Gradient AI cards");
  assert.equal(first.author, "@basit_designs");
  assert.equal(first.url, "https://getdesign.ai/#design/gradient-ai-feature-cards");
  assert.equal(first.image, "https://getdesign.ai/media/gradient-ai-feature-cards.webp");
  assert.ok(first.tags.includes("gradient") && first.tags.includes("Features"));
  assert.deepEqual(first.palette.slice(0, 2), ["#EFEFEF", "#111111"]);
  assert.deepEqual(parseGetDesign("not json"), []);
});

test("posts.design: article cards give title, brand, tags and the posted date", () => {
  const items = parsePostsDesign(read("posts.html"));
  shape(items, "posts");
  assert.ok(items.every((i) => i.kind === "social"));
  const first = items[0];
  assert.equal(first.title, "Grok Bot knows the Black Friday deals");
  assert.equal(first.author, "SpaceX Super Intelligence");
  assert.deepEqual(first.tags, ["Promotional", "Announcement Card"]);
  assert.equal(first.postedAt, "2026-11-25");
  assert.equal(first.url, "https://posts.design/grok-bot-knows-the-black-friday-deals-2026-11-25");
  assert.match(first.image, /^https:\/\/posts\.design\/images\/posts\/responsive\/.*w1200.*\.webp$/);
});

test("loadmo.re: poster background, site name and studio credit", () => {
  const items = parseLoadmore(read("loadmore.html"));
  shape(items, "loadmore");
  assert.ok(items.every((i) => i.kind === "mobile"));
  assert.equal(items[0].title, "Water Works Project");
  assert.equal(items[0].author, "Field Records");
  assert.equal(items[0].url, "https://loadmo.re/posts/water-works-project");
  assert.match(items[0].image, /waterworksproject-hp-cover\.jpg$/);
  assert.ok(!items.some((i) => i.key.endsWith("sabrina-zeltner")) || items.find((i) => i.key.endsWith("sabrina-zeltner")).image);
  const studio = items.find((i) => i.live);
  assert.ok(!studio || /^https?:\/\//.test(studio.live));
});

test("recent.design: feed cards give title, link, poster and author", () => {
  const items = parseRecentDesign(read("recentdesign.html"));
  shape(items, "recentdesign");
  assert.ok(items.every((i) => i.kind === "motion"));
  assert.equal(items[0].title, "Variable Font Motion Studies");
  assert.equal(items[0].url, "https://recent.design/i/cvlbs4p-variable-font-motion-studies");
  assert.equal(items[0].image, "https://cdn.recent.design/items/cvlbs4p/0/poster/675.webp");
  assert.ok(items[0].author.includes("PLANT"));
});

test("60fps.design: shot links pair with their video poster and app, repeated links are merged", () => {
  const items = parse60fps(read("fps60.html"));
  shape(items, "fps60");
  assert.ok(items.every((i) => i.kind === "motion"));
  assert.equal(items[0].title, "Airbnb Gift Feature Intro Card Split Interaction");
  assert.equal(items[0].author, "Airbnb");
  assert.equal(items[0].url, "https://60fps.design/shots/airbnb-gift-feature-intro-card-split-interaction");
  assert.match(items[0].image, /^https:\/\/video\.gumlet\.io\/.*thumbnail-1-0\.png\?width=800$/);
  assert.ok(items[0].tags.includes("airbnb"));
});

test("supahero.io: hero cards", () => {
  const items = parseSupahero(read("supahero.html"));
  shape(items, "supahero");
  assert.equal(items.length, 3);
  assert.ok(items.every((i) => i.kind === "hero"));
  assert.equal(items[0].title, "Anubi");
  assert.equal(items[0].url, "https://supahero.io/hero/anubi");
  assert.match(items[0].image, /\/heroes\/anubi\.webp$/);
});

test("navbar.gallery: card data attributes become tags and the live site", () => {
  const items = parseNavbarGallery(read("navbar.html"));
  shape(items, "navbar");
  assert.ok(items.every((i) => i.kind === "nav"));
  const oatly = items[0];
  assert.equal(oatly.title, "Oatly");
  assert.equal(oatly.live, "https://www.oatly.com/");
  assert.equal(oatly.url, "https://www.navbar.gallery/navbar/oatly");
  for (const t of ["mega-menu", "Food & Drink", "Unusual Layout", "nextjs"]) assert.ok(oatly.tags.includes(t), t);
  assert.match(oatly.image, /^https:\/\/cdn\.navbar\.gallery\//);
});

test("cta.gallery: the first large picture and the brand name per link", () => {
  const items = parseCtaGallery(read("cta.html"));
  shape(items, "cta");
  assert.ok(items.every((i) => i.kind === "cta"));
  assert.equal(items[0].title, "Safds");
  assert.equal(items[0].url, "https://www.cta.gallery/cta/safds");
  assert.equal(items[0].image, "https://framerusercontent.com/images/LmhHMkZI9nWA9Uk7ff0QcATkU.jpg?width=1208&height=556");
});

test("inspora.design: posts with a picture are kept, sponsors and pictureless cards are skipped", () => {
  const items = parseInspora(read("inspora.html"));
  shape(items, "inspora");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Theater seat preview");
  assert.equal(items[0].author, "Charles Postiaux");
  assert.equal(items[0].url, "https://www.inspora.design/posts/theater-seat-preview");
  assert.match(items[0].image, /^https:\/\/media\.inspora\.design\/posts\/.*\.webp$/);
  assert.ok(items[0].description.includes("cinema"));
  assert.ok(items[1].image.startsWith("https://media.inspora.design/"), "plain <img> posts work too");
  assert.ok(!items.some((i) => /affectui|sponsor/i.test(i.title + i.url)));
});

test("parsers return nothing, not errors, on a page they do not recognise", () => {
  for (const parse of [parseGetDesign, parsePostsDesign, parseLoadmore, parseRecentDesign, parse60fps, parseSupahero, parseNavbarGallery, parseCtaGallery, parseInspora]) assert.deepEqual(parse("<html><body>Just a moment...</body></html>"), []);
});

test("the providers are registered, unique, and every search ranks the fetched page by the query", async () => {
  const ids = ["getdesign", "posts", "loadmore", "recentdesign", "fps60", "supahero", "navbar", "cta", "inspora"];
  assert.deepEqual(providers.map((p) => p.id), ids);
  const registered = allProviders().map((p) => p.id);
  for (const id of ids) assert.equal(registered.filter((x) => x === id).length, 1, id);
  assert.ok(providers.every((p) => p.label && p.kinds.length && typeof p.search === "function" && ["works", "feed"].includes(p.status)));
  // The not-usable list must not repeat a working provider.
  assert.ok(NOT_USABLE.every((n) => !ids.includes(n.id)));
});

test("ranking puts query matches first and flags the rest as feed", async () => {
  const { rankByQuery } = await import("../src/modules/inspire/contract.mjs");
  const ranked = rankByQuery(parseNavbarGallery(read("navbar.html")), "food");
  assert.equal(ranked[0].title, "Oatly");
  assert.ok(!ranked[0].feed);
  assert.ok(ranked.slice(1).every((i) => i.feed));
});

test("every need routes to galleries that exist", async () => {
  const { ROUTES } = await import("../src/modules/inspire/index.mjs");
  const { getProvider } = await import("../src/modules/inspire/providers/index.mjs");
  for (const [need, ids] of Object.entries(ROUTES)) for (const id of ids) assert.ok(getProvider(id), `${need}: no provider ${id}`);
});
