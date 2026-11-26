// The AI-mistake checks, run in a real browser on a page that makes every mistake once.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../src/core/chrome.mjs";
import { capture, judgeAudit } from "../src/core/cdp.mjs";
import { judgeTells } from "../src/core/ai-tells.mjs";
import { isHard } from "../src/modules/fitcheck/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !findChrome({}) && "no Chrome/Edge on this machine";

test("judgeTells: blockers are breakage, warnings are not", () => {
  const j = judgeTells([
    { sev: "block", kind: "unreadable button", text: "Go", detail: "x" },
    { sev: "warn", kind: "gradient text", text: "", detail: "y" },
  ]);
  assert.equal(j.blockers.length, 1);
  assert.ok(isHard(`desktop: ${j.blockers[0]}`));
  assert.ok(!isHard(`desktop: ${j.warnings[0]}`));
});

test("the page check finds the AI mistakes on a page that makes them", { skip, timeout: 120000 }, async () => {
  const url = pathToFileURL(path.join(here, "fixtures", "ai-tells.html")).href;
  const { audit } = await capture(url, { width: 1440, height: 900, shots: false });
  const kinds = new Set(audit.tells.map((t) => t.kind));
  for (const k of ["unreadable button", "button label cut off", "dead button", "default indigo button", "button doesn't look like a button", "low-contrast text", "placeholder copy", "stretched image", "broken image", "icon-card row", "logos are words", "old year in the footer", "no focus states"])
    assert.ok(kinds.has(k), `missing: ${k} (found ${[...kinds].join(", ")})`);
  const same = audit.tells.find((t) => t.kind === "unreadable button" && /Get started/.test(t.text));
  assert.match(same.detail, /colour of its fill/);
  const { blockers } = judgeAudit(audit, { persuade: true });
  assert.ok(blockers.some((b) => /broken: unreadable button "Get started"/.test(b)));
  assert.ok(blockers.some((b) => /broken: placeholder copy.*\[price\]/.test(b)));
});
