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

test("music ranks calm motion-design beds first and rules out what fights the picture", async () => {
  const { motionFit, musicQueries } = await import("../src/modules/motion/sound.mjs");
  const calm = { name: "Soft Light", tags: ["ambient", "instrumental", "speed_low"], vocals: "instrumental", seconds: 150 };
  const metal = { name: "Raw ambient black metal", tags: ["instrumental"], vocals: "instrumental", seconds: 200 };
  const club = { name: "Minimal club mix", tags: ["techno", "instrumental", "speed_high"], vocals: "instrumental", seconds: 400 };
  const sung = { name: "Morning", tags: ["pop", "vocal"], vocals: "vocal", seconds: 180 };
  assert.ok(motionFit(calm) > motionFit(club));
  assert.ok(motionFit(metal) <= -4); // the search keeps only fits above -4
  assert.ok(motionFit(sung) < motionFit(calm));
  assert.ok(motionFit(club, "upbeat") > motionFit(club, "calm"));
  assert.deepEqual(musicQueries("saas product launch").slice(0, 2), ["ambient electronic", "chill piano"]);
  assert.equal(musicQueries("warm piano launch")[0], "warm piano");
});
