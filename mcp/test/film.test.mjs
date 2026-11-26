// Drip Film recording: good frames only, where each write landed, and the story before building (refs, assets, pieces).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Jimp } from "jimp";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
process.env.DRIP_NO_INSTALL = "1";
process.env.DRIP_NO_OPEN = "1";
const project = tmp("film");
process.env.CLAUDE_PROJECT_DIR = project;

const film = await import("../src/core/film.mjs");
const { claimRecorder, frameVerdict, flatShare, openLiveFilm } = await import("../src/modules/film/index.mjs");
const { filmRecord, filmAsset, filmFlush } = await import("../src/modules/film/record.mjs");
const state = await import("../src/core/state.mjs");

const png = async (w, h, paint) => {
  const img = new Jimp({ width: w, height: h, color: 0xffffffff });
  if (paint) paint(img);
  return img.getBuffer("image/png");
};

test("frames: error overlays, loading pages and blank pages are never kept", async () => {
  const page = { error: false, loading: false, text: 900, media: 6, height: 4000 };
  assert.equal(frameVerdict({ ...page, error: true }, 0.2), "error overlay");
  assert.equal(frameVerdict({ ...page, loading: true }, 0.2), "still loading");
  assert.equal(frameVerdict(page, 0.99), "blank", "nearly one flat colour");
  assert.equal(frameVerdict({ ...page, text: 0, media: 0 }, 0.4), "blank", "nothing on the page");
  assert.equal(frameVerdict(null, 0), "no page");
  assert.equal(frameVerdict(page, 0.6), null, "a real page is kept");

  const white = await png(320, 200);
  assert.ok((await flatShare(white)) > 0.99, "a white frame is flat");
  const striped = await png(320, 200, (img) => {
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) if (Math.floor(x / 40) % 2) img.setPixelColor(y < 100 ? 0x1b2333ff : 0xe0663aff, x, y);
  });
  assert.ok((await flatShare(striped)) < 0.6, "a page with content is not flat");
});

test("writes: hints say where on the page a write lands", () => {
  const h = film.writeHints("src/components/footer-3.tsx", '<footer id="site-footer" className="py-24">');
  assert.deepEqual(h.slice(0, 3), ["site-footer", "footer-3", "footer"]);
  assert.deepEqual(film.writeHints("src/sections/PricingTable.tsx", "export function PricingTable() {}"), ["pricing-table"]);
  const app = film.writeHints("src/App.tsx", "<Nav />\n<Hero />\n<Pricing />");
  assert.ok(app.includes("pricing") && app.includes("hero"), "a generic file names the sections it renders");
  assert.ok(!app.includes("app"));
  assert.ok(film.writeHints("src/sections/x.tsx", '<section data-section="faq">').includes("faq"));
});

test("the film: process events with their agent, write targets, frames, start/stop and done", async () => {
  const task = { id: "t_story", title: "Kiln", startedAt: new Date(Date.now() - 600000).toISOString() };
  const at = (s) => new Date(Date.now() - 600000 + s * 1000).toISOString();
  const ev = (e) => fs.appendFileSync(path.join(film.filmDir(task.id), "events.jsonl"), `${JSON.stringify(e)}\n`);
  fs.mkdirSync(film.filmDir(task.id), { recursive: true });
  ev({ t: at(1), ...film.startEvent({ subagent_type: "drip:scout", description: "Style refs", prompt: "Find style refs" }) });
  // the server logs the reference (no agent), the hook logs the same call with the scout's agent_id
  ev({ t: at(5), kind: "ref", tool: "refs_site", title: "Linear", url: "https://linear.app", image: "thumbs/ref-1.jpg", from: "refs_site" });
  ev({ t: at(6), kind: "tool", tool: "refs_site", agent: "sc-1", type: "drip:scout", summary: "refs site" });
  ev({ t: at(7), kind: "end", agent: "sc-1", type: "drip:scout" });
  ev({ t: at(8), kind: "piece", tool: "pieces_preview", name: "magicui marquee", url: "https://magicui.design/docs/components/marquee", image: "thumbs/piece-1.jpg" });
  ev({ t: at(9), kind: "tool", tool: "pieces_preview", agent: "main", summary: "looked at 1 pieces" });
  ev({ t: at(10), kind: "piece", tool: "pieces_install", name: "magicui marquee", url: "https://magicui.design/r/marquee.json", picked: true });
  ev({ t: at(11), kind: "asset", tool: "images_save", file: "public/img/hero.webp", assetKind: "photo", src: "https://unsplash.com/x", image: "thumbs/asset-1.webp" });
  const write = { t: at(20), kind: "write", agent: "main", tool: "Write", file: "src/components/footer.tsx", hints: ["footer"], summary: "wrote footer.tsx (40 lines)" };
  ev(write);
  ev({ t: at(21), kind: "write", agent: "main", tool: "Edit", file: "src/lib/utils.ts", hints: [], summary: "edited utils.ts" });

  // targets: one write is pending until a frame finds it; a miss is tried again, then given up
  const pending = film.pendingTargets(task);
  assert.deepEqual(pending.map((p) => p.key), [film.writeKey(write)], "a write with nothing to look for is never pending");
  film.saveTargets(task, {}, [film.writeKey(write)]);
  assert.equal(film.pendingTargets(task).length, 1, "one miss: looked for again");
  film.addFrame(task, Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { width: 720, height: 2400, scale: 0.5, pageHeight: 4800, url: "http://127.0.0.1:5173/" });
  film.saveTargets(task, { [film.writeKey(write)]: { selector: "footer", x: 0, y: 2200, w: 720, h: 200, frame: "frames/0001.jpg" } }, []);
  assert.equal(film.pendingTargets(task).length, 0);

  const f = film.buildFilm({ ...task, endedAt: new Date(Date.now() + 1000).toISOString() });
  const scout = f.agents.find((a) => a.type === "scout");
  assert.equal(scout.id, "sc-1");
  const ref = f.events.find((e) => e.kind === "ref");
  assert.equal(ref.agent, "sc-1", "the reference belongs to the scout that looked at it");
  assert.equal(ref.title, "Linear");
  assert.equal(ref.image, "thumbs/ref-1.jpg");
  const picked = f.events.find((e) => e.kind === "piece" && e.picked);
  assert.equal(picked.image, "thumbs/piece-1.jpg", "a picked piece shows the picture it was previewed with");
  const asset = f.events.find((e) => e.kind === "asset");
  assert.equal(asset.file, "public/img/hero.webp");
  assert.equal(asset.assetKind, "photo");
  const w = f.events.find((e) => e.kind === "write" && e.file === "src/components/footer.tsx");
  assert.deepEqual(w.target, { selector: "footer", x: 0, y: 2200, w: 720, h: 200, frame: "frames/0001.jpg" });
  assert.ok(!f.events.find((e) => e.file === "src/lib/utils.ts").target);
  const fr = f.events.find((e) => e.kind === "frame");
  assert.equal(fr.image, "frames/0001.jpg");
  assert.equal(fr.url, "http://127.0.0.1:5173/");
  assert.equal(f.frames[0].scale, 0.5);
  const start = f.events.find((e) => e.kind === "start");
  assert.equal(start.id, "sc-1");
  assert.equal(start.type, "scout");
  assert.equal(start.label, "Style refs");
  assert.equal(f.events.find((e) => e.kind === "stop").id, "sc-1");
  assert.equal(f.events.at(-1).kind, "done");
  assert.equal(f.version, 2);
});

test("the recorder saves thumbnails for references and assets", async () => {
  state.updateState((st) => {
    st.task = state.newTask({ title: "Kiln landing", size: "full", surface: "landing", guides: [] });
  });
  const task = state.loadState().task;
  const shot = await png(1440, 900, (img) => {
    for (let x = 0; x < 700; x++) for (let y = 0; y < 300; y++) img.setPixelColor(0x334455ff, x, y);
  });
  filmRecord("ref", { title: "Godly", url: "https://godly.website", from: "refs_site" }, shot, { tool: "refs_site" });
  filmAsset("gen_image", { out: "public/art/hero.png", prompt: "a kiln at dusk" }, { content: [{ type: "text", text: "Saved" }, { type: "image", data: shot.toString("base64"), mimeType: "image/png" }] });
  filmAsset("gen_image", { out: "x.png" }, { isError: true, content: [] });
  await filmFlush();
  const f = film.buildFilm(task);
  const ref = f.events.find((e) => e.kind === "ref");
  assert.match(ref.image, /^thumbs\/ref-.+\.jpg$/);
  assert.ok(fs.existsSync(path.join(film.filmDir(task.id), ref.image)));
  const asset = f.events.filter((e) => e.kind === "asset");
  assert.equal(asset.length, 1, "a failed call records nothing");
  assert.equal(asset[0].file, "public/art/hero.png");
  assert.match(asset[0].src, /kiln at dusk/);
  const t = await Jimp.read(fs.readFileSync(path.join(film.filmDir(task.id), asset[0].image)));
  assert.ok(t.width <= 480, "thumbnails are small");

  // one recorder per task, however many Drip servers run on the project
  assert.equal(claimRecorder(task, "server-a"), true);
  assert.equal(claimRecorder(task, "server-b"), false, "another server's live claim wins");
  assert.equal(claimRecorder(task, "server-a"), true, "the holder renews it");

  // drip_start's live film: served next to film.json, never opened in tests
  const { url, opened } = await openLiveFilm(task);
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/index\.html$/);
  assert.equal(opened, false);
  assert.ok(fs.existsSync(path.join(film.filmDir(task.id), "index.html")));
  assert.ok(!state.loadState().task.filmOpened);
});
