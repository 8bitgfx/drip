// Drip Motion: the storyboard check, the frame plan, the frame judge, query relaxing, the motion gates, and (with a
// Chrome/Edge) seeking the kit composition to exact times.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findChrome } from "../src/core/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const project = tmp("motion");
process.env.CLAUDE_PROJECT_DIR = project;
const skip = !findChrome({}) && "no Chrome/Edge on this machine";

const { checkStoryboard, slopIn, storyboardMd } = await import("../src/modules/motion/story.mjs");
const { planTimes, judgeFrames, sparkline, fmtT } = await import("../src/modules/motion/capture.mjs");
const { relaxQuery } = await import("../src/modules/motion/index.mjs");
const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");

const base = {
  concept: "47 tabs fold into one window",
  hook: "a wall of tabs shudders and snaps into a line",
  motif: "the tab shape",
  format: { width: 1920, height: 1080, fps: 30, duration: 10 },
  look: "off-white, ink, one coral accent",
  moves: "paper tabs, light overshoot",
  beats: [
    { at: 0, len: 2.5, action: "tabs pile in and snap into a line", text: "You have 47 tabs open.", energy: 4, visual: "glass tabs on a tilted plane, glow behind", moments: ["a tab shudders", "the rest snap into line"] },
    { at: 2.5, len: 3.5, action: "the line folds into one window", transition: "morph", energy: 2, visual: "a window with a light sweep", moments: ["the fold", "the light sweeps", "a cursor eases in"] },
    { at: 6, len: 4, action: "the window settles; the name writes on", text: "We can fix that.", transition: "push", energy: 3, visual: "particles forming the wordmark", moments: ["camera pulls back", "particles gather", "the name lands"] },
  ],
  references: [{ source: "https://x/ref.mp4", role: "moves", take: "trailing edges spring later than leading ones" }],
};

test("storyboard: a studied reference with a concrete take is required", () => {
  assert.match(checkStoryboard(base, { studied: [] }).errors.join(" "), /no studied reference/);
  assert.deepEqual(checkStoryboard(base, { studied: [{ source: "https://x/ref.mp4" }] }).errors, []);
  const given = { ...base, references: [{ source: "client.mp4", role: "look", take: "their colour and type system", given: true }] };
  assert.deepEqual(checkStoryboard(given, { studied: [] }).errors, []);
  const vague = { ...base, references: [{ source: "https://x/ref.mp4", role: "moves", take: "vibes" }] };
  assert.match(checkStoryboard(vague, { studied: [{ source: "https://x/ref.mp4" }] }).errors.join(" "), /say what you take/);
});

test("storyboard: AI-slop copy is an error, with the reason", () => {
  const sb = { ...base, beats: [{ ...base.beats[0], text: "Unlock the power of seamless, AI-powered notes" }, ...base.beats.slice(1)] };
  const s = slopIn(sb.beats).map((x) => x.word.toLowerCase());
  assert.ok(s.includes("unlock the power") && s.includes("seamless") && s.includes("ai-powered"));
  assert.ok(checkStoryboard(sb, { studied: [{ source: "https://x/ref.mp4" }] }).errors.length >= 3);
});

test("storyboard: warnings for gaps, no rest, slides, too many words, no motif", () => {
  const studied = [{ source: "https://x/ref.mp4" }];
  const flat = {
    ...base,
    motif: "",
    beats: [
      { at: 0, len: 2, action: "a burst of shapes", energy: 5, text: "one two three four five six seven eight nine ten eleven twelve" },
      { at: 2.5, len: 2, action: "cards", energy: 5, transition: "cut" },
      { at: 4.5, len: 2, action: "cards", energy: 5, transition: "fade" },
      { at: 6.5, len: 3.5, action: "logo", energy: 5, transition: "cut" },
    ],
  };
  const w = checkStoryboard(flat, { studied }).warnings.join("\n");
  assert.match(w, /gap 2\.00-2\.50s/);
  assert.match(w, /every beat is high energy/);
  assert.match(w, /every transition is a cut or a fade/);
  assert.match(w, /12 words in 2s/);
  assert.match(w, /no motif/);
  assert.match(w, /name no visual/);
  assert.match(w, /one move over more than 1\.6 s/);
  assert.deepEqual(checkStoryboard(base, { studied }).warnings, []);
  assert.match(storyboardMd(base), /\| 2 \| 2\.5s \| 3\.5s \| the line folds into one window/);
});

test("frame plan: sweeps, transition windows and dense ranges stay inside the film", () => {
  const sweep = planTimes({ duration: 8, count: 5 });
  assert.equal(sweep.length, 5);
  assert.equal(sweep[0], 0);
  assert.ok(sweep.at(-1) < 8);
  assert.deepEqual(planTimes({ duration: 8, around: [2] }), [1.75, 1.9, 2, 2.1, 2.25]);
  const dense = planTimes({ duration: 8, from: 1, to: 1.2, step: 0.05 });
  assert.equal(dense.length, 5);
  assert.deepEqual(planTimes({ duration: 8, times: [3, 3, 99, -1] }), [0, 3, 8 - 1 / 60]);
});

test("frame judge: blank middles are faults, empty openings are notes, cuts and holds are found", () => {
  const t = [0, 1, 2, 3, 4, 5, 6];
  const m = [
    { mean: 10, spread: 0, diff: null },
    { mean: 80, spread: 30, diff: 20 },
    { mean: 82, spread: 30, diff: 2 },
    { mean: 10, spread: 0.5, diff: 70 },
    { mean: 82, spread: 30, diff: 70 },
    { mean: 82, spread: 30, diff: 0.1 },
    { mean: 82, spread: 30, diff: 0.1 },
  ];
  const j = judgeFrames(t, m);
  assert.match(j.issues.join(" "), /blank frame .* 0:03\.0/);
  assert.ok(!j.issues.join(" ").includes("0:00.0"));
  assert.match(j.notes.join(" "), /opens on an empty frame until 0:01.0/);
  assert.deepEqual(j.cuts, [3, 4]);
  assert.deepEqual(j.holds, [[4, 6]]);
  assert.equal(sparkline([0, 1, 2]).length, 3);
  assert.equal(fmtT(65.25), "1:05.3");
});

test("reference search relaxes long queries word by word", () => {
  const q = relaxQuery("shape morph product launch video");
  assert.equal(q[0], "shape morph product launch video");
  assert.ok(q.includes("shape morph") && q.includes("shape"));
  assert.ok(!q.includes("video"));
});

test("motion gates: a reference look, then a storyboard, before composition files", () => {
  const config = loadConfig(project);
  const t = state.newTask({ title: "film", size: "full", surface: "other", guides: ["video"], mode: "motion" });
  t.motion = { studied: [], renders: [] };
  assert.deepEqual(state.missingBeforeUi(t, config).map((m) => m.need), ["a motion reference", "storyboard"]);
  t.motion.studied.push({ source: "x" });
  assert.deepEqual(state.missingBeforeUi(t, config).map((m) => m.need), ["storyboard"]);
  t.motion.storyboard = base;
  assert.deepEqual(state.missingBeforeUi(t, config), []);
  assert.equal(state.isPersuade(t), false);
  assert.match(state.checklist(t, config), /motion film/);
});

test("the kit composition seeks to exact times and passes a sweep", { skip }, async () => {
  fs.mkdirSync(path.join(project, "film"), { recursive: true });
  fs.copyFileSync(path.resolve(here, "..", "..", "content", "kit", "motion.html"), path.join(project, "film", "index.html"));
  fs.copyFileSync(path.resolve(here, "..", "..", "content", "kit", "motion-visuals.js"), path.join(project, "film", "motion-visuals.js"));
  const { filmSheets } = await import("../src/modules/motion/sheets.mjs");
  const config = loadConfig(project);
  // The template loads GSAP from a CDN: without the network there is no clock to test.
  let r;
  try {
    r = await filmSheets("film/index.html", { times: { count: 6 }, width: 960, height: 540, config });
  } catch (e) {
    if (/No clock/.test(e.message)) return; // offline
    throw e;
  }
  assert.equal(r.probe.via, "drip");
  assert.equal(r.probe.duration, 8);
  assert.equal(r.times.length, 6);
  assert.equal(r.sheets.length, 1);
  // The bare template is a skeleton: the only thing allowed to complain is that it is still mostly empty.
  assert.deepEqual(r.judge.issues.filter((x) => !/mostly empty frames/.test(x)), []);
  assert.deepEqual(r.errors, []);
  // The same time twice gives the same picture: seeking, not playback.
  const again = await filmSheets("film/index.html", { times: { times: [1.5, 1.5001] }, width: 960, height: 540, config });
  assert.ok(again.measures[1].diff < 0.5);
  (await import("../src/core/browser.mjs")).closeBrowser();
});
