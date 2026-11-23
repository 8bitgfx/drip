// Consistency of the skill suite: every skill has its files, every reference file is listed,
// every tool a skill mentions exists, every `drip_guide <topic>` points at a real guide.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { listGuides } from "../src/core/guides.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsDir = path.join(root, "skills");
const srcDir = path.join(root, "mcp", "src");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const TOOLS = new Set(walk(srcDir).filter((f) => f.endsWith(".mjs")).flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1])));
const TOPICS = new Set(listGuides().map((g) => g.topic));
const TOOL_PREFIXES = /^(drip|refs|board|components|palette|fonts|icons|gradient|images|gen|keys|fitcheck)_[a-z_]+$/;
const skills = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
const mdFiles = walk(skillsDir).concat(walk(path.join(root, "rules")), walk(path.join(root, "commands"))).filter((f) => f.endsWith(".md"));

test("there are 22 skills, each with SKILL.md and guide.md", () => {
  assert.equal(skills.length, 22, `skills: ${skills.join(", ")}`);
  for (const s of skills) {
    assert.ok(fs.existsSync(path.join(skillsDir, s, "SKILL.md")), `${s}/SKILL.md`);
    assert.ok(fs.existsSync(path.join(skillsDir, s, "guide.md")), `${s}/guide.md`);
  }
});

test("SKILL.md frontmatter has name and a triggering description", () => {
  for (const s of skills) {
    const head = fs.readFileSync(path.join(skillsDir, s, "SKILL.md"), "utf8").split("---")[1] || "";
    assert.match(head, new RegExp(`name:\\s*${s}\\b`), `${s}: name`);
    assert.match(head, /description:\s*\S.{40,}/s, `${s}: description`);
  }
});

test("SKILL.md tells the agent to call drip_guide for its topic", () => {
  for (const s of skills.filter((x) => x !== "drip")) {
    const body = fs.readFileSync(path.join(skillsDir, s, "SKILL.md"), "utf8");
    assert.match(body, /drip_guide/, `${s} must point at drip_guide`);
  }
});

test("every reference file is listed in its SKILL.md", () => {
  for (const s of skills) {
    const refDir = path.join(skillsDir, s, "reference");
    if (!fs.existsSync(refDir)) continue;
    const body = fs.readFileSync(path.join(skillsDir, s, "SKILL.md"), "utf8");
    const topic = s === "drip" ? "loop" : s.replace(/^drip-/, "");
    for (const f of fs.readdirSync(refDir).filter((x) => x.endsWith(".md"))) assert.ok(body.includes(`${topic}/${f.slice(0, -3)}`), `${s}/SKILL.md must list ${topic}/${f.slice(0, -3)}`);
  }
});

test("every tool mentioned in skills, rules and commands exists", () => {
  const missing = [];
  for (const f of mdFiles)
    for (const m of fs.readFileSync(f, "utf8").matchAll(/`([a-z]+_[a-z_]+)`/g))
      if (TOOL_PREFIXES.test(m[1]) && !TOOLS.has(m[1])) missing.push(`${path.relative(root, f)}: ${m[1]}`);
  assert.deepEqual(missing, []);
});

test("every drip_guide topic mentioned exists", () => {
  const missing = [];
  for (const f of mdFiles)
    for (const m of fs.readFileSync(f, "utf8").matchAll(/drip_guide[`\s(]+(?:topic\s+)?`?([a-z0-9][a-z0-9/-]*)`?/g)) {
      const t = m[1].replace(/^drip-/, "");
      if (!["index", "with", "for", "topic"].includes(t) && !TOPICS.has(t)) missing.push(`${path.relative(root, f)}: ${t}`);
    }
  assert.deepEqual(missing, []);
});
