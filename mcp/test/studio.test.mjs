// Studio tools: procedural art, shader presets, 3D scenes, Poly Haven / ambientCG downloads, Blender discovery and render,
// motion recording, MCP Apps. Offline: the page builders, spec validation and file formats are checked without the network;
// anything that needs a CDN (three.js, Paper Shaders) or a third-party API runs only with DRIP_NET=1.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import { Jimp } from "jimp";

const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-studio-"));
process.env.DRIP_PROJECT_DIR = project;
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-studio-home-"));

const { findChrome } = await import("../src/core/chrome.mjs");
const { collectTools } = await import("../src/core/registry.mjs");
const { rng, simplex, fbm, mix, luminance, smoothPath, simplify, hexToRgb } = await import("../src/modules/studio/rng.mjs");
const art = await import("../src/modules/studio/art.mjs");
const { animatedWebp, inspectWebp, readStill } = await import("../src/modules/studio/webp.mjs");
const shader = await import("../src/modules/studio/shader.mjs");
const scene = await import("../src/modules/studio/scene.mjs");
const assets3d = await import("../src/modules/studio/assets3d.mjs");
const blender = await import("../src/modules/studio/blender.mjs");
const apps = await import("../src/core/apps.mjs");
const viewer = await import("../src/modules/studio/viewer.mjs");
const motion = await import("../src/modules/studio/motion.mjs");

const NET = process.env.DRIP_NET === "1";
const hasChrome = !!findChrome({});
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args, {});
  return { r, t: (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: (r.content || []).filter((c) => c.type === "image").length };
};
const file = (rel) => path.join(project, rel);

// ---- registry --------------------------------------------------------------------------------------------------------

test("the studio tools are in the registry, with a no-op registerResource sink", () => {
  for (const name of ["art_generate", "shader_hero", "scene_render", "assets_3d_search", "assets_3d_save", "blender_render", "motion_render"]) {
    assert.ok(tools.has(name), name);
    assert.equal(tools.get(name).module, "studio");
    assert.ok(tools.get(name).meta.description.length > 200, `${name}: the description is its documentation`);
    assert.match(tools.get(name).meta.description, /Example:|e\.g\./, `${name}: gives an example call`);
  }
  assert.ok(tools.get("art_generate").meta._meta.ui.resourceUri.startsWith("ui://drip/"));
});

// ---- random numbers, noise, colour ------------------------------------------------------------------------------------

test("seeded random numbers and noise repeat exactly; colour helpers behave", () => {
  const a = rng(42);
  const b = rng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(rng(1)(), rng(2)());
  const n1 = simplex(5);
  const n2 = simplex(5);
  assert.equal(n1(1.3, 2.7), n2(1.3, 2.7));
  for (let i = 0; i < 200; i++) assert.ok(Math.abs(fbm(n1, i * 0.37, i * 0.11)) <= 1.01);
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.ok(luminance("#ffffff") > 0.99 && luminance("#000000") < 0.01);
  assert.deepEqual(hexToRgb("#f00"), [255, 0, 0]);
  assert.throws(() => hexToRgb("nope"), /Not a hex colour/);
  assert.match(smoothPath([[0, 0], [10, 5], [20, 0], [30, 5]]), /^M0 0C/);
  assert.equal(simplify([[0, 0], [5, 0.01], [10, 0]], 0.5).length, 2);
});

// ---- art ---------------------------------------------------------------------------------------------------------------

test("every layer type draws something valid, in a sane size, and the same seed gives the same SVG", () => {
  for (const type of art.LAYER_TYPES) {
    const spec = { width: 800, height: 450, seed: 3, mood: "editorial", layers: [{ type, params: ["halftone", "dither"].includes(type) ? { field: "noise" } : {} }] };
    const one = art.buildArt(spec);
    assert.equal(one.svg, art.buildArt(spec).svg, `${type}: deterministic`);
    assert.notEqual(one.svg, art.buildArt({ ...spec, seed: 4 }).svg, `${type}: seed changes it`);
    assert.match(one.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 800 450"/);
    assert.ok(one.svg.endsWith("</svg>"));
    assert.ok(!/NaN|undefined|Infinity/.test(one.svg), `${type}: no broken numbers`);
    assert.ok(one.svg.length < 400_000, `${type}: ${Math.round(one.svg.length / 1024)} KB`);
    assert.ok(one.svg.length > 400, `${type}: it drew something`);
  }
});

test("a composition per mood returns an editable layer stack that re-runs to the same picture", () => {
  for (const mood of Object.keys(art.MOODS)) {
    const layers = art.composition(mood);
    assert.ok(layers.length >= 1 && layers.every((l) => art.LAYER_TYPES.includes(l.type)));
    const first = art.buildArt({ width: 640, height: 360, seed: 9, mood, layers });
    // what the tool returns (type, seed, params) is enough to reproduce it
    const again = art.buildArt({ width: 640, height: 360, seed: 9, palette: first.palette, layers: first.layers.map(({ type, seed, params }) => ({ type, seed, params })) });
    assert.equal(again.svg, first.svg, `${mood}: stack replays`);
    assert.match(art.describe(first), /palette #/);
  }
  const edited = art.buildArt({ width: 640, height: 360, seed: 9, mood: "technical", layers: [{ type: "contours", params: { levels: 3 } }] });
  assert.equal(edited.layers[0].info.levels, 3, "an edited parameter takes effect");
  assert.throws(() => art.buildArt({ layers: [{ type: "lava" }] }), /Unknown layer type "lava"/);
  assert.throws(() => art.buildArt({ palette: ["#fff", "red"], layers: [{ type: "blobs" }] }), /Not a hex colour/);
});

test("contours close into loops and flow lines keep their distance", () => {
  const c = art.buildArt({ width: 600, height: 400, seed: 2, palette: ["#fff", "#000"], layers: [{ type: "contours", params: { levels: 6, indexEvery: 0 } }] });
  assert.equal(c.layers[0].info.levels, 6);
  const f = art.buildArt({ width: 600, height: 400, seed: 2, palette: ["#fff", "#000"], layers: [{ type: "flow", params: { sep: 30 } }] });
  const dense = art.buildArt({ width: 600, height: 400, seed: 2, palette: ["#fff", "#000"], layers: [{ type: "flow", params: { sep: 10 } }] });
  assert.ok(dense.layers[0].info.lines > f.layers[0].info.lines, "smaller separation = more lines");
});

test("art_generate writes the svg, the spec and replays from the spec", async () => {
  const { r, t } = await call("art_generate", { mood: "bold", seed: 5, width: 800, height: 450, out: "public/img/hero.svg" });
  assert.notEqual(r.isError, true, t);
  assert.ok(fs.existsSync(file("public/img/hero.svg")) && fs.existsSync(file("public/img/hero.art.json")));
  const spec = JSON.parse(fs.readFileSync(file("public/img/hero.art.json"), "utf8"));
  assert.equal(spec.version, 1);
  assert.equal(spec.seed, 5);
  assert.ok(spec.layers.length >= 2 && spec.layers.every((l) => l.type && l.seed && l.params));
  assert.match(t, /Layer stack/);
  await call("art_generate", { from: "public/img/hero.art.json", out: "public/img/hero2.svg", optimize: false });
  assert.equal(fs.readFileSync(file("public/img/hero2.svg"), "utf8"), fs.readFileSync(file("public/img/hero.svg"), "utf8"), "from: a saved spec gives the identical svg");
  const edited = await call("art_generate", { from: "public/img/hero.art.json", seed: 6, out: "public/img/hero3.svg", optimize: false });
  assert.notEqual(fs.readFileSync(file("public/img/hero3.svg"), "utf8"), fs.readFileSync(file("public/img/hero.svg"), "utf8"));
  assert.ok(edited.t.includes("seed"));
  const bad = await call("art_generate", { out: "public/img/x.gif" });
  assert.equal(bad.r.isError, true);
  assert.match(bad.t, /\.svg, \.webp or \.png/);
  const outside = await call("art_generate", { out: "../escape.svg" });
  assert.equal(outside.r.isError, true);
  assert.match(outside.t, /outside the project/);
});

test("art_generate rasterises to png and webp in the browser", { skip: !hasChrome && "no Chrome/Edge", timeout: 90000 }, async () => {
  const { r, t, images } = await call("art_generate", { mood: "editorial", seed: 1, width: 640, height: 360, out: "public/img/raster.webp" });
  assert.notEqual(r.isError, true, t);
  assert.equal(images, 1);
  const webp = fs.readFileSync(file("public/img/raster.webp"));
  assert.deepEqual({ w: inspectWebp(webp).width, h: inspectWebp(webp).height, animated: inspectWebp(webp).animated }, { w: 640, h: 360, animated: false });
  await call("art_generate", { mood: "calm", seed: 1, width: 320, height: 200, out: "public/img/raster.png" });
  const png = await Jimp.read(file("public/img/raster.png"));
  assert.equal(png.width, 320);
  assert.equal(png.height, 200);
  const resvg = await call("art_generate", { mood: "calm", width: 320, height: 200, out: "public/img/resvg.png", rasterizer: "resvg" });
  if (resvg.r.isError) assert.match(resvg.t, /@resvg\/resvg-js is not installed/, "optional rasteriser explains how to install it");
});

// ---- animated WebP -------------------------------------------------------------------------------------------------------

// a 1x1 lossless WebP
const STILL = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");

test("animated WebP is assembled from stills and can be read back", () => {
  const still = readStill(STILL);
  assert.deepEqual([still.width, still.height], [1, 1]);
  const anim = animatedWebp([STILL, STILL, STILL], { fps: 10 });
  assert.deepEqual(inspectWebp(anim), { animated: true, frames: 3, width: 1, height: 1, loop: 0 });
  assert.equal(anim.readUInt32LE(4), anim.length - 8, "RIFF size is right");
  assert.throws(() => animatedWebp([]), /No frames/);
  assert.throws(() => readStill(Buffer.from("not a webp at all, no")), /Not a WebP/);
});

test("Chrome decodes the animated WebP we build", { skip: !hasChrome && "no Chrome/Edge", timeout: 60000 }, async () => {
  const { withTab, openPage } = await import("../src/core/browser.mjs");
  const anim = animatedWebp([STILL, STILL], { fps: 5 });
  const html = path.join(project, "webp-check.html");
  fs.writeFileSync(html, `<!doctype html><img id=i src="data:image/webp;base64,${anim.toString("base64")}">`);
  const ok = await withTab({}, async (tab) => {
    await openPage(tab, `file:///${html.replace(/\\/g, "/")}`, { width: 100, height: 100, settleMs: 100 });
    const { result } = await tab.s("Runtime.evaluate", { expression: "(async () => { const i = document.getElementById('i'); await i.decode(); return i.naturalWidth })()", awaitPromise: true, returnByValue: true });
    return result.value;
  });
  assert.equal(ok, 1);
});

// ---- shader presets ------------------------------------------------------------------------------------------------------

test("every shader preset has defaults, a fragment shader and a snippet; the page pins the library", () => {
  assert.ok(shader.PRESET_NAMES.length >= 15);
  const seen = new Set();
  for (const name of shader.PRESET_NAMES) {
    const def = shader.PRESETS[name];
    assert.ok(def.component && def.fragment && def.about, name);
    assert.ok(!seen.has(def.fragment), "one fragment shader per preset");
    seen.add(def.fragment);
    const params = shader.resolveParams(name);
    assert.ok(Object.keys(params).length >= 2);
    const page = shader.shaderPage(name, {}, { width: 640, height: 360 });
    assert.ok(page.includes(`@paper-design/shaders@${shader.SHADERS_VERSION}/+esm`), "pinned version");
    assert.ok(page.includes(def.fragment));
    const s = shader.snippets(name, {});
    assert.ok(s.react.includes(`<${def.component}`) && s.react.includes("@paper-design/shaders-react"));
    assert.ok(s.vanilla.includes(def.fragment));
  }
  assert.match(shader.SHADERS_VERSION, /^\d+\.\d+\.\d+$/);
});

test("shader parameters are checked: unknown names are rejected with the valid list", () => {
  assert.throws(() => shader.resolveParams("mesh-gradient", { sparkle: 1 }), /no parameter "sparkle".*distortion/);
  assert.throws(() => shader.resolveParams("nope"), /Unknown preset/);
  assert.equal(shader.resolveParams("mesh-gradient", { distortion: 0.2 }).distortion, 0.2);
  assert.equal(shader.resolveParams("grain-gradient", { shape: "wave" }).colors.length, 4, "defaults fill the rest");
  const page = shader.shaderPage("dithering", { colorFront: "#ff0000" }, { width: 100, height: 100 });
  assert.ok(page.includes('"colorFront":"#ff0000"'));
});

test("shader_hero fails clearly when the preset is unknown", async () => {
  const bad = await call("shader_hero", { preset: "mesh-gradient", params: { nonsense: 1 } });
  assert.equal(bad.r.isError, true);
  assert.match(bad.t, /no parameter "nonsense"/);
});

// ---- scenes --------------------------------------------------------------------------------------------------------------

test("mockups are valid scenes; the page loads a pinned three.js and escapes the spec", () => {
  for (const kind of scene.MOCKUPS) {
    const spec = scene.mockupScene(kind, { image: "shot.png" });
    scene.sceneSchema.parse(spec);
    assert.equal(spec.objects[0].decal.image, "shot.png");
  }
  assert.throws(() => scene.mockupScene("tv"), /Unknown mockup/);
  const page = scene.scenePage({ width: 100, height: 100, background: "#fff", objects: [{ type: "box", material: { color: "#fff" }, name: "</script><b>" }] });
  assert.ok(page.includes(`three@${scene.THREE_VERSION}/build/three.module.js`));
  assert.ok(page.includes("three/addons/"));
  assert.ok(!page.includes("</script><b>"), "spec text cannot close the script");
  assert.match(scene.THREE_VERSION, /^\d+\.\d+\.\d+$/);
});

test("the scene schema rejects what it cannot draw, with readable errors", () => {
  assert.throws(() => scene.sceneSchema.parse({ objects: [] }), /too_small|at least 1/i);
  assert.throws(() => scene.sceneSchema.parse({ objects: [{ type: "teapot" }] }), /Invalid option|teapot/i);
  assert.throws(() => scene.sceneSchema.parse({ background: "blue", objects: [{ type: "box" }] }), /hex colour/);
  assert.throws(() => scene.sceneSchema.parse({ width: 20, objects: [{ type: "box" }] }), /too_small|>=200/i);
});

test("prepareScene inlines local images and picks PBR maps from a texture folder", async () => {
  fs.mkdirSync(file("assets/3d/wood"), { recursive: true });
  for (const name of ["Wood_Color.jpg", "Wood_NormalGL.jpg", "Wood_NormalDX.jpg", "Wood_Roughness.jpg", "Wood_AmbientOcclusion.jpg", "Wood_Displacement.jpg"]) await new Jimp({ width: 8, height: 8, color: 0x886644ff }).write(file(`assets/3d/wood/${name}`));
  await new Jimp({ width: 40, height: 80, color: 0xff0000ff }).write(file("shot.png"));
  const maps = scene.findPbrMaps("assets/3d/wood");
  assert.deepEqual(Object.keys(maps).sort(), ["aoMap", "map", "normalMap", "roughnessMap"]);
  assert.match(maps.normalMap, /NormalGL/, "the OpenGL normal map, not DirectX");
  const prepared = await scene.prepareScene({ objects: [{ type: "box", material: { pbrFolder: "assets/3d/wood" }, decal: { image: "shot.png" } }] });
  assert.match(prepared.objects[0].decal.image, /^data:image\/jpeg;base64,/);
  assert.match(prepared.objects[0].material.map, /^data:image\//);
  assert.match(prepared.objects[0].material.normalMap, /^data:image\//);
  await assert.rejects(scene.prepareScene({ objects: [{ type: "box", decal: { image: "../../etc/passwd" } }] }), /outside the project/);
});

test("scene_render rejects a bad scene before opening a browser", async () => {
  const bad = await call("scene_render", { scene: { objects: [{ type: "box" }], width: 50 } });
  assert.equal(bad.r.isError, true);
  const none = await call("scene_render", {});
  assert.equal(none.r.isError, true);
  assert.match(none.t, /Pass mockup/);
});

test("scene_render draws a mockup (needs three.js from the CDN)", { skip: !NET && "set DRIP_NET=1", timeout: 120000 }, async () => {
  const { r, t, images } = await call("scene_render", { mockup: "phone", image: "shot.png", width: 640, height: 400, turntable: { frames: 4 }, out: "public/img/phone.png" });
  assert.notEqual(r.isError, true, t);
  assert.ok(images >= 1);
  const png = await Jimp.read(file("public/img/phone.png"));
  assert.equal(png.width, 640);
  assert.ok(fs.existsSync(file("public/img/phone.scene.json")));
  assert.equal(inspectWebp(fs.readFileSync(file("public/img/phone-turntable.webp"))).frames, 4);
});

test("shader_hero renders a still and a loop (needs Paper Shaders from the CDN)", { skip: !NET && "set DRIP_NET=1", timeout: 120000 }, async () => {
  const { r, t } = await call("shader_hero", { preset: "mesh-gradient", width: 640, height: 360, frames: 3, duration: 1, out: "public/img/shader.webp" });
  assert.notEqual(r.isError, true, t);
  const still = inspectWebp(fs.readFileSync(file("public/img/shader.webp")));
  assert.deepEqual([still.width, still.height, still.animated], [640, 360, false]);
  assert.equal(inspectWebp(fs.readFileSync(file("public/img/shader-loop.webp"))).frames, 3);
});

// ---- 3D assets ---------------------------------------------------------------------------------------------------------

function makeZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const { name, data, store } of entries) {
    const body = store ? data : zlib.deflateRawSync(data);
    const crc = zlib.crc32(data);
    const nameBuf = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(store ? 0 : 8, 8);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    locals.push(head, nameBuf, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(store ? 0 : 8, 10);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test("zip files are read (stored and deflated) and extraction cannot leave its folder", () => {
  const zip = makeZip([{ name: "a/Color.jpg", data: Buffer.from("colour-bytes".repeat(50)) }, { name: "Roughness.jpg", data: Buffer.from("rough"), store: true }, { name: "dir/", data: Buffer.alloc(0), store: true }]);
  const entries = assets3d.unzip(zip);
  assert.deepEqual(entries.map((e) => e.name), ["a/Color.jpg", "Roughness.jpg"]);
  assert.equal(entries[0].data.toString(), "colour-bytes".repeat(50));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-unzip-"));
  assert.deepEqual(assets3d.extractTo(entries, dir), ["a/Color.jpg", "Roughness.jpg"]);
  assert.ok(fs.existsSync(path.join(dir, "a", "Color.jpg")));
  assert.throws(() => assets3d.extractTo([{ name: "../evil.txt", data: Buffer.from("x") }], dir), /outside the folder/);
  assert.throws(() => assets3d.unzip(Buffer.from("not a zip")), /Not a zip/);
});

test("asset search ranks by words, then popularity", () => {
  const map = { wood_a: { name: "Wood A", tags: ["wood"], download_count: 5 }, wood_b: { name: "Wood B", tags: ["wood", "dark"], download_count: 50 }, stone: { name: "Stone", tags: ["rock"], download_count: 999 } };
  assert.deepEqual(assets3d.rankAssets(map, "wood dark", 5).map((r) => r.id), ["wood_b", "wood_a"]);
  assert.deepEqual(assets3d.rankAssets(map, "", 2).map((r) => r.id), ["stone", "wood_b"]);
});

test("assets_3d_search and assets_3d_save download into the project with provenance (stubbed APIs)", async () => {
  const realFetch = globalThis.fetch;
  const hdr = Buffer.from("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n....");
  const zip = makeZip([{ name: "Wood_1K-JPG_Color.jpg", data: Buffer.from("c") }, { name: "Wood_1K-JPG_NormalGL.jpg", data: Buffer.from("n") }]);
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith("https://api.polyhaven.com/assets?t=hdris")) return json({ studio_test: { name: "Studio Test", tags: ["studio"], categories: ["indoor"], authors: { Ann: "All" }, max_resolution: [4096, 2048], download_count: 10 } });
    if (u.startsWith("https://api.polyhaven.com/files/studio_test")) return json({ hdri: { "1k": { hdr: { url: "https://dl.test/studio_test_1k.hdr" } }, "2k": { hdr: { url: "https://dl.test/studio_test_2k.hdr" } } } });
    if (u.startsWith("https://api.polyhaven.com/info/studio_test")) return json({ type: 0, authors: { Ann: "All" } });
    if (u.startsWith("https://dl.test/studio_test_2k.hdr")) return new Response(hdr, { status: 200 });
    if (u.startsWith("https://ambientcg.com/api/v2/full_json?id=Wood1")) return json({ foundAssets: [{ assetId: "Wood1", dataType: "Material", shortLink: "https://ambientcg.com/a/Wood1", downloadFolders: { default: { downloadFiletypeCategories: { zip: { downloads: [{ attribute: "1K-JPG", downloadLink: "https://dl.test/Wood1_1K-JPG.zip" }] } } } } }] });
    if (u.startsWith("https://dl.test/Wood1_1K-JPG.zip")) return new Response(zip, { status: 200 });
    if (u.includes("cdn.polyhaven.com") || u.includes("ambientcg")) return new Response(Buffer.alloc(0), { status: 404 });
    throw new Error(`unexpected request ${u}`);
  };
  try {
    const s = await call("assets_3d_search", { type: "hdri", query: "studio", source: "polyhaven" });
    assert.match(s.t, /Listing L\d+: hdris for "studio"/);
    assert.match(s.t, /Studio Test — polyhaven/);
    const tag = s.t.match(/Listing (L\d+)/)[1];
    const saved = await call("assets_3d_save", { asset: `${tag}-1`, resolution: "2k" });
    assert.notEqual(saved.r.isError, true, saved.t);
    assert.ok(fs.existsSync(file("assets/3d/polyhaven/studio_test/studio_test_2k.hdr")));
    const prov = JSON.parse(fs.readFileSync(file("assets/3d/polyhaven/studio_test/provenance.json"), "utf8"));
    assert.deepEqual([prov.source, prov.id, prov.kind, prov.authors, prov.url], ["polyhaven", "studio_test", "hdri", ["Ann"], "https://polyhaven.com/a/studio_test"]);
    const log = JSON.parse(fs.readFileSync(file(".drip/assets.json"), "utf8"));
    assert.ok(log.some((e) => e.file === "assets/3d/polyhaven/studio_test/studio_test_2k.hdr" && e.author === "Ann" && e.source === "https://polyhaven.com/a/studio_test"));
    const buf = await assets3d.hdrBuffer("studio_test", "2k");
    assert.equal(buf.toString("latin1", 0, 10), "#?RADIANCE");

    const m = await call("assets_3d_save", { asset: "ambientcg:Wood1" });
    assert.notEqual(m.r.isError, true, m.t);
    assert.deepEqual(fs.readdirSync(file("assets/3d/ambientcg/Wood1")).sort(), ["Wood_1K-JPG_Color.jpg", "Wood_1K-JPG_NormalGL.jpg", "provenance.json"]);
    assert.match(m.t, /pbrFolder: "assets\/3d\/ambientcg\/Wood1"/);

    const none = await call("assets_3d_save", { asset: "unsplash:abc" });
    assert.equal(none.r.isError, true);
    const outside = await call("assets_3d_save", { asset: "ambientcg:Wood1", dest: "../elsewhere" });
    assert.equal(outside.r.isError, true);
    assert.match(outside.t, /outside the project/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("live: Poly Haven and ambientCG answer", { skip: !NET && "set DRIP_NET=1", timeout: 90000 }, async () => {
  const s = await call("assets_3d_search", { type: "hdri", query: "studio", limit: 6 });
  assert.match(s.t, /Listing L\d+/);
  assert.ok(s.images >= 1);
  const t = await call("assets_3d_search", { type: "texture", query: "wood", source: "ambientcg", limit: 4 });
  assert.match(t.t, /ambientcg/);
});

// ---- Blender -------------------------------------------------------------------------------------------------------------

test("Blender is found in the usual places, newest version first, without running anything", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "drip-blender-find-"));
  const bf = path.join(root, "Blender Foundation");
  for (const v of ["Blender 2.93", "Blender 4.2", "Blender 5.1", "Blender 4.10"]) {
    fs.mkdirSync(path.join(bf, v), { recursive: true });
    fs.writeFileSync(path.join(bf, v, "blender.exe"), "");
  }
  const cands = blender.blenderCandidates({ ProgramFiles: root, PATH: "" }, "win32");
  const versions = cands.filter((c) => c.includes("Blender Foundation") && c.includes(root)).map((c) => path.basename(path.dirname(c)));
  assert.deepEqual(versions, ["Blender 5.1", "Blender 4.10", "Blender 4.2", "Blender 2.93"]);
  assert.equal(blender.findBlender({}, { ProgramFiles: root, PATH: "" }, "win32"), path.join(bf, "Blender 5.1", "blender.exe"));
  const explicit = path.join(root, "mine.exe");
  fs.writeFileSync(explicit, "");
  assert.equal(blender.findBlender({}, { DRIP_BLENDER: explicit, ProgramFiles: root, PATH: "" }, "win32"), explicit, "DRIP_BLENDER wins");
  assert.equal(blender.findBlender({ blender: { path: explicit } }, { ProgramFiles: root, PATH: "" }, "win32"), explicit, "config path wins");
  const onPath = path.join(root, "bin");
  fs.mkdirSync(onPath);
  fs.writeFileSync(path.join(onPath, "blender"), "");
  assert.equal(blender.findBlender({}, { PATH: onPath }, "linux"), path.join(onPath, "blender"), "PATH lookup");
  assert.equal(blender.findBlender({}, { PATH: "" }, "darwin"), fs.existsSync("/Applications/Blender.app/Contents/MacOS/Blender") ? "/Applications/Blender.app/Contents/MacOS/Blender" : null);
});

test("the Blender spec turns images into files and takes the scene as data, not code", async () => {
  await new Jimp({ width: 20, height: 40, color: 0x00ff00ff }).write(file("label.png"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-bspec-"));
  const spec = await blender.blenderSpec({ width: 100, height: 100, objects: [{ type: "box", decal: { image: "label.png" }, material: { color: "#fff" } }] }, dir, { samples: 8 });
  assert.equal(spec.samples, 8);
  assert.ok(path.isAbsolute(spec.objects[0].decal.image) && fs.existsSync(spec.objects[0].decal.image));
  const evil = await blender.blenderSpec({ objects: [{ type: "box", material: { color: '"; import os; os.system("x") #' } }] }, dir);
  assert.ok(JSON.stringify(evil).includes("import os"), "kept as a JSON string for the script to read as data");
});

test("blender_render renders a real image when Blender is installed", { skip: !blender.findBlender({}) && "Blender is not installed", timeout: 240000 }, async () => {
  const { r, t, images } = await call("blender_render", { scene: { width: 240, height: 200, background: "#e9e6df", objects: [{ type: "box", size: [1, 1, 1], material: { color: "#d45a2a", roughness: 0.4 } }] }, samples: 4, out: "public/img/blender.png" });
  assert.notEqual(r.isError, true, t);
  assert.equal(images, 1);
  const png = await Jimp.read(file("public/img/blender.png"));
  assert.deepEqual([png.width, png.height], [240, 200]);
  const mid = png.getPixelColor(120, 100);
  const corner = png.getPixelColor(2, 2);
  assert.notEqual(mid, corner, "the object is in the picture");
  assert.ok(fs.existsSync(file("public/img/blender.scene.json")));
});

// ---- motion ----------------------------------------------------------------------------------------------------------------

test("motion_render steps CSS animations and transitions and reports their timings", { skip: !hasChrome && "no Chrome/Edge", timeout: 90000 }, async () => {
  fs.mkdirSync(file("site"), { recursive: true });
  fs.writeFileSync(file("site/anim.html"), `<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#f4efe6}
.card{position:absolute;left:40px;top:40px;width:120px;height:70px;background:#1f3bff;transition:transform .4s cubic-bezier(.2,.8,.2,1),background-color .4s}
.card:hover{transform:translateY(-20px) scale(1.2);background-color:#e8452c}
.box{position:absolute;left:300px;top:40px;width:50px;height:50px;background:#111;animation:slide 1s ease-in-out forwards}
@keyframes slide{from{transform:translateX(0)}to{transform:translateX(120px)}}
</style><div class=card id=c></div><div class=box></div>`);
  const { r, t, images } = await call("motion_render", { target: "site/anim.html", before: [{ action: "hover", selector: "#c" }], fps: 10, width: 480, height: 240, out: "public/motion/anim.webp" });
  assert.notEqual(r.isError, true, t);
  assert.equal(images, 1);
  assert.match(t, /\(seek, 10 fps stepped\)/);
  assert.match(t, /transition transform on #c: 400 ms, cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
  assert.match(t, /animation slide on div\.box: 1000 ms, ease-in-out/);
  const info = inspectWebp(fs.readFileSync(file("public/motion/anim.webp")));
  assert.equal(info.animated, true);
  assert.equal(info.frames, Number(t.match(/Recorded (\d+) frames/)[1]));
  assert.deepEqual([info.width, info.height], [480, 240]);
  assert.ok(motion.naturalDuration([{ duration: 400, delay: 0, iterations: 1 }, { duration: 1000, delay: 100, iterations: 1 }, { duration: 50, iterations: Infinity }]) === 1100);
  const nope = await call("motion_render", { target: "site/anim.html", before: [{ action: "hover", selector: "#missing" }] });
  assert.equal(nope.r.isError, true);
  assert.match(nope.t, /No element matches "#missing"/);
});

test("pages with script-driven motion fall back to live recording and say so", { skip: !hasChrome && "no Chrome/Edge", timeout: 90000 }, async () => {
  fs.writeFileSync(file("site/raf.html"), `<!doctype html><body style="margin:0"><div id=b style="width:40px;height:40px;background:#e00;position:absolute"></div><script>let x=0;(function f(){x=(x+4)%300;b.style.left=x+'px';requestAnimationFrame(f)})()</script>`);
  const { r, t } = await call("motion_render", { target: "site/raf.html", duration: 0.5, fps: 8, width: 400, height: 200 });
  assert.notEqual(r.isError, true, t);
  assert.match(t, /recorded live/);
  assert.match(t, /\(live, achieved/);
});

// ---- MCP Apps -----------------------------------------------------------------------------------------------------------

test("MCP Apps helpers follow the spec: mime type, tool metadata, resources, capability check", () => {
  assert.equal(apps.APP_MIME, "text/html;profile=mcp-app");
  assert.equal(apps.UI_EXTENSION, "io.modelcontextprotocol/ui");
  assert.deepEqual(apps.appToolMeta("ui://drip/x").ui, { resourceUri: "ui://drip/x" });
  assert.equal(apps.appToolMeta("ui://drip/x")["ui/resourceUri"], "ui://drip/x", "deprecated flat key kept for older hosts");
  assert.deepEqual(apps.appToolMeta("ui://drip/x", { visibility: ["app"] }).ui.visibility, ["app"]);

  const registered = [];
  const fake = { registerResource: (name, uri, config, read) => registered.push({ name, uri, config, read }) };
  assert.equal(apps.registerAppResource(fake, { uri: "ui://drip/x", name: "x", html: "<p>hi</p>" }), true);
  assert.equal(registered[0].uri, "ui://drip/x");
  assert.equal(registered[0].config.mimeType, apps.APP_MIME);
  assert.equal(apps.registerAppResource({}, { uri: "ui://drip/x", name: "x", html: "" }), false, "the CLI and registry sinks ignore it");

  const plain = { content: [{ type: "text", text: "ok" }] };
  const noUi = { server: { getClientCapabilities: () => ({}) } };
  const withUi = { server: { getClientCapabilities: () => ({ extensions: { [apps.UI_EXTENSION]: { mimeTypes: [apps.APP_MIME] } } }) } };
  assert.equal(apps.hostSupportsApps(noUi), false);
  assert.equal(apps.hostSupportsApps(withUi), true);
  assert.equal(apps.hostSupportsApps(undefined), false);
  assert.equal(apps.withApp(noUi, plain, "ui://drip/x", { a: 1 }), plain, "no UI data for hosts without Apps");
  const rich = apps.withApp(withUi, plain, "ui://drip/x", { a: 1 });
  assert.deepEqual(rich.structuredContent, { a: 1 });
  assert.equal(rich._meta.ui.resourceUri, "ui://drip/x");
  assert.equal(rich.content, plain.content, "the normal content is untouched");
});

test("the registered studio server exposes the View as a resource and tool metadata", async () => {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { registerAll } = await import("../src/core/registry.mjs");
  const server = new McpServer({ name: "drip", version: "0" });
  registerAll(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "t", version: "0" }, { capabilities: { extensions: { [apps.UI_EXTENSION]: { mimeTypes: [apps.APP_MIME] } } } });
  await Promise.all([server.connect(a), client.connect(b)]);
  const list = await client.listTools();
  const art = list.tools.find((x) => x.name === "art_generate");
  assert.equal(art._meta.ui.resourceUri, viewer.VIEWER_URI);
  const res = await client.readResource({ uri: viewer.VIEWER_URI });
  assert.equal(res.contents[0].mimeType, apps.APP_MIME);
  assert.match(res.contents[0].text, /ui\/initialize/);
  assert.match(res.contents[0].text, /ui\/notifications\/initialized/);
  assert.equal(apps.hostSupportsApps(server), true);
  const out = await client.callTool({ name: "art_generate", arguments: { kind: "blobs", seed: 1, width: 400, height: 300 } });
  if (hasChrome) {
    assert.ok(out.structuredContent?.kind === "studio", "an Apps host receives the View data");
    assert.equal(out.structuredContent.tool, "art_generate");
    assert.ok(out.structuredContent.controls.some((c) => c.key === "seed"));
    assert.match(out.structuredContent.image, /^data:image\/jpeg;base64,/);
  }
  assert.ok(out.content.some((c) => c.type === "text"), "text is always there");
  await client.close();
});

test("the View completes the handshake, shows the result, and calls the tool again when a control changes", { skip: !hasChrome && "no Chrome/Edge", timeout: 60000 }, async () => {
  const { withTab, openPage } = await import("../src/core/browser.mjs");
  const host = path.join(project, "host.html");
  const safe = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const tiny = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  const first = { content: [{ type: "text", text: "x" }], structuredContent: { kind: "studio", tool: "art_generate", args: { seed: 1, out: "public/a.svg", layers: [{ type: "blobs", params: { count: 3 } }] }, title: "First", summary: "s", image: tiny, controls: [{ key: "seed", label: "Seed", type: "number", value: 1 }, { key: "layers.0.params.count", label: "count", type: "range", min: 1, max: 9, step: 1, value: 3 }] } };
  const second = { ...first, structuredContent: { ...first.structuredContent, title: "Second", args: { seed: 1, layers: [{ type: "blobs", params: { count: 7 } }] } } };
  fs.writeFileSync(
    host,
    `<!doctype html><body><iframe id=f style="width:600px;height:500px;border:0"></iframe><script>
window.__log = [];
const frame = document.getElementById('f');
frame.srcdoc = ${safe(viewer.viewerHtml())};
const send = (m) => frame.contentWindow.postMessage({ jsonrpc: '2.0', ...m }, '*');
window.addEventListener('message', (ev) => {
  const m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
  window.__log.push(m.method || 'response');
  if (m.method === 'ui/initialize') { window.__init = m.params; send({ id: m.id, result: { protocolVersion: m.params.protocolVersion, hostInfo: { name: 'test-host', version: '1' }, hostCapabilities: {}, hostContext: { theme: 'light' } } }); }
  else if (m.method === 'ui/notifications/initialized') { send({ method: 'ui/notifications/tool-result', params: ${safe(first)} }); }
  else if (m.method === 'tools/call') { window.__call = m.params; send({ id: m.id, result: ${safe(second)} }); }
});
</script>`,
  );
  const out = await withTab({}, async (tab) => {
    await openPage(tab, `file:///${host.replace(/\\/g, "/")}`, { width: 700, height: 600, settleMs: 100 });
    const ev = async (expr) => (await tab.s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    const inner = (js) => `(() => { const d = document.getElementById('f').contentDocument; return ${js}; })()`;
    const until = async (js, ms = 8000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if (await ev(inner(js))) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };
    const shown = await until("d.getElementById('t').textContent === 'First'");
    const init = await ev("window.__init");
    const controls = await ev(inner("d.querySelectorAll('#c label').length"));
    const saveVisible = await ev(inner("!d.getElementById('save').hidden"));
    // change the range control: the View must call the tool with the new value and without `out`
    await ev(inner("(() => { const i = d.querySelectorAll('#c input')[1]; i.value = '7'; i.dispatchEvent(new Event('input')); return 1 })()"));
    const updated = await until("d.getElementById('t').textContent === 'Second'");
    const call2 = await ev("window.__call");
    const log = await ev("window.__log");
    const saveStill = await ev(inner("!d.getElementById('save').hidden"));
    return { shown, init, controls, saveVisible, updated, call2, log, saveStill };
  });
  assert.equal(out.shown, true, "the tool result was rendered");
  assert.equal(out.init.protocolVersion, apps.APP_SPEC_VERSION);
  assert.equal(out.init.appInfo.name, "drip-view");
  assert.deepEqual(out.log.slice(0, 2), ["ui/initialize", "ui/notifications/initialized"]);
  assert.equal(out.controls, 2);
  assert.equal(out.saveVisible, true, "Save is offered when the call had an out path");
  assert.equal(out.updated, true, "the new result replaced the old one");
  assert.equal(out.call2.name, "art_generate");
  assert.equal(out.call2.arguments.layers[0].params.count, 7);
  assert.equal(out.call2.arguments.out, undefined, "exploring does not write files");
  assert.equal(out.saveStill, true, "the original out path is remembered for Save");
});

test.after(async () => {
  const { closeBrowser } = await import("../src/core/browser.mjs");
  await closeBrowser();
});
