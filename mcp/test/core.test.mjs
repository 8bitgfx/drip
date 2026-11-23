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

test("page audit: measured blockers for tiny text, too many sizes, overflow", async () => {
  const { judgeAudit } = await import("../src/core/cdp.mjs");
  const bad = { width: 390, scrollWidth: 412, overflowX: true, offenders: ["div.stack 412px"], fontSizes: [[12, 186], [15, 95], [13, 68], [17, 48], [16, 38], [14, 31], [36, 27], [28, 23], [24, 9]], families: [["Martian Mono", 423], ["Bricolage Grotesque", 139]], words: 562, smallShare: 0.45, gaps: [[3000, 4200]], media: 0, bodyText: 12 };
  const j = judgeAudit(bad);
  assert.ok(j.blockers.some((b) => /overflow/.test(b)));
  assert.ok(j.blockers.some((b) => /text sizes/.test(b)));
  assert.ok(j.blockers.some((b) => /under 14px/.test(b)));
  assert.ok(j.blockers.some((b) => /monospace/.test(b)));
  assert.ok(j.blockers.some((b) => /paragraph is 12px/.test(b)));
  // An app screen is judged more loosely: mono and small body are warnings, not blockers.
  assert.ok(!judgeAudit(bad, { persuade: false }).blockers.some((b) => /monospace/.test(b)));
  const hero = { h1w: 1100, h1Visible: true, pic: { w: 0, h: 0 }, emptyBelow: 80, actions: 1 };
  const good = { width: 1440, vh: 900, scrollWidth: 1440, overflowX: false, offenders: [], fontSizes: [[18, 400], [127, 6], [56, 20], [26, 40], [14, 30]], families: [["Söhne", 400], ["Tiempos", 90]], words: 490, smallShare: 0.06, gaps: [], media: 4, bodyText: 18, h1: 127, h2: 56, hero, sections: [{ id: "a", pic: true }, { id: "b", pic: false }, { id: "c", pic: true }], empty: [0.1, 0.3, 0.2] };
  assert.deepEqual(judgeAudit(good).blockers, []);
});

test("hero gate: small h1, small picture and empty bottom block; page checks are skipped", async () => {
  const { judgeAudit, displayPx } = await import("../src/core/cdp.mjs");
  assert.ok(Math.abs(displayPx(1440) - 127) < 2 && Math.abs(displayPx(390) - 48.5) < 1);
  const small = { width: 1440, vh: 900, overflowX: false, fontSizes: [[12, 900]], families: [["A", 9], ["B", 9], ["C", 9]], words: 900, smallShare: 0.9, gaps: [], media: 0, h1: 89, hero: { h1w: 500, h1Visible: true, pic: { w: 400, h: 300 }, emptyBelow: 300, actions: 1 } };
  const j = judgeAudit(small, { hero: true });
  assert.ok(j.blockers.some((b) => /h1 is 89px/.test(b)));
  assert.ok(j.blockers.some((b) => /hero is small/.test(b)));
  assert.ok(j.blockers.some((b) => /300px of nothing/.test(b)));
  assert.ok(!j.blockers.some((b) => /under 14px|families/.test(b)));
  const page = judgeAudit({ ...small, h1: 130, hero: { ...small.hero, pic: { w: 700, h: 700 }, emptyBelow: 40 }, sections: [{ id: "x", pic: false }, { id: "y", pic: false }], empty: [0.2, 0.7] });
  assert.ok(page.blockers.some((b) => /two sections without a picture/.test(b)));
  assert.ok(page.blockers.some((b) => /more than half empty/.test(b)));
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
