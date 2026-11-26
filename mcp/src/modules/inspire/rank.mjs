// Ranking of the curated catalogue (content/data/catalogue.json) by stack, design fit and quality.
// The metadata (fit tags, quality 1-5) is Drip's own hint; components_find ignores it.
import fs from "node:fs";
import path from "node:path";
import { dataDir, projectDripDir } from "../../core/paths.mjs";

const read = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return {};
  }
};

/** Built-in entries plus the project's own .drip/catalogue.json entries, like components_find sees them. */
export function loadEntries() {
  return [...(read(path.join(dataDir, "catalogue.json")).entries || []), ...(read(path.join(projectDripDir(), "catalogue.json")).entries || [])];
}

/**
 * Score entries: stack match (hard filter when `stack` is given and the entry names stacks), fit-tag overlap, quality.
 * Entries without a `stack` list are treated as stack-neutral. Returns [{ entry, score, why }] best first.
 */
export function rankEntries(entries, { stack = [], fit = [], category } = {}) {
  const stacks = stack.map((s) => String(s).toLowerCase());
  const wants = fit.map((s) => String(s).toLowerCase());
  const out = [];
  for (const e of entries) {
    if (category && e.category !== category) continue;
    const have = (e.stack || []).map((s) => s.toLowerCase());
    const stackHits = stacks.filter((s) => have.includes(s));
    if (stacks.length && have.length && !stackHits.length) continue;
    const tags = (e.fit || []).map((s) => s.toLowerCase());
    const fitHits = wants.filter((w) => tags.includes(w) || tags.some((t) => t.includes(w) || w.includes(t)));
    const quality = Number.isFinite(e.quality) ? e.quality : 2.5;
    const score = quality + fitHits.length * 2 + stackHits.length * 0.5 + (tags.includes("any") ? 0.5 : 0);
    out.push({ entry: e, score, why: [fitHits.length ? `fits ${fitHits.join(", ")}` : "", stackHits.length ? `stack ${stackHits.join(", ")}` : "", `quality ${quality}/5`].filter(Boolean).join(" · ") });
  }
  return out.sort((a, b) => b.score - a.score);
}
