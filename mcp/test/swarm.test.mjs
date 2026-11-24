// Swarm Mode (agents, brief tools, host fallback) and first-use setup (doctor --fix, setup notes, install preflight).
// Offline: a temp HOME and project; a missing Chrome is faked by passing `chrome: null`.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const proj = fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarm-"));
const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarmhome-"));
process.env.DRIP_PROJECT_DIR = proj;
process.env.DRIP_HOME = home;

const { collectTools } = await import("../src/core/registry.mjs");
const { swarmInstructions, swarmOn, hostHasSubagents } = await import("../src/modules/swarm/index.mjs");
const { doctorFix, formatFix, installPreflight, missingPieces, setupNotes } = await import("../src/core/doctor.mjs");
const hosts = await import("../src/hosts/index.mjs");
const tools = collectTools();
const run = async (name, args) => (await tools.get(name).handler(args, {})).content[0].text;

test("agents have their model in the frontmatter", () => {
  const want = { scout: "haiku", builder: "sonnet", checker: "haiku" };
  for (const [name, model] of Object.entries(want)) {
    const head = fs.readFileSync(path.join(root, "agents", `${name}.md`), "utf8").split("---")[1];
    assert.match(head, new RegExp(`name:\\s*${name}\\b`));
    assert.match(head, new RegExp(`model:\\s*${model}\\b`));
    assert.match(head, /description:\s*\S.{40,}/s);
  }
});

test("the three brief tools exist and return a launchable prompt", async () => {
  for (const n of ["scout_prepare", "build_prepare", "checker_prepare"]) assert.ok(tools.has(n), n);
  const scout = await run("scout_prepare", { role: "competitor", subject: "modular baby stroller", style: "warm, playful" });
  assert.match(scout, /subagent_type: "drip:scout"/);
  assert.match(scout, /role: competitor/);
  assert.match(scout, /modular baby stroller/);
  assert.match(scout, /warm, playful/);
  assert.match(scout, /refs_study/);

  fs.writeFileSync(path.join(proj, "DESIGN.md"), "# Direction\nOne accent: #FF4D00. Display 127px.\n");
  const build = await run("build_prepare", { section: "hero", spec: "h1 at the Display role in cols 1-7, product photo bleeding right, one button Pre-order", files: ["index.html"], url: "http://localhost:3000" });
  assert.match(build, /subagent_type: "drip:builder"/);
  assert.match(build, /One accent: #FF4D00/);
  assert.match(build, /YOU MAY TOUCH ONLY: index\.html/);
  assert.match(build, /section/);

  const check = await run("checker_prepare", { url: "http://localhost:3000", sections: ["#hero", "#pricing"] });
  assert.match(check, /subagent_type: "drip:checker"/);
  assert.match(check, /numbersOnly: true/);
  assert.match(check, /#pricing/);
  assert.match((await tools.get("checker_prepare").handler({}, {})).content[0].text, /No page URL/);
});

test("swarmInstructions: full crew on Claude Code, single-agent fallback elsewhere", () => {
  const cc = swarmInstructions(null, { env: {} });
  assert.match(cc, /scout_prepare/);
  assert.match(cc, /build_prepare/);
  assert.match(cc, /checker_prepare/);
  assert.ok(cc.split("\n").length <= 10);
  const codex = swarmInstructions(null, { env: { DRIP_HOST: "codex" } });
  assert.match(codex, /single-agent loop/);
  assert.match(codex, /codex/);
  assert.ok(!/IN PARALLEL/.test(codex));
  assert.ok(hostHasSubagents({}) && hostHasSubagents({ DRIP_HOST: "claude-code" }) && !hostHasSubagents({ DRIP_HOST: "cursor" }));
});

test("swarm is on by default, off by config or task", () => {
  assert.equal(swarmOn({}, null), true);
  assert.equal(swarmOn({ swarm: false }, null), false);
  assert.equal(swarmOn({}, { swarm: false }), false);
  assert.equal(swarmOn({ swarm: true }, null), true);
  assert.equal(swarmOn({ swarm: false }, { swarm: true }), true);
});

test("the swarm skill and guide exist and are reachable as a topic", async () => {
  const { listGuides } = await import("../src/core/guides.mjs");
  assert.ok(listGuides().some((g) => g.topic === "swarm"));
});

test("setupNotes: names what is missing, once per machine", () => {
  const first = setupNotes({}, { chrome: null });
  assert.match(first, /^SETUP:/);
  assert.match(first, /Chrome or Edge/);
  assert.match(first, /drip doctor --fix --yes/);
  assert.ok(first.split("\n").length <= 3);
  assert.equal(setupNotes({}, { chrome: null }), "", "shown once");
  assert.ok(fs.existsSync(path.join(home, "setup.json")));
  assert.match(setupNotes({}, { chrome: "/some/chrome" }), /Optional/, "a different set of missing pieces shows again");
  assert.equal(setupNotes({}, { chrome: "/some/chrome" }), "");
});

test("doctorFix lists first, installs only with consent, never Chrome", async () => {
  const calls = [];
  const installers = { vendor: async (n) => calls.push(`vendor:${n}`), mockstudio: async () => (calls.push("mockstudio"), { ok: true }) };
  const dry = await doctorFix({ chrome: null, installers });
  assert.equal(dry.confirmed, false);
  assert.deepEqual(calls, []);
  assert.ok(dry.todo.length >= 2);
  assert.ok(dry.manual.some((m) => /Chrome or Edge/.test(m) && /google\.com\/chrome/.test(m)));
  assert.match(formatFix(dry), /--yes/);

  const done = await doctorFix({ confirm: true, chrome: null, installers });
  assert.equal(done.ok, true);
  assert.deepEqual(calls.sort(), ["mockstudio", "vendor:axe-core", "vendor:svgo"]);
  assert.ok(!calls.some((c) => /chrome|blender/i.test(c)));
  assert.match(formatFix(done), /Install these yourself/);

  const bad = await doctorFix({ confirm: true, chrome: "/c", installers: { vendor: async () => { throw new Error("offline"); }, mockstudio: async () => ({ ok: true }) } });
  assert.equal(bad.ok, false);
  assert.match(bad.failed.join(), /offline/);
});

test("installPreflight fails loudly without Chrome and says the fix", async () => {
  const pre = await installPreflight({ chrome: null });
  assert.equal(pre.ok, false);
  assert.ok(pre.failures.some((f) => f.id === "chrome"));
  assert.match(pre.text, /Chrome \/ Edge missing/);
  assert.match(pre.text, /google\.com\/chrome/);
  assert.match(pre.text, /DRIP_CHROME/);
  const ok = await installPreflight({ chrome: process.execPath });
  assert.ok(!ok.failures.some((f) => f.id === "chrome"));
});

test("host doctor runs the machine checks too", async () => {
  const fakeFail = () => [{ id: "machine-chrome", status: "fail", detail: "Chrome / Edge: not found", fix: "install it" }];
  const one = await hosts.doctor("codex", { pluginRoot: root, home: fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarm-h-")), machineChecks: fakeFail });
  assert.equal(one.ok, false);
  assert.ok(one.checks.some((c) => c.id === "machine-chrome"));
  assert.match(one.summary, /machine problem/);
  const all = await hosts.doctor(undefined, { pluginRoot: root, home: fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarm-h-")), machineChecks: fakeFail });
  assert.ok(all.checks.some((c) => c.id === "machine-chrome"));
  const real = await hosts.doctor("codex", { pluginRoot: root, home: fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarm-h-")) });
  const ids = real.checks.map((c) => c.id);
  for (const id of ["machine-node", "machine-chrome", "machine-codemode"]) assert.ok(ids.includes(id), id);
  assert.ok(Array.isArray(missingPieces({ chrome: null })));
});

test("drip doctor --fix without --yes only lists", () => {
  const r = spawnSync(process.execPath, [path.join(here, "..", "src", "index.mjs"), "doctor", "--fix"], { encoding: "utf8", env: { ...process.env, DRIP_PROJECT_DIR: proj, DRIP_HOME: fs.mkdtempSync(path.join(os.tmpdir(), "drip-swarm-cli-")) }, timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /--yes|Nothing for Drip to install/);
});
