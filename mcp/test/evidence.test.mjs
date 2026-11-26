// Evidence is bound to what it reviewed; edits Drip never saw are caught; the session-start pointer; carrying studies.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const hooks = path.resolve(here, "..", "..", "hooks");
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
const use = (dir) => (process.env.CLAUDE_PROJECT_DIR = dir);

const state = await import("../src/core/state.mjs");
const evidence = await import("../src/core/evidence.mjs");
const store = await import("../src/modules/board/store.mjs");
const memory = await import("../src/core/memory.mjs");
const project = await import("../src/core/project.mjs");
const { loadConfig } = await import("../src/core/config.mjs");
const { collectTools } = await import("../src/core/registry.mjs");
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args);
  return { text: r.content.map((c) => c.text || "").join("\n"), error: !!r.isError };
};

function hook(name, input, dir) {
  const r = spawnSync(process.execPath, [path.join(hooks, name)], { input: JSON.stringify({ cwd: dir, ...input }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: "utf8" });
  return r.stdout ? JSON.parse(r.stdout) : null;
}

function builtTask(p, { size = "quick" } = {}) {
  fs.mkdirSync(path.join(p, "src"), { recursive: true });
  fs.writeFileSync(path.join(p, "src", "Hero.tsx"), "export const Hero = () => <h1 className='p-4'>one</h1>;");
  state.updateState((st) => {
    st.task = state.newTask({ title: "hero", size, surface: "landing", guides: [] });
  });
  evidence.takeSnapshot(state.loadState().task);
}

test("evidence is bound to the files it reviewed: change them and the fit check, the shot and the critic are stale", async () => {
  const p = use(tmp("rev"));
  builtTask(p);
  const file = path.join(p, "src", "Hero.tsx");
  state.updateState((st) => {
    st.task.uiWrites = [{ file: "src/Hero.tsx", at: new Date().toISOString() }];
    st.task.lastUiWriteAt = new Date(Date.now() - 5000).toISOString();
    st.task.fitcheck.lastShotAt = new Date(Date.now() - 2000).toISOString();
    st.task.fitcheck.doneAt = new Date(Date.now() - 1000).toISOString();
    st.task.fitcheck.shotRev = evidence.artifactRev(st.task);
    st.task.fitcheck.doneRev = evidence.artifactRev(st.task);
  });
  const cfg = loadConfig();
  const t = () => state.loadState().task;
  assert.equal(state.needsFitcheck(t(), cfg), false);
  assert.deepEqual(state.evidenceStale(t()), []);
  const rev0 = evidence.artifactRev(t());
  assert.equal(evidence.artifactRev(t()), rev0, "stable while nothing changes");
  // a logic edit no hook recorded still changes what was reviewed
  fs.writeFileSync(file, "export const Hero = () => <h1 className='p-4'>two</h1>;");
  evidence.markSeen(t(), "src/Hero.tsx");
  assert.notEqual(evidence.artifactRev(t()), rev0);
  assert.equal(state.needsFitcheck(t(), cfg), true);
  assert.equal(state.evidenceStale(t()).length, 2);
  assert.match((await call("fitcheck_done", { scores: { hierarchy: 5, layout: 5, type: 5, color: 5, imagery: 5, polish: 5, copy: 5, fidelity: 5 }, verdict: "pass", fixes: [] })).text, /changed after the last fitcheck_shot|UI changed after/);
  // DESIGN.md is part of it too
  fs.writeFileSync(file, "export const Hero = () => <h1 className='p-4'>one</h1>;");
  evidence.markSeen(t(), "src/Hero.tsx");
  assert.equal(state.needsFitcheck(t(), cfg), false, "back to what was reviewed");
  fs.writeFileSync(path.join(p, "DESIGN.md"), "# design\nnew rule");
  assert.notEqual(evidence.artifactRev(t()), rev0);
  // the critic's verdict carries the revision it looked at
  state.updateState((st) => {
    st.task.size = "full";
    st.task.critic.records.push({ kind: "build", verdict: "pass", at: new Date().toISOString(), rev: evidence.artifactRev(st.task) });
  });
  assert.equal(state.needsCritic(t(), cfg), false);
  fs.writeFileSync(path.join(p, "DESIGN.md"), "# design\nanother rule");
  // One critic round, at the final version: a passed critic is not re-run after small fixes, but the evidence says it is old.
  assert.equal(state.needsCritic(t(), cfg), false, "the critic is a one-time reality check");
  assert.ok(state.evidenceStale(t()).some((s) => /critic reviewed an earlier version/.test(s)));
  // drip_end refuses with stale evidence, unless the user accepts the open points
  const end = await call("drip_end", {});
  assert.equal(end.error, true);
  assert.match(end.text, /Not closed/);
  assert.equal(state.loadState().task !== null, true);
  const ok = await call("drip_end", { acceptOpen: "ship it, I saw it" });
  assert.ok(!ok.error);
  assert.equal(state.loadState().history.at(-1).acceptedOpen, "ship it, I saw it");
});

test("edits Drip never saw are found at the end; edits its hooks saw are not", async () => {
  const p = use(tmp("diff"));
  builtTask(p);
  const t = () => state.loadState().task;
  assert.deepEqual(evidence.workspaceDiff(t()).unseen, []);
  // an edit through the hooks: known
  fs.writeFileSync(path.join(p, "src", "Hero.tsx"), "export const Hero = () => <h1 className='p-8'>seen</h1>;");
  hook("post-write.mjs", { tool_name: "Edit", tool_input: { file_path: path.join(p, "src", "Hero.tsx"), new_string: "className='p-8'" } }, p);
  assert.deepEqual(evidence.workspaceDiff(t()).unseen, [], "the hook told Drip");
  assert.ok(t().uiWrites.some((w) => w.file.split("\\").join("/") === "src/Hero.tsx"));
  // a shell edit and a new file: unseen
  fs.writeFileSync(path.join(p, "src", "Hero.tsx"), "export const Hero = () => <h1 className='p-16'>sneaky</h1>;");
  fs.writeFileSync(path.join(p, "src", "Footer.tsx"), "export const Footer = () => <footer/>;");
  const diff = evidence.workspaceDiff(t());
  assert.deepEqual(diff.unseen.map((u) => `${u.file}:${u.status}`).sort(), ["src/Footer.tsx:new", "src/Hero.tsx:changed"]);
  // the Stop hook demands a fit check that covers them
  const stop = hook("stop.mjs", {}, p);
  assert.equal(stop?.decision, "block");
  assert.match(stop.reason, /never saw: .*Footer\.tsx/);
  assert.ok(t().uiWrites.some((w) => w.file.split("\\").join("/") === "src/Footer.tsx" && w.unseen), "folded into the task's UI writes");
  assert.ok(state.needsFitcheck(t(), loadConfig()));
  // drip_status says so; once folded in, the diff is empty
  assert.deepEqual(evidence.workspaceDiff(t()).unseen, []);
  // a fit check done AFTER the edits covers them
  state.updateState((st) => {
    st.task.fitcheck.lastShotAt = new Date(Date.now() + 1000).toISOString();
    st.task.fitcheck.doneAt = new Date(Date.now() + 2000).toISOString();
    st.task.fitcheck.shotRev = evidence.artifactRev(st.task);
    st.task.fitcheck.doneRev = evidence.artifactRev(st.task);
  });
  assert.equal(state.needsFitcheck(t(), loadConfig()), false);
  // drip_end on a task without a snapshot (older state) never invents unseen edits
  assert.deepEqual(evidence.workspaceDiff({ id: "nosnap" }).unseen, []);
});

test("session start: a project with a master board gets a short pointer, any other project hears nothing, an open task is still recovered", async () => {
  const empty = use(tmp("quiet"));
  assert.equal(hook("session-start.mjs", {}, empty), null);
  assert.ok(!fs.existsSync(path.join(empty, ".drip")), "looking created nothing");
  assert.equal(hook("prompt.mjs", { prompt: "hello" }, empty), null);

  const p = use(tmp("pointer"));
  store.createBoard("Acme", "brief");
  let out = hook("session-start.mjs", {}, p);
  assert.match(out.hookSpecificOutput.additionalContext, /master board "Acme"/);
  assert.match(out.hookSpecificOutput.additionalContext, /No approved direction yet/);
  assert.ok(out.hookSpecificOutput.additionalContext.split("\n").length <= 5, "2-4 lines");
  store.updateBoard("acme", (b) => {
    b.directions = [{ name: "Paper", summary: "s", adjectives: ["a", "b"], palette: ["#111111", "#ffffff"], type: "x", items: [] }];
  });
  memory.approveDirection({ boardId: "acme", direction: "Paper", approved: true });
  memory.recordFeedback({ text: "sharp", scope: "brand", source: "user-explicit", rule: { topic: "corners", value: "sharp" } });
  out = hook("session-start.mjs", {}, p);
  assert.match(out.hookSpecificOutput.additionalContext, /Approved direction "Paper" \(style sr1\); 1 approved rule/);
  // an unfinished task is still reported, with the pointer after it
  state.updateState((st) => (st.task = state.newTask({ title: "pricing", size: "full", surface: "landing", guides: [] })));
  out = hook("session-start.mjs", {}, p);
  assert.match(out.hookSpecificOutput.additionalContext, /design task from an earlier session is still open/);
  assert.match(out.hookSpecificOutput.additionalContext, /master board "Acme"/);
  // it can be turned off
  fs.writeFileSync(path.join(p, ".drip", "config.json"), JSON.stringify({ memory: { sessionPointer: false } }));
  assert.ok(!/master board/.test(hook("session-start.mjs", {}, p)?.hookSpecificOutput?.additionalContext || ""));
});

test("drip_start loads the memory only for design tasks; drip_status shows the context line; modes are chosen from the words and can be overridden", async () => {
  const p = use(tmp("start"));
  fs.writeFileSync(path.join(p, "x.html"), "<p>x</p>");
  store.createBoard("Acme", "brief");
  store.updateBoard("acme", (b) => {
    b.directions = [{ name: "Paper", summary: "paper and ink", adjectives: ["a", "b"], palette: ["#111111", "#ffffff"], type: "x", items: [] }];
  });
  memory.approveDirection({ boardId: "acme", direction: "Paper", approved: true });
  const refs = await call("drip_start", { task: "just find references for a bakery", mode: "refs" });
  assert.ok(!/PROJECT MEMORY [(]/.test(refs.text));
  assert.equal(state.loadState().task.memory, null);
  const d = await call("drip_start", { task: "pricing page for the app" });
  assert.match(d.text, /PROJECT MEMORY \(fidelity mode/);
  const st = await call("drip_status");
  assert.match(st.text, /Project memory: fidelity mode · master board acme/);
  assert.match(st.text, /Project context: Master board/);
  const r = await call("drip_start", { task: "redesign the whole look of the site" });
  assert.match(r.text, /PROJECT MEMORY \(redesign mode/);
  const o = await call("drip_start", { task: "redesign the whole look of the site", memory: "fidelity" });
  assert.match(o.text, /fidelity mode/);
  const f = await call("drip_start", { task: "a new brand inside this repo", memory: "fresh" });
  assert.ok(!/PROJECT MEMORY [(]/.test(f.text), f.text.slice(0, 600));
  // a task that is not design work is not told anything about it
  assert.equal(project.hasMemory(), true);
  assert.equal(project.projectContext({ task: { memory: null } }).hasMemory, true);
});

test("carrying studies: only complete, fresh studies of the same kind of surface count, and they stay the task's to pass", async () => {
  use(tmp("carry"));
  const full = { layout: "12-col grid, headline spans 9 cols", type: "serif display 96px over text 16px", color: "#f4f1ea ground, #16140f ink", density: "about 25 words above the fold", detail: "nav aligned to the headline baseline", take: "the 10:1 type ratio", leave: "the stock 3D render" };
  const b = store.createBoard("Master", "b");
  const old = new Date(Date.now() - 200 * 864e5).toISOString();
  store.updateBoard(b.id, (x) => {
    store.addItem(x, { key: "site:good.com", kind: "shot", designer: "Good", title: "Good", note: "n".repeat(20), study: { ...full, at: new Date().toISOString(), surface: "landing", onSurface: true } });
    store.addItem(x, { key: "site:old.com", kind: "shot", designer: "Old", title: "Old", note: "n".repeat(20), study: { ...full, at: old, surface: "landing", onSurface: true } });
    store.addItem(x, { key: "dribbble:1", kind: "shot", designer: "App", title: "App", note: "n".repeat(20), study: { ...full, at: new Date().toISOString(), surface: "app", onSurface: true } });
    store.addItem(x, { key: "dribbble:2", kind: "shot", designer: "Thin", title: "Thin", note: "n".repeat(20), study: { ...full, detail: "nice", at: new Date().toISOString(), surface: "landing" } });
  });
  state.updateState((st) => (st.task = state.newTask({ title: "landing", size: "full", surface: "landing", guides: [] })));
  const c = await call("board_attach", { board: b.id, carry: true, from: b.id });
  assert.match(c.text, /Carried 1 study/);
  assert.match(c.text, /site:old\.com \(older than 90 days\)/);
  assert.match(c.text, /dribbble:1 \(studied for a app task/);
  assert.match(c.text, /dribbble:2 \(incomplete study\)/);
  const studied = state.loadState().task.refs.studied;
  assert.deepEqual(studied.map((s) => s.key), ["site:good.com"]);
  assert.ok(studied.every((s) => s.inherited?.board === b.id), "marked as inherited with the board revision");
  const need = state.missingBeforeUi(state.loadState().task, loadConfig()).map((m) => m.need);
  assert.ok(need.includes("references"), "4 studies from 3 designers are still required");
  assert.ok(need.includes("brief"));
});

test("style_extract measures a rendered page (skipped when no Chrome/Edge is installed)", async (t) => {
  const { findChrome } = await import("../src/core/chrome.mjs");
  let chrome = null;
  try {
    chrome = findChrome(loadConfig());
  } catch {
    /* none */
  }
  if (!chrome) return t.skip("no browser installed");
  const p = use(tmp("render"));
  fs.writeFileSync(
    path.join(p, "index.html"),
    `<!doctype html><html><head><style>:root{--accent:#e8452c}body{margin:0;background:#f4f1ea;color:#16140f;font:16px/1.5 Georgia,serif}.wrap{max-width:1120px;margin:0 auto;padding:48px 24px}h1{font-size:72px;margin:0 0 24px}.btn{display:inline-block;background:#e8452c;color:#fff;border:0;padding:12px 24px;border-radius:2px;transition:background 150ms ease-out}.card{padding:24px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.2)}</style></head><body><div class="wrap"><h1>Hello there</h1><p>Some body text for the page.</p><button class="btn">Go</button><div class="card">card</div></div></body></html>`,
  );
  const r = await call("style_extract", { url: path.join(p, "index.html"), files: [] });
  assert.ok(!r.error, r.text);
  const s = memory.loadStyle().tokens;
  assert.ok(s.type.some((x) => x.size === 72), JSON.stringify(s.type));
  assert.ok(s.colors.some((c) => c.value === "#e8452c" && c.role === "accent"), JSON.stringify(s.colors));
  assert.ok(s.colors.some((c) => c.value === "#f4f1ea" && c.role === "ground"));
  assert.ok(s.motion.includes("0.15s") || s.motion.includes("150ms"), JSON.stringify(s.motion));
  assert.ok(s.radii.includes("2px"));
  assert.equal(s.grid.containerMax, 1120);
  assert.ok(s.spacing.includes(24));
});

test.after(async () => {
  (await import("../src/modules/board/server.mjs")).closeServer();
  setTimeout(() => process.exit(0), 300);
});
