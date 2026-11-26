// The settings page: renders the task, keys, switches, kits and packs, and its posts change the right files.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-settings-home-"));
const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-settings-proj-"));
process.env.DRIP_HOME = home;
process.env.DRIP_NO_OPEN = "1";
for (const k of ["OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "UNSPLASH_ACCESS_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY"]) delete process.env[k];
const settings = await import("../src/modules/gen/settings.mjs");
const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");

test("the settings page shows every part and never a key value", async () => {
  await settings.applySettings("/key", new URLSearchParams({ name: "openai", value: "sk-secret-123" }), { cwd: project });
  const html = settings.renderSettings({ token: "tok", cwd: project });
  for (const part of ["Current task", "How Drip works", "API keys", "Paid UI kits", "Niche packs", "Check the install"]) assert.match(html, new RegExp(part));
  assert.doesNotMatch(html, /sk-secret-123/, "a saved key is never shown");
  assert.match(html, /No task open/);
  assert.ok((html.match(/role="switch"/g) || []).length === settings.SWITCHES.length);
  assert.ok(!/action="\/[^"]*"/.test(html.replace(/action="\/[^"?]*\?t=tok"/g, "")), "every form posts with the token");
});

test("posts change the machine-wide config, keys, kits and the task", async () => {
  assert.equal(loadConfig(project).gates.fastCritic, false);
  await settings.applySettings("/switch", new URLSearchParams({ id: "critic", on: "1" }), { cwd: project });
  assert.equal(loadConfig(project).gates.fastCritic, true);
  await settings.applySettings("/switch", new URLSearchParams({ id: "builders", on: "0" }), { cwd: project });
  assert.equal(loadConfig(project).swarm, false);
  assert.equal(loadConfig(project).gates.enforce, true, "other settings are kept");

  const keysFile = path.join(home, "keys.json");
  assert.equal(JSON.parse(fs.readFileSync(keysFile, "utf8")).openai, "sk-secret-123");
  await settings.applySettings("/key", new URLSearchParams({ name: "openai", remove: "1" }), { cwd: project });
  assert.equal(JSON.parse(fs.readFileSync(keysFile, "utf8")).openai, undefined);
  assert.match((await settings.applySettings("/key", new URLSearchParams({ name: "../../etc", value: "x" }), { cwd: project })).msg, /Unknown key/);

  const kits = new URLSearchParams();
  kits.append("kit", "Tailark");
  kits.append("kit", "not a kit");
  await settings.applySettings("/kits", kits, { cwd: project });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "kits.json"), "utf8")).owned, ["Tailark"]);

  fs.mkdirSync(path.join(project, ".drip"), { recursive: true });
  state.saveState({ task: state.newTask({ title: "Bakery landing", size: "full", surface: "landing", guides: [] }), history: [] }, project);
  assert.match(settings.renderSettings({ token: "tok", cwd: project }), /Bakery landing/);
  await settings.applySettings("/task/skip", new URLSearchParams(), { cwd: project });
  assert.match(state.loadState(project).task.skipped, /settings page/);
  await settings.applySettings("/task/end", new URLSearchParams(), { cwd: project });
  assert.equal(state.loadState(project).task, null);
  assert.equal(state.loadState(project).history.at(-1).endedBy, "settings page");
});

test("the page server refuses requests without its token", async () => {
  const url = await settings.openSettingsPage({ cwd: project, ttlMs: 5000 });
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/\?t=[0-9a-f]{32}$/);
  assert.equal((await fetch(url.replace(/\?t=.*/, ""))).status, 403);
  const ok = await fetch(url);
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Drip settings/);
  const bad = await fetch(url.replace(/\?t=.*/, "/switch?t=wrong"), { method: "POST", body: "id=checks&on=0" });
  assert.equal(bad.status, 403);
});
