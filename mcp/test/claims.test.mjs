// 0.8.21: the agent can't claim things on the user's or the critic's behalf, write Drip's state, dodge the size limit
// in small edits or by copying files, hand-make around a named piece, or argue with the critic.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const project = tmp("claims");
process.env.CLAUDE_PROJECT_DIR = project;

const hooks = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../hooks");
const { readTranscript, criticVerdict, userSaid, userReplied } = await import("../../hooks/transcript.mjs");
const { shellWrites, isDripState, directorTooBig } = await import("../../hooks/lib.mjs");
const state = await import("../src/core/state.mjs");
const { defends } = await import("../src/modules/critic/index.mjs");
const { unusedPieces, pieceKey } = await import("../src/core/pieces-check.mjs");
const { buildGaps } = await import("../src/modules/swarm/index.mjs");

// A small Claude Code transcript: the user's request, a critic run in the background, its notification.
function transcript(extra = []) {
  const f = path.join(tmp("tr"), "s.jsonl");
  const rows = [
    { type: "user", timestamp: "2026-11-25T10:00:00.000Z", message: { content: "redesign the chat page, make it beautiful" } },
    { type: "assistant", timestamp: "2026-11-25T10:05:00.000Z", message: { content: [{ type: "tool_use", id: "c1", name: "Agent", input: { subagent_type: "drip:critic" } }] } },
    { type: "user", timestamp: "2026-11-25T10:05:01.000Z", message: { content: [{ type: "tool_result", tool_use_id: "c1", content: [{ type: "text", text: "Async agent launched successfully." }] }] } },
    { type: "user", timestamp: "2026-11-25T10:09:00.000Z", message: { content: "<task-notification>\n<tool-use-id>c1</tool-use-id>\n<result>VERDICT: REVISE\n\nSCORES: appeal 6/10 · polish 4/10 · ux &amp; motion 5/10 (weighted ~54/100)</result>\n</task-notification>" } },
    { type: "user", timestamp: "2026-11-25T10:10:00.000Z", message: { content: "Stop hook feedback: [Drip] ship it" } },
    ...extra,
  ];
  fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n"));
  return f;
}

test("the transcript gives the user's words and the critic's own verdict, never hook text as the user", () => {
  const tr = readTranscript(transcript());
  assert.equal(tr.user.length, 1, "hook feedback and notifications aren't the user");
  assert.deepEqual(criticVerdict(tr, "2026-11-25T10:04:00.000Z"), { verdict: "revise", scores: { appeal: 6, polish: 4, uxmotion: 5 }, at: "2026-11-25T10:09:00.000Z" });
  assert.ok(userSaid(tr, "make it beautiful"));
  assert.ok(!userSaid(tr, "skip the design process"));
  assert.ok(!userReplied(tr, /ship/i, "2026-11-25T10:09:00.000Z"), "'ship it' in hook feedback is not the user");
});

function claim(tool, toolInput, task, extra = []) {
  state.saveState({ task }, project);
  const r = spawnSync(process.execPath, [path.join(hooks, "claims.mjs")], { input: JSON.stringify({ cwd: project, tool_name: `mcp__plugin_drip_drip__${tool}`, tool_input: toolInput, transcript_path: transcript(extra) }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}
const task = () => ({ id: "t", loop: "fast", size: "full", startedAt: "2026-11-25T09:59:00.000Z", critic: { records: [{ kind: "build", verdict: "revise", at: "2026-11-25T10:09:30.000Z" }], pending: null }, uiWrites: [] });

test("claims on the user's behalf need the user's words", () => {
  assert.equal(claim("drip_skip", { reason: "the user said skip the process" }, task())?.permissionDecision, "deny");
  assert.equal(claim("fitcheck_done", { verdict: "pass", acceptedByUser: true }, task())?.permissionDecision, "deny");
  assert.equal(claim("critic_prepare", { kind: "build", extraRound: true }, task())?.permissionDecision, "deny");
  const yes = [{ type: "user", timestamp: "2026-11-25T10:12:00.000Z", message: { content: "ok ship it with those open points" } }];
  assert.equal(claim("fitcheck_done", { verdict: "pass", acceptedByUser: true }, task(), yes), null);
});

test("critic_record has to match what the critic wrote", () => {
  const t = { ...task(), critic: { records: [], pending: { at: "2026-11-25T10:04:00.000Z" } } };
  assert.match(claim("critic_record", { kind: "build", verdict: "pass", scores: { appeal: 6 } }, t).permissionDecisionReason, /VERDICT: REVISE/);
  assert.match(claim("critic_record", { kind: "build", verdict: "revise", scores: { appeal: 8 } }, t).permissionDecisionReason, /appeal 8 \(critic: 6\)/);
  assert.equal(claim("critic_record", { kind: "build", verdict: "revise", scores: { appeal: 6, polish: 4 } }, t), null);
});

test("Drip's state can't be written by hand, from the editor or the shell", () => {
  assert.ok(isDripState(".drip/state.json") && isDripState("C:\\p\\.drip\\config.json") && isDripState(".drip/memory/rules.md"));
  assert.ok(!isDripState(".drip/DESIGN.md"));
  const r = spawnSync(process.execPath, [path.join(hooks, "pre-write.mjs")], { input: JSON.stringify({ cwd: project, tool_name: "Write", tool_input: { file_path: path.join(project, ".drip", "state.json"), content: "{}" } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, "deny");
  const s = spawnSync(process.execPath, [path.join(hooks, "pre-shell.mjs")], { input: JSON.stringify({ cwd: project, tool_name: "Bash", tool_input: { command: `echo '{"gates":{"enforce":false}}' > .drip/config.json` } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  assert.equal(JSON.parse(s.stdout).hookSpecificOutput.permissionDecision, "deny");
});

test("copies onto a UI file count as shell writes", () => {
  assert.deepEqual(shellWrites("cp /tmp/x.tsx src/Hero.tsx"), ["src/Hero.tsx"]);
  assert.deepEqual(shellWrites("mv -f draft.css src/index.css"), ["src/index.css"]);
  assert.deepEqual(shellWrites('Copy-Item C:\\t\\a.tsx -Destination "src\\App.tsx"'), ["src\\App.tsx"]);
});

test("the director's small edits add up", () => {
  const t = Object.assign(state.newTask({ title: "p", size: "full", surface: "landing", guides: [] }), { loop: "fast", directorLines: 145 });
  const ten = { new_string: Array(10).fill("x").join("\n") };
  assert.match(directorTooBig({ agent_id: undefined }, ten, t, {}), /written 145 lines yourself/);
  assert.equal(directorTooBig({}, ten, { ...t, directorLines: 20 }, {}), null);
});

test("a named piece must be on the page", () => {
  const root = tmp("page-root");
  const src = path.join(root, "page", "src");
  fs.mkdirSync(path.join(src, "components"), { recursive: true });
  fs.mkdirSync(path.join(src, "sections"), { recursive: true });
  fs.writeFileSync(path.join(src, "App.tsx"), 'import Ideas from "./sections/Ideas";');
  fs.writeFileSync(path.join(src, "sections", "Ideas.tsx"), "export default () => <div/>;");
  const t = { page: { dir: "page" }, sections: { ideas: { piece: "https://reactbits.dev/r/AccordionGallery-TS-TW.json" } } };
  assert.equal(pieceKey(t.sections.ideas.piece), "accordiongallery");
  assert.match(unusedPieces(t, root)[0], /no accordiongallery component is installed/);
  fs.writeFileSync(path.join(src, "components", "AccordionGallery.tsx"), "export default () => null;");
  assert.match(unusedPieces(t, root)[0], /nothing imports it/);
  fs.writeFileSync(path.join(src, "sections", "Ideas.tsx"), 'import AccordionGallery from "@/components/AccordionGallery";');
  assert.deepEqual(unusedPieces(t, root), []);
});

test("a piece installed under its own file name counts, without wrapper files", () => {
  const root = tmp("page-root-2");
  const src = path.join(root, "page", "src");
  fs.mkdirSync(path.join(src, "components"), { recursive: true });
  fs.mkdirSync(path.join(src, "sections"), { recursive: true });
  fs.writeFileSync(path.join(src, "App.tsx"), 'import Nav from "./sections/Nav";');
  fs.writeFileSync(path.join(src, "components", "header.tsx"), "export const Header = () => null;");
  fs.writeFileSync(path.join(src, "sections", "Nav.tsx"), 'import { Header } from "@/components/header";');
  const url = "https://www.efferd.com/r/header3.json";
  const t = { page: { dir: "page" }, sections: { nav: { piece: url } } };
  assert.match(unusedPieces(t, root)[0] || "", /no header3 component/, "unknown file names: the URL name is all there is");
  assert.deepEqual(unusedPieces({ ...t, pieceFiles: { [url]: ["header"] } }, root), [], "the registry's own file name is found");
});

test("the critic's context states facts, it doesn't argue", () => {
  assert.equal(defends("Logged-in workspace home of a thumbnail maker; the pictures are real outputs."), null);
  assert.ok(defends("The tilted cards are intentional"));
  assert.ok(defends("Round 2: the glow is already fixed"));
  assert.ok(defends("x".repeat(401)));
});

test("'from' names a reference that was looked at", () => {
  const t = { refs: { viewed: ["site:recraft.ai", "site:krea.ai", "site:ideogram.ai", "site:higgsfield.ai"], studied: [{ key: "site:recraft.ai", take: "t" }, { key: "site:krea.ai", take: "t" }, { key: "site:ideogram.ai", take: "t" }] }, toolUse: { pieces_preview: 1 } };
  assert.match(buildGaps(t, [{ section: "hero", piece: "x", from: "a big rounded frame of real art" }]).join(), /has to name a reference/);
  assert.deepEqual(buildGaps(t, [{ section: "hero", piece: "x", from: "recraft.ai: real art in a big rounded frame" }]), []);
});
