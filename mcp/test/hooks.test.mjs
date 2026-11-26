// Hook behaviour: feed the scripts the same JSON Claude Code sends and check their decisions.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { newTask, saveState, loadState } from "../src/core/state.mjs";

const hooks = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "hooks");

function runHook(name, input, project) {
  const r = spawnSync(process.execPath, [path.join(hooks, name)], { input: JSON.stringify({ cwd: project, ...input }), env: { ...process.env, CLAUDE_PROJECT_DIR: project }, encoding: "utf8" });
  return r.stdout ? JSON.parse(r.stdout) : null;
}

function project({ strict = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-hooks-"));
  fs.mkdirSync(path.join(dir, "src"));
  if (strict) {
    fs.mkdirSync(path.join(dir, ".drip"));
    fs.writeFileSync(path.join(dir, ".drip", "config.json"), JSON.stringify({ gates: { mode: "always" } }));
  }
  fs.writeFileSync(path.join(dir, "src", "Old.tsx"), "export const Old = () => <div className='p-4'>hi</div>;");
  return dir;
}

const deny = (r) => r?.hookSpecificOutput?.permissionDecision === "deny";

test("default (opt-in): without a Drip task the hooks stay out of the way", () => {
  const p = project({ strict: false });
  const file = path.join(p, "src/New.tsx");
  assert.equal(runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "<div/>" } }, p), null);
  assert.equal(runHook("pre-write.mjs", { tool_name: "Edit", tool_input: { file_path: path.join(p, "src/Old.tsx"), old_string: "p-4", new_string: "className='p-8 bg-zinc-900'" } }, p), null);
  fs.writeFileSync(file, `<h1 className="from-purple-500 to-pink-500">Unlock</h1>`);
  assert.equal(runHook("post-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "x" } }, p), null);
  assert.equal(runHook("prompt.mjs", { prompt: "redesign the pricing page" }, p), null);
  assert.equal(runHook("session-start.mjs", {}, p), null);
  assert.equal(runHook("stop.mjs", {}, p), null);
});

test("default (opt-in): once a task is started, the gate applies", () => {
  const p = project({ strict: false });
  saveState({ version: 1, task: newTask({ title: "pricing", size: "full", surface: "landing", guides: ["loop"] }), history: [] }, p);
  assert.ok(deny(runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/P.tsx"), content: "<div/>" } }, p)));
});

test("strict: new UI file without a task is blocked", () => {
  const p = project();
  assert.ok(deny(runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/New.tsx"), content: "<div/>" } }, p)));
});

test("non-UI files are never blocked", () => {
  const p = project();
  assert.equal(runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/util.ts"), content: "x" } }, p), null);
});

test("logic-only edit to a UI file without a task is allowed", () => {
  const p = project();
  assert.equal(runHook("pre-write.mjs", { tool_name: "Edit", tool_input: { file_path: path.join(p, "src/Old.tsx"), old_string: "hi", new_string: "count + 1" } }, p), null);
});

test("strict: visual edit without a task is blocked", () => {
  const p = project();
  assert.ok(deny(runHook("pre-write.mjs", { tool_name: "Edit", tool_input: { file_path: path.join(p, "src/Old.tsx"), old_string: "p-4", new_string: "className='p-8 bg-zinc-900'" } }, p)));
});

test("full task blocks until guides, references and direction are done", () => {
  const p = project();
  const task = newTask({ title: "pricing", size: "full", surface: "landing", guides: ["rules/hard-rules", "loop"] });
  saveState({ version: 1, task, history: [] }, p);
  const r = runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/Pricing.tsx"), content: "<div/>" } }, p);
  assert.ok(deny(r));
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /guides[\s\S]*references[\s\S]*direction/);
  task.guidesRead = ["rules/hard-rules", "loop"];
  task.brief = { what: "pricing", audience: "devs", job: "pick a plan", feel: ["precise"], ambition: "bold" };
  task.refs.viewed = ["a", "b", "c", "d", "e", "f"].map((x) => `dribbble:${x}`);
  task.refs.studied = task.refs.viewed.map((key, i) => ({ key, designer: `designer${i % 3}`, onSurface: false }));
  task.board = { id: "b", items: 9, directions: 2, chosen: "Terminal Calm" };
  task.critic.records.push({ kind: "directions", verdict: "pass", summary: "ok", at: new Date().toISOString() });
  task.guidesRead = ["rules/hard-rules", "loop"];
  saveState({ version: 1, task, history: [] }, p);
  const printOnly = runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/Pricing.tsx"), content: "<div/>" } }, p);
  assert.ok(deny(printOnly), "6 studies of posters and books must not unlock a landing page");
  assert.match(printOnly.hookSpecificOutput.permissionDecisionReason, /real examples/);
  task.refs.studied = task.refs.studied.map((x, i) => ({ ...x, onSurface: i < 4 }));
  saveState({ version: 1, task, history: [] }, p);
  const tasteOnly = runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/Pricing.tsx"), content: "<div/>" } }, p);
  assert.ok(deny(tasteOnly), "a landing page needs competitors and the same kind of page, not only style");
  assert.match(tasteOnly.hookSpecificOutput.permissionDecisionReason, /competitor references/);
  task.refs.studied.push({ key: "site:linear.app", role: "competitor", designer: "linear.app", onSurface: true }, { key: "site:height.app", role: "competitor", designer: "height.app", onSurface: true });
  task.refs.studied.push({ key: "site:stripe.com", role: "page", designer: "stripe.com", onSurface: true }, { key: "site:vercel.com", role: "page", designer: "vercel.com", onSurface: true });
  task.toolUse = { components_find: 1, images_search: 1 }; // the parts' sources were searched
  task.critic.records = [];
  task.board = { id: "b", items: 9, directions: 2, chosen: "Terminal Calm" };
  task.critic.records.push({ kind: "directions", verdict: "pass", summary: "ok", at: new Date().toISOString() });
  saveState({ version: 1, task, history: [] }, p);
  const noPlan = runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/Pricing.tsx"), content: "<div/>" } }, p);
  assert.ok(deny(noPlan), "sections need a plan that names their borrowed move and picture");
  assert.match(noPlan.hookSpecificOutput.permissionDecisionReason, /board_plan/);
  task.plan = { page: "landing", at: new Date().toISOString(), sections: [] };
  saveState({ version: 1, task, history: [] }, p);
  assert.equal(runHook("pre-write.mjs", { tool_name: "Write", tool_input: { file_path: path.join(p, "src/Pricing.tsx"), content: "<div/>" } }, p), null);
});

test("post-write records the change and reports slop", () => {
  const p = project();
  saveState({ version: 1, task: { ...newTask({ title: "t", size: "quick", surface: "other", guides: [] }) }, history: [] }, p);
  const file = path.join(p, "src/Hero.tsx");
  fs.writeFileSync(file, `<h1 className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Unlock seamless growth</h1>`);
  const r = runHook("post-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "x" } }, p);
  assert.match(r.hookSpecificOutput.additionalContext, /ai-gradient/);
  assert.equal(loadState(p).task.uiWrites.length, 1);
});

test("stop is blocked after UI changes until a fit check, then gives up after 3", () => {
  const p = project();
  const task = newTask({ title: "t", size: "full", surface: "landing", guides: [] });
  task.lastUiWriteAt = new Date().toISOString();
  task.uiWrites = [{ file: "src/A.tsx", at: task.lastUiWriteAt }];
  saveState({ version: 1, task, history: [] }, p);
  for (let i = 0; i < 3; i++) assert.equal(runHook("stop.mjs", {}, p)?.decision, "block");
  const gaveUp = runHook("stop.mjs", {}, p);
  assert.ok(!gaveUp?.decision, "the turn may end: never stuck");
  assert.match(gaveUp.systemMessage, /ended unchecked/, "but the user is told");
  assert.equal(loadState(p).task.endedUnchecked.length, 1);
  const t2 = loadState(p).task;
  t2.fitcheck.doneAt = new Date(Date.now() + 1000).toISOString();
  saveState({ version: 1, task: t2, history: [] }, p);
  const r = runHook("stop.mjs", {}, p);
  assert.equal(r?.decision, "block", "fit check alone isn't enough on a full loop: the critic must pass the build");
  assert.match(r.reason, /critic/);
  t2.critic.records.push({ kind: "build", verdict: "pass", summary: "ok", at: new Date(Date.now() + 2000).toISOString() });
  saveState({ version: 1, task: t2, history: [] }, p);
  assert.equal(runHook("stop.mjs", {}, p), null);
});

test("strict: prompt hook nudges design prompts only", () => {
  const p = project();
  assert.match(runHook("prompt.mjs", { prompt: "redesign the pricing page" }, p).hookSpecificOutput.additionalContext, /drip_start/);
  assert.equal(runHook("prompt.mjs", { prompt: "fix the failing unit test in the parser" }, p), null);
});

test("two sessions in one folder never see or change each other's task", () => {
  const p = project({ strict: false });
  const t = newTask({ title: "README polish", size: "full", surface: "landing", guides: ["loop"] });
  t.ownerSession = "session-A";
  t.ownerPid = process.pid; // a live process
  fs.mkdirSync(path.join(p, ".drip"), { recursive: true });
  fs.writeFileSync(path.join(p, ".drip", "state.json"), JSON.stringify({ version: 2, tasks: { [t.id]: t }, sessions: { "session-A": t.id }, history: [] }));
  const write = { tool_name: "Write", tool_input: { file_path: path.join(p, "src/P.tsx"), content: "<div/>" } };
  assert.ok(deny(runHook("pre-write.mjs", { session_id: "session-A", ...write }, p)), "the owner is gated by its task");
  assert.equal(runHook("pre-write.mjs", { session_id: "session-B", ...write }, p), null, "another session is not");
  const ss = runHook("session-start.mjs", { session_id: "session-B" }, p);
  assert.match(ss.hookSpecificOutput.additionalContext, /README polish.*they are theirs/s);
  assert.doesNotMatch(ss.hookSpecificOutput.additionalContext, /still open/);
  // B's hooks record nothing into A's task.
  runHook("post-write.mjs", { session_id: "session-B", ...write }, p);
  const raw = JSON.parse(fs.readFileSync(path.join(p, ".drip", "state.json"), "utf8"));
  assert.equal(raw.tasks[t.id].uiWrites.length, 0);
});

test("a task whose session is gone is picked up by the next session", () => {
  const p = project({ strict: false });
  const t = newTask({ title: "old", size: "full", surface: "landing", guides: ["loop"] });
  t.ownerSession = "gone";
  t.ownerPid = 999999; // not running
  fs.mkdirSync(path.join(p, ".drip"), { recursive: true });
  fs.writeFileSync(path.join(p, ".drip", "state.json"), JSON.stringify({ version: 2, tasks: { [t.id]: t }, sessions: { gone: t.id }, history: [] }));
  const ss = runHook("session-start.mjs", { session_id: "new" }, p);
  assert.match(ss.hookSpecificOutput.additionalContext, /still open/);
});

test("a v1 state file still loads", () => {
  const p = project({ strict: false });
  fs.mkdirSync(path.join(p, ".drip"), { recursive: true });
  const t = newTask({ title: "legacy", size: "quick", surface: "app", guides: [] });
  fs.writeFileSync(path.join(p, ".drip", "state.json"), JSON.stringify({ version: 1, task: t, history: [] }));
  assert.equal(loadState(p).task.title, "legacy");
});

test("stop lets the turn end when the agent is waiting on the user (a plan to approve), and speaks of films as films", () => {
  const p = project();
  const task = newTask({ title: "film", size: "full", surface: "other", guides: ["video"], mode: "motion" });
  task.lastUiWriteAt = new Date().toISOString();
  task.uiWrites = [{ file: "film/index.html", at: task.lastUiWriteAt }];
  saveState({ version: 1, task, history: [] }, p);
  const waiting = "I'm waiting on your OK for the film plan (prompt, slop page, paint wipe, logo) before I build anything. Say go, or tell me what to change.";
  assert.equal(runHook("stop.mjs", { last_assistant_message: waiting }, p), null);
  assert.equal(runHook("stop.mjs", { last_assistant_message: "Which of the two directions do you want?" }, p), null);
  // From the transcript when the host doesn't pass the message.
  const tr = path.join(p, "t.jsonl");
  fs.writeFileSync(tr, [JSON.stringify({ type: "user", message: { content: "make a trailer" } }), JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: waiting }] } })].join("\n"));
  assert.equal(runHook("stop.mjs", { transcript_path: tr }, p), null);
  const r = runHook("stop.mjs", { last_assistant_message: "Done: the film is built." }, p);
  assert.equal(r?.decision, "block");
  assert.match(r.reason, /changed the film .*frame and speed check/);
  assert.doesNotMatch(r.reason, /fit check/);
});
