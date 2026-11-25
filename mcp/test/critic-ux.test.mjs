// 0.8.18: the critic gets how the page behaves (and hover frames), builders and the gate need written studies, the
// director can't overrule a critic REVISE alone, and the page check notes a headline on a picture and hard crops.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const project = tmp("critic-ux");
process.env.CLAUDE_PROJECT_DIR = project;

const { behaviourBlock, hoverSteps } = await import("../src/modules/critic/index.mjs");
const { buildGaps, studiedTakes } = await import("../src/modules/swarm/index.mjs");
const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");
const { judgeAudit } = await import("../src/core/cdp.mjs");

const sections = {
  ideas: { piece: "https://reactbits.dev/r/AccordionGallery-TS-TW.json", spec: "idea thumbnails as an accordion gallery; the hovered panel widens" },
  footer: { piece: "custom: tiny", spec: "one line of links" },
};

test("the critic is told what each section does, and that a resting frame is not a defect", () => {
  const b = behaviourBlock({ sections, refs: { studied: [{ source: "krea.ai", motion: "cards lift 2px on hover" }] } });
  assert.match(b, /HOW IT BEHAVES/);
  assert.match(b, /#ideas: library piece .*AccordionGallery/i);
  assert.match(b, /resting frame of a known pattern/);
  assert.match(b, /krea\.ai: cards lift/);
  assert.equal(behaviourBlock({}), "");
});

test("interactive sections get hover frames for the critic; plain ones don't", () => {
  const steps = hoverSteps({ sections });
  assert.deepEqual(steps.map((s) => s.selector || s.do), ["#ideas", "wait"]);
  assert.ok(steps[1].label.includes("#ideas"));
});

test("builders wait for three written studies, and get what was taken", () => {
  const task = { refs: { viewed: ["a", "b", "c", "d"], studied: [{ key: "a", take: "the wall of real outputs", source: "cosmos.so" }] }, toolUse: { pieces_preview: 1 } };
  const list = [{ section: "hero", piece: "x", from: "cosmos.so: the wall of real outputs" }];
  assert.ok(buildGaps(task, list).some((g) => /1 studied \(3 needed\)/.test(g)));
  task.refs.studied.push({ key: "b", take: "t" }, { key: "c", take: "t" });
  assert.ok(!buildGaps(task, list).some((g) => /studied/.test(g)));
  assert.match(studiedTakes(task), /cosmos\.so: take the wall of real outputs/);
});

test("after a critic REVISE the fast loop needs the user's choice or a new critic pass", () => {
  const config = loadConfig(project);
  const task = { loop: "fast", size: "full", lastUiWriteAt: 1, critic: { records: [{ kind: "build", verdict: "revise", at: "2026-11-25T10:00:00.000Z" }] }, fitcheck: {} };
  assert.equal(state.needsCritic(task, config), true);
  task.critic.shipAt = "2026-11-25T11:00:00.000Z";
  assert.equal(state.needsCritic(task, config), false);
  task.critic.records.push({ kind: "build", verdict: "revise", at: "2026-11-25T12:00:00.000Z" });
  assert.equal(state.needsCritic(task, config), true, "a newer REVISE asks again");
  task.critic.records.push({ kind: "build", verdict: "pass", at: "2026-11-25T13:00:00.000Z" });
  assert.equal(state.needsCritic(task, config), false);
});

test("a headline on a picture and hard crops are warnings, never blockers", () => {
  const a = { width: 1440, vh: 900, h1: 72, hero: { h1Over: 'img "how deep"', cropped: ["banner 45% cut top and bottom"], h1Visible: true, h1Inside: true, h1Box: { x: 0, y: 0, w: 800, h: 80 }, navCovers: [], placeholders: [], clipped: [], pic: { w: 900, h: 700 }, h1w: 900 } };
  const { blockers, warnings } = judgeAudit(a, { hero: true });
  assert.ok(warnings.some((w) => /headline sits on a picture/.test(w)));
  assert.ok(warnings.some((w) => /cropped hard/.test(w)));
  assert.ok(!blockers.some((b) => /picture|cropped/.test(b)));
});

test("a page Drip builds in its own folder never reads the host repo's DESIGN.md", async () => {
  const { designDoc } = await import("../src/core/skills.mjs");
  const repo = tmp("host-repo");
  fs.mkdirSync(path.join(repo, "docs", "design"), { recursive: true });
  fs.writeFileSync(path.join(repo, "docs", "design", "DESIGN.md"), "purple host style guide");
  fs.mkdirSync(path.join(repo, "page", "src", "sections"), { recursive: true });
  const task = { page: { dir: "page" }, uiWrites: [{ file: "page/src/sections/Hero.tsx" }] };
  assert.equal(designDoc(repo, task), null, "no page doc: nothing, not the host's");
  fs.writeFileSync(path.join(repo, "page", "DESIGN.md"), "honey page system");
  assert.equal(designDoc(repo, task).text, "honey page system");
  assert.equal(designDoc(repo, { uiWrites: [{ file: "src/App.tsx" }] }).text, "purple host style guide", "a task on the repo itself still reads it");
});
