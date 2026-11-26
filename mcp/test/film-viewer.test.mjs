// The Film viewer's story model (content/film-viewer/model.js): plain browser JS, loaded here through node:vm.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "content/film-viewer/model.js"), "utf8"), ctx);
const F = ctx.DripFilm;
const fixture = JSON.parse(fs.readFileSync(path.join(root, "mcp/test/fixtures/film/film.json"), "utf8"));
const oldFilm = JSON.parse(fs.readFileSync(path.join(root, "content/film-viewer/sample/film.json"), "utf8"));

/** Every frame measured as good, at its own height; listed sources marked bad. */
const measured = (n, bad = []) => new Map(n.frames.map((f, i) => [f.src, { pageH: f.height || 900, bad: bad.includes(f.src), band: i ? { y0: 0, y1: 400 } : null }]));

test("normalize: the new events become refs, pieces, assets, named agents, targeted writes and frames", () => {
  const n = F.normalize(fixture);
  assert.deepEqual([...n.agents.map((a) => a.name)], ["Director", "Builder 1", "Builder 2"]);
  assert.equal(new Set(n.agents.map((a) => a.color)).size, 3);
  assert.equal(n.refs.length, 4);
  assert.equal(n.pieces.length, 3);
  assert.equal(n.assets.length, 2);
  assert.equal(n.assets.filter((a) => a.image).length, 1, "a font has no picture");
  assert.equal(n.frames.length, 8);
  assert.ok(n.frames.some((f) => f.height > 900), "tall frames");
  assert.ok(n.writes.filter((w) => w.target).length >= 10);
  assert.equal(n.live, false);
});

test("normalize: an old film (frames[], no refs or targets) still plays", () => {
  const n = F.normalize(oldFilm);
  assert.equal(n.refs.length + n.pieces.length, 0);
  assert.ok(n.frames.length >= 2);
  assert.ok(n.frames.every((f) => f.src.startsWith("frames/")));
  const s = F.buildStory(n, measured(n));
  assert.equal(s.cards.length, 0);
  assert.equal(s.frames.length, n.frames.length);
  assert.equal(F.cursorsAt(s, s.frames[1].start + 1).length, 0, "no targets, no cursors");
  assert.equal(s.chapters.at(-1).id, "build");
});

test("judgeFrame: blank pages and dev-server error overlays are bad, real pages are not", () => {
  assert.equal(F.judgeFrame({ std: 0.5, mean: 255, redRows: [] }).why, "blank");
  assert.equal(F.judgeFrame({ std: 30, mean: 40, redRows: [{ y: 0.18, frac: 0.8 }] }).why, "error");
  assert.equal(F.judgeFrame({ std: 70, mean: 55, redRows: [] }).bad, false);
  // a page with a wide red section is not an overlay
  assert.equal(F.judgeFrame({ std: 70, mean: 60, redRows: Array.from({ length: 12 }, (_, i) => ({ y: 0.1 + i * 0.01, frac: 1 })) }).bad, false);
});

test("changeBand: finds what changed, ignores identical frames, counts new length as change", () => {
  const a = Array.from({ length: 100 }, () => 200);
  assert.equal(F.changeBand(a, 900, a.slice(), 900), null);
  const b = a.slice();
  for (let i = 40; i < 50; i++) b[i] = 120;
  const band = F.changeBand(a, 900, b, 900);
  assert.ok(band.y0 > 300 && band.y1 < 500, JSON.stringify(band));
  const taller = F.changeBand(a, 900, Array.from({ length: 200 }, () => 200), 1800);
  assert.ok(taller.y0 >= 880 && taller.y1 >= 1790);
});

test("story: references, then pieces, then the build; bad frames are skipped", () => {
  const n = F.normalize(fixture);
  const bad = n.frames.filter((f) => /0005|0007/.test(f.src)).map((f) => f.src);
  const s = F.buildStory(n, measured(n, bad));
  assert.deepEqual([...s.chapters.map((c) => c.id)], ["refs", "pieces", "build"]);
  assert.equal(s.frames.length, 6);
  assert.ok(s.frames.every((f) => !bad.includes(f.src)));
  for (let i = 1; i < s.chapters.length; i++) assert.ok(s.chapters[i].start >= s.chapters[i - 1].end - 1e-9);
  assert.ok(s.frames.at(-1).last && s.frames.at(-1).end <= s.total + 1e-9);
  // the last (tall) frame is toured to its bottom
  const end = F.cameraAt(s, s.total - 0.1, 562);
  assert.ok(end > s.frames.at(-1).pageH - 600, String(end));
});

test("story: sampling is a pure function of t (seeking lands exactly)", () => {
  const n = F.normalize(fixture);
  const s = F.buildStory(n, measured(n));
  for (const f of s.frames) {
    const at = F.frameAt(s, f.start + 0.01);
    assert.equal(s.frames[at.cur].src, f.src);
  }
  const t = s.frames[3].start + 1.234;
  assert.deepEqual(JSON.parse(JSON.stringify(F.cursorsAt(s, t))), JSON.parse(JSON.stringify(F.cursorsAt(s, t))));
  // a cursor arrives on its target at the write
  const w = s.writes.find((x) => x.target && x.agent === "b1");
  const c = F.cursorsAt(s, w.t).find((x) => x.id === "b1");
  assert.ok(c.x >= w.target.x && c.x <= w.target.x + w.target.w && c.y >= w.target.y && c.y <= w.target.y + w.target.h);
  assert.equal(c.writing.file, w.file);
  assert.ok(F.marksAt(s, w.t + 0.1).some((m) => m.w === w));
});

test("story: real time maps onto story time in order, and live films end at their head", () => {
  const n = F.normalize(fixture);
  const s = F.buildStory(n, measured(n));
  let last = -1;
  for (let m = n.start; m <= n.end; m += 20000) {
    const v = s.realToStory(m);
    assert.ok(v >= last, "monotonic");
    last = v;
  }
  assert.equal(s.realToStory(n.end), s.total);
  const live = F.normalize({ ...fixture, task: { ...fixture.task, endedAt: null }, events: fixture.events.filter((e) => e.kind !== "done") });
  assert.equal(live.live, true);
  const ls = F.buildStory(live, measured(live), { live: true });
  assert.ok(!ls.frames.at(-1).last, "no closing tour while live");
});

test("wallSlot: cards stay inside the wall, at desktop and phone width", () => {
  for (const [w, h] of [[1360, 700], [343, 560]]) {
    for (const of of [1, 3, 5, 8]) {
      for (let i = 0; i < of; i++) {
        const s = F.wallSlot(i, of, w, h);
        assert.ok(s.x >= -1 && s.x + s.w <= w + 1, `x ${w} ${of} ${i}`);
        assert.ok(s.y >= -12 && s.y + s.h <= h + 12, `y ${w} ${of} ${i}`);
      }
    }
  }
});
