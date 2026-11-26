// Fixes from the second Drip trailer (v3): what let a jittery, disconnected film through and what got in the way.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const session = tmp("session");
process.env.CLAUDE_PROJECT_DIR = session;

const { cleanContext } = await import("../src/modules/critic/index.mjs");
const { checkStoryboard } = await import("../src/modules/motion/story.mjs");
const { feelFor, queryFit, motionFit, musicQueries } = await import("../src/modules/motion/sound.mjs");
const { structure } = await import("../src/modules/motion/music.mjs");
const { bringSound } = await import("../src/modules/motion/audio.mjs");

test("critic context: arguments are taken out and the review goes ahead", () => {
  const r = cleanContext("Launch film for Drip, a design plugin. The flat look is deliberately simple. Dark brand on ink.");
  assert.equal(r.context, "Launch film for Drip, a design plugin. Dark brand on ink.");
  assert.deepEqual(r.dropped, ["deliberately"]);
  const long = cleanContext(`${"A fact about the film. ".repeat(30)}`);
  assert.ok(long.context.length <= 400);
  assert.equal(cleanContext("").context, undefined);
});

test("a studied film named a little differently still backs the storyboard", () => {
  const sb = { format: { duration: 4 }, beats: [{ at: 0, len: 4, action: "logo reveal hook", visual: "glow", moments: ["a", "b"] }], motif: "dot", references: [{ source: "https://www.youtube.com/watch?v=abc&si=xyz", role: "story", take: "one idea per shot, held" }] };
  const r = checkStoryboard(sb, { studied: [{ source: "https://www.youtube.com/watch?v=abc" }] });
  assert.ok(!r.errors.some((e) => /no studied reference/.test(e)), r.errors.join("; "));
});

test("music: a cinematic search asks for cinematic tracks, and the asked genre leads", () => {
  assert.equal(feelFor("cinematic launch trailer"), "cinematic");
  assert.equal(feelFor("upbeat synth"), "motion");
  assert.equal(feelFor("anything", "ambient"), "ambient");
  assert.equal(musicQueries("cinematic launch trailer", "cinematic")[1], "cinematic electronic");
  const epic = { tags: ["cinematic", "epic", "trailer"] };
  const house = { tags: ["electro", "house"] };
  assert.ok(motionFit(epic, "cinematic") + queryFit(epic, "cinematic") > motionFit(house, "cinematic") + queryFit(house, "cinematic"));
  assert.ok(motionFit(epic, "cinematic") > motionFit(epic, "motion"), "epic is home for cinematic, beatless for motion");
});

test("music analysis: bars past the last frame never read NaN or silence", () => {
  const N = 200;
  const a = structure({ sr: 44100, hop: 512, duration: (N * 512) / 44100 + 3, rms: Array(N).fill(0.1), hi: Array(N).fill(0.01), lo: Array(N).fill(0.01) });
  assert.ok(a.barEnergy.every((v) => Number.isFinite(v)));
  assert.ok(a.sections.every((s) => Number.isFinite(s.level)));
  assert.equal(a.quiet.length, 0);
});

test("speed curve: a smooth ease passes; a stop at a key, a jump and judder are flagged; a cut is not", async () => {
  const { judgeSpeed } = await import("../src/modules/motion/trace.mjs");
  const smooth = Array.from({ length: 60 }, (_, i) => ({ t: i / 15, diff: 5 + 3 * Math.sin(i / 10) }));
  assert.deepEqual(judgeSpeed(smooth), []);
  const ease = Array.from({ length: 60 }, (_, i) => ({ t: i / 15, diff: i < 15 ? 0 : i < 45 ? Math.sin(((i - 15) / 30) * Math.PI) * 8 : 0 }));
  assert.deepEqual(judgeSpeed(ease), []);
  assert.deepEqual(judgeSpeed(smooth.map((p, i) => ({ ...p, diff: i === 30 ? 0.3 : p.diff }))).map((x) => x.kind), ["stop"]);
  assert.ok(judgeSpeed(smooth.map((p, i) => ({ ...p, diff: i > 20 && i < 35 ? (i % 2 ? 8 : 2) : p.diff }))).some((x) => x.kind === "judder"));
  assert.ok(judgeSpeed(smooth.map((p, i) => ({ ...p, diff: i >= 30 ? 18 : 2 }))).some((x) => x.kind === "jump"));
  assert.deepEqual(judgeSpeed(smooth.map((p, i) => ({ ...p, diff: i === 30 ? 60 : p.diff }))), []);
});

test("continuity: five scenes joined by cuts with no motif in them don't record", () => {
  const scenes = ["a terminal types", "a chart grows", "a phone buzzes", "a logo lands", "a tagline"].map((action, i) => ({ at: i * 2, len: 2, action, visual: "glow", moments: ["x", "y"], transition: i ? "cut" : "" }));
  const sb = { format: { duration: 10 }, motif: "the paint drop", beats: scenes, references: [{ source: "s", given: true, role: "moves", take: "one shape carries the film" }] };
  const r = checkStoryboard(sb);
  assert.ok(r.errors.some((e) => /motif/.test(e)), r.errors.join("; "));
  const carried = scenes.map((b) => ({ ...b, action: `the paint drop: ${b.action}`, transition: b.transition && "the drop wipes into it" }));
  const ok = checkStoryboard({ ...sb, beats: carried });
  assert.ok(!ok.errors.some((e) => /motif/.test(e)) && !ok.warnings.some((w) => /carries across/.test(w)), [...ok.errors, ...ok.warnings].join("; "));
});

test("the check needs both halves: a clean sweep and a smooth speed curve of the same version", async () => {
  const { speedOk } = await import("../src/modules/motion/index.mjs");
  assert.equal(speedOk({ trace: { whole: true, rev: "r1", speed: 0 } }, "r1"), true);
  assert.equal(speedOk({ trace: { whole: true, rev: "r0", speed: 0 } }, "r1"), false, "traced an older version");
  assert.equal(speedOk({ trace: { whole: false, rev: "r1", speed: 0 } }, "r1"), false, "a range isn't the film");
  assert.equal(speedOk({ trace: { whole: true, rev: "r1", speed: 2 } }, "r1"), false);
  assert.equal(speedOk({}, "r1"), false);
});

test("camera rig: the speed carries through the keys, eases only at the ends and at a hold, never overshoots", async () => {
  const vm = await import("node:vm");
  const { fileURLToPath } = await import("node:url");
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../content/kit/motion-visuals.js"), "utf8");
  const ctx = { window: {}, document: { createElement: () => ({ getContext: () => ({}) }) } };
  vm.runInNewContext(src, ctx);
  const { camAt, camKeys } = ctx.window.DripVisuals.util;
  const keys = camKeys([{ t: 0, x: 0 }, { t: 1, x: 100 }, { t: 2, x: 300 }, { t: 3, x: 400, hold: true }, { t: 4, x: 500 }]);
  const v = (t) => (camAt(keys, t + 0.005).x - camAt(keys, t - 0.005).x) / 0.01;
  assert.ok(v(1) > 50 && v(2) > 50, `moving through the keys: ${v(1).toFixed(0)}, ${v(2).toFixed(0)}`);
  assert.ok(Math.abs(v(3)) < 2, "a hold stops");
  assert.ok(Math.abs(camAt(keys, 0.001).x) < 1 && camAt(keys, 4).x === 500);
  for (let t = 0; t <= 4; t += 0.05) assert.ok(camAt(keys, t).x >= -0.01 && camAt(keys, t).x <= 500.01);
  assert.equal(camAt(keys, 2).s, 1, "channels not given keep their default");
});

test("ui freeze: fonts and pictures in the CSS become local files; each sheet goes back in its place; nothing animates", async () => {
  const { localiseCss, frozenHtml } = await import("../src/modules/motion/uifreeze.mjs");
  const asked = [];
  const css = await localiseCss('@font-face{src:url("../f/inter.woff2") format("woff2")} .a{background:url(data:image/png;base64,xx)} .b{background:url(img/x.png)}', "https://site.dev/css/app.css", async (h) => (asked.push(h), `assets/${h.split("/").pop()}`));
  assert.deepEqual(asked, ["https://site.dev/f/inter.woff2", "https://site.dev/css/img/x.png"]);
  assert.match(css, /url\("assets\/inter\.woff2"\)/);
  assert.match(css, /data:image\/png/);
  const html = frozenHtml('<html><head><style data-drip-sheet="0"></style><style data-drip-sheet="1"></style></head><body></body></html>', ["/*a*/", "/*b*/"]);
  assert.ok(html.indexOf("/*a*/") < html.indexOf("/*b*/") && html.indexOf("/*b*/") < html.indexOf("animation:none!important"));
});

test("two different tracks never share one file", async () => {
  const a = path.join(session, "a.mp3");
  const b = path.join(session, "b.mp3");
  fs.writeFileSync(a, "A");
  fs.writeFileSync(b, "B");
  const ra = await bringSound(null, a, { name: "Theme" });
  const rb = await bringSound(null, b, { name: "Theme" });
  const again = await bringSound(null, a, { name: "Theme" });
  assert.notEqual(ra, rb);
  assert.equal(again, ra);
  assert.equal(fs.readFileSync(path.join(session, rb), "utf8"), "B");
  assert.match(ra, /^sound\//, "no stray film/ folder when the film's folder isn't known");
});
