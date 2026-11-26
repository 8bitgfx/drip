// Fixes from the first real film (the Drip trailer): a task's own folder, critic once, the camera, sound file names,
// font files in the lint.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const session = tmp("session");
process.env.CLAUDE_PROJECT_DIR = session;

const paths = await import("../src/core/paths.mjs");
const { removeCamera, analyzeTrace } = await import("../src/modules/motion/trace.mjs");
const { soundFileName } = await import("../src/modules/motion/audio.mjs");
const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");

test("a task can keep its Drip state in its own folder, and hands the session folder back", () => {
  const film = tmp("film");
  assert.equal(paths.projectDir(), session);
  paths.setWorkspace(paths.sessionDir(), film);
  assert.equal(paths.projectDir(), path.resolve(film));
  assert.equal(paths.projectDripDir(), path.join(path.resolve(film), ".drip"));
  assert.equal(paths.sessionDir(), session);
  paths.setWorkspace(paths.sessionDir(), null);
  assert.equal(paths.projectDir(), session);
});

test("a film's critic is one review, not a gate", () => {
  const config = loadConfig(session);
  const t = state.newTask({ title: "film", size: "full", surface: "other", guides: [], mode: "motion" });
  t.lastUiWriteAt = new Date().toISOString();
  t.critic.records.push({ kind: "motion", verdict: "revise", at: new Date().toISOString(), rev: "old" });
  assert.equal(state.needsCritic(t, config), false);
  assert.deepEqual(state.evidenceStale(t), []);
});

test("a camera move is taken out: elements riding it are not choreography", () => {
  const times = Array.from({ length: 31 }, (_, i) => i / 30);
  const labels = Array.from({ length: 8 }, (_, k) => `#e${k}`);
  // 8 elements in a grid, all pushed by one camera (zoom 1 -> 1.3 around the centre) between 0.2 s and 0.8 s.
  const zoom = (t) => 1 + 0.3 * Math.min(1, Math.max(0, (t - 0.2) / 0.6));
  const samples = times.map((t) => labels.map((_, k) => {
    const x = 300 + (k % 4) * 400;
    const y = 300 + Math.floor(k / 4) * 400;
    const s = zoom(t);
    return [960 + (x - 960) * s, 540 + (y - 540) * s, 100 * s, 60 * s, 1];
  }));
  const { camera } = removeCamera(samples, { width: 1920 });
  assert.ok(camera.length >= 10, "the push is found as the camera");
  const a = analyzeTrace({ labels, times, samples, width: 1920 });
  assert.ok(!a.flags.some((f) => /start on the same frame/.test(f)), a.flags.join("\n"));
  assert.match(a.notes.join(" "), /camera moves/);
});

test("sound files get readable names and real audio extensions", () => {
  assert.deepEqual(soundFileName("https://prod-1.storage.jamendo.com/?trackid=1670486&format=mp32"), { base: "track-1670486", ext: ".mp3" });
  assert.equal(soundFileName("https://prod-1.storage.jamendo.com/?trackid=1&format=mp32", "Upbeat Corporate — Soundrider (Jamendo)").base, "upbeat-corporate-soundrider");
  assert.equal(soundFileName("film/sound/My Track.WAV").ext, ".wav");
});

test("font files in @font-face don't count as the families a design uses", async () => {
  const { lintFiles } = await import("../src/modules/fitcheck/lint.mjs");
  const f = path.join(session, "fonts.css");
  fs.writeFileSync(f, ["Inter", "Inter", "Bricolage", "Bricolage"].map((n, i) => `@font-face { font-family: "${n}"; src: url(f${i}.woff2); font-weight: ${400 + i * 100}; }`).join("\n") + "\n.a { font-family: Inter; }\n");
  assert.ok(!lintFiles([f], session).some((i) => i.id === "font-families"));
});
