// Host adapters: install / uninstall against temp HOME folders, hook adapters with sample payloads, generated packages.
// Nothing here touches the real machine. No host software is started; every host is "built, not verified in the real app".
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { adaptText } from "../src/hosts/adapt.mjs";
import * as hosts from "../src/hosts/index.mjs";
import { packMcpb, packPlugin, renderTemplates } from "../build-hosts.mjs";
import { readZip, zipDir } from "../src/hosts/zip.mjs";
import { newTask, saveState, loadState } from "../src/core/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-hosts-${p}-`));
const read = (f) => fs.readFileSync(f, "utf8");
const rj = (f) => JSON.parse(read(f));
const opts = (home, extra = {}) => ({ pluginRoot: root, home, env: { APPDATA: path.join(home, "AppData", "Roaming"), LOCALAPPDATA: path.join(home, "AppData", "Local") }, platform: process.platform, ...extra });

// The committed bundle must exist for installs (CI builds before testing).
const built = fs.existsSync(path.join(root, "mcp", "dist", "drip-mcp.mjs"));

/** Parse the TOML subset Drip writes: [tables], key = "string" | number | ["array"]. */
function miniToml(text) {
  const out = {};
  let cur = out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m;
    if ((m = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line))) {
      cur = out;
      for (const k of m[1].split(".")) cur = cur[k] = cur[k] || {};
    } else if ((m = /^([A-Za-z0-9_-]+) = (.+)$/.exec(line))) {
      cur[m[1]] = JSON.parse(m[2]);
    } else assert.fail(`not in the TOML subset: ${line}`);
  }
  return out;
}

// ---- install / uninstall ----

test("codex: install writes config.toml, hooks, skills, agent, rules; uninstall restores the user's files", { skip: !built }, async () => {
  const home = tmp("codex");
  const codexDir = path.join(home, ".codex");
  fs.mkdirSync(codexDir, { recursive: true });
  const userToml = '# my settings\nmodel = "gpt-x"\n\n[mcp_servers.other]\ncommand = "node"\nargs = ["other.js"]\n';
  const userHooks = { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } };
  fs.writeFileSync(path.join(codexDir, "config.toml"), userToml);
  fs.writeFileSync(path.join(codexDir, "hooks.json"), JSON.stringify(userHooks, null, 2));
  fs.writeFileSync(path.join(codexDir, "AGENTS.md"), "# My rules\nBe nice.\n");

  const r = await hosts.install("codex", opts(home));
  assert.equal(r.ok, true);
  const toml = miniToml(read(path.join(codexDir, "config.toml")));
  assert.equal(toml.model, "gpt-x");
  assert.deepEqual(toml.mcp_servers.other.args, ["other.js"]);
  assert.equal(toml.mcp_servers.drip.command, "node");
  assert.ok(fs.existsSync(toml.mcp_servers.drip.args[0]), "server path exists");
  assert.equal(toml.mcp_servers.drip.env.DRIP_HOST, "codex");
  const hooks = rj(path.join(codexDir, "hooks.json"));
  assert.equal(hooks.hooks.Stop.length, 2, "user's Stop hook kept, Drip's added");
  assert.equal(hooks.hooks.Stop[0].hooks[0].command, "echo mine");
  for (const ev of ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStop"]) assert.ok(hooks.hooks[ev].some((g) => g.hooks.some((h) => /codex\.mjs/.test(h.command))), ev);
  assert.ok(fs.existsSync(path.join(home, ".agents", "skills", "drip", "SKILL.md")));
  assert.ok(!/ToolSearch|mcp__plugin_drip/.test(read(path.join(home, ".agents", "skills", "drip", "SKILL.md"))));
  const agent = miniToml(read(path.join(codexDir, "agents", "drip-critic.toml")).split("developer_instructions")[0]);
  assert.equal(agent.name, "drip-critic");
  assert.match(read(path.join(codexDir, "AGENTS.md")), /# My rules[\s\S]*Drip \(design process\)/);
  assert.ok(fs.readdirSync(codexDir).some((f) => f.startsWith("config.toml.drip-backup-")), "backup made");
  assert.ok(fs.existsSync(path.join(home, ".drip", "hosts", "codex.json")));

  // Installing twice does not duplicate anything.
  await hosts.install("codex", opts(home));
  assert.equal(rj(path.join(codexDir, "hooks.json")).hooks.Stop.length, 2);
  assert.equal((read(path.join(codexDir, "config.toml")).match(/\[mcp_servers\.drip\]/g) || []).length, 1);

  const u = await hosts.uninstall("codex", opts(home));
  assert.ok(u.removed.length >= 4);
  assert.equal(read(path.join(codexDir, "config.toml")).trim(), userToml.trim());
  assert.deepEqual(rj(path.join(codexDir, "hooks.json")), userHooks);
  assert.equal(read(path.join(codexDir, "AGENTS.md")).trim(), "# My rules\nBe nice.");
  assert.ok(!fs.existsSync(path.join(home, ".agents", "skills", "drip")));
  assert.ok(!fs.existsSync(path.join(codexDir, "agents", "drip-critic.toml")));
});

test("codex: a foreign [mcp_servers.drip] table is never clobbered", { skip: !built }, async () => {
  const home = tmp("codex-conflict");
  fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
  const mine = '[mcp_servers.drip]\ncommand = "python"\nargs = ["mine.py"]\n';
  fs.writeFileSync(path.join(home, ".codex", "config.toml"), mine);
  const r = await hosts.install("codex", opts(home));
  assert.match(r.warnings.join("\n"), /did not write/);
  assert.equal(read(path.join(home, ".codex", "config.toml")), mine);
  await hosts.uninstall("codex", opts(home));
  assert.equal(read(path.join(home, ".codex", "config.toml")), mine);
});

test("cursor: install merges mcp.json and hooks.json, adds skills, critic and a project rule; uninstall keeps user entries", { skip: !built }, async () => {
  const home = tmp("cursor");
  const project = tmp("cursor-project");
  const cur = path.join(home, ".cursor");
  fs.mkdirSync(cur, { recursive: true });
  const userMcp = { mcpServers: { mine: { command: "node", args: ["m.js"] } } };
  const userHooks = { version: 1, hooks: { stop: [{ command: "./mine.sh" }] } };
  fs.writeFileSync(path.join(cur, "mcp.json"), JSON.stringify(userMcp));
  fs.writeFileSync(path.join(cur, "hooks.json"), JSON.stringify(userHooks));
  const r = await hosts.install("cursor", opts(home, { project }));
  assert.equal(r.ok, true);
  const mcp = rj(path.join(cur, "mcp.json"));
  assert.deepEqual(mcp.mcpServers.mine, userMcp.mcpServers.mine);
  assert.equal(mcp.mcpServers.drip.env.DRIP_PROJECT_DIR, "${workspaceFolder}");
  assert.ok(fs.existsSync(mcp.mcpServers.drip.args[0]));
  const hooks = rj(path.join(cur, "hooks.json"));
  assert.equal(hooks.version, 1);
  assert.equal(hooks.hooks.stop.length, 2);
  assert.ok(hooks.hooks.preToolUse[0].command.includes("cursor.mjs"));
  const critic = read(path.join(cur, "agents", "drip-critic.md"));
  assert.match(critic, /^---\nname: drip-critic\n[\s\S]*readonly: true\n---/);
  assert.match(read(path.join(project, ".cursor", "rules", "drip.mdc")), /^---\ndescription: [\s\S]*alwaysApply: true\n---/);
  assert.ok(fs.existsSync(path.join(cur, "skills", "drip-color", "SKILL.md")));
  await hosts.uninstall("cursor", opts(home, { project }));
  assert.deepEqual(rj(path.join(cur, "mcp.json")), userMcp);
  assert.deepEqual(rj(path.join(cur, "hooks.json")).hooks, userHooks.hooks);
  assert.ok(!fs.existsSync(path.join(project, ".cursor", "rules", "drip.mdc")));
});

test("cursor: a user's own server named drip is left alone; a config that does not parse is never overwritten", { skip: !built }, async () => {
  const home = tmp("cursor-conflict");
  fs.mkdirSync(path.join(home, ".cursor"), { recursive: true });
  const mine = { mcpServers: { drip: { command: "python", args: ["mine.py"] } } };
  fs.writeFileSync(path.join(home, ".cursor", "mcp.json"), JSON.stringify(mine));
  const r = await hosts.install("cursor", opts(home));
  assert.match(r.warnings.join("\n"), /not Drip's/);
  assert.deepEqual(rj(path.join(home, ".cursor", "mcp.json")), mine);
  await hosts.uninstall("cursor", opts(home));
  assert.deepEqual(rj(path.join(home, ".cursor", "mcp.json")), mine);

  const home2 = tmp("cursor-badjson");
  fs.mkdirSync(path.join(home2, ".cursor"), { recursive: true });
  fs.writeFileSync(path.join(home2, ".cursor", "mcp.json"), "{ not json");
  await assert.rejects(hosts.install("cursor", opts(home2)), /not valid JSON/);
  assert.equal(read(path.join(home2, ".cursor", "mcp.json")), "{ not json");
});

test("opencode: install follows the user's config layout; plugin, agent, skills; uninstall", { skip: !built }, async () => {
  const home = tmp("opencode");
  const oc = path.join(home, ".config", "opencode");
  fs.mkdirSync(oc, { recursive: true });
  const user = { $schema: "https://opencode.ai/config.json", theme: "dark", mcp: { mine: { type: "local", command: ["x"] } } };
  fs.writeFileSync(path.join(oc, "opencode.json"), JSON.stringify(user));
  const r = await hosts.install("opencode", opts(home));
  assert.equal(r.variant, "v1");
  const cfg = rj(path.join(oc, "opencode.json"));
  assert.equal(cfg.theme, "dark");
  assert.deepEqual(cfg.mcp.mine, user.mcp.mine);
  assert.equal(cfg.mcp.drip.type, "local");
  assert.ok(fs.existsSync(cfg.mcp.drip.command[1]));
  const plugin = read(path.join(oc, "plugins", "drip.js"));
  assert.match(plugin, /tool\.execute\.before/);
  assert.ok(fs.existsSync(JSON.parse(plugin.match(/const ADAPTER = (".*");/)[1])), "plugin points at an existing adapter");
  assert.match(read(path.join(oc, "agents", "drip-critic.md")), /mode: subagent\npermission:\n {2}edit: deny\n {2}bash: deny/);
  assert.match(r.warnings.join("\n"), /cannot block the end of a turn/);
  await hosts.uninstall("opencode", opts(home));
  assert.deepEqual(rj(path.join(oc, "opencode.json")), user);
  assert.ok(!fs.existsSync(path.join(oc, "plugins", "drip.js")));

  // V2 layout in the user's config: mcp.servers
  const home2 = tmp("opencode-v2");
  const oc2 = path.join(home2, ".config", "opencode");
  fs.mkdirSync(oc2, { recursive: true });
  fs.writeFileSync(path.join(oc2, "opencode.json"), JSON.stringify({ mcp: { servers: {} } }));
  const r2 = await hosts.install("opencode", opts(home2));
  assert.equal(r2.variant, "v2");
  assert.ok(rj(path.join(oc2, "opencode.json")).mcp.servers.drip);
  assert.ok(!fs.existsSync(path.join(oc2, "plugins", "drip.js")));
  await hosts.uninstall("opencode", opts(home2));
  assert.deepEqual(rj(path.join(oc2, "opencode.json")), { mcp: { servers: {} } });
});

test("claude-desktop: config path per platform (incl. the Store build), merge and uninstall", { skip: !built }, async () => {
  for (const [platform, expect] of [["darwin", ["Library", "Application Support", "Claude"]], ["linux", [".config", "Claude"]]]) {
    const home = tmp(`cd-${platform}`);
    const r = await hosts.install("claude-desktop", opts(home, { platform, project: "/work/site" }));
    assert.ok(r.configFile.includes(path.join(home, ...expect)), r.configFile);
    const cfg = rj(r.configFile);
    assert.equal(cfg.mcpServers.drip.env.DRIP_PROJECT_DIR, path.resolve("/work/site").split(path.sep).join("/"));
    await hosts.uninstall("claude-desktop", opts(home, { platform }));
    assert.deepEqual(rj(r.configFile).mcpServers, {});
  }
  // Windows: the Store (MSIX) build reads a copy under Packages\Claude_*; it is used when it exists.
  const home = tmp("cd-win");
  const appdata = path.join(home, "AppData", "Roaming");
  const msix = path.join(home, "AppData", "Local", "Packages", "Claude_pzs8sxrjxfjjc", "LocalCache", "Roaming", "Claude");
  fs.mkdirSync(msix, { recursive: true });
  fs.mkdirSync(path.join(appdata, "Claude"), { recursive: true });
  const user = { mcpServers: { files: { command: "npx", args: ["x"] } }, theme: "dark" };
  fs.writeFileSync(path.join(msix, "claude_desktop_config.json"), JSON.stringify(user));
  const r = await hosts.install("claude-desktop", opts(home, { platform: "win32" }));
  assert.equal(r.configFile, path.join(msix, "claude_desktop_config.json"));
  const cfg = rj(r.configFile);
  assert.deepEqual(cfg.mcpServers.files, user.mcpServers.files);
  assert.equal(cfg.theme, "dark");
  assert.ok(cfg.mcpServers.drip);
  await hosts.uninstall("claude-desktop", opts(home, { platform: "win32" }));
  assert.deepEqual(rj(r.configFile), user);
  // The classic %APPDATA% location when there is no Store build.
  const home2 = tmp("cd-win2");
  fs.mkdirSync(path.join(home2, "AppData", "Roaming", "Claude"), { recursive: true });
  const r2 = await hosts.install("claude-desktop", opts(home2, { platform: "win32" }));
  assert.equal(r2.configFile, path.join(home2, "AppData", "Roaming", "Claude", "claude_desktop_config.json"));
});

test("chatgpt: builds a self-contained plugin folder and a local marketplace entry; uninstall removes both", { skip: !built }, async () => {
  const home = tmp("chatgpt");
  fs.mkdirSync(path.join(home, ".agents", "plugins"), { recursive: true });
  const userMarket = { name: "mine", plugins: [{ name: "other", source: { source: "local", path: "./o" } }] };
  fs.writeFileSync(path.join(home, ".agents", "plugins", "marketplace.json"), JSON.stringify(userMarket));
  const r = await hosts.install("chatgpt", opts(home));
  assert.equal(r.ok, true);
  const plug = path.join(home, ".drip", "hosts", "chatgpt-plugin");
  assertPluginFolder(plug);
  const market = rj(path.join(home, ".agents", "plugins", "marketplace.json"));
  assert.equal(market.plugins.length, 2);
  assert.equal(market.plugins.find((p) => p.name === "drip").source.path, "./.drip/hosts/chatgpt-plugin");
  assert.ok(fs.existsSync(path.join(home, market.plugins.find((p) => p.name === "drip").source.path)));
  await hosts.uninstall("chatgpt", opts(home));
  assert.deepEqual(rj(path.join(home, ".agents", "plugins", "marketplace.json")), userMarket);
  assert.ok(!fs.existsSync(plug));
});

test("dry run changes nothing; unbuilt checkout is refused with the fix", { skip: !built }, async () => {
  for (const id of ["codex", "cursor", "opencode", "claude-desktop", "chatgpt"]) {
    const home = tmp(`dry-${id}`);
    const r = await hosts.install(id, opts(home, { dryRun: true }));
    assert.equal(r.dryRun, true);
    assert.ok(r.actions.length > 0, id);
    assert.deepEqual(fs.readdirSync(home).filter((f) => !f.startsWith("AppData")), [], `${id} wrote into home`);
  }
  const fake = tmp("unbuilt");
  await assert.rejects(hosts.install("codex", opts(tmp("x"), { pluginRoot: fake })), /server bundle is missing/);
});

test("hosts list, aliases, deferred and indirect hosts", async () => {
  const list = hosts.listHosts();
  for (const id of ["claude-code", "codex", "cursor", "opencode", "t3code", "claude-desktop", "chatgpt", "claude-web", "chatgpt-web"]) assert.ok(list.some((h) => h.id === id), id);
  for (const h of list) assert.ok(h.label && h.summary && h.capabilities, h.id);
  for (const h of list.filter((x) => x.installable)) for (const k of ["mcpTools", "skills", "writeHook", "stopHook", "criticSubagent"]) assert.ok(["supported", "partial", "unsupported", "unknown"].includes(h.capabilities[k]), `${h.id}.${k}`);
  assert.equal((await hosts.install("t3", { home: tmp("t3") })).ok, true);
  assert.match((await hosts.install("t3code", { home: tmp("t3") })).note, /drives Codex/);
  assert.match((await hosts.install("claude-code", { home: tmp("cc") })).note, /plugin/);
  await assert.rejects(hosts.install("chatgpt-web", {}), /unsupported/);
  await assert.rejects(hosts.install("claude-web", {}), /unsupported/);
  await assert.rejects(hosts.install("nope", {}), /Unknown host/);
  const d = await hosts.doctor("codex", opts(tmp("doc")));
  assert.ok(d.checks.some((c) => c.id === "mcp"));
  assert.ok((await hosts.doctor(undefined, opts(tmp("doc2")))).checks.length >= 5);
});

// ---- hook adapters ----

const adapterEnv = (project) => ({ ...process.env, CLAUDE_PROJECT_DIR: "", DRIP_PROJECT_DIR: project });

function runAdapter(host, event, payload, project) {
  const r = spawnSync(process.execPath, [path.join(root, "hooks", "hosts", `${host}.mjs`), event], { input: JSON.stringify(payload), encoding: "utf8", env: adapterEnv(project), timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

function projectWithTask(extra = {}) {
  const project = tmp("proj");
  const task = { ...newTask({ title: "Landing page", size: "full", surface: "landing", guides: [] }), ...extra };
  saveState({ task, history: [] }, project);
  return project;
}

const PATCH = "*** Begin Patch\n*** Add File: src/Hero.tsx\n+export const Hero = () => <div className=\"bg-red-500 p-4\">Hi</div>;\n*** End Patch";

test("codex adapter: a UI write is denied while the design loop is incomplete; logic edits and other tools pass", () => {
  const project = projectWithTask();
  const deny = runAdapter("codex", "PreToolUse", { session_id: "s1", cwd: project, hook_event_name: "PreToolUse", tool_name: "apply_patch", tool_input: { command: PATCH } }, project);
  assert.equal(deny.hookSpecificOutput.permissionDecision, "deny");
  assert.match(deny.hookSpecificOutput.permissionDecisionReason, /^\[Drip\] Not yet: the full design loop/);
  assert.ok(!/ToolSearch|mcp__plugin_drip/.test(deny.hookSpecificOutput.permissionDecisionReason), "Claude-only wording removed");
  assert.equal(runAdapter("codex", "PreToolUse", { cwd: project, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Add File: src/util.js\n+export const a = 1;\n*** End Patch" } }, project), null);
  assert.equal(runAdapter("codex", "PreToolUse", { cwd: project, tool_name: "Bash", tool_input: { command: "ls" } }, project), null);
  assert.equal(runAdapter("codex", "PreToolUse", { cwd: project, tool_name: "apply_patch", tool_input: { command: "garbage" } }, project), null);
});

test("codex adapter: no Drip task means no blocking; post-write records the UI change; stop blocks until a fit check", () => {
  const empty = tmp("empty");
  assert.equal(runAdapter("codex", "PreToolUse", { cwd: empty, tool_name: "apply_patch", tool_input: { command: PATCH } }, empty), null);
  assert.equal(runAdapter("codex", "Stop", { cwd: empty, session_id: "s" }, empty), null);

  const project = projectWithTask({ brief: { at: new Date().toISOString() } });
  const post = runAdapter("codex", "PostToolUse", { session_id: "s1", cwd: project, tool_name: "apply_patch", tool_input: { command: PATCH }, tool_response: "ok" }, project);
  assert.ok(post === null || post.hookSpecificOutput.hookEventName === "PostToolUse");
  const t = loadState(project).task;
  assert.ok(t.uiWrites.some((w) => w.file.split(path.sep).join("/") === "src/Hero.tsx"), "UI write recorded");
  const stop = runAdapter("codex", "Stop", { session_id: "s1", cwd: project, hook_event_name: "Stop", stop_hook_active: false }, project);
  assert.equal(stop.decision, "block");
  assert.match(stop.reason, /\[Drip\] You changed UI/);
  assert.ok(!/ToolSearch|mcp__plugin_drip/.test(stop.reason));
});

test("codex adapter: session start context, critic run recorded from SubagentStop, drip_start binds the session", () => {
  const project = projectWithTask();
  const start = runAdapter("codex", "SessionStart", { session_id: "s9", cwd: project, source: "startup" }, project);
  assert.match(start.hookSpecificOutput.additionalContext, /design task from an earlier session is still open/);
  assert.ok(!/ToolSearch/.test(start.hookSpecificOutput.additionalContext));
  assert.equal(runAdapter("codex", "SubagentStop", { session_id: "s9", cwd: project, agent_type: "drip-critic" }, project), null);
  assert.equal(loadState(project).task.critic.runs.length, 1, "critic run recorded");
  const id = loadState(project).task.id;
  runAdapter("codex", "PostToolUse", { session_id: "s9", cwd: project, tool_name: "mcp__drip__drip_start", tool_response: `Started. task id ${id} ready` }, project);
  const raw = rj(path.join(project, ".drip", "state.json"));
  assert.equal(raw.sessions.s9, id, "session bound to the task");
});

test("cursor adapter: preToolUse deny, followup on stop, session start context, afterFileEdit recording, afterMCPExecution binding", () => {
  const project = projectWithTask();
  const base = { conversation_id: "c1", workspace_roots: [project] };
  const deny = runAdapter("cursor", "preToolUse", { ...base, hook_event_name: "preToolUse", tool_name: "Write", tool_input: { file_path: path.join(project, "src", "Hero.tsx"), contents: "export const H = () => <div className=\"p-4 bg-red-500\" />" } }, project);
  assert.equal(deny.permission, "deny");
  assert.match(deny.agent_message, /^\[Drip\] Not yet/);
  assert.equal(runAdapter("cursor", "preToolUse", { ...base, tool_name: "Shell", tool_input: { command: "ls" } }, project), null);
  assert.equal(runAdapter("cursor", "preToolUse", { ...base, tool_name: "Write", tool_input: { file_path: path.join(project, "a.js"), contents: "x" } }, project), null);

  const start = runAdapter("cursor", "sessionStart", { ...base, session_id: "c1" }, project);
  assert.match(start.additional_context, /design task from an earlier session/);

  const edited = runAdapter("cursor", "afterFileEdit", { ...base, file_path: path.join(project, "src", "Card.tsx"), edits: [{ old_string: "a", new_string: "<div className=\"p-4\">x</div>" }] }, project);
  assert.equal(edited, null);
  assert.ok(loadState(project).task.uiWrites.some((w) => w.file.endsWith("Card.tsx")));
  const stop = runAdapter("cursor", "stop", { ...base, status: "completed", loop_count: 0 }, project);
  assert.match(stop.followup_message, /\[Drip\] You changed UI/);

  const id = loadState(project).task.id;
  runAdapter("cursor", "afterMCPExecution", { ...base, tool_name: "drip_start", result_json: JSON.stringify({ content: [{ type: "text", text: `task id ${id}` }] }) }, project);
  assert.equal(rj(path.join(project, ".drip", "state.json")).sessions.c1, id);
  runAdapter("cursor", "subagentStop", { ...base, subagent_type: "drip-critic", status: "completed" }, project);
  assert.equal(loadState(project).task.critic.runs.length, 1);
});

test("opencode adapter: write gate, note after write, no stop gate", () => {
  const project = projectWithTask();
  const deny = runAdapter("opencode", "pre-write", { tool: "write", args: { filePath: path.join(project, "src", "Hero.tsx"), content: "<div className=\"p-4\" />" }, directory: project, sessionID: "o1" }, project);
  assert.equal(deny.block, true);
  assert.match(deny.reason, /^\[Drip\] Not yet/);
  assert.equal(runAdapter("opencode", "pre-write", { tool: "write", args: { filePath: path.join(project, "x.js"), content: "1" }, directory: project }, project), null);
  runAdapter("opencode", "post-write", { tool: "edit", args: { filePath: path.join(project, "src", "Nav.tsx"), newString: "<nav className=\"p-4\" />" }, directory: project }, project);
  assert.ok(loadState(project).task.uiWrites.some((w) => w.file.endsWith("Nav.tsx")));
  assert.equal(runAdapter("opencode", "stop", {}, project), null);
});

test("adapters never break the host: garbage input exits 0 with no output", () => {
  for (const [h, ev] of [["codex", "PreToolUse"], ["cursor", "preToolUse"], ["opencode", "pre-write"]]) {
    const r = spawnSync(process.execPath, [path.join(root, "hooks", "hosts", `${h}.mjs`), ev], { input: "not json at all", encoding: "utf8", timeout: 20000 });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  }
});

// ---- text adaptation, generated packages ----

test("adapted skills and rules contain no Claude Code only wording", () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (f.endsWith(".md")) files.push(f);
    }
  };
  walk(path.join(root, "skills"));
  walk(path.join(root, "rules"));
  for (const host of ["codex", "cursor", "opencode", "claude-desktop", "chatgpt"]) {
    for (const f of files) {
      const t = adaptText(read(f), host);
      assert.ok(!/ToolSearch|mcp__plugin_drip_drip__|AskUserQuestion/.test(t), `${host}: ${path.relative(root, f)}`);
      assert.ok(!/drip:critic/.test(t), `${host}: critic name in ${path.relative(root, f)}`);
    }
  }
});

test("hosts/ is generated and up to date; every file parses", () => {
  const files = renderTemplates();
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(root, "hosts", rel);
    assert.ok(fs.existsSync(f), `hosts/${rel} missing: run npm run build:hosts`);
    assert.equal(read(f).replace(/\r\n/g, "\n"), content, `hosts/${rel} is stale: run npm run build:hosts`);
    if (rel.endsWith(".json")) JSON.parse(content);
    if (rel.endsWith(".toml") && !rel.includes("agents/")) miniToml(content);
  }
  assert.ok(!Object.values(files).some((c) => c.includes(os.homedir()) || /C:\\Dev|C:\/Dev/.test(c)), "no machine-specific paths");
});

function assertPluginFolder(dir) {
  const plugin = rj(path.join(dir, "plugin.json"));
  assert.equal(plugin.name, "drip");
  const mcp = rj(path.join(dir, "mcp.json"));
  const server = mcp.mcpServers.drip.args[0].replace("${PLUGIN_ROOT}", dir);
  assert.ok(fs.existsSync(server), `server ${server}`);
  const hooks = rj(path.join(dir, "hooks", "hooks.json"));
  const cmds = Object.values(hooks.hooks).flat().flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(cmds.length >= 6);
  for (const c of cmds) {
    const file = /"([^"]+)"/.exec(c)[1].replace("${PLUGIN_ROOT}", dir);
    assert.ok(fs.existsSync(file), `hook adapter ${file}`);
  }
  for (const rel of ["skills/drip/SKILL.md", "skills/drip/playbook.md", "rules/hard-rules.md", "data/slop.json", "kit/base.css", ".claude-plugin/plugin.json", "hooks/lib.mjs", "mcp/src/core/state.mjs"]) assert.ok(fs.existsSync(path.join(dir, rel)), rel);
  assert.ok(!fs.existsSync(path.join(dir, "node_modules")));
  assert.ok(!/ToolSearch/.test(read(path.join(dir, "skills", "drip", "SKILL.md"))));
  // The packaged hook adapter runs from inside the package.
  const project = tmp("pkgproj");
  const r = spawnSync(process.execPath, [path.join(dir, "hooks", "hosts", "codex.mjs"), "PreToolUse"], { input: JSON.stringify({ cwd: project, tool_name: "apply_patch", tool_input: { command: PATCH } }), encoding: "utf8", env: adapterEnv(project) });
  assert.equal(r.status, 0, r.stderr);
}

test("packages: plugin folders and the .mcpb reference files that exist", { skip: !built }, () => {
  const dest = path.join(tmp("pack"), "plugin");
  packPlugin("codex", dest);
  assertPluginFolder(dest);

  const out = path.join(tmp("mcpb"), "drip.mcpb");
  const r = packMcpb(out);
  assert.ok(r.files > 50 && r.bytes > 100000);
  const zip = readZip(out);
  const manifest = JSON.parse(zip["manifest.json"].toString());
  assert.equal(manifest.manifest_version, "0.3");
  assert.equal(manifest.server.type, "node");
  assert.ok(zip[manifest.server.entry_point], "entry_point is in the archive");
  assert.ok(manifest.server.mcp_config.args[0].startsWith("${__dirname}/"));
  assert.ok(zip[manifest.server.mcp_config.args[0].replace("${__dirname}/", "")]);
  assert.ok(zip[".claude-plugin/plugin.json"], "plugin-root marker is packaged");
  assert.ok(zip["skills/drip/SKILL.md"] && !/ToolSearch/.test(zip["skills/drip/SKILL.md"].toString()));
  assert.equal(manifest.user_config.project_dir.type, "directory");
  assert.equal(manifest.name, "drip");
});

test("zip writer round trip, deterministic", () => {
  const dir = tmp("zip");
  fs.mkdirSync(path.join(dir, "a"), { recursive: true });
  fs.writeFileSync(path.join(dir, "a", "x.txt"), "hello ".repeat(1000));
  fs.writeFileSync(path.join(dir, "b.bin"), Buffer.from([0, 1, 2, 3, 255]));
  const f1 = path.join(tmp("zo"), "a.zip");
  const f2 = path.join(tmp("zo"), "b.zip");
  zipDir(dir, f1);
  zipDir(dir, f2);
  assert.ok(fs.readFileSync(f1).equals(fs.readFileSync(f2)));
  const z = readZip(f1);
  assert.equal(z["a/x.txt"].toString(), "hello ".repeat(1000));
  assert.deepEqual([...z["b.bin"]], [0, 1, 2, 3, 255]);
});
