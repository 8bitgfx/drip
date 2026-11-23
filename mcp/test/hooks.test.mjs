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

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-hooks-"));
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "Old.tsx"), "export const Old = () => <div className='p-4'>hi</div>;");
  return dir;
}

const deny = (r) => r?.hookSpecificOutput?.permissionDecision === "deny";

test("new UI file without a task is blocked", () => {
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

test("visual edit without a task is blocked", () => {
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
  task.refs.viewed = ["a", "b", "c", "d", "e", "f"].map((x) => `dribbble:${x}`);
  task.board = { id: "b", items: 9, directions: 2, chosen: "Terminal Calm" };
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
  assert.equal(runHook("stop.mjs", {}, p), null);
  const t2 = loadState(p).task;
  t2.fitcheck.doneAt = new Date(Date.now() + 1000).toISOString();
  saveState({ version: 1, task: t2, history: [] }, p);
  assert.equal(runHook("stop.mjs", {}, p), null);
});

test("prompt hook nudges design prompts only", () => {
  const p = project();
  assert.match(runHook("prompt.mjs", { prompt: "redesign the pricing page" }, p).hookSpecificOutput.additionalContext, /drip_start/);
  assert.equal(runHook("prompt.mjs", { prompt: "fix the failing unit test in the parser" }, p), null);
});
