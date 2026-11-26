// motion_refs ranking, offline: like counts, query -> kinds of film, picking masters by kind, query relaxing.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
process.env.CLAUDE_PROJECT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "drip-mrefs-"));
const { parseLikes, kindsFor, pickMasters, relaxQuery, loadMasters } = await import("../src/modules/motion/refsources.mjs");

test("like counts parse as Dribbble prints them", () => {
  assert.equal(parseLikes("1.2k"), 1200);
  assert.equal(parseLikes("103"), 103);
  assert.equal(parseLikes("2,345"), 2345);
  assert.equal(parseLikes(""), 0);
});

test("queries map to kinds of film", () => {
  assert.deepEqual(kindsFor("saas product launch"), ["product-launch"]);
  assert.ok(kindsFor("kinetic typography").includes("kinetic-type"));
  assert.ok(kindsFor("logo reveal sting").includes("logo"));
  assert.ok(kindsFor("shape morph transition").includes("abstract"));
});

test("masters are picked by the kind of film asked for", () => {
  const masters = [
    { name: "Type Studio", kinds: ["kinetic-type"] },
    { name: "Launch Studio", kinds: ["product-launch", "ui-motion"] },
    { name: "3D Studio", kinds: ["3d-product"] },
  ];
  assert.equal(pickMasters(["saas launch video"], masters, 1)[0].name, "Launch Studio");
  assert.equal(pickMasters(["kinetic typography"], masters, 1)[0].name, "Type Studio");
  assert.equal(pickMasters(["something unusual"], masters, 3).length, 3);
});

test("the shipped masters list is valid and names where each master's work is", () => {
  const m = loadMasters();
  assert.ok(Array.isArray(m));
  for (const x of m) {
    assert.ok(x.name && (x.dribbble || x.kisto), `master ${x.name} needs a dribbble or kisto source`);
    assert.ok(Array.isArray(x.kinds) && x.kinds.length, `master ${x.name} needs kinds`);
  }
});

test("long queries relax into pairs and words", () => {
  assert.deepEqual(relaxQuery("shape morph launch").slice(0, 3), ["shape morph launch", "shape morph", "morph launch"]);
});

test("music ranks rhythmic motion-design beds first and rules out what fights the picture", async () => {
  const { motionFit, musicQueries } = await import("../src/modules/motion/sound.mjs");
  const groove = { name: "Bright Lines", tags: ["electronic", "synthpop", "instrumental", "speed_medium"], vocals: "instrumental", seconds: 150 };
  const ambient = { name: "Drift", tags: ["ambient", "drone", "instrumental", "speed_verylow"], vocals: "instrumental", seconds: 300 };
  const metal = { name: "Raw ambient black metal", tags: ["instrumental"], vocals: "instrumental", seconds: 200 };
  const club = { name: "Minimal club mix", tags: ["techno", "instrumental", "speed_high"], vocals: "instrumental", seconds: 400 };
  const jazz = { name: "Funky Blues Bar", tags: ["funk", "jazz", "instrumental"], vocals: "instrumental", seconds: 200 };
  const sung = { name: "Morning", tags: ["pop", "vocal"], vocals: "vocal", seconds: 180 };
  assert.ok(motionFit(groove) > motionFit(ambient), "a beat beats a drone for motion design");
  assert.ok(motionFit(ambient, "ambient") > motionFit(ambient), "ambient has its own feel");
  assert.ok(motionFit(groove) > motionFit(club));
  assert.ok(motionFit(groove) > motionFit(jazz));
  assert.ok(motionFit(metal) <= -4); // the search keeps only fits above -4
  assert.ok(motionFit(sung) < motionFit(groove));
  assert.deepEqual(musicQueries("saas product launch").slice(0, 2), ["upbeat electronic", "synthpop"]);
  assert.equal(musicQueries("warm piano launch")[0], "warm piano");
});

test("topic matching: a launch query finds 'Introducing…', not a car spot or a blank title", async () => {
  const { matchScore } = await import("../src/modules/motion/refsources.mjs");
  assert.ok(matchScore("ai product launch", "Introducing GPT-4o") >= 2);
  assert.equal(matchScore("ai product launch", "Range Rover Sport"), 0);
  assert.equal(matchScore("ai product launch", "CULTURE"), 0);
  // "ai" is a word, not a substring of "said" or "paint".
  assert.equal(matchScore("ai", "Paint said hello"), 0);
});

test("launch films: a named brand first, then shared topics; nothing for an unrelated brief", async () => {
  const { searchLaunches, LAUNCHY } = await import("../src/modules/motion/refsources.mjs");
  const films = [
    { brand: "Stripe", title: "Sessions keynote", url: "https://youtu.be/a", tags: ["fintech", "saas"], kind: "keynote" },
    { brand: "Linear", title: "Introducing Linear Agents", url: "https://x.com/linear/status/1", tags: ["ai", "saas", "ui-heavy"], kind: "launch" },
    { brand: "Cursor", title: "Cursor 1.0", url: "https://youtu.be/c", tags: ["ai", "devtool", "ui-heavy"], kind: "launch" },
  ];
  assert.equal(searchLaunches(["ai developer tool launch"], { films })[0].brand, "Cursor");
  assert.equal(searchLaunches(["stripe style launch"], { films })[0].brand, "Stripe");
  const r = searchLaunches(["ai product launch"], { films });
  assert.ok(r.every((x) => x.launch && x.video === x.url));
  assert.ok(!r.slice(0, 2).some((x) => x.brand === "Stripe"), "AI films before a fintech keynote");
  assert.equal(searchLaunches(["liquid shape morph loop"], { films }).length, 0);
  assert.ok(LAUNCHY.test("drip launch trailer") && !LAUNCHY.test("liquid shape morph loop"));
});

test("platform videos go through yt-dlp; vimeo pages become their player URL", async () => {
  const { isPlatformVideo, fetchableUrl } = await import("../src/modules/motion/sitevideo.mjs");
  for (const u of ["https://www.youtube.com/watch?v=x", "https://youtu.be/x", "https://x.com/a/status/1", "https://twitter.com/a/status/1", "https://vimeo.com/123456", "https://www.instagram.com/reel/x/"]) assert.ok(isPlatformVideo(u), u);
  for (const u of ["https://cdn.kisto.app/a.webm", "https://dribbble.com/shots/1", "film/out.mp4"]) assert.ok(!isPlatformVideo(u), u);
  assert.equal(fetchableUrl("https://vimeo.com/22439234"), "https://player.vimeo.com/video/22439234");
  assert.equal(fetchableUrl("https://vimeo.com/channels/staffpicks/22439234"), "https://player.vimeo.com/video/22439234");
  assert.equal(fetchableUrl("https://x.com/a/status/1"), "https://x.com/a/status/1");
});

test("a post's description is cleaned for choosing a reference: no links, no follow-us lines, cut at a sentence", async () => {
  const { cleanAbout } = await import("../src/modules/motion/refsources.mjs");
  const raw = "Introducing Cursor 2.0.\nOur first coding model.\n\nLearn more: https://cursor.com/blog\nFollow us on X\n___\nFind us on X\n#ai #launch";
  assert.equal(cleanAbout(raw), "Introducing Cursor 2.0. Our first coding model.");
  const long = `${"A sentence about the film. ".repeat(20)}`;
  assert.ok(cleanAbout(long, 100).length <= 100 && cleanAbout(long, 100).endsWith("."));
});

test("each reference reads as words: kind, title, facts, what its maker says, where to watch", async () => {
  const { refText } = await import("../src/modules/motion/refinfo.mjs");
  const t = refText({ from: "kisto", master: "Tomas Puerta", title: "SaaS motion for Google", creator: "Tomas Puerta", aspect: 0.56, posted: "2026-06", views: 12400, about: "A product film.", tags: ["mograph"], url: "https://kisto.app/i/x", video: "https://cdn.kisto.app/x.webm" }, 3);
  assert.match(t, /^3\. \[MASTER: Tomas Puerta\] SaaS motion for Google · vertical · posted 2026-06 · 12k views/);
  assert.match(t, /says: "A product film\."/);
  assert.match(t, /video: https:\/\/cdn\.kisto\.app\/x\.webm/);
  assert.doesNotMatch(t, /by Tomas Puerta/, "the master's name isn't repeated");
});

test("music reads as text: energy bar by bar with builds, drops and storyboard beats", async () => {
  const { energyLines } = await import("../src/modules/motion/music.mjs");
  const a = { duration: 40, bars: Array.from({ length: 20 }, (_, i) => i * 2), barEnergy: Array.from({ length: 20 }, (_, i) => (i < 8 ? -30 + i : -12)), sections: [{ from: 0, to: 16, level: -25 }, { from: 16, to: 40, level: -12 }], builds: [[10, 16]], drops: [16], quiet: [] };
  const lines = energyLines(a, { beats: [16.2] }).split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^\s*0:00\.0  ▁/);
  assert.match(lines[1], /DROP 0:16\.0/);
  assert.match(lines[1], /beat@16\.2s/);
  assert.match(lines[0], /build 0:10\.0-0:16\.0/);
});

test("close-ups: the busiest stretches are found, and a window samples ~36 frames", async () => {
  const { busiestWindows, closeUpTimes } = await import("../src/modules/motion/index.mjs");
  const calm = Array(40).fill(0.1);
  const busy = calm.map((v, s) => (s >= 10 && s < 16 ? 5 : s >= 30 && s < 34 ? 3 : v));
  const w = busiestWindows(busy, { len: 6 });
  assert.deepEqual(w[0], [10, 16]);
  assert.ok(w.length === 2 && w[1][0] >= 28 && w[1][0] <= 30);
  assert.deepEqual(busiestWindows(calm, { len: 6 }), [], "an even film has no stretch to point at");
  const t = closeUpTimes(40, 52);
  assert.equal(t.length, 36);
  assert.equal(t[0], 40);
  assert.ok(Math.abs(t.at(-1) - 52) < 0.01);
  assert.ok(closeUpTimes(0, 100).at(-1) <= 30, "a window is at most 30 s");
  assert.equal(closeUpTimes(10, 11)[1], 10.083, "short windows go no denser than 12 a second");
});

test("storyboard: a long moves reference not watched up close is a warning; a close-up clears it", async () => {
  const { checkStoryboard } = await import("../src/modules/motion/story.mjs");
  const sb = { format: { duration: 10 }, beats: [{ at: 0, len: 10, action: "a box snaps open", energy: 3 }], references: [{ source: "https://youtu.be/x", role: "moves", take: "the box widens with an ease-out, then content fades in" }] };
  const far = checkStoryboard(sb, { studied: [{ source: "https://youtu.be/x", duration: 117 }] });
  assert.ok(far.warnings.some((w) => /up close/.test(w)));
  const near = checkStoryboard(sb, { studied: [{ source: "https://youtu.be/x", duration: 117, closeups: [[40, 52]] }] });
  assert.ok(!near.warnings.some((w) => /up close/.test(w)));
  const clip = checkStoryboard(sb, { studied: [{ source: "https://youtu.be/x", duration: 8 }] });
  assert.ok(!clip.warnings.some((w) => /up close/.test(w)), "a short clip is dense enough already");
});
