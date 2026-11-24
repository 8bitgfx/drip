// Code Mode: sandbox limits and escapes, allowlist, argument validation, images, drip_search / drip_execute.
// Offline: only tools that need no network are called.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const proj = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cm-"));
process.env.DRIP_PROJECT_DIR = proj;
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cmhome-"));
const cfgDir = path.join(proj, ".drip");
fs.mkdirSync(cfgDir, { recursive: true });
fs.writeFileSync(path.join(cfgDir, "config.json"), JSON.stringify({ codemode: { allow: ["test_*"] } }));

const { collectTools } = await import("../src/core/registry.mjs");
const { executeCode, searchTools, scriptTools } = await import("../src/core/codemode/execute.mjs");
const { allowedTools } = await import("../src/core/codemode/allowlist.mjs");
const { toolSignature } = await import("../src/core/codemode/signatures.mjs");

// Tools that return an image, fail, or are slow, so those paths are tested without network or Chrome.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const tools = collectTools();
const textRes = (t, isError) => ({ content: [{ type: "text", text: t }], ...(isError ? { isError: true } : {}) });
tools.set("test_image", { module: "test", meta: { description: "image", inputSchema: {} }, handler: async () => ({ content: [{ type: "text", text: "made one" }, { type: "image", data: PNG.toString("base64"), mimeType: "image/png" }] }) });
tools.set("test_fail", { module: "test", meta: { description: "fail", inputSchema: {} }, handler: async () => textRes("Gate: write a brief first.", true) });
tools.set("test_json", { module: "test", meta: { description: "json", inputSchema: {} }, handler: async () => textRes('{"a":[1,2,3]}') });
tools.set("test_slow", { module: "test", meta: { description: "slow", inputSchema: {} }, handler: async () => new Promise((r) => setTimeout(() => r(textRes("late")), 400)) });

test("a script chains tools and returns a value", async () => {
  const r = await executeCode("const a = await drip.palette_check({ pairs: [{ fg: '#000000', bg: '#FFFFFF' }] }); console.log('checked'); return { text: a.text, n: 2 };");
  assert.equal(r.ok, true, JSON.stringify(r.error));
  assert.match(r.value.text, /21\.00/);
  assert.deepEqual(r.logs, ["checked"]);
  assert.equal(r.calls, 1);
});

test("the sandbox has no host access", async () => {
  const probes = [
    "typeof require", "typeof process", "typeof fetch", "typeof module", "typeof Buffer", "typeof setTimeout",
    "typeof XMLHttpRequest", "typeof WebSocket", "typeof importScripts", "typeof __call", "typeof __log",
    "(function () { return typeof this.process + typeof this.require; })()",
    "(0, eval)('typeof process')",
    "(function(){}).constructor('return typeof process + typeof require')()",
    "(async function(){}).constructor('return typeof process')()",
  ];
  for (const p of probes) {
    const r = await executeCode(`return await (${p});`);
    assert.equal(r.ok, true, `${p}: ${JSON.stringify(r.error)}`);
    assert.match(String(r.value), /^(undefined)+$/, `${p} leaked: ${r.value}`);
  }
  const keys = await executeCode("return Object.getOwnPropertyNames(globalThis).join(',');");
  const have = keys.value.split(",");
  for (const bad of ["process", "require", "fetch", "__call", "__log", "Buffer", "setTimeout"]) assert.ok(!have.includes(bad), bad);
  const imp = await executeCode("const m = await import('node:fs'); return typeof m;");
  assert.equal(imp.ok, false);
  const bad = await executeCode("return await drip.__call('x');");
  assert.equal(bad.ok, false);
});

test("tools the script was not given are unreachable", async () => {
  for (const name of ["drip_execute", "board_open", "keys_open", "drip_serve", "not_a_tool"]) {
    const r = await executeCode(`return await drip.${name}({});`);
    assert.equal(r.ok, false, name);
    assert.match(r.error.message, /not available in Code Mode/, name);
  }
});

test("infinite loops are interrupted", async () => {
  const t = Date.now();
  const r = await executeCode("while (true) {}", { timeoutMs: 5000, cpuMs: 300 });
  assert.equal(r.ok, false);
  assert.equal(r.error.name, "LimitError");
  assert.ok(Date.now() - t < 4000);
});

test("memory and stack bombs are stopped", async () => {
  const mem = await executeCode("let s = 'x'; while (true) s += s;", { memoryMb: 16, cpuMs: 2000, timeoutMs: 10000 });
  assert.equal(mem.ok, false);
  const mem2 = await executeCode("const a = []; while (true) a.push({ a: 1, b: [1, 2, 3] });", { memoryMb: 8, cpuMs: 5000, timeoutMs: 10000 });
  assert.equal(mem2.ok, false);
  const stack = await executeCode("function f() { f(); } f();");
  assert.equal(stack.ok, false);
});

test("the total time limit applies while waiting on a tool", async () => {
  const r = await executeCode("await drip.test_slow({}); return 1;", { timeoutMs: 100 });
  assert.equal(r.ok, false);
  assert.match(r.error.message, /Time limit/);
});

test("maxCalls stops runaway loops of tool calls", async () => {
  const r = await executeCode("for (let i = 0; i < 10; i++) await drip.test_json({}); return 'done';", { maxCalls: 3 });
  assert.equal(r.ok, false);
  assert.match(r.error.message, /Call limit/);
});

test("zod errors are surfaced with the signature", async () => {
  const r = await executeCode("return await drip.palette_generate({ accent: 5 });");
  assert.equal(r.ok, false);
  assert.match(r.error.message, /Invalid arguments for palette_generate: accent/);
  assert.match(r.error.message, /drip\.palette_generate\(args: \{ accent: string/);
  const caught = await executeCode("try { await drip.palette_generate({}); } catch (e) { return 'caught: ' + e.message.slice(0, 30); }");
  assert.equal(caught.ok, true);
  assert.match(caught.value, /^caught: Invalid arguments/);
});

test("a tool refusal (gate) throws inside the script; try/catch continues", async () => {
  const r = await executeCode("try { await drip.test_fail({}); } catch (e) { return e.message; }");
  assert.equal(r.value, "Gate: write a brief first.");
});

test("images are written to files, not into the sandbox", async () => {
  const r = await executeCode("const x = await drip.test_image({}); return x;");
  assert.equal(r.ok, true);
  assert.equal(r.images.length, 1);
  assert.ok(fs.readFileSync(r.images[0]).equals(PNG));
  assert.equal(r.value.images[0], r.images[0]);
  assert.equal(r.value.text, "made one");
  assert.ok(!JSON.stringify(r.value).includes(PNG.toString("base64")));
});

test("JSON tool output is parsed into data", async () => {
  const r = await executeCode("const x = await drip.test_json({}); return x.data.a.length;");
  assert.equal(r.value, 3);
});

test("parallel calls with Promise.all run together", async () => {
  const t = Date.now();
  const r = await executeCode("const x = await Promise.all([drip.test_slow({}), drip.test_slow({}), drip.test_slow({})]); return x.map((v) => v.text);");
  assert.deepEqual(r.value, ["late", "late", "late"]);
  assert.ok(Date.now() - t < 1100, "calls ran one after another");
});

test("allowlist rules", () => {
  const names = ["drip_start", "drip_execute", "drip_search", "board_open", "board_add", "keys_open", "keys_status", "gen_image", "weird_tool"];
  assert.deepEqual(allowedTools(names, {}), ["drip_start", "drip_search", "board_add", "keys_status", "gen_image"]);
  assert.ok(allowedTools(names, { codemode: { allow: ["board_open"] } }).includes("board_open"));
  assert.ok(allowedTools(names, { codemode: { allow: ["weird_*"] } }).includes("weird_tool"));
  assert.ok(!allowedTools(names, { codemode: { deny: ["gen_*"] } }).includes("gen_image"));
  assert.ok(!allowedTools(names, { codemode: { allow: ["drip_execute"] } }).includes("drip_execute"), "drip_execute is never reachable");
  assert.ok(scriptTools().has("test_image"), "config allow applies");
});

test("drip_search returns signatures built from the zod schemas", () => {
  const found = searchTools("contrast", 3);
  const f = found.find((x) => x.name === "palette_check");
  assert.ok(f, "palette_check not found");
  assert.match(f.signature, /^drip\.palette_check\(args: \{ pairs: \{ fg: string; bg: string; label\?: string \}\[\] \}\)/);
  assert.match(toolSignature("drip_status", tools.get("drip_status").meta), /^drip\.drip_status\(/);
});

test("drip_search and drip_execute are registered tools and share the handlers", async () => {
  const search = await tools.get("drip_search").handler({ query: "palette contrast", limit: 2 });
  assert.match(search.content[0].text, /drip\.palette_check/);
  const exec = await tools.get("drip_execute").handler({ code: "console.log('x'); await drip.test_image({}); return 7;" });
  assert.equal(exec.isError, undefined);
  assert.match(exec.content[0].text, /console:\nx/);
  assert.match(exec.content[0].text, /result:\n7/);
  assert.equal(exec.content[1].type, "image");
  const fail = await tools.get("drip_execute").handler({ code: "throw new Error('nope')" });
  assert.equal(fail.isError, true);
  assert.match(fail.content[0].text, /error \(Error\): nope/);
});

test("console output is bounded", async () => {
  const r = await executeCode("for (let i = 0; i < 20000; i++) console.log('line ' + i); return 1;");
  assert.equal(r.ok, true);
  assert.equal(r.logsTruncated, true);
  assert.ok(r.logs.join("\n").length <= 21000);
});
