// The project's own components: index, find, plan, audit, save, preview and drip_check, against a fixture
// app (primitives with cva variants, an untracked new component, a deliberate duplicate, token drift, legitimate
// variants). Offline; the judge is a fake CLI. Browser parts are skipped when no Chrome/Edge is installed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { findChrome } from "../src/core/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skipBrowser = !findChrome({}) && "no Chrome/Edge on this machine";

function makeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-comp-"));
  fs.cpSync(path.join(here, "fixtures", "components-app"), dir, { recursive: true });
  fs.renameSync(path.join(dir, "_gitignore"), path.join(dir, ".gitignore"));
  fs.mkdirSync(path.join(dir, "node_modules", "lib"), { recursive: true });
  fs.writeFileSync(path.join(dir, "node_modules", "lib", "x.tsx"), "export const Nope = () => <div>nope</div>;\n");
  const git = (...a) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" });
  git("init", "-q");
  git("add", "-A", ":!src/components/feature-tile.tsx");
  git("-c", "user.email=t@t", "-c", "user.name=t", "-c", "core.autocrlf=false", "commit", "-qm", "fixture");
  return { dir, git };
}

const { dir: project, git } = makeProject();
process.env.DRIP_PROJECT_DIR = project;
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-comp-home-"));
const { collectTools } = await import("../src/core/registry.mjs");
const { closeBrowser } = await import("../src/core/browser.mjs");
const { runCheck, componentEvidence } = await import("../src/core/check.mjs");
const dl = await import("../src/modules/components/drylint.mjs");
const { indexProject } = await import("../src/core/indexer/index.mjs");
after(() => closeBrowser());

const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args);
  return { r, t: r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: r.content.filter((c) => c.type === "image").length };
};
const read = (f) => fs.readFileSync(path.join(project, f), "utf8");
const write = (f, s) => fs.writeFileSync(path.join(project, f), s);

test("the component tools are registered next to the existing ones", () => {
  for (const n of ["components_find", "components_get", "components_registries", "components_catalogue", "components_index", "components_local_find", "components_plan", "components_preview", "components_audit", "components_save", "drip_check"]) assert.ok(tools.has(n), n);
});

test("index: exports, props, variants, usage, stories and tests; untracked included; ignored and secret files skipped", async () => {
  const before = git("status", "--porcelain");
  const { t } = await call("components_index", {});
  assert.match(t, /Indexed 12 files/);
  const idx = JSON.parse(read(".drip/index/components.json"));
  const files = Object.keys(idx.files);
  assert.ok(files.includes("src/components/feature-tile.tsx"), "the untracked component is indexed");
  assert.ok(!files.some((f) => f.includes("node_modules") || f.includes("generated") || f.includes(".env")));
  const btn = idx.files["src/components/ui/button.tsx"].facts.exports.find((e) => e.name === "Button");
  assert.equal(btn.kind, "component");
  assert.deepEqual(btn.variants, { variant: ["primary", "secondary", "ghost"], size: ["sm", "md", "lg"] });
  assert.deepEqual(btn.props.map((p) => p.name), ["loading", "asChild"]);
  const input = idx.files["src/components/ui/input.tsx"].facts.exports.find((e) => e.name === "Input");
  assert.deepEqual(input.propUnions, { density: ["compact", "comfortable"] });
  const tag = idx.files["src/components/Tag.vue"].facts.exports[0];
  assert.deepEqual(tag.propUnions.tone, ["neutral", "accent", "danger"]);
  assert.equal(idx.files["src/styles/tokens.css"].facts.tokens.defined["--color-primary"].value, "#3b82f6");
  // git's index is untouched: the new file stays untracked and nothing got staged
  const clean = (s) => s.split(/\r?\n/).filter((l) => l && !l.includes(".drip/")).join("|");
  const status = clean(git("status", "--porcelain"));
  assert.equal(status, clean(before));
  assert.equal(status, "?? src/components/feature-tile.tsx");
  const { t: find } = await call("components_local_find", { query: "button", limit: 3 });
  assert.match(find, /Button · src\/components\/ui\/button\.tsx:\d+ · used \d+x/);
  assert.match(find, /story yes · test yes/);
});

test("incremental reindex: unchanged files are reused, edits and new files are parsed, removals dropped", () => {
  const a = indexProject({ root: project });
  assert.equal(a.stats.reused, a.stats.files);
  assert.equal(a.changed.length, 0);
  // same content, new mtime: re-read but not re-parsed
  const f = path.join(project, "src/components/ui/input.tsx");
  const now = new Date(Date.now() + 5000);
  fs.utimesSync(f, now, now);
  const b = indexProject({ root: project });
  assert.equal(b.changed.length, 0);
  assert.equal(b.stats.reparsed, 0);
  write("src/components/ui/input.tsx", read("src/components/ui/input.tsx").replace("comfortable", "roomy").replace("comfortable", "roomy").replace("comfortable", "roomy"));
  write("src/components/new-thing.tsx", "export function NewThing({ label }: { label: string }) {\n  return <p className=\"text-sm\">{label}</p>;\n}\n");
  const c = indexProject({ root: project });
  assert.deepEqual(c.changed.sort(), ["src/components/new-thing.tsx", "src/components/ui/input.tsx"]);
  assert.equal(c.stats.reparsed, 1);
  assert.equal(c.stats.added, 1);
  fs.rmSync(path.join(project, "src/components/new-thing.tsx"));
  write("src/components/ui/input.tsx", read("src/components/ui/input.tsx").replace(/roomy/g, "comfortable"));
  const d = indexProject({ root: project });
  assert.ok(d.changed.includes("src/components/new-thing.tsx"));
  assert.equal(d.stats.removed, 1);
});

test("components_local_find: own components first, approved patterns too, honest when nothing fits", async () => {
  const { t } = await call("components_local_find", { query: "pricing card" });
  assert.match(t, /1\. PricingCard · src\/components\/pricing-card\.tsx:\d+/);
  assert.match(t, /props title, price, features, highlighted\?, onSelect/);
  const v = await call("components_local_find", { query: "ghost variant button" });
  assert.match(v.t, /1\. Button/);
  assert.match(v.t, /variants variant\(primary\|secondary\|ghost\)/);
  const none = await call("components_local_find", { query: "kanban board drag" });
  assert.match(none.t, /Nothing in this project matches/);
  const task = componentEvidence({ id: "none" });
  assert.equal(task.searched, 0);
});

test("components_plan: reuse, extend or new; primitives for overlays; card monotony and needless abstraction", async () => {
  const { t } = await call("components_plan", {
    page: "pricing page",
    sections: [
      { name: "Hero", components: [{ name: "PricingHero", need: "headline with one statement and a CTA", usedIn: 1 }] },
      { name: "Plans", purpose: "three plan cards", components: [{ name: "PricingCard", need: "plan card with price and features", usedIn: 3 }, { name: "Button" }] },
      { name: "Features grid", components: [{ name: "FeatureCard", need: "feature card in a grid" }] },
      { name: "Testimonials", purpose: "testimonial cards", components: [{ name: "TestimonialCard", need: "quote card" }] },
      { name: "Compare", components: [{ name: "CompareDialog", need: "modal dialog comparing plans", usedIn: 2 }] },
    ],
  });
  assert.match(t, /PricingCard \(plan card[^)]*\) -> REUSE PricingCard \(src\/components\/pricing-card\.tsx/);
  assert.match(t, /Button -> REUSE Button/);
  assert.match(t, /CompareDialog.* -> NEW: behaviour from an accessible primitive/);
  assert.match(t, /sections are cards, tiles or a grid/);
  assert.match(t, /New components used once: PricingHero/);
  assert.match(t, /\d+ reused, \d+ new or extended/);
});

test("components_audit: finds the duplicate, the token drift and the repeated CSS; leaves legitimate variants alone", async () => {
  const { t, r } = await call("components_audit", { judge: false });
  assert.ok(!r.isError);
  assert.match(t, /duplicate-markup: PlanCard and PricingCard are \d+% the same markup and styling/);
  assert.match(t, /src\/components\/plan-card\.tsx:\d+ PlanCard · src\/components\/pricing-card\.tsx:\d+ PricingCard/);
  assert.match(t, /token-drift: #3b82f6 is the value of --color-primary \(src\/styles\/tokens\.css:2\)/);
  assert.match(t, /src\/components\/badge\.tsx:3/);
  assert.match(t, /reuse: var\(--color-primary\)/);
  assert.match(t, /duplicate-css: \.hero-title and \.section-title/);
  assert.match(t, /radius 8px equals --radius-md/);
  assert.match(t, /box-shadow equals --shadow-card/);
  assert.doesNotMatch(t, /PrimaryButton|GhostButton/, "thin wrappers over one component are legitimate variants");
  assert.doesNotMatch(t, /Button and Button/);
  // an exception recorded on purpose silences exactly that finding
  fs.mkdirSync(path.join(project, ".drip", "check"), { recursive: true });
  write(".drip/check/exceptions.json", JSON.stringify({ audit: [{ kind: "duplicate-markup", files: ["src/components/plan-card.tsx", "src/components/pricing-card.tsx"], reason: "tiers diverge next quarter" }] }));
  const again = await call("components_audit", { judge: false });
  assert.doesNotMatch(again.t, /duplicate-markup/);
  assert.match(again.t, /token-drift/);
  fs.rmSync(path.join(project, ".drip", "check", "exceptions.json"));
  const ev = componentEvidence({ id: undefined });
  assert.equal(ev.audited, false);
});

test("components_audit with a changed-files scope only reports findings that touch them", async () => {
  await runCheck({ only: ["components-audit"], config: { check: { dryLint: { judge: "none", enabled: false } } } }); // saves the snapshot
  write("src/components/badge.tsx", read("src/components/badge.tsx") + "\n// touched\n");
  const { t } = await call("components_audit", { changed: true, judge: false });
  assert.match(t, /token-drift/);
  assert.doesNotMatch(t, /duplicate-markup/);
});

test("components_save writes an approved-pattern entry that later searches find", async () => {
  const { t } = await call("components_save", { name: "Pricing card", file: "src/components/pricing-card.tsx", tags: ["pricing"], notes: "Highlighted tier gets the blue border." });
  assert.match(t, /Saved Pricing card as pattern pricing-card \(proposed\)/);
  const dir = path.join(project, ".drip", "patterns", "pricing-card");
  const spec = JSON.parse(fs.readFileSync(path.join(dir, "spec.json"), "utf8"));
  assert.equal(spec.file, "src/components/pricing-card.tsx");
  assert.deepEqual(spec.props.map((p) => p.name), ["title", "price", "features", "highlighted", "onSelect"]);
  const entry = JSON.parse(read(".drip/patterns/index.json")).patterns.find((p) => p.id === "pricing-card");
  assert.equal(entry.kind, "component");
  assert.equal(entry.status, "proposed");
  assert.deepEqual(entry.files, ["src/components/pricing-card.tsx"]);
  assert.ok(entry.source.capturedAt && entry.spec === ".drip/patterns/pricing-card/spec.json");
  assert.doesNotMatch((await call("components_local_find", { query: "pricing" })).t, /Approved patterns/);
  await call("components_save", { name: "Pricing card", file: "src/components/pricing-card.tsx", status: "approved" });
  assert.match((await call("components_local_find", { query: "pricing" })).t, /Approved patterns[\s\S]*pricing-card \(component\) Pricing card/);
  assert.equal((await call("components_save", { name: "x", file: "src/styles/tokens.css" })).r.isError, true);
});

test("judge selection: the host's own CLI first (fake claude on PATH), then codex, then none; configurable", () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "drip-fakebin-"));
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "drip-emptybin-"));
  const exe = (name) => {
    const f = path.join(bin, process.platform === "win32" ? `${name}.cmd` : name);
    fs.writeFileSync(f, process.platform === "win32" ? "@echo off\r\nexit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
    fs.chmodSync(f, 0o755);
  };
  const env = (p) => ({ ...process.env, PATH: p });
  assert.equal(dl.detectJudge({}, env(empty)).judge, "none");
  assert.match(dl.detectJudge({}, env(empty)).reason, /neither claude nor codex/);
  exe("codex");
  assert.equal(dl.detectJudge({}, env(bin)).judge, "codex");
  exe("claude");
  const auto = dl.detectJudge({}, env(bin));
  assert.equal(auto.judge, "claude-code");
  assert.equal(auto.model, "haiku");
  assert.match(auto.commandLine, /^claude -p --model haiku /);
  assert.equal(dl.detectJudge({ model: "sonnet" }, env(bin)).model, "sonnet");
  assert.equal(dl.detectJudge({ judge: "codex" }, env(bin)).judge, "codex");
  assert.equal(dl.detectJudge({ judge: "none" }, env(bin)).judge, "none");
  assert.equal(dl.detectJudge({ judge: "claude-code" }, env(empty)).judge, "none");
  const cmd = dl.detectJudge({ judge: "command", command: [process.execPath, "some file.mjs", "--x"] }, env(bin));
  assert.equal(cmd.judge, "command");
  assert.deepEqual(cmd.args, ["some file.mjs", "--x"]);
  assert.equal(dl.detectJudge({ judge: "command", command: "" }, env(bin)).judge, "none");
});

function fakeJudge(label = "duplicate") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-fakejudge-"));
  const counter = path.join(dir, "calls.txt");
  const script = path.join(dir, "judge.mjs");
  fs.writeFileSync(script, `import fs from "node:fs"; let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => { fs.appendFileSync(${JSON.stringify(counter)}, "x"); console.log("noise before " + JSON.stringify({ label: ${JSON.stringify(label)}, score: 0.91, why: "same card layout, different names", sawA: s.includes("PlanCard") || s.includes("PricingCard") })); });\n`);
  // fake `claude` for the PATH route: runs the same script, ignoring the flags
  const claude = path.join(dir, process.platform === "win32" ? "claude.cmd" : "claude");
  fs.writeFileSync(claude, process.platform === "win32" ? `@echo off\r\n"${process.execPath}" "${script}"\r\n` : `#!/bin/sh\nexec "${process.execPath}" "${script}"\n`);
  fs.chmodSync(claude, 0o755);
  return { dir, script, counter, calls: () => (fs.existsSync(counter) ? fs.readFileSync(counter, "utf8").length : 0) };
}

test("judged duplicates: verdicts land in the findings and are cached, so a pair is never judged twice", async () => {
  const fj = fakeJudge();
  const cfg = { check: { dryLint: { judge: "command", command: `"${process.execPath}" "${fj.script}"`, enabled: false } } };
  const a = await runCheck({ full: true, only: ["components-audit"], config: cfg });
  const audit = a.checks.find((c) => c.name === "components-audit");
  assert.equal(audit.status, "warn");
  assert.ok(audit.findings.some((f) => /Judge \(.*\): duplicate 0\.91: same card layout/.test(f.message)), JSON.stringify(audit.findings.map((f) => f.message)));
  const first = fj.calls();
  assert.ok(first >= 1);
  const b = await runCheck({ full: true, only: ["components-audit"], config: cfg }); // receipts ignored, verdict cache used
  assert.equal(fj.calls(), first, "no second call for the same pair");
  assert.ok(b.checks[0].findings.some((f) => /cached/.test(f.message)));
  const store = JSON.parse(read(".drip/check/verdicts.json"));
  assert.ok(Object.keys(store.verdicts).length >= 1);
  // a "separate" verdict from the judge downgrades the finding to low
  const sep = fakeJudge("separate");
  fs.rmSync(path.join(project, ".drip", "check", "verdicts.json"));
  const c = await runCheck({ full: true, only: ["components-audit"], config: { check: { dryLint: { judge: "command", command: `"${process.execPath}" "${sep.script}"`, enabled: false } } } });
  assert.ok(c.checks[0].findings.some((f) => f.severity === "info" && /judge.*separate/i.test(f.message)));
});

test("a fake claude on PATH is run for real (the .cmd/.sh route) and its verdict is parsed", async () => {
  const fj = fakeJudge();
  const judge = dl.detectJudge({}, { ...process.env, PATH: `${fj.dir}${path.delimiter}${process.env.PATH}` });
  assert.equal(judge.judge, "claude-code");
  fs.rmSync(path.join(project, ".drip", "check", "verdicts.json"), { force: true });
  const res = await dl.judgePairs(project, [{ a: { file: "src/components/plan-card.tsx", line: 11, end: 28, name: "PlanCard" }, b: { file: "src/components/pricing-card.tsx", line: 11, end: 28, name: "PricingCard" } }], judge, {});
  assert.equal(res.failed.length, 0, res.failed.join("; "));
  const v = res.verdicts.get(0);
  assert.equal(v.label, "duplicate");
  assert.equal(v.score, 0.91);
  assert.equal(fj.calls(), 1);
  assert.equal(dl.parseVerdict("no json here"), null);
});

test("dry-lint missing: skipped with the reason, never an error; reads tracked files of supported languages only", async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "drip-emptybin-"));
  const r = await dl.runDryLint(project, {}, { env: { ...process.env, PATH: empty } });
  assert.equal(r.status, "skipped");
  assert.match(r.reason, /uvx .*not on PATH/);
  const off = await dl.runDryLint(project, { enabled: false });
  assert.match(off.reason, /disabled/);
  const inputs = await dl.dryLintInputs(project);
  assert.ok(inputs.files.includes("src/components/pricing-card.tsx"), "tracked TSX is in dry-lint's scope");
  assert.ok(!inputs.files.some((f) => /\.(vue|css)$/.test(f)), "Vue and CSS are not");
  assert.ok(!inputs.files.includes("src/components/feature-tile.tsx"), "untracked files are not: Drip's own index covers them");
});

test("drip_check: scripts, fit-check lint, audit; structured results; receipts reused only while inputs match", async () => {
  const cfg = { check: { dryLint: { enabled: false } } };
  const first = await runCheck({ full: true, config: cfg });
  const by = Object.fromEntries(first.checks.map((c) => [c.name, c]));
  assert.equal(by.lint.status, "pass");
  assert.equal(by.test.status, "pass");
  assert.ok(["pass", "warn"].includes(by["fitcheck-lint"].status));
  assert.equal(by["components-audit"].status, "warn");
  assert.ok(by["components-audit"].findings.every((f) => f.file && f.line && f.severity && f.message && f.fix));
  assert.equal(first.exitCode, 0);
  assert.ok(first.checks.every((c) => ["pass", "warn", "fail", "skipped"].includes(c.status) && typeof c.durationMs === "number"));
  const second = await runCheck({ config: cfg });
  assert.ok(second.checks.every((c) => c.reused), "nothing changed: every result reused");
  // change a UI file: the checks that read it run again
  write("src/components/badge.tsx", read("src/components/badge.tsx") + "\n");
  const third = await runCheck({ config: cfg });
  const t3 = Object.fromEntries(third.checks.map((c) => [c.name, c]));
  assert.equal(t3["components-audit"].reused, false);
  assert.equal(t3["fitcheck-lint"].reused, false);
  assert.equal(t3.lint.reused, false, "scripts read the sources too");
  // config change invalidates
  const fourth = await runCheck({ config: { check: { dryLint: { enabled: false }, strict: true } } });
  assert.equal(fourth.checks.find((c) => c.name === "components-audit").reused, false);
  // strict policy: verified token drift fails the audit
  assert.equal(fourth.checks.find((c) => c.name === "components-audit").status, "fail");
  assert.equal(fourth.exitCode, 1);
  // tool output
  const { t, r } = await call("drip_check", { only: ["lint"] });
  assert.match(t, /PASS lint/);
  assert.ok(!r.isError);
});

test("drip_check: a failing script fails the run with a fix hint; only: limits the checks", async () => {
  const pkg = JSON.parse(read("package.json"));
  pkg.scripts.lint = 'node -e "console.error(\'src/components/badge.tsx:3:5 error bad thing\'); process.exit(2)"';
  write("package.json", JSON.stringify(pkg));
  const r = await runCheck({ only: ["lint"], config: { check: { dryLint: { enabled: false } } } });
  assert.equal(r.checks.length, 1);
  assert.equal(r.checks[0].status, "fail");
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.checks[0].findings[0], { file: "src/components/badge.tsx", line: 3, severity: "error", message: "lint reported a problem here" });
  assert.match(r.checks[0].fix, /Run `npm run lint` yourself/);
  const t = await call("drip_check", { only: ["lint"] });
  assert.equal(t.r.isError, true);
  assert.match(t.t, /FAIL lint/);
});

test("components_preview renders plain HTML with stress cells and states", { skip: skipBrowser, timeout: 120000 }, async () => {
  const { t, images } = await call("components_preview", { html: '<button class="b">Buy now</button>', css: ".b{padding:12px 20px;border:2px solid #111;background:#fff;transition:background .15s}.b:hover{background:#fc0}", selector: ".b", states: [{ do: "hover", selector: ".b", label: "hover" }], variants: [{ label: "long label", html: '<button class="b">Buy the annual plan today and save</button>' }], sizes: [375, 1440] });
  assert.equal(images, 1);
  assert.match(t, /stress sheet: default, narrow, long text, RTL, dark, zoom 200%, long label/);
  assert.match(t, /1440px · hover/);
  assert.match(t, /375px · Tab 1/);
  const sheets = fs.readdirSync(path.join(project, ".drip", "index", "previews"));
  assert.ok(sheets.some((f) => f.startsWith("stress-")) && sheets.length >= 2);
  const none = await call("components_preview", {});
  assert.equal(none.r.isError, true);
  assert.match(none.t, /Storybook|Ladle/);
});
