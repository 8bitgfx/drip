// Patterns workflow end to end with local fixtures only (no network): study a reference menu, build a second
// implementation, preview and compare it, catch a bad one, save to the index, and keep the index safe under
// concurrent writers. Browser tests are skipped when no Chrome/Edge is installed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../src/core/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcp = path.join(here, "..");
const skip = !findChrome({}) && "no Chrome/Edge on this machine";
const axePath = path.join(mcp, "node_modules", "axe-core", "axe.min.js");

const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-patterns-"));
process.env.DRIP_PROJECT_DIR = project;
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-patterns-home-"));
fs.cpSync(path.join(here, "fixtures", "patterns"), path.join(project, "fx"), { recursive: true });

const { collectTools } = await import("../src/core/registry.mjs");
const { closeBrowser } = await import("../src/core/browser.mjs");
after(() => closeBrowser());
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args);
  return { r, t: r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: r.content.filter((c) => c.type === "image").length };
};
const STATES = [
  { do: "hover", selector: "#trigger", label: "hover" },
  { do: "click", selector: "#trigger", label: "open" },
  { do: "key", text: "ArrowDown", label: "arrow down" },
  { do: "key", text: "Escape", label: "closed with Escape" },
];

test("the pattern tools are registered", () => {
  for (const n of ["refs_extract", "pattern_study", "pattern_spec", "pattern_preview", "pattern_compare", "pattern_save", "pattern_list", "pattern_get"]) assert.ok(tools.has(n), n);
});

test("study -> preview -> compare -> save", { skip, timeout: 240000 }, async (t) => {
  await t.test("refs_extract measures geometry, type, colour, states, motion, keyboard and ARIA", async () => {
    const { t: out, images } = await call("refs_extract", { file: "fx/ref-menu.html", selector: "#demo", states: STATES });
    assert.ok(images >= 1);
    assert.match(out, /## Colour roles/);
    assert.match(out, /transition opacity 160ms ease-out/);
    assert.match(out, /observed on "open"[\s\S]*CSSTransition opacity on ul\[role=menu\]#menu 160ms ease-out/);
    assert.match(out, /aria\/expanded false -> true/);
    assert.match(out, /Escape closes yes/);
    assert.match(out, /prefers-reduced-motion rules: yes/);
    assert.match(out, /Responsive[\s\S]*375px[\s\S]*768px[\s\S]*1440px/);
    const spec = JSON.parse(fs.readFileSync(out.match(/Full spec JSON: (.+)/)[1].trim(), "utf8"));
    assert.equal(spec.inferred, false);
    assert.equal(spec.keyboard.popup.opensWithKeyboard, true);
    assert.ok(spec.aria.roles.some((r) => r.value === "menu"));
    assert.equal(spec.states.length, 4);
  });

  await t.test("pattern_study stores spec, readable md, evidence and provenance", async () => {
    const { t: out } = await call("pattern_study", { name: "Actions menu", file: "fx/ref-menu.html", selector: "#demo", states: STATES, title: "Fixture menu", author: "Test", tags: ["menu"] });
    assert.match(out, /Status: proposed/);
    const dir = path.join(project, ".drip", "patterns", "actions-menu");
    for (const f of ["spec.json", "spec.md", "reference/base-375.png", "reference/base-1440.png", "reference/state-2-1440.png"]) assert.ok(fs.existsSync(path.join(dir, f)), f);
    const spec = JSON.parse(fs.readFileSync(path.join(dir, "spec.json"), "utf8"));
    assert.equal(spec.source.title, "Fixture menu");
    assert.equal(spec.source.author, "Test");
    assert.ok(spec.source.capturedAt);
    const idx = JSON.parse(fs.readFileSync(path.join(project, ".drip", "patterns", "index.json"), "utf8"));
    const e = idx.patterns.find((p) => p.id === "actions-menu");
    assert.equal(e.status, "proposed");
    assert.equal(e.kind, "component");
    assert.ok(e.previews.length >= 8);
  });

  await t.test("pattern_preview renders a second implementation (file and generated harness)", async () => {
    const a = await call("pattern_preview", { id: "actions-menu", file: "fx/impl-menu.html" });
    assert.match(a.t, /closed with Escape \(1440px\)/);
    assert.match(a.t, /opens with keyboard: yes, Escape closes: yes/);
    assert.equal(a.images, 1);
    const b = await call("pattern_preview", { html: '<button id="b" style="padding:10px">Hi</button>', css: "#b{transition:background 90ms}", selector: "#b", states: [{ do: "hover", selector: "#b", label: "hover" }] });
    assert.match(b.t, /Rendered http:\/\/127\.0\.0\.1/);
  });

  await t.test("pattern_compare: a close implementation gets a low diff, measured deltas, axe and keyboard results", async () => {
    process.env.DRIP_AXE_PATH = axePath;
    const { t: out, images } = await call("pattern_compare", { id: "actions-menu", file: "fx/impl-menu.html" });
    assert.equal(images, 1);
    const pcts = [...out.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => +m[1]);
    assert.ok(pcts.length >= 6 && pcts.every((p) => p < 10), `diff percentages ${pcts}`);
    assert.match(out, /motion: longest transition or animation: reference 160ms, yours 200ms/);
    assert.match(out, /shape: corner radii/);
    assert.match(out, /axe 4\.\d+\.\d+: no violations/);
    assert.match(out, /opens from keyboard yes, Escape closes yes/);
    assert.doesNotMatch(out, /\[high\]/);
  });

  await t.test("pattern_compare: a div-and-onclick menu is flagged on states, keyboard and ARIA", async () => {
    const { t: out } = await call("pattern_compare", { id: "actions-menu", file: "fx/bad-menu.html", selector: "#demo" });
    assert.match(out, /\[high\] state: "open" changes nothing/);
    assert.match(out, /\[high\] keyboard: tab stops: reference 1, yours 0/);
    assert.match(out, /aria: role menu/);
    assert.match(out, /\(size differs\)/);
  });

  await t.test("axe unavailable is reported, not hidden", async () => {
    process.env.DRIP_AXE_PATH = path.join(project, "no-such-axe.js");
    const { t: out } = await call("pattern_compare", { id: "actions-menu", file: "fx/impl-menu.html" });
    assert.match(out, /axe: not run — DRIP_AXE_PATH points at .*no-such-axe\.js/);
    process.env.DRIP_AXE_PATH = axePath;
  });

  await t.test("a screenshot is studied as inferred, and compares by colour only", async () => {
    const shot = path.join(project, ".drip", "patterns", "actions-menu", "reference", "base-1440.png");
    fs.copyFileSync(shot, path.join(project, "fx", "menu-shot.png"));
    const { t: out } = await call("pattern_study", { name: "Menu screenshot", file: "fx/menu-shot.png" });
    assert.match(out, /INFERRED from pixels/);
    assert.match(out, /Layout bands \(inferred\)/);
    assert.match(out, /NOT known/);
    const { t: cmp } = await call("pattern_compare", { id: "menu-screenshot", file: "fx/impl-menu.html", selector: "#demo" });
    assert.match(cmp, /reference is a screenshot: only colours and pixels can be compared/);
  });

  await t.test("pattern_spec adds notes and patches fields; pattern_save links files and keeps status until approved", async () => {
    await call("pattern_spec", { id: "actions-menu", notes: "Keep the 140ms open feel.", patch: { "colors.roles.accent": "#c2410c" } });
    const spec = JSON.parse(fs.readFileSync(path.join(project, ".drip", "patterns", "actions-menu", "spec.json"), "utf8"));
    assert.equal(spec.colors.roles.accent, "#c2410c");
    assert.match(fs.readFileSync(path.join(project, ".drip", "patterns", "actions-menu", "spec.md"), "utf8"), /Keep the 140ms open feel/);
    const bad = await call("pattern_save", { id: "actions-menu", files: ["fx/missing.html"] });
    assert.equal(bad.r.isError, true);
    await call("pattern_save", { id: "actions-menu", files: ["fx/impl-menu.html"], tags: ["keyboard"] });
    assert.match((await call("pattern_list", { status: "proposed" })).t, /actions-menu · component · proposed/);
    assert.doesNotMatch((await call("pattern_list", { status: "approved" })).t, /actions-menu/);
    await call("pattern_save", { id: "actions-menu", status: "approved" });
    const listed = (await call("pattern_list", { status: "approved", query: "menu keyboard" })).t;
    assert.match(listed, /actions-menu · component · approved .*menu, keyboard.*fx\/impl-menu\.html/);
    const got = (await call("pattern_get", { id: "actions-menu" })).t;
    assert.match(got, /"status": "approved"/);
    assert.match(got, /Keep the 140ms open feel/);
  });
});

test("the pattern index survives concurrent writers", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-pidx-"));
  const store = pathToFileURL(path.join(mcp, "src", "modules", "patterns", "store.mjs")).href;
  const script = `import { upsertPattern } from ${JSON.stringify(store)}; const w = process.argv[1]; for (let i = 0; i < 12; i++) upsertPattern({ id: w + "-" + i, name: w, kind: "component", status: "proposed", files: [], previews: [], source: {}, tags: [] });`;
  const run = (w) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e", script, w], { env: { ...process.env, DRIP_PROJECT_DIR: dir, DRIP_HOME: dir }, stdio: "ignore" });
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`writer ${w} exited ${c}`))));
  });
  await Promise.all(["a", "b", "c"].map(run));
  const idx = JSON.parse(fs.readFileSync(path.join(dir, ".drip", "patterns", "index.json"), "utf8"));
  assert.equal(idx.patterns.length, 36);
  assert.equal(new Set(idx.patterns.map((p) => p.id)).size, 36);
  assert.equal(idx.revision, 36);
});
