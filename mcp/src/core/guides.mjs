// Guides are the deep instructions. They live as Markdown in the plugin:
//   skills/drip-<topic>/guide.md            -> topic "<topic>"          (e.g. "color")
//   skills/drip-<topic>/reference/<x>.md    -> topic "<topic>/<x>"      (e.g. "color/dark-mode")
//   skills/drip/guide.md                    -> topic "loop"
//   rules/<x>.md                            -> topic "rules/<x>"        (e.g. "rules/slop-tells")
// Claude reads them through drip_guide, which records the read, so the hooks know it happened.
import fs from "node:fs";
import path from "node:path";
import { readPackFile } from "./packs.mjs";
import { examplesDir, rulesDir, skillsDir } from "./paths.mjs";

function topicFile(topic) {
  const t = topic.trim().replace(/^drip-/, "").replace(/\.md$/, "");
  if (t === "loop" || t === "drip") return path.join(skillsDir, "drip", "guide.md");
  if (t === "playbook") return path.join(skillsDir, "drip", "playbook.md");
  if (t === "fast") return path.join(skillsDir, "drip", "fast.md");
  if (t.startsWith("rules/")) return path.join(rulesDir, `${t.slice(6)}.md`);
  if (t.startsWith("examples/")) return path.join(examplesDir, `${t.slice(9)}.md`);
  const [skill, ...rest] = t.split("/");
  const dir = path.join(skillsDir, `drip-${skill}`);
  return rest.length ? path.join(dir, "reference", `${rest.join("/")}.md`) : path.join(dir, "guide.md");
}

export function normalizeTopic(topic) {
  if (/^pack:/.test(topic.trim())) return topic.trim();
  const t = topic.trim().replace(/^drip-/, "").replace(/\.md$/, "");
  return t === "drip" ? "loop" : t;
}

export function readGuide(topic) {
  // Niche packs: "pack:<id>" (its guide.md) or "pack:<id>/<file>" (genres, artists, critic, queries…)
  const pk = topic.trim().match(/^pack:([a-z0-9-]+)(?:\/([a-z-]+))?$/);
  if (pk) {
    const file = pk[2] ? (pk[2].includes(".") ? pk[2] : `${pk[2]}.md`) : "guide.md";
    return readPackFile(pk[1], file);
  }
  const file = topicFile(topic);
  if (!fs.existsSync(file)) return null;
  return stripSources(fs.readFileSync(file, "utf8"));
}

/** Drops "## Sources" / "## Credits" sections (attribution lives in CREDITS.md) and source HTML comments. */
export function stripSources(md) {
  return String(md)
    .replace(/\n#{2,3} (Sources|Credits|References used)\b[\s\S]*?(?=\n#{1,3} |$)/gi, "\n")
    .replace(/<!--\s*(Method adapted|Sources?|Adapted)[\s\S]*?-->/gi, "")
    .trimEnd() + "\n";
}

/** Every topic that exists, with its first heading, for the index. */
export function listGuides() {
  const out = [];
  const add = (topic, file) => {
    const first = fs.readFileSync(file, "utf8").split("\n").find((l) => l.startsWith("# ")) || "";
    out.push({ topic, title: first.replace(/^#\s*/, "") });
  };
  if (fs.existsSync(examplesDir)) for (const f of fs.readdirSync(examplesDir).filter((f) => f.endsWith(".md"))) add(`examples/${f.slice(0, -3)}`, path.join(examplesDir, f));
  if (fs.existsSync(rulesDir)) for (const f of fs.readdirSync(rulesDir).filter((f) => f.endsWith(".md"))) add(`rules/${f.slice(0, -3)}`, path.join(rulesDir, f));
  if (fs.existsSync(skillsDir))
    for (const d of fs.readdirSync(skillsDir)) {
      const topic = d === "drip" ? "loop" : d.replace(/^drip-/, "");
      const guide = path.join(skillsDir, d, "guide.md");
      if (fs.existsSync(guide)) add(topic, guide);
      if (d === "drip" && fs.existsSync(path.join(skillsDir, d, "playbook.md"))) add("playbook", path.join(skillsDir, d, "playbook.md"));
      if (d === "drip" && fs.existsSync(path.join(skillsDir, d, "fast.md"))) add("fast", path.join(skillsDir, d, "fast.md"));
      const ref = path.join(skillsDir, d, "reference");
      if (fs.existsSync(ref)) for (const f of fs.readdirSync(ref).filter((f) => f.endsWith(".md"))) add(`${topic}/${f.slice(0, -3)}`, path.join(ref, f));
    }
  return out;
}

/** Sub-topics of a topic (its reference files), to point Claude at the deeper reads. */
export function subTopics(topic) {
  const t = normalizeTopic(topic);
  if (t.includes("/")) return [];
  const dir = path.join(skillsDir, t === "loop" ? "drip" : `drip-${t}`, "reference");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => `${t}/${f.slice(0, -3)}`);
}
