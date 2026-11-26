// Drip Motion's measuring and sound logic, offline: the trace analysis, music structure, cue checks, the mix graph,
// narration word timings and the script check.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
process.env.CLAUDE_PROJECT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "drip-maudio-"));

const { analyzeTrace, stretches } = await import("../src/modules/motion/trace.mjs");
const { structure, alignToMusic, musicPrompt } = await import("../src/modules/motion/music.mjs");
const { checkCues, mixGraph, placeCue, searchCatalogue, soundTracks } = await import("../src/modules/motion/sound.mjs");
const { wordsFrom, checkLines } = await import("../src/modules/motion/voice.mjs");

test("trace: a dead stop, a linear move and four things starting on one frame are flagged; an eased move is not", () => {
  const fps = 30;
  const times = Array.from({ length: 61 }, (_, i) => i / fps);
  const ease = (p) => 1 - (1 - p) ** 3;
  const labels = ["#eased", "#linear", "#dead", "#a", "#b"];
  const samples = times.map((t) => {
    const p = Math.min(1, Math.max(0, (t - 0.2) / 1)); // every move runs 0.2-1.2s
    return [
      [100 + 600 * ease(p), 300, 100, 100, 1],
      [100 + 600 * p, 500, 100, 100, 1],
      [100 + 600 * Math.min(1, p * 1.0001), 700, 100, 100, 1], // linear to the end, then a hard stop
      [100 + 300 * ease(p), 100, 50, 50, 1],
      [900 + 300 * ease(p), 100, 50, 50, 1],
    ];
  });
  const a = analyzeTrace({ labels, times, samples, width: 1920, beats: [1.5] });
  const flags = a.flags.join("\n");
  assert.match(flags, /stops dead.*#linear|stops dead.*#dead/);
  assert.match(flags, /constant speed.*#linear/);
  assert.match(flags, /5 separate moves start on the same frame/);
  assert.ok(!/stops dead[^\n]*#eased/.test(flags));
  assert.match(a.notes.join(" "), /of the time nothing moves/);
  assert.deepEqual(stretches(10, [{ at: 0, len: 4 }, { at: 4, len: 6 }]), [[0, 4], [4, 10]]);
  assert.equal(stretches(9).length, 3);
});

test("music: tempo, bars and a drop from synthetic features", () => {
  // 120 BPM kicks for 40 s at 44.1 kHz / 512 hop; quiet until 16 s, loud after: a drop at 16 s.
  const sr = 44100;
  const hop = 512;
  const fps = sr / hop;
  const duration = 40;
  const N = Math.floor(duration * fps);
  const rms = [];
  const lo = [];
  const hi = [];
  for (let i = 0; i < N; i++) {
    const t = i / fps;
    const beatPhase = (t % 0.5) / 0.5;
    const hit = beatPhase < 0.06 ? 1 : 0.05;
    const level = t < 16 ? 0.05 : 0.5;
    rms.push(level * (0.4 + hit));
    lo.push(level * hit);
    hi.push(level * (0.2 + hit * 0.5));
  }
  const a = structure({ sr, hop, duration, rms, hi, lo });
  assert.ok(Math.abs(a.bpm - 120) <= 1, `bpm ${a.bpm}`);
  assert.ok(Math.abs(a.bars[1] - a.bars[0] - 2) < 0.02);
  assert.ok(a.drops.some((d) => Math.abs(d - 16) < 1.1), `drops ${a.drops}`);
  const al = alignToMusic([2.03, 3.9], a);
  assert.ok(Math.abs(al[0].offBarMs) < 120);
  assert.match(musicPrompt({ bpm: 112, seconds: 20, mood: "calm" }), /112 BPM.*20 seconds.*No vocals/);
});

test("sound: cues land by sync point, the sheet is judged, the mix ducks music under the voice", () => {
  assert.equal(placeCue({ at: 2 }, { sync: { at: 0.09 } }), 1.91);
  assert.equal(placeCue({ at: 2, align: "start" }, { sync: { at: 0.09 } }), 2);
  const busy = Array.from({ length: 12 }, (_, i) => ({ at: i, sound: i % 2 ? "akalan:whoosh-fast-hard" : "akalan:whoosh-soft", name: "whoosh", licence: "CC0-1.0", role: "foreground" }));
  const w = checkCues(busy, { duration: 12, moves: [{ from: 0, to: 2 }] }).warnings.join("\n");
  assert.match(w, /effect cues in 12s/);
  assert.match(w, /used 6 times/);
  assert.match(w, /whooshes/);
  assert.match(w, /land where nothing moves/);
  assert.match(checkCues([{ at: 1, sound: "x.mp3" }], {}).errors.join(" "), /no licence/);
  const tracks = soundTracks({ music: { file: "m.mp3", from: 4, gainDb: -6 }, cues: [{ file: "c.ogg", at: 1, start: 0.9 }], voice: [{ file: "v1.mp3", at: 0.5 }, { file: "v2.mp3", at: 3 }] });
  assert.deepEqual(tracks.map((t) => t.kind), ["music", "cue", "voice", "voice"]);
  const g = mixGraph(tracks, { duration: 10 });
  assert.match(g, /\[1:a\]atrim=start=4/);
  assert.match(g, /sidechaincompress/);
  assert.match(g, /adelay=900\|900/);
  assert.match(g, /alimiter/);
  assert.ok(!/sidechain/.test(mixGraph([{ file: "m", kind: "music", start: 0 }], { duration: 5 })));
  const cat = [
    { id: "a:click-soft", name: "Click, soft", category: "clicks", tags: ["ui", "soft"], use: [], seconds: 0.1 },
    { id: "a:whoosh", name: "Whoosh", category: "whooshes", tags: ["air"], use: [], seconds: 0.3 },
  ];
  assert.equal(searchCatalogue(cat, { query: "soft click" })[0].id, "a:click-soft");
});

test("voice: word timings from character alignment, tags dropped; the script check catches pace, slop and order", () => {
  const text = "[warmly] We can fix that.";
  const chars = [...text];
  const start = chars.map((_, i) => i * 0.05);
  const end = chars.map((_, i) => i * 0.05 + 0.05);
  const words = wordsFrom({ characters: chars, character_start_times_seconds: start, character_end_times_seconds: end }, 10);
  assert.deepEqual(words.map((w) => w.w), ["We", "can", "fix", "that."]);
  assert.ok(words[0].start > 10);
  const beats = [{ at: 0, len: 2 }, { at: 2, len: 3 }];
  const c = checkLines([{ at: 0.2, text: "Unlock the power of seamless notes for every single person on your whole team today" }, { at: 0.1, text: "Hi." }], { beats });
  assert.match(c.errors.join(" "), /unlock the power/i);
  assert.match(c.errors.join(" "), /time order/);
  assert.match(c.warnings.join(" "), /until the next beat/);
  assert.deepEqual(checkLines([{ at: 0.3, text: "You have forty-seven tabs open." }], { beats }).errors, []);
});
