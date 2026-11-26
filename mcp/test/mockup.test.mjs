// mockup_render's scene building (offline) and a real render when MockStudio is installed; the covered-text check.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDocument, diffPatch, mergePatch, mockstudioReady } from "../src/modules/studio/mockup.mjs";
import { capture, judgeAudit } from "../src/core/cdp.mjs";
import { toUrl } from "../src/core/serve.mjs";
import { closeBrowser } from "../src/core/browser.mjs";
import { findChrome } from "../src/core/chrome.mjs";

test("merge patches round-trip: base + diff(base, next) = next", () => {
  const base = { a: 1, b: { c: 2, d: [1, 2] }, gone: true };
  const next = { a: 1, b: { c: 3, d: [3] }, added: { x: 1 } };
  assert.deepEqual(mergePatch(base, diffPatch(base, next)), next);
});

test("buildDocument: look, then camera and motion presets, then Drip's choices, then the user's patch", () => {
  const presets = (n) =>
    ({ "look.hero": { frame: { kind: "slab" }, stage: { background: { kind: "solid", solid: "#000" }, environment: { id: "studio", intensity: 1 } }, camera: { tiltX: 0 } }, "camera.three-quarter": { camera: { tiltX: 8, tiltY: -20 } } })[n];
  const d = buildDocument({ look: "hero", camera: "three-quarter", device: "iphone-17-pro", background: "#0D0E12", environment: "daylight", light: 2, patch: { camera: { tiltY: -5 } } }, presets);
  assert.deepEqual(d.frame, { kind: "device", device: { model: "iphone-17-pro" } });
  assert.equal(d.artboard.aspect, "4:5");
  assert.deepEqual(d.stage.background, { kind: "solid", solid: "#0D0E12" });
  assert.deepEqual(d.stage.environment, { id: "daylight", intensity: 2 });
  assert.deepEqual(d.camera, { tiltX: 8, tiltY: -5 });
  assert.equal(buildDocument({ look: "hero", device: "slab", background: "transparent" }, presets).stage.background.kind, "transparent");
});

test("a shape drawn over text is a blocker; decoration behind it is not", { skip: !findChrome({}) && "no Chrome/Edge", timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cover-"));
  const page = (drip) => `<!doctype html><meta name=viewport content="width=device-width"><style>body{font:18px system-ui;margin:40px}.tile{background:#161a21;color:#ddd;padding:24px;width:420px}.d{position:absolute;left:150px;top:30px;width:46px;height:240px;background:#2340FF;pointer-events:none;${drip}}</style><h1>Brand sheet</h1><div class=tile><p>4 questions asked</p><p>6 references studied</p></div><div class=d></div>`;
  fs.writeFileSync(path.join(dir, "over.html"), page(""));
  fs.writeFileSync(path.join(dir, "behind.html"), page("z-index:-1"));
  try {
    const over = await capture(await toUrl(path.join(dir, "over.html")), { width: 1440, height: 900, config: {} });
    assert.ok(over.audit.covered.some((c) => c.text === "4 questions asked" && /div\.d/.test(c.by)));
    assert.ok(judgeAudit(over.audit, { persuade: false }).blockers.some((b) => /text covered by a shape/.test(b)));
    const behind = await capture(await toUrl(path.join(dir, "behind.html")), { width: 1440, height: 900, config: {} });
    assert.equal(behind.audit.covered.length, 0);
  } finally {
    await closeBrowser();
  }
});

test("mockup_render puts a screenshot on the real iPhone model", { skip: !mockstudioReady() && "MockStudio not installed (drip doctor --install mockstudio)", timeout: 180000 }, async () => {
  const { collectTools } = await import("../src/core/registry.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-mock-"));
  process.env.DRIP_PROJECT_DIR = dir;
  fs.writeFileSync(path.join(dir, "screen.html"), "<!doctype html><body style='margin:0;background:#2340FF;color:#fff;font:700 64px system-ui;display:grid;place-items:center;height:100vh'>drip");
  try {
    const r = await collectTools().get("mockup_render").handler({ image: "screen.html", look: "studio", out: "out/phone.png", width: 800 });
    assert.ok(!r.isError, r.content?.[0]?.text);
    const png = fs.readFileSync(path.join(dir, "out", "phone.png"));
    assert.equal(png.readUInt32BE(16), 800);
    assert.match(fs.readFileSync(path.join(dir, "out", "phone.credits.txt"), "utf8"), /CC-BY/);
  } finally {
    await closeBrowser();
  }
});
