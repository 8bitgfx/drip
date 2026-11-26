// SnapCN pieces: which component a piece exports, its props, font family names, and (when Drip's piece tools are
// installed on this machine) a real piece bundled and seeked on the film clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const { describePiece, familyName } = await import("../src/modules/motion/pieces.mjs");

test("the piece's component and props are found in its source", () => {
  const src = `export const TEXT_REVEAL_DEFAULTS = {};\ninterface TextRevealProps {\n  /** The sentence. */\n  text?: string;\n  fontSize?: number;\n}\nexport function splitText() {}\nexport const TextReveal = (p: TextRevealProps) => null;\n`;
  const d = describePiece(src, "text-reveal");
  assert.equal(d.component, "TextReveal");
  assert.match(d.props, /text\?: string/);
  assert.ok(!d.exports.includes("splitText"));
});

test("Google Fonts family names are spelled out from the module name", () => {
  assert.equal(familyName("InstrumentSerif"), "Instrument Serif");
  assert.equal(familyName("SpaceGrotesk"), "Space Grotesk");
  assert.equal(familyName("Inter"), "Inter");
});

test("the Remotion stand-in exports what SnapCN pieces import", () => {
  const s = fs.readFileSync(path.resolve(import.meta.dirname, "..", "..", "content", "kit", "snapcn", "remotion.mjs"), "utf8");
  for (const name of ["useCurrentFrame", "useVideoConfig", "interpolate", "interpolateColors", "Easing", "spring", "measureSpring", "random", "AbsoluteFill", "Sequence", "Series", "Img", "staticFile", "delayRender", "continueRender", "getRemotionEnvironment"])
    assert.match(s, new RegExp(`export (const|function) ${name}\\b`), name);
  assert.ok(!/remotion-dev|Copyright.*Remotion/i.test(s), "clean-room: no Remotion code copied");
});

void os;
