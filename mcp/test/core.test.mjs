// Offline unit tests for the pure parts: colour maths, lint rules, Dribbble parsing, gates.
import assert from "node:assert/strict";
import test from "node:test";
import { contrast, hexToOklch, oklchToHex, ramp } from "../src/modules/assets/color.mjs";
import { lintText, loadRules } from "../src/modules/fitcheck/lint.mjs";
import { parseCards } from "../src/modules/refs/dribbble.mjs";
import { meshGradient } from "../src/modules/assets/gradient.mjs";
import { missingBeforeUi, needsFitcheck, newTask } from "../src/core/state.mjs";
import { DEFAULTS } from "../src/core/config.mjs";

test("hex <-> oklch round trip", () => {
  for (const hex of ["#E8452C", "#16140F", "#3DDC84", "#FFFFFF", "#000000"]) assert.equal(oklchToHex(hexToOklch(hex)), hex);
});

test("contrast matches WCAG reference values", () => {
  assert.equal(contrast("#000000", "#FFFFFF").toFixed(1), "21.0");
  assert.ok(Math.abs(contrast("#767676", "#FFFFFF") - 4.54) < 0.02);
});

test("ramps are 11 steps, light to dark, in gamut", () => {
  const r = ramp("#E8452C");
  assert.equal(r.length, 11);
  const l = r.map((s) => hexToOklch(s.hex).l);
  for (let i = 1; i < l.length; i++) assert.ok(l[i] < l[i - 1]);
  for (const s of r) assert.match(s.hex, /^#[0-9A-F]{6}$/);
});

test("lint catches slop and respects 'unless' and 'min'", () => {
  const rules = loadRules();
  const ids = (src) => lintText(src, rules).map((i) => i.id);
  assert.ok(ids(`<h1 className="from-purple-500 to-pink-500">Unlock seamless growth 🚀</h1>`).includes("ai-gradient"));
  assert.ok(ids(`<h1>Unlock seamless growth</h1>`).includes("slop-words"));
  assert.ok(ids(`<button className="outline-none">x</button>`).includes("outline-none"));
  assert.ok(!ids(`<button className="outline-none focus-visible:ring-2">x</button>`).includes("outline-none"));
  assert.ok(!ids(`<p className="backdrop-blur">x</p>`).includes("glass-everywhere"));
});

test("Dribbble listing parser reads a card", () => {
  const html = `<li id="screenshot-123" data-thumbnail-id="123" class="shot-thumbnail">
    <img data-src="https://cdn.dribbble.com/userupload/1/file/still-abc.png?format=webp&amp;resize=400x300" />
    <a class="shot-thumbnail-link" href="/shots/123-Cool-Dashboard"><span class="accessibility-text">View Cool Dashboard</span></a>
    <div class="shot-title">Cool Dashboard</div>
    <div class="user-information"><a class="url" href="/studio"><span class="display-name">Studio &amp; Co</span></a></div>
    <span data-shot-like-count>1.2k</span><span class="js-shot-views-count x">45k</span></li>`;
  const [c] = parseCards(html);
  assert.equal(c.id, "123");
  assert.equal(c.title, "Cool Dashboard");
  assert.equal(c.designer, "Studio & Co");
  assert.equal(c.designerUrl, "studio");
  assert.equal(c.image, "https://cdn.dribbble.com/userupload/1/file/still-abc.png");
  assert.equal(c.likes, "1.2k");
  assert.equal(c.views, "45k");
});

test("mesh gradient is deterministic per seed", () => {
  const a = meshGradient({ colors: ["#E8452C", "#F4B860"], seed: 3 });
  assert.equal(a.css, meshGradient({ colors: ["#E8452C", "#F4B860"], seed: 3 }).css);
  assert.notEqual(a.css, meshGradient({ colors: ["#E8452C", "#F4B860"], seed: 4 }).css);
  assert.match(a.svg, /^<svg/);
});

test("gates: quick tasks need only guides; skip opens everything", () => {
  const t = newTask({ title: "x", size: "quick", surface: "other", guides: ["polish"] });
  assert.equal(missingBeforeUi(t, DEFAULTS).length, 1);
  t.guidesRead = ["polish"];
  assert.equal(missingBeforeUi(t, DEFAULTS).length, 0);
  t.lastUiWriteAt = new Date().toISOString();
  assert.ok(needsFitcheck(t, DEFAULTS));
  t.skipped = "user said skip";
  assert.ok(!needsFitcheck(t, DEFAULTS));
});
