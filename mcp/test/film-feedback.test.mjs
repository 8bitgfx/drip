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
