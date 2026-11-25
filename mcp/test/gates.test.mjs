// Phase 3 and 4 of the quality plan: overlay clearing, slices that cover every section, the hero gate's real boxes,
// rendered text sizes, numbersOnly / section shots, the hold step, change detection by content, the REVISE tick,
// the competitor and mix guards, the One Page Love limit. Offline (local pages in a real Chrome/Edge, skipped
// without one); the live five-site overlay check runs only with DRIP_NET=1.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../src/modules/fitcheck/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const hooks = path.resolve(here, "..", "..", "hooks");
const skip = !findChrome({}) && "no Chrome/Edge on this machine";
const NET = process.env.DRIP_NET === "1";
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
const project = tmp("gates");
process.env.CLAUDE_PROJECT_DIR = project;

const cdp = await import("../src/core/cdp.mjs");
const browser = await import("../src/core/browser.mjs");
const state = await import("../src/core/state.mjs");
const evidence = await import("../src/core/evidence.mjs");
const store = await import("../src/modules/board/store.mjs");
const { loadConfig } = await import("../src/core/config.mjs");
const { collectTools } = await import("../src/core/registry.mjs");
const { mixNote } = await import("../src/modules/inspire/contract.mjs");
const opl = await import("../src/modules/inspire/providers/onepagelove.mjs");
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args);
  return { text: r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: r.content.filter((c) => c.type === "image").length, error: !!r.isError };
};
const page = (name, html) => {
  const f = path.join(project, name);
  fs.writeFileSync(f, html);
  return pathToFileURL(f).href;
};
const config = {};

test.after(async () => {
  await browser.closeBrowser();
});

// ---- slices -------------------------------------------------------------------------------------------------------
test("sectionSlices: every section appears in some slice, the budget grows only as far as that needs", () => {
  const sections = Array.from({ length: 9 }, (_, i) => ({ top: i * 2000, h: 2000 }));
  const ys = cdp.sectionSlices({ total: 18000, height: 900, sections, maxSlices: 5 });
  for (const s of sections) assert.ok(ys.some((y) => Math.min(s.top + s.h, y + 900) - Math.max(s.top, y) >= 270), `section at ${s.top} is in no slice (${ys})`);
  assert.ok(ys.length <= 10);
  assert.deepEqual(cdp.sectionSlices({ total: 18000, height: 900, sections, maxSlices: 1 }), [0]);
  assert.deepEqual(cdp.sectionSlices({ total: 4000, height: 900, sections: [], maxSlices: 6 }), [0, 900, 1800, 2700, 3100]);
  const even = cdp.sectionSlices({ total: 9000, height: 900, maxSlices: 5 });
  assert.equal(even.length, 5);
  assert.equal(even[0], 0);
});

test("capture: slices cover every section; slicing top gives screen 2 at one viewport down, never the footer", { skip, timeout: 120000 }, async () => {
  const body = Array.from({ length: 7 }, (_, i) => `<section style="height:2000px;background:hsl(${i * 50} 40% 80%)"><h2 style="font-size:48px;margin:0">Section ${i + 1}</h2></section>`).join("");
  const url = page("long.html", `<!doctype html><meta name=viewport content="width=device-width"><title>long</title><style>body{margin:0}</style><main>${body}</main><footer style="height:600px">Footer</footer>`);
  const r = await cdp.capture(url, { width: 1440, height: 900, maxSlices: 4, config });
  const ys = r.slices.map((s) => s.y);
  for (const b of r.audit.sectionBoxes) assert.ok(ys.some((y) => Math.min(b.top + b.h, y + 900) - Math.max(b.top, y) >= 270), `section at ${b.top} appears in no slice: ${ys}`);
  const top = await cdp.capture(url, { width: 1440, height: 900, maxSlices: 2, slicing: "top", config });
  assert.deepEqual(top.slices.map((s) => s.y), [0, 900]);
  const none = await cdp.capture(url, { width: 1440, height: 900, maxSlices: 4, shots: false, config });
  assert.equal(none.slices.length, 0);
  assert.ok(none.audit.sectionBoxes.length >= 7);
  const one = await cdp.capture(url, { width: 1440, height: 900, maxSlices: 3, section: "main > section:nth-of-type(3)", config });
  assert.equal(one.audit.section.top, 4000);
  assert.ok(one.slices.length >= 1 && one.slices.length <= 3);
  const missing = await cdp.capture(url, { width: 1440, height: 900, section: "#nope", config });
  assert.equal(missing.audit.section.missing, true);
});

// ---- overlays -----------------------------------------------------------------------------------------------------
const SHOP = `<!doctype html><meta name=viewport content="width=device-width"><title>Shop</title>
<style>body{margin:0;font:18px system-ui;overflow:hidden}.q1{position:fixed;left:0;right:0;top:0;background:#dde;padding:14px;z-index:9}.q2{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:grid;place-items:center}.q3{background:#fff;padding:24px;width:640px}main{height:2600px}h1{margin:120px 40px 0;font-size:96px}footer{padding:20px}</style>
<div class=q1><span>We've noticed you're visiting from Israel. Would you like to change your location?</span> <button id=us onclick="document.title='WRONG us'">USA</button> <button aria-label="Close" onclick="this.parentNode.remove()">&times;</button></div>
<div class=q2><div class=q3 role=dialog><p>We use cookies to improve your experience and personalise content.</p><button onclick="document.title='WRONG customize'">Customize</button><button onclick="document.querySelector('.q2').remove()">Accept only functional</button><button onclick="document.title='WRONG allow'">Allow</button></div></div>
<main><h1>Real hero</h1><p>The page itself.</p></main><footer><a href="#">Cookie settings</a></footer>`;

const WALL = `<!doctype html><meta name=viewport content="width=device-width"><title>Wall</title>
<style>body{margin:0;font:18px system-ui;overflow:hidden}.k9{position:fixed;inset:0;z-index:99;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}main{height:2400px}h1{font-size:90px}</style>
<div class=k9><h2>Your privacy choices</h2><p>We and our partners use cookies and similar technologies for analytics.</p><button onclick="document.title='WRONG manage'">Manage preferences</button></div>
<main><h1>Behind the wall</h1></main>`;

test("overlays: reject / close are clicked, pickers never, what is left is hidden, scroll lock is lifted, the page stays", { skip, timeout: 120000 }, async () => {
  const r = await cdp.capture(page("shop.html", SHOP), { width: 1440, height: 900, maxSlices: 1, config });
  assert.deepEqual(r.audit.overlayLeft, []);
  assert.ok(r.audit.cleared.clicked >= 2, JSON.stringify(r.audit.cleared));
  assert.doesNotMatch(r.audit.title, /WRONG/, "a picker or accept button was clicked");
  assert.equal(r.audit.h1, 96, "the page's own h1 must stay");
  assert.ok(r.audit.height > 2000, "page should scroll once the cookie wall is gone");
  const w = await cdp.capture(page("wall.html", WALL), { width: 1440, height: 900, maxSlices: 1, config });
  assert.deepEqual(w.audit.overlayLeft, [], "a full-screen wall with no cookie class names is found by what it says");
  assert.ok(w.audit.cleared.hidden >= 1, JSON.stringify(w.audit.cleared));
  assert.equal(w.audit.h1, 90);
  assert.ok(w.audit.cleared.unlocked, "overflow hidden left on the body is lifted");
});

test("overlays: the five sites the 0.6.2 test run tripped on show no overlay text on the first screen (DRIP_NET=1)", { skip: skip || (!NET && "set DRIP_NET=1"), timeout: 300000 }, async () => {
  const sites = ["https://www.bugaboo.com", "https://www.nuna.eu", "https://vanmoof.com", "https://mailchimp.com", "https://supercell.com"];
  const out = await Promise.all(
    sites.map((u) =>
      cdp
        .capture(u, { width: 1440, height: 900, maxSlices: 2, slicing: "top", idle: true, config })
        .then((r) => ({ u, left: r.audit.overlayLeft, blocked: r.blocked, ys: r.audit.sliceYs }))
        .catch((e) => ({ u, err: e.message })),
    ),
  );
  for (const o of out) {
    if (o.err || o.blocked) continue; // a site that refuses a headless browser or is offline says nothing about the overlay clearing
    assert.deepEqual(o.left, [], `${o.u} still shows ${o.left}`);
    assert.deepEqual(o.ys, [0, 900], `${o.u}: screen 2 must start one viewport down`);
  }
  assert.ok(out.filter((o) => !o.err && !o.blocked).length >= 3, `too few sites answered: ${JSON.stringify(out.map((o) => o.err || o.blocked || "ok"))}`);
});

// ---- hero gate ----------------------------------------------------------------------------------------------------
test("hero gate: h1 and primary action must be fully inside the first viewport, nothing cut at the edges", { skip, timeout: 120000 }, async () => {
  const base = "<!doctype html><meta name=viewport content=width=device-width><title>h</title><style>body{margin:0;font:20px system-ui}.b{display:inline-block;padding:14px 28px;background:#111;color:#fff;border-radius:8px;text-decoration:none}</style>";
  const ok = await cdp.capture(page("hero-ok.html", `${base}<main><h1 style="font-size:120px;margin:80px 64px 0">Good hero</h1><p style="margin:16px 64px">Lead line.</p><a class=b style="margin:0 64px" href="#">Start now</a></main>`), { width: 1440, height: 900, maxSlices: 1, config });
  assert.deepEqual(cdp.judgeAudit(ok.audit, { persuade: true, hero: true }).blockers.filter((b) => /primary action|h1's box|cut off/.test(b)), []);

  const low = await cdp.capture(page("hero-low.html", `${base}<main><h1 style="font-size:120px;margin:400px 64px 0">Good hero</h1><div style="height:330px"></div><a class=b style="margin:0 64px" href="#">Start now</a></main>`), { width: 1440, height: 900, maxSlices: 1, config });
  assert.match(cdp.judgeAudit(low.audit, { persuade: true, hero: true }).blockers.join(" | "), /primary action "Start now".*not fully inside the first viewport/);

  const tall = await cdp.capture(page("hero-tall.html", `${base}<main><h1 style="font-size:120px;margin:800px 64px 0">Half out</h1><a class=b style="margin:0 64px" href="#">Go</a></main>`), { width: 1440, height: 900, maxSlices: 1, config });
  assert.match(cdp.judgeAudit(tall.audit, { persuade: true, hero: true }).blockers.join(" | "), /h1's box .*not fully inside the first viewport/);

  const cut = await cdp.capture(page("hero-cut.html", `${base}<main style="overflow:hidden"><h1 style="font-size:120px;margin:80px 64px 0">Good hero</h1><div style="width:300px;overflow:hidden;margin-left:64px"><span style="display:block;margin-left:-60px;white-space:nowrap">Clipped promise text</span></div><a class=b style="margin:0 64px" href="#">Start now</a></main>`), { width: 1440, height: 900, maxSlices: 1, config });
  assert.match(cdp.judgeAudit(cut.audit, { persuade: true, hero: true }).blockers.join(" | "), /cut off at the edge: "Clipped promise text".*past the left edge/);

  const bleed = await cdp.capture(page("hero-bleed.html", `${base}<main style="overflow:hidden"><h1 style="font-size:120px;margin:80px 64px 0">Good hero</h1><div style="width:300px;overflow:hidden;margin-left:64px"><span data-bleed style="display:block;margin-left:-60px;white-space:nowrap">Intentional bleed</span></div><a class=b style="margin:0 64px" href="#">Start now</a></main>`), { width: 1440, height: 900, maxSlices: 1, config });
  assert.doesNotMatch(cdp.judgeAudit(bleed.audit, { persuade: true, hero: true }).blockers.join(" | "), /cut off/);
});

// ---- rendered sizes -----------------------------------------------------------------------------------------------
test("text sizes are the rendered ones: an SVG viewBox and a CSS scale shrink the numbers they would show as attributes", { skip, timeout: 120000 }, async () => {
  const url = page("sizes.html", `<!doctype html><meta name=viewport content=width=device-width><title>s</title><body style="margin:0;font:18px system-ui"><p>Body copy here at eighteen pixels.</p><svg viewBox="0 0 1000 1000" width="200" height="200"><text x="10" y="500" font-size="60">Tiny label here</text></svg><p style="font-size:40px;transform:scale(.5);transform-origin:left top;margin:0">Scaled text here</p></body>`);
  const r = await cdp.capture(url, { width: 1440, height: 900, maxSlices: 1, shots: false, config });
  const sizes = r.audit.fontSizes.map(([s]) => s);
  assert.ok(sizes.includes(12), `the SVG text renders at 12px, got ${sizes}`);
  assert.ok(sizes.includes(20), `the scaled paragraph renders at 20px, got ${sizes}`);
  assert.ok(!sizes.includes(60) && !sizes.includes(40), `attribute sizes leaked into the counts: ${sizes}`);
});

// ---- steps: hold --------------------------------------------------------------------------------------------------
test("hold step: pointer down, a shot while held, then release", { skip, timeout: 120000 }, async () => {
  const url = page("hold.html", `<!doctype html><meta name=viewport content=width=device-width><title>hold</title><style>body{margin:0}#b{position:absolute;left:100px;top:100px;width:240px;height:100px;background:#444;color:#fff}#b:active{background:#d22}</style><button id=b>Hold to confirm</button><script>window.log=[];const b=document.getElementById('b');b.onpointerdown=()=>log.push('down:'+Date.now());b.onpointerup=()=>log.push('up:'+Date.now());</script>`);
  const states = await cdp.captureStates(url, [{ do: "hold", hold: { selector: "#b", ms: 400 }, label: "mid-hold" }], { width: 800, height: 400, config });
  assert.equal(states.length, 1);
  assert.equal(states[0].label, "mid-hold");
  assert.ok(states[0].buf.length > 500, "a picture was taken");
  assert.equal(states[0].error, null);
  // The picture shows the :active colour (red), i.e. it was taken while the button was held.
  const { Jimp } = await import("jimp");
  const img = await Jimp.read(states[0].buf);
  const px = img.getPixelColor(120, 180);
  const r = (px >>> 24) & 255;
  const g = (px >>> 16) & 255;
  assert.ok(r > 150 && g < 100, `button should be :active red while held, pixel rgb ~ ${r},${g}`);
  const log = await browser.withTab(config, async (tab) => {
    await browser.openPage(tab, url, { width: 800, height: 400 });
    await cdp.runStep(tab.s, { do: "hold", hold: { selector: "#b", ms: 300 } });
    return (await tab.s("Runtime.evaluate", { expression: "JSON.stringify(window.log)", returnByValue: true })).result.value;
  });
  const [down, up] = JSON.parse(log).map((l) => +l.split(":")[1]);
  assert.ok(up - down >= 250, `released after ${up - down}ms`);
});

// ---- fitcheck_shot: numbersOnly / section --------------------------------------------------------------------------
test("fitcheck_shot numbersOnly has no images and never counts as the fit check; section shoots one section", { skip, timeout: 180000 }, async () => {
  state.updateState((st) => {
    st.task = state.newTask({ title: "ceramics", size: "full", surface: "landing", guides: [] });
  });
  const url = page("page.html", `<!doctype html><meta name=viewport content=width=device-width><title>p</title><style>body{margin:0;font:18px system-ui}</style><main><section id=a style="height:900px"><h1 style="font-size:120px">Hero</h1></section><section id=pricing style="height:700px"><h2 style="font-size:56px">Pricing</h2></section></main>`);
  const n = await call("fitcheck_shot", { url, numbersOnly: true });
  assert.equal(n.images, 0);
  assert.match(n.text, /numbers only/);
  assert.match(n.text, /not the fit check/);
  assert.equal(state.loadState().task.fitcheck.lastShotAt, null);
  const done = await call("fitcheck_done", { scores: Object.fromEntries(["hierarchy", "layout", "type", "color", "imagery", "polish", "copy", "fidelity"].map((k) => [k, 5])), verdict: "pass", fixes: [] });
  assert.equal(done.error, true);
  assert.match(done.text, /Shoot the page first/);
  const s = await call("fitcheck_shot", { url, section: "#pricing" });
  assert.ok(s.images >= 2, "one picture per size");
  assert.match(s.text, /section #pricing/);
  assert.equal(state.loadState().task.fitcheck.lastShotAt, null, "a section shot is not the fit check either");
  const bad = await call("fitcheck_shot", { url, section: "#nothing-here" });
  assert.equal(bad.error, true);
  const full = await call("fitcheck_shot", { url });
  assert.ok(full.images >= 2);
  assert.ok(state.loadState().task.fitcheck.lastShotAt);
});

// ---- fitcheck_compare: the chosen comp -----------------------------------------------------------------------------
test("fitcheck_compare puts the build beside the chosen direction's comp, not the reference shots", { skip, timeout: 120000 }, async () => {
  const dir = tmp("cmp");
  process.env.CLAUDE_PROJECT_DIR = dir;
  try {
    const b = store.createBoard("cmp board", "brief");
    const tileFile = path.join(dir, "comp.jpg");
    const { Jimp } = await import("jimp");
    fs.writeFileSync(tileFile, await new Jimp({ width: 1440, height: 900, color: 0x336699ff }).getBuffer("image/jpeg"));
    b.directions = [{ name: "Quiet", summary: "calm and spare", adjectives: ["calm"], palette: ["#336699"], type: "serif", items: [], tile: tileFile }];
    b.chosen = "Quiet";
    store.saveBoard(b);
    state.updateState((st) => {
      st.task = state.newTask({ title: "cmp", size: "full", surface: "landing", guides: [] });
      st.task.board = { id: b.id, chosen: "Quiet", directions: 1 };
    }, dir);
    const url = page("cmp.html", `<!doctype html><title>c</title><body style="margin:0"><h1>Build</h1>`);
    const r = await call("fitcheck_compare", { url });
    assert.match(r.text, /RIGHT \(2\) the chosen direction "Quiet", its comp/);
    assert.equal(r.images, 1, "one sheet with both pictures");
  } finally {
    process.env.CLAUDE_PROJECT_DIR = project;
  }
});

// ---- gates: competitor type, REVISE tick, content hashes, running critic -------------------------------------------
test("competitor gate: with none of the same product type, the how-text asks for a same-type rival", () => {
  const cfg = loadConfig(project);
  const t = state.newTask({ title: "landing page for a baby stroller brand", size: "full", surface: "landing", guides: [] });
  t.brief = { what: "premium baby strollers", audience: "parents", ambition: "high" };
  t.refs.studied = [{ key: "site:apple.com", role: "competitor", terms: "Apple iPhone Pro" }, { key: "site:notion.so", role: "competitor", terms: "Notion workspace" }];
  const comp = (task) => state.missingBeforeUi(task, cfg).find((m) => m.need === "competitor references");
  assert.equal(comp(t), undefined, "the gate numbers are unchanged: two competitors satisfy them");
  assert.match(state.checklist(t, cfg), /none of the competitors is the same product type as "baby stroller/);
  t.refs.studied = [{ key: "site:apple.com", role: "competitor", terms: "Apple iPhone Pro" }];
  assert.match(comp(t).how, /None of your competitors is the SAME product type.*same-product-type rival.*three real rivals/);
  t.refs.studied.push({ key: "site:bugaboo.com", role: "competitor", terms: "Bugaboo | strollers, prams and car seats" });
  assert.equal(comp(t), undefined);
  assert.doesNotMatch(state.checklist(t, cfg), /none of the competitors/);
  t.refs.studied = [{ key: "site:apple.com", role: "competitor", terms: "Apple iPhone Pro" }];
  t.title = "redesign vizzbees.com";
  t.brief = null;
  assert.doesNotMatch(comp(t).how, /SAME product type/, "an unknown product type is not guessed at");
});

test("a REVISE or REJECT directions verdict is not ticked, and NEXT says which directions to rework", () => {
  const cfg = loadConfig(project);
  const t = state.newTask({ title: "stroller page", size: "full", surface: "landing", guides: [] });
  t.board = { id: "b1", items: 4, directions: 3, chosen: null };
  t.critic.records.push({ kind: "directions", verdict: "revise", summary: "B and C are one idea in two colourways", fixes: ["make C an editorial layout with the product cropped"], perDirection: [{ name: "A", score: 8, verdict: "keep", note: "" }, { name: "B", score: 4, verdict: "rework", note: "" }, { name: "C", score: 3, verdict: "cut", note: "" }], at: new Date().toISOString() });
  const dir = state.missingBeforeUi(t, cfg).find((m) => m.need === "direction");
  assert.match(dir.how, /critic said REVISE.*Rework "B", "C".*editorial layout.*board_directions again/);
  assert.doesNotMatch(dir.how, /^board_directions \(renders/);
  assert.match(state.checklist(t, cfg), /\[ \] critic ranked the directions: REVISE .*NOT PASSED: rework "B", "C"/);
  t.critic.records.push({ kind: "directions", verdict: "pass", summary: "ranked", fixes: [], at: new Date().toISOString() });
  assert.match(state.checklist(t, cfg), /\[x\] critic ranked the directions: PASS/);
  const b = state.newTask({ title: "x", size: "full", surface: "landing", guides: [] });
  b.lastUiWriteAt = new Date().toISOString();
  b.critic.records.push({ kind: "build", verdict: "revise", summary: "timid", at: new Date(Date.now() + 5000).toISOString() });
  assert.match(state.checklist(b, cfg), /\[ \] critic passed the build: REVISE/);
});

test("files a script rewrote with the same content are not unseen or changed since the last fit check", () => {
  const dir = tmp("hash");
  process.env.CLAUDE_PROJECT_DIR = dir;
  try {
    fs.mkdirSync(path.join(dir, "src"));
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-4'>one</h1>");
    state.updateState((st) => {
      st.task = state.newTask({ title: "hero", size: "full", surface: "landing", guides: [] });
    }, dir);
    let task = state.loadState(dir).task;
    evidence.takeSnapshot(task, dir);
    // A build script rewrites the page (different from the start), then the fit check looks at it.
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-8'>two</h1>");
    evidence.markShot(task, dir);
    assert.deepEqual(evidence.workspaceDiff(task, dir).unseen, [], "what a shot showed is not unseen");
    // The script runs again and writes the same bytes: nothing changed.
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-8'>two</h1>");
    assert.deepEqual(state.reconcileWorkspace(dir), []);
    // A real change is still caught.
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-8'>three</h1>");
    assert.equal(state.reconcileWorkspace(dir).length, 1);
    task = state.loadState(dir).task;
    assert.equal(evidence.lintableUiFiles(dir).includes("index.html"), true, "root index.html is a lintable UI file");
  } finally {
    process.env.CLAUDE_PROJECT_DIR = project;
  }
});

test("needsFitcheck / needsCritic follow the content, not the write times", () => {
  const dir = tmp("rev");
  process.env.CLAUDE_PROJECT_DIR = dir;
  try {
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-4'>one</h1>");
    const cfg = loadConfig(dir);
    const t = state.newTask({ title: "hero", size: "full", surface: "landing", guides: [] });
    t.uiWrites = [{ file: "index.html", at: new Date().toISOString() }];
    t.lastUiWriteAt = new Date(Date.now() + 60000).toISOString(); // a later write time, same bytes
    t.fitcheck.doneAt = new Date().toISOString();
    t.fitcheck.doneRev = evidence.artifactRev(t, dir);
    t.critic.records.push({ kind: "build", verdict: "pass", summary: "ok", rev: evidence.artifactRev(t, dir), at: new Date().toISOString() });
    assert.equal(state.needsFitcheck(t, cfg), false);
    fs.writeFileSync(path.join(dir, "index.html"), "<h1 class='p-8'>two</h1>");
    assert.equal(state.needsFitcheck(t, cfg), true);
  } finally {
    process.env.CLAUDE_PROJECT_DIR = project;
  }
});

function hookIn(name, input, dir) {
  const r = spawnSync(process.execPath, [path.join(hooks, name)], { input: JSON.stringify({ cwd: dir, ...input }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: "utf8" });
  return r.stdout ? JSON.parse(r.stdout) : null;
}

test("the Stop hook does not block while a subagent (the critic) is running, and blocks again once it is done", () => {
  const dir = tmp("agent");
  fs.mkdirSync(path.join(dir, ".drip"));
  fs.writeFileSync(path.join(dir, ".drip", "config.json"), JSON.stringify({ gates: { mode: "always" } }));
  const task = state.newTask({ title: "t", size: "full", surface: "landing", guides: [] });
  task.lastUiWriteAt = new Date().toISOString();
  task.uiWrites = [{ file: "src/A.tsx", at: task.lastUiWriteAt }];
  state.saveState({ version: 1, task, history: [] }, dir);
  hookIn("agent-start.mjs", { tool_name: "Agent", tool_input: { subagent_type: "drip:critic", run_in_background: true } }, dir);
  assert.equal(state.agentsRunning(state.loadState(dir).task).length, 1);
  assert.equal(hookIn("stop.mjs", {}, dir), null, "waiting for the critic is not skipping the check");
  assert.equal(state.loadState(dir).task.stopBlocks || 0, 0, "and it is not counted as a block");
  // The Agent tool returning for a background launch leaves it running; the critic run is recorded.
  hookIn("agent-run.mjs", { tool_name: "Agent", tool_input: { subagent_type: "drip:critic", run_in_background: true } }, dir);
  assert.equal(state.agentsRunning(state.loadState(dir).task).length, 1);
  assert.equal(state.loadState(dir).task.critic.runs.length, 1);
  hookIn("agent-stop.mjs", { agent_type: "drip:critic" }, dir);
  assert.equal(state.agentsRunning(state.loadState(dir).task).length, 0);
  assert.equal(hookIn("stop.mjs", {}, dir)?.decision, "block");
  // A foreground subagent is finished by the tool returning.
  hookIn("agent-start.mjs", { tool_name: "Agent", tool_input: { subagent_type: "drip:critic" } }, dir);
  hookIn("agent-run.mjs", { tool_name: "Agent", tool_input: { subagent_type: "drip:critic" } }, dir);
  assert.equal(state.agentsRunning(state.loadState(dir).task).length, 0);
  // One that never reports expires.
  const t = state.loadState(dir).task;
  assert.equal(state.agentsRunning({ agents: [{ type: "x", at: new Date(Date.now() - 11 * 60000).toISOString() }] }).length, 0);
  assert.equal(t.id, task.id);
});

test("post-write: the same bytes written again do not count as a change after a fit check", () => {
  const dir = tmp("pw");
  fs.mkdirSync(path.join(dir, "src"));
  fs.mkdirSync(path.join(dir, ".drip"));
  fs.writeFileSync(path.join(dir, ".drip", "config.json"), JSON.stringify({ gates: { mode: "always" } }));
  const file = path.join(dir, "src", "Hero.tsx");
  fs.writeFileSync(file, "export const Hero = () => <h1 className='p-4'>one</h1>;");
  const task = state.newTask({ title: "t", size: "full", surface: "landing", guides: [] });
  state.saveState({ version: 1, task, history: [] }, dir);
  hookIn("post-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "x" } }, dir);
  const first = state.loadState(dir).task.lastUiWriteAt;
  assert.ok(first);
  const wait = Date.now() + 15;
  while (Date.now() < wait); // a later clock tick
  hookIn("post-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "x" } }, dir);
  assert.equal(state.loadState(dir).task.lastUiWriteAt, first, "identical content: nothing to re-check");
  fs.writeFileSync(file, "export const Hero = () => <h1 className='p-8'>two</h1>;");
  hookIn("post-write.mjs", { tool_name: "Write", tool_input: { file_path: file, content: "y" } }, dir);
  assert.notEqual(state.loadState(dir).task.lastUiWriteAt, first);
});

// ---- references -----------------------------------------------------------------------------------------------------
test("One Page Love is never asked for more than 10 (its endpoint rejects more)", async () => {
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (url, init) => {
    asked.push(JSON.parse(init.body).params.arguments);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [] } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await opl.onepagelove.search("saas gates", { kind: "site", limit: 48, config: {} });
    await opl.onepagelove.search("pricing gates", { kind: "section", limit: 48, config: {} });
  } finally {
    globalThis.fetch = real;
  }
  assert.equal(asked.length, 2);
  for (const a of asked) assert.ok(a.limit <= 10, `limit ${a.limit}`);
});

test("mix guard: a query that mixes look words with a subject says to search twice", () => {
  assert.match(mixNote("bold dark fintech"), /MIXED QUERY: "bold dark" is a LOOK and "fintech" is a SUBJECT.*two searches.*refs_search\("fintech"\).*refs_search\("bold dark"\)/);
  assert.match(mixNote("playful coffee", "refs_gallery"), /refs_gallery\("coffee"\)/);
  assert.equal(mixNote("fintech dashboard"), "");
  assert.equal(mixNote("brutalist"), "");
  assert.equal(mixNote(""), "");
});

test("the section plan borrows from studied references and varies its forms", async () => {
  const { planGate } = await import("../src/modules/board/index.mjs");
  const task = { refs: { studied: [{ key: "site:linear.app", role: "competitor" }, { key: "site:vercel.com", role: "page" }, { key: "site:dsyellow.com", role: "style" }] } };
  const s = (id, form, ref, source = "product-ui", candy, motion) => ({ id, idea: "says one clear thing", form, takes: { ref, what: "a borrowed composition" }, picture: { source }, candy, motion });
  const lazy = [s("hero", "hero", "https://linear.app/"), s("how", "split", "https://linear.app/"), s("features", "split", "https://linear.app/"), s("proof", "split", "https://linear.app/"), s("pricing", "split", "https://linear.app/")];
  const p = planGate(lazy, task).join("\n");
  assert.match(p, /from 1 reference/);
  assert.match(p, /4 sections are "split"/);
  assert.match(p, /side by side/);
  assert.match(p, /eye-candy/);
  assert.match(p, /no footer/);
  assert.match(p, /no motion planned for "hero"/);
  assert.match(planGate([s("hero", "hero", "https://nowhere.example/"), ...lazy.slice(1)], task).join("\n"), /haven't studied/);
  const good = [
    s("hero", "hero", "https://linear.app/", "product-ui", false, "the cards fan in on load"),
    s("demo", "sticky-demo", "https://vercel.com/", "product-ui", true, "the demo steps as you scroll"),
    s("wall", "gallery", "https://dsyellow.com/", "user-files"),
    s("numbers", "visualisation", "https://vercel.com/", "code-visual", true, "the chart draws as it scrolls in"),
    s("say", "statement", "https://dsyellow.com/", "none"),
    s("footer", "footer", "https://linear.app/", "none"),
  ];
  assert.deepEqual(planGate(good, task), []);
});

test("web image results parse from Bing's markup", async () => {
  const { parseBing } = await import("../src/modules/assets/images.mjs");
  const html = '<a class="iusc" m="{&quot;purl&quot;:&quot;https://site.example/p&quot;,&quot;murl&quot;:&quot;https://site.example/a.jpg&quot;,&quot;turl&quot;:&quot;https://tse.example/t&quot;,&quot;t&quot;:&quot;Vineyard rows&quot;}">';
  const r = parseBing(html);
  assert.equal(r.length, 1);
  assert.equal(r[0].full, "https://site.example/a.jpg");
  assert.equal(r[0].title, "Vineyard rows");
});

test("the fast loop asks only for a look and a deal before UI", async () => {
  const { missingBeforeUi, newTask } = await import("../src/core/state.mjs");
  const { loadConfig } = await import("../src/core/config.mjs");
  const t = newTask({ title: "landing page for a saas", size: "full", surface: "landing", guides: ["fast"], mode: "design" });
  t.loop = "fast";
  const cfg = loadConfig();
  assert.deepEqual(missingBeforeUi(t, cfg).map((m) => m.need), ["look", "deal"]);
  t.toolUse = { refs_gallery: 1 };
  t.deal = { kind: "software", summary: "hero centred" };
  assert.deepEqual(missingBeforeUi(t, cfg), []);
});

test("the fast loop never makes the critic a gate", async () => {
  const { needsCritic, newTask } = await import("../src/core/state.mjs");
  const { loadConfig } = await import("../src/core/config.mjs");
  const t = newTask({ title: "landing page for a saas", size: "full", surface: "landing", guides: ["fast"], mode: "design" });
  t.lastUiWriteAt = new Date().toISOString();
  const cfg = loadConfig();
  assert.equal(needsCritic(t, cfg), true, "full loop: the critic is required");
  t.loop = "fast";
  assert.equal(needsCritic(t, cfg), false, "fast loop: a polish pass on request");
});

test("layout_deal with out writes a ready page from the dealt set", { skip: !fs.existsSync(path.join(os.homedir(), ".drip", "vendor", "taste-skill", "skills", "taste-skill", "assets", "starter.html")) && "taste-skill not installed" }, async () => {
  const { scaffoldPage } = await import("../src/modules/parts/index.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-scaf-"));
  const prev = process.env.CLAUDE_PROJECT_DIR;
  const prevHome = process.env.DRIP_HOME;
  process.env.CLAUDE_PROJECT_DIR = dir;
  process.env.DRIP_HOME = path.join(os.homedir(), ".drip"); // the installed taste-skill
  try {
    const msg = await scaffoldPage({ out: "p", kind: "software", hero: "split", palette: "green-black-bone", type: "host", nav: "nav-centre", footer: "footer-dark", close: "close-word", buttons: "pill", mark: "initial", radius: "soft" });
    assert.match(msg, /Scaffolded/);
    const html = fs.readFileSync(path.join(dir, "p", "index.html"), "utf8");
    assert.match(html, /<!-- drip:sections -->/);
    assert.match(html, /<header class="nav nav--centre">/);
    assert.match(html, /footer--dark/);
    assert.match(html, /close--word/);
    assert.match(html, /data-buttons="pill"/);
    assert.match(html, /--p-bg: #161c1a/, "the dealt palette");
    assert.equal((html.match(/--p-bg:/g) || []).length, 1, "the demo's own palette is gone");
    assert.doesNotMatch(html, /<template data-part/);
    assert.ok(fs.existsSync(path.join(dir, "p", "assets", "system.css")));
    assert.ok(!fs.existsSync(path.join(dir, "p", ".taste-skill")), "no foreign gate armed");
    assert.match(await scaffoldPage({ out: "p", kind: "software" }), /exists: not scaffolded/);
  } finally {
    process.env.CLAUDE_PROJECT_DIR = prev;
    if (prevHome === undefined) delete process.env.DRIP_HOME;
    else process.env.DRIP_HOME = prevHome;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the agent sees the core tools; Code Mode reaches the rest", async () => {
  const { registerAll, collectTools, CORE } = await import("../src/core/registry.mjs");
  const prev = process.env.DRIP_TOOLS;
  delete process.env.DRIP_TOOLS;
  const seen = [];
  registerAll({ registerTool: (name) => seen.push(name), registerResource: () => {} });
  process.env.DRIP_TOOLS = prev;
  assert.ok(seen.length < 60, `too many listed tools: ${seen.length}`);
  for (const n of seen) assert.ok(CORE.has(n), `${n} listed but not core`);
  for (const n of ["drip_start", "layout_deal", "parts_get", "page_stitch", "fitcheck_shot", "drip_execute"]) assert.ok(seen.includes(n), `${n} missing`);
  assert.ok(collectTools().size > seen.length + 40, "Code Mode keeps every tool");
});
