// Host-neutral project context: what a design task inherits from the project and what it still has to do itself.
// The MCP tools (project_context, drip_start, drip_status), the session-start hook, the CLI and other hosts all call
// these functions, so every harness sees the same memory. Nothing here needs a chat history or a model's memory.
//
//   projectContext(opts)            compact summary of the master board, approved direction, rules, sub-boards, DESIGN.md
//   buildTaskMemory(opts)           what drip_start stores on the task (mode, revisions, inherited / still needed)
//   carryStudies(task, board, cfg)  validated studies of a board counted toward this task's reference gate
//   adoptApproved(task, opts)       the approved direction counted as this task's direction, if its review is on record
//   sessionPointer(cwd)             the 2-4 line pointer the session-start hook prints (empty when nothing to say)
//
// No dependencies beyond node: hooks import this file.
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { loadDecisions, effectiveRules } from "./memory.mjs";
import { projectDir, projectDripDir } from "./paths.mjs";
import { designDoc } from "./skills.mjs";
import { listPacks } from "./packs.mjs";
import { listBoards, liveItems, loadBoard, loadIndex, masterId } from "../modules/board/store.mjs";

const brandKey = (b) => b || "default";
const REDESIGN = /\b(redesign|re-design|rework|rebrand|new direction|reimagine|overhaul|different look|start over|explore (?:new|other|different))\b/i;

/** Is there anything of Drip's design memory in this project? (Reads only; creates nothing.) */
export function hasMemory(cwd) {
  const dir = projectDripDir(cwd);
  return ["boards/index.json", "memory/decisions.json", "skills/project-design/SKILL.md"].some((f) => fs.existsSync(path.join(dir, f)));
}

function itemCounts(board) {
  const c = {};
  for (const it of liveItems(board)) c[it.status || "inspiration"] = (c[it.status || "inspiration"] || 0) + 1;
  return c;
}

/**
 * The compact project context. opts: { cwd, task, brand, maxChars }.
 * Returns the structured parts plus `text`, already trimmed to maxChars (config memory.contextChars by default).
 */
export function projectContext({ cwd, task, brand, maxChars } = {}) {
  const root = projectDir(cwd);
  const config = loadConfig(cwd);
  const limit = maxChars || config.memory?.contextChars || 1800;
  const out = { root, hasMemory: hasMemory(cwd), brand: brand || task?.memory?.brand || null, master: null, approved: null, rules: [], rejected: [], proposals: [], conflicts: [], subBoards: [], designDoc: null, skill: null, packs: [], mode: task?.memory?.mode || null, text: "" };
  if (!out.hasMemory) {
    out.text = "No project design memory yet. board_project({ action: \"bootstrap\" }) builds a master board from this repo's logos, tokens, DESIGN.md and screenshots; the approved direction and learned rules accumulate there.";
    return out;
  }
  const idx = loadIndex();
  const mid = idx.masters[brandKey(out.brand)];
  const master = mid ? loadBoard(mid) : null;
  if (master) out.master = { id: master.id, name: master.name, revision: master.revision, items: liveItems(master).length, counts: itemCounts(master), updatedAt: master.updatedAt };
  const ap = idx.approved[brandKey(out.brand)];
  if (ap) out.approved = { direction: ap.direction, revision: ap.revision, at: ap.at, board: ap.board, snapshot: ap.snapshot || null, critic: ap.critic || null };
  const d = loadDecisions(cwd);
  out.rules = effectiveRules(cwd, { d });
  out.rejected = d.rejected.slice(-6);
  out.proposals = d.rules.filter((r) => r.status === "proposed");
  out.conflicts = d.rules.filter((r) => r.status === "proposed" && r.conflictsWith?.length);
  out.styleRevisions = d.styleRevisions.filter((r) => r.status === "proposed");
  out.subBoards = listBoards({ includeArchived: false }).filter((b) => b.id !== mid).slice(0, 6).map((b) => ({ id: b.id, name: b.name, scope: b.scope, items: liveItems(b).length, chosen: b.chosen }));
  const doc = designDoc(root, task);
  if (doc) out.designDoc = { rel: doc.rel, chars: doc.text.length };
  if (fs.existsSync(path.join(projectDripDir(cwd), "skills", "project-design", "SKILL.md"))) out.skill = ".drip/skills/project-design/SKILL.md";
  out.packs = listPacks(cwd).filter((p) => p.type === "project").map((p) => p.id);

  const L = [];
  L.push(
    master
      ? `Master board "${master.name}" (${master.id} r${master.revision}): ${out.master.items} items (${Object.entries(out.master.counts).map(([k, v]) => `${v} ${k}`).join(", ") || "empty"}).`
      : "No master board yet (board_project bootstrap).",
  );
  if (ap) {
    const s = ap.snapshot || {};
    L.push(`Approved direction: "${ap.direction}" (style ${ap.revision}, ${String(ap.at || "").slice(0, 10)})${s.summary ? `: ${String(s.manifesto || s.summary).slice(0, 220)}` : ""}${s.palette?.length ? ` Palette ${s.palette.join(" ")}.` : ""}${s.type ? ` Type ${s.type}.` : ""}`);
  } else L.push("No approved direction: existing UI is evidence, not an approved look. The user approves a direction with board_choose.");
  if (out.rules.length) L.push(`Rules (${out.rules.length}, approved): ${out.rules.slice(0, 7).map((r) => `${r.topic}: ${r.value}${r.avoid?.length ? ` (not ${r.avoid.slice(0, 2).join("/")})` : ""}`).join("; ")}.`);
  if (out.rejected.length) L.push(`Rejected: ${out.rejected.slice(-4).map((r) => r.what).join("; ")}.`);
  if (out.conflicts.length) L.push(`NEEDS THE USER: ${out.conflicts.length} proposed rule(s) contradict approved ones (project_learn list).`);
  else if (out.proposals.length) L.push(`${out.proposals.length} proposed rule(s) wait for the user's approval (project_learn list); they are not in force.`);
  if (out.styleRevisions?.length) L.push(`A proposed redesign (${out.styleRevisions.map((r) => r.id).join(", ")}) is waiting; the approved direction stays in force until the user promotes it.`);
  if (out.subBoards.length) L.push(`Sub-boards: ${out.subBoards.map((b) => `${b.id} (${b.scope}${b.chosen ? `, chose ${b.chosen}` : ""})`).join(", ")}.`);
  L.push(`DESIGN.md: ${out.designDoc ? `${out.designDoc.rel}${task?.page?.dir ? "" : " (this repo’s: it applies only when the task is this repo’s own product; a page Drip builds in a new folder gets its own)"}` : "none"}${out.skill ? ` · project skill ${out.skill}` : ""}${out.packs.length ? ` · packs ${out.packs.join(", ")}` : ""}.`);
  let text = L.join("\n");
  if (text.length > limit) text = `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
  out.text = text;
  return out;
}

/** What drip_start stores on a design task: the mode, the revisions it started from, what it inherits and what it still needs. */
export function buildTaskMemory({ cwd, taskText = "", mode, brand } = {}) {
  const ctx = projectContext({ cwd, brand });
  if (!ctx.hasMemory) return null;
  const approved = ctx.approved;
  const m = mode || (approved ? (REDESIGN.test(taskText) ? "redesign" : "fidelity") : "fresh");
  const inherited = [];
  if (approved) inherited.push(`approved direction "${approved.direction}"`);
  if (ctx.rules.length) inherited.push(`${ctx.rules.length} rules`);
  if (ctx.designDoc) inherited.push(ctx.designDoc.rel);
  if (ctx.master?.items) inherited.push(`master board (${ctx.master.items} items)`);
  const needed = ["this task's brief", "references for what is new (research the gaps)"];
  needed.push(approved && m !== "redesign" ? "direction: board_attach({ adopt: true }) or board_choose" : "direction: board_directions + critic + board_choose");
  needed.push("the usual gates: critic and fit check on the real build");
  return { mode: m, brand: brand || null, masterId: ctx.master?.id || null, masterRevision: ctx.master?.revision ?? null, styleRevision: approved?.revision || null, approved: approved?.direction || null, attachedAt: new Date().toISOString(), inherited, needed, proposedRevision: null };
}

/**
 * Studies recorded on `board` that may count toward this task's reference gate. A study is carried only when it is
 * complete, fresh (config memory.freshDays), made for the same kind of surface or of a shipped site, and not already counted.
 * Returns { carried: [studied entries], skipped: [{ key, why }] }; the caller stores `carried` in task.refs.studied.
 */
export function carryStudies(task, board, config = loadConfig()) {
  const fresh = (config.memory?.freshDays ?? 90) * 864e5;
  const have = new Set((task.refs?.studied || []).map((s) => s.key));
  const carried = [];
  const skipped = [];
  const fields = ["layout", "type", "color", "density", "detail", "take", "leave"];
  for (const it of liveItems(board)) {
    const s = it.study;
    if (!s) continue;
    if (have.has(it.key)) continue;
    const why =
      fields.some((f) => !s[f] || String(s[f]).trim().length < 12)
        ? "incomplete study"
        : s.at && Date.now() - Date.parse(s.at) > fresh
          ? `older than ${config.memory?.freshDays ?? 90} days`
          : s.surface && s.surface !== task.surface && !String(it.key).startsWith("site:")
            ? `studied for a ${s.surface} task, this is ${task.surface}`
            : null;
    if (why) {
      skipped.push({ key: it.key, why });
      continue;
    }
    carried.push({ key: it.key, designer: it.designer || it.designerUrl || it.key, onSurface: s.onSurface ?? true, at: s.at, inherited: { board: board.id, revision: board.revision, at: new Date().toISOString() } });
  }
  return { carried, skipped };
}

/**
 * Count the project's approved direction as this task's direction. Allowed only when it was reviewed: the critic's
 * verdict on it is on record (or the project does not require the critic). Anything else needs acceptUnreviewed: true,
 * which is the user's call to make. Returns { ok, why?, ptr? }.
 */
export function adoptApproved({ task, acceptUnreviewed = false, cwd } = {}) {
  const idx = loadIndex();
  const ap = idx.approved[brandKey(task?.memory?.brand)];
  if (!ap) return { ok: false, why: "The project has no approved direction yet. Run board_directions + critic + board_choose for this task." };
  const config = loadConfig(cwd);
  const reviewed = ap.critic?.verdict === "pass" || !config.gates.requireCritic || !config.gates.enforce;
  if (!reviewed && !acceptUnreviewed)
    return { ok: false, why: `"${ap.direction}" was approved without a critic review on record (${ap.critic ? `the critic said ${ap.critic.verdict}` : "none"}), so this task cannot count it as its own reviewed direction. Have the critic rank it (critic_prepare kind "directions" on a board that shows it), or, if the user accepts it as is, board_attach({ adopt: true, acceptUnreviewed: true }).` };
  return { ok: true, ptr: ap, unreviewed: !reviewed };
}

/** The pointer the session-start hook prints: 2-4 lines, only for a project that has a master board. */
export function sessionPointer(cwd) {
  const config = loadConfig(cwd);
  if (config.memory?.sessionPointer === false || !hasMemory(cwd)) return "";
  const mid = masterId(null);
  if (!mid) return "";
  const ctx = projectContext({ cwd, maxChars: 600 });
  const lines = [`This project has design memory: master board "${ctx.master?.name}" (${mid} r${ctx.master?.revision}).`];
  lines.push(ctx.approved ? `Approved direction "${ctx.approved.direction}" (style ${ctx.approved.revision}); ${ctx.rules.length} approved rule(s).` : "No approved direction yet.");
  if (ctx.conflicts.length || ctx.proposals.length) lines.push(`${ctx.proposals.length} proposed rule(s) wait for the user${ctx.conflicts.length ? ` (${ctx.conflicts.length} contradict approved rules)` : ""}.`);
  lines.push("For design work start with drip_start: it loads this context and the mode (fidelity extends the system; redesign only on the user's word). Nothing here replaces the task's own gates.");
  return lines.join("\n");
}
