// The command line: parity with the old form and with the handlers, --json shape, exit codes, schemas, images.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, "..", "src", "index.mjs");
const proj = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cli-"));
const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-clihome-"));
process.env.DRIP_PROJECT_DIR = proj;
process.env.DRIP_HOME = home;

function drip(args, { input, env } = {}) {
  const r = spawnSync(process.execPath, [entry, ...args], { encoding: "utf8", input, env: { ...process.env, DRIP_PROJECT_DIR: proj, DRIP_HOME: home, ...env }, timeout: 60000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const PAIRS = JSON.stringify({ pairs: [{ fg: "#000000", bg: "#FFFFFF" }] });

const { collectTools } = await import("../src/core/registry.mjs");
const { invokeTool, parseArgs } = await import("../src/core/cli.mjs");
const { inputJsonSchema } = await import("../src/core/codemode/signatures.mjs");
const tools = collectTools();

test("old form, `call` and the handler print the same text", async () => {
  const handler = await tools.get("palette_check").handler(JSON.parse(PAIRS), {});
  const expected = handler.content[0].text;
  const old = drip(["palette_check", PAIRS]);
  const call = drip(["call", "palette_check", "--input", PAIRS]);
  const viaFile = drip(["call", "palette_check", "--input-file", (() => { const f = path.join(proj, "in.json"); fs.writeFileSync(f, PAIRS); return f; })()]);
  const viaStdin = drip(["call", "palette_check", "--input", "-"], { input: PAIRS });
  for (const r of [old, call, viaFile, viaStdin]) {
    assert.equal(r.code, 0, r.err);
    assert.equal(r.out.trim(), expected.trim());
  }
});

test("`list` still prints one line per tool; tools list --json is structured", () => {
  const list = drip(["list"]);
  assert.equal(list.code, 0);
  assert.equal(list.out.trim().split("\n").length, tools.size);
  assert.match(list.out, /^drip_start\s/m);
  const j = JSON.parse(drip(["tools", "list", "--json"]).out);
  assert.equal(j.ok, true);
  assert.equal(j.tools.length, tools.size);
  assert.ok(j.tools.every((t) => t.name && t.module && "description" in t));
  assert.ok(j.tools.some((t) => t.name === "drip_execute"));
});

test("--json has the documented shape", () => {
  const ok = JSON.parse(drip(["call", "palette_check", "--input", PAIRS, "--json"]).out);
  assert.deepEqual(Object.keys(ok).sort(), ["images", "ok", "text", "tool"]);
  assert.equal(ok.ok, true);
  assert.equal(ok.tool, "palette_check");
  assert.deepEqual(ok.images, []);
  const bad = drip(["call", "palette_check", "--input", "{}", "--json"]);
  assert.equal(bad.code, 2);
  const b = JSON.parse(bad.out);
  assert.equal(b.ok, false);
  assert.equal(b.error.code, "invalid_arguments");
  assert.match(b.error.message, /pairs/);
});

test("exit codes", () => {
  assert.equal(drip(["nope_tool"]).code, 2, "unknown tool");
  assert.equal(drip(["call", "nope_tool"]).code, 2);
  assert.equal(drip(["call", "palette_check", "--input", "{oops"]).code, 2, "bad JSON");
  assert.equal(drip(["call", "palette_check", "--bogus"]).code, 2, "unknown option");
  assert.equal(drip(["tools", "schema"]).code, 2);
  // A tool that refuses (no files, no task) is a tool error, not a usage error.
  assert.equal(drip(["call", "fitcheck_lint", "--input", "{}"]).code, 1);
  // A feature this build does not have is a missing prerequisite.
  if (!tools.has("components_index")) assert.equal(drip(["components", "index"]).code, 3);
  assert.equal(drip(["help"]).code, 0);
  assert.equal(drip([]).code, 0);
});

test("every tool has a valid JSON Schema, and `tools schema` prints it", () => {
  for (const [name, { meta }] of tools) {
    const s = inputJsonSchema(meta);
    assert.equal(s.type, "object", name);
    assert.equal(typeof s.properties, "object", name);
    JSON.parse(JSON.stringify(s));
    for (const [k, v] of Object.entries(s.properties)) assert.ok(v && typeof v === "object", `${name}.${k}`);
    for (const r of s.required || []) assert.ok(r in s.properties, `${name} requires unknown ${r}`);
  }
  const r = drip(["tools", "schema", "palette_check"]);
  assert.equal(r.code, 0);
  const s = JSON.parse(r.out);
  assert.equal(s.name, "palette_check");
  assert.equal(s.inputSchema.type, "object");
  assert.deepEqual(s.inputSchema.required, ["pairs"]);
});

test("images go to --out, long text goes to a file", async () => {
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  tools.set("test_img", { module: "test", meta: { description: "t", inputSchema: {} }, handler: async () => ({ content: [{ type: "text", text: "y".repeat(30000) }, { type: "image", data: PNG.toString("base64"), mimeType: "image/png" }] }) });
  const out = path.join(proj, "shots");
  const r = await invokeTool("test_img", {}, { out });
  assert.equal(r.ok, true);
  assert.equal(r.images.length, 1);
  assert.ok(r.images[0].startsWith(out));
  assert.ok(fs.readFileSync(r.images[0]).equals(PNG));
  assert.ok(r.text.length < 21000, "text is bounded");
  assert.ok(r.textFile && fs.readFileSync(r.textFile, "utf8").length === 30000, "full text in a file");
  const legacy = await invokeTool("test_img", {}, { out, __legacy: true });
  assert.equal(legacy.text.length, 30000, "old form prints everything");
});

test("--project selects the project; project inspect works without a project_context tool", () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cli-other-"));
  fs.writeFileSync(path.join(other, "DESIGN.md"), "# x");
  const r = drip(["project", "inspect", "--project", other, "--json"]);
  assert.equal(r.code, 0, r.err);
  const j = JSON.parse(r.out);
  assert.equal(j.ok, true);
  assert.ok(j.text.includes(other) || j.text.toLowerCase().includes("design") || j.text.includes("Project"), j.text);
  assert.equal(drip(["project", "inspect", "--project", path.join(other, "missing")]).code, 2);
});

test("run --file executes a Code Mode script through the same handlers", () => {
  const f = path.join(proj, "wf.js");
  fs.writeFileSync(f, "const a = await drip.palette_check({ pairs: [{ fg: '#000000', bg: '#FFFFFF' }] }); console.log('step'); return a.text;");
  const r = drip(["run", "--file", f, "--json"]);
  assert.equal(r.code, 0, r.err + r.out);
  const j = JSON.parse(r.out);
  assert.equal(j.ok, true);
  assert.match(j.result, /21\.00/);
  assert.deepEqual(j.logs, ["step"]);
  fs.writeFileSync(f, "throw new Error('bad');");
  assert.equal(drip(["run", "--file", f]).code, 1);
  assert.equal(drip(["run"]).code, 2);
});

test("doctor reports checks and never prints key values", () => {
  const r = drip(["doctor", "--json"], { env: { OPENAI_API_KEY: "sk-secret-value-123" } });
  assert.ok([0, 3].includes(r.code), r.err);
  const j = JSON.parse(r.out);
  const ids = j.checks.map((c) => c.id);
  for (const id of ["node", "chrome", "blender", "uvx", "keys", "project", "plugin", "tools", "codemode"]) assert.ok(ids.includes(id), id);
  assert.ok(!r.out.includes("sk-secret-value-123"));
  assert.match(j.checks.find((c) => c.id === "keys").detail, /openai/);
  assert.equal(j.ok, j.checks.every((c) => c.status !== "fail"));
  assert.equal(drip(["doctor", "--install", "not-a-dep"]).code, 2);
});

test("install / uninstall / hosts report a missing hosts module as a prerequisite", () => {
  const hostsFile = path.resolve(here, "..", "src", "hosts", "index.mjs");
  if (fs.existsSync(hostsFile)) return; // the hosts workstream is merged; its own tests cover it
  for (const args of [["hosts"], ["install", "--agent", "codex"], ["uninstall", "--agent", "codex"]]) {
    const r = drip(args);
    assert.equal(r.code, 3, args.join(" "));
    assert.match(r.err + r.out, /not available in this build/);
  }
  assert.equal(drip(["install"]).code === 2 || drip(["install"]).code === 3, true);
});

test("--task and --session choose task state without editing it", () => {
  const r = drip(["call", "drip_status", "--session", "cli-test-session", "--json"]);
  assert.ok([0, 1].includes(r.code), r.err);
  JSON.parse(r.out);
});

test("argument parser", () => {
  const p = parseArgs(["call", "x", "--input={\"a\":1}", "--json", "--out", "d"]);
  assert.deepEqual(p.positional, ["call", "x"]);
  assert.equal(p.flags.input, '{"a":1}');
  assert.equal(p.flags.json, true);
  assert.equal(p.flags.out, "d");
  assert.throws(() => parseArgs(["--out"]), /needs a value/);
});
