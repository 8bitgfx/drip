// PostToolUse (Drip's own tools): one line in the task's film for each call, with who made it (the director, or a
// builder / helper by agent_id), so the film viewer can show the swarm at work.
import { allow, filmEvent, loadState, readInput, run, hookDir } from "./lib.mjs";

const KIND = { page_stitch: "stitch", pieces_install: "install", fitcheck_shot: "shot", build_prepare: "note", layout_deal: "note", critic_record: "note" };
const SAY = {
  page_stitch: (i) => `stitched ${(i.sections || []).length} sections`,
  pieces_install: (i) => `installed ${(i.urls || []).length} piece(s)`,
  fitcheck_shot: (i) => (i.hero ? "hero check" : i.numbersOnly ? "numbers check" : "page check"),
  build_prepare: (i) => `briefed ${(i.sections || []).map((s) => s.section).join(", ") || i.section || "a builder"}`,
  layout_deal: (i) => `dealt a ${i.kind || ""} set${i.out ? ` into ${i.out}` : ""}`,
  images_save: () => "saved pictures",
  images_search: (i) => `searched pictures${i.queries ? `: ${i.queries.slice(0, 2).join(", ")}` : ""}`,
  components_find: (i) => `searched pieces: ${i.need || i.kind || ""}`,
  pieces_preview: (i) => `looked at ${(i.items || i.urls || []).length} pieces`,
};

run(async () => {
  const input = await readInput();
  const dir = hookDir(input);
  const { task } = loadState(dir);
  if (!task) return allow();
  const tool = String(input.tool_name || "").replace(/^mcp__plugin_drip_drip__/, "");
  if (!tool || ["drip_status", "drip_guide", "drip_film"].includes(tool)) return allow();
  const ti = input.tool_input || {};
  filmEvent(task, { kind: KIND[tool] || "tool", agent: input.agent_id || "main", type: input.agent_type || null, tool, summary: (SAY[tool] || (() => tool.replace(/_/g, " ")))(ti) }, dir);
  allow();
});
