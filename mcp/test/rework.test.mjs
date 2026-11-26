// 0.8.16: a big-change request on a built page opens a new round (look + pieces again); UI is never written from
// the shell while a task is open; an accented headline is a warning, never a lock.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const project = tmp("rework");
process.env.CLAUDE_PROJECT_DIR = project;

const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");
const { shellWrites } = await import("../../hooks/lib.mjs");
const { judgeAudit } = await import("../src/core/cdp.mjs");
const { isHard } = await import("../src/modules/fitcheck/index.mjs");
const hooks = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../hooks");

const builtTask = () => ({
  id: "t1",
  title: "chat page",
  loop: "fast",
  size: "full",
  surface: "app",
  refs: { viewed: [], studied: [] },
  toolUse: { refs_site: 3, components_find: 2, pieces_preview: 1 },
  toolLast: { refs_site: 1000, components_find: 1000, pieces_preview: 1000 },
  deal: { hero: "x" },
  brief: { what: "x" },
  uiWrites: [{ file: "src/App.tsx" }],
  requiredGuides: [],
  guidesRead: [],
});

test("rework words catch big-change asks and leave small edits alone", () => {
  for (const p of ["make it 1000x more beautiful and cool", "this is ugly", "it's boring, redo it", "way better please", "make it pop", "blow me away"]) assert.ok(state.REWORK_WORDS.test(p), p);
  for (const p of ["make the button 2px bigger", "fix the typo in the footer", "change the colour of the link", "move the nav down"]) assert.ok(!state.REWORK_WORDS.test(p), p);
});

test("a new round needs a fresh look and pieces before UI; calls after it began clear it", () => {
  const config = loadConfig(project);
  const t = builtTask();
  assert.deepEqual(state.missingBeforeUi(t, config), [], "the built page has nothing missing");
  t.rework = { at: 5000, prompt: "make it 1000x more beautiful" };
  const needs = state.missingBeforeUi(t, config).map((m) => m.need);
  assert.deepEqual(needs, ["a look for this round", "pieces for this round"]);
  t.toolLast.refs_gallery = 6000;
  t.toolLast.components_find = 6100;
  assert.deepEqual(state.missingBeforeUi(t, config), []);
});

test("the prompt hook opens the round on a built page and says what to do", () => {
  fs.mkdirSync(path.join(project, ".drip"), { recursive: true });
  state.saveState({ task: builtTask() }, project);
  const r = spawnSync(process.execPath, [path.join(hooks, "prompt.mjs")], { input: JSON.stringify({ cwd: project, prompt: "make it 1000x more beautiful and cool" }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /NEW ROUND/);
  assert.ok(state.loadState(project).task.rework?.at > 0);
});

test("a builder's or the critic's report is never the user asking for a new round", () => {
  fs.mkdirSync(path.join(project, ".drip"), { recursive: true });
  state.saveState({ task: builtTask() }, project);
  const note = "<task-notification>\n<status>completed</status>\n<result>REVISE: the pricing reads generic and the hero is a template; boring footer. Redo the showcase.</result>\n</task-notification>";
  for (const prompt of [note, `${note}\n<system-reminder>x</system-reminder>`, "Stop hook feedback: the page is boring"]) {
    const r = spawnSync(process.execPath, [path.join(hooks, "prompt.mjs")], { input: JSON.stringify({ cwd: project, prompt }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
    assert.doesNotMatch(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /NEW ROUND/);
    assert.equal(state.loadState(project).task.rework, undefined);
  }
  // The user's own words typed alongside a queued notification still count.
  const r = spawnSync(process.execPath, [path.join(hooks, "prompt.mjs")], { input: JSON.stringify({ cwd: project, prompt: `${note}\nit's boring, redo it` }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /NEW ROUND/);
});

test("shell writes are found: redirects, heredocs, tee, sed -i, PowerShell, inline node", () => {
  assert.deepEqual(shellWrites("cat >> src/index.css <<'EOF'\n.a{}\nEOF"), ["src/index.css"]);
  assert.deepEqual(shellWrites("cd app && echo hi > src/App.tsx"), ["src/App.tsx"]);
  assert.deepEqual(shellWrites("printf x | tee -a styles.css"), ["styles.css"]);
  assert.deepEqual(shellWrites("sed -i 's/a/b/' src/Hero.tsx"), ["src/Hero.tsx"]);
  assert.deepEqual(shellWrites('Set-Content -Path "src/a.css" -Value x'), ["src/a.css"]);
  assert.deepEqual(shellWrites(`node -e "require('fs').writeFileSync('src/b.tsx', s)"`), ["src/b.tsx"]);
  assert.deepEqual(shellWrites("npm run build 2>/dev/null && ls > /dev/null 2>&1"), []);
  assert.deepEqual(shellWrites("grep -n foo src/a.tsx | head"), []);
});

test("the shell gate refuses UI writes during a task and lets other commands through", () => {
  state.saveState({ task: builtTask() }, project);
  const run = (command) => spawnSync(process.execPath, [path.join(hooks, "pre-shell.mjs")], { input: JSON.stringify({ cwd: project, tool_name: "Bash", tool_input: { command } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  const denied = run("cat >> src/index.css <<'EOF'\n.a{}\nEOF");
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");
  const ok = run("npm run build");
  assert.ok(!ok.stdout.includes("deny"));
});

test("an accented word in the headline is a warning, not a blocker", () => {
  const a = { width: 1440, vh: 900, h1: 72, hero: { h1Accent: ['"thumbnail"'], h1Visible: true, h1Inside: true, h1Box: { x: 0, y: 0, w: 800, h: 80 }, navCovers: [], placeholders: [], clipped: [], pic: { w: 900, h: 700 }, h1w: 900 } };
  const { blockers, warnings } = judgeAudit(a, { hero: true });
  assert.ok(!blockers.some((x) => /accented headline/.test(x)), "never blocks");
  const w = warnings.find((x) => /accented headline/.test(x));
  assert.ok(w, warnings.join("\n"));
  assert.ok(!isHard(w));
});
