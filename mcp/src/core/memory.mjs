// What the project has learned about its own design, kept as local evidence (see docs/PROJECT_MEMORY.md).
//
//   .drip/memory/feedback.jsonl   append-only events: what the user, the critic or the agent said, with who/when/where
//   .drip/memory/decisions.json   versioned rules, exceptions, rejected directions and style revisions (revision-checked)
//   .drip/memory/style.json       measured tokens (style_extract)
//   .drip/skills/project-design/  the portable Agent Skill generated from the approved decisions, with undo
//
// Authority, highest first: the user's latest explicit instruction, approved decisions, the user's selections
// (star, choose), the critic, the agent's own inference. A lower source never overrides a higher one; page and
// feature feedback never changes a brand rule; a contradiction becomes a question, not a silent overwrite.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { appendJsonl, readJson, readJsonl, updateJson } from "./jsonstore.mjs";
import { ensureProjectDrip, projectDir, projectDripDir } from "./paths.mjs";
import { designDoc } from "./skills.mjs";
import { isProjectPack, learnInPack } from "./packs.mjs";
import { actor, loadState, updateState } from "./state.mjs";
import { artifactRev, hashFile } from "./evidence.mjs";
import { loadBoard, loadIndex, updateBoard, updateIndex } from "../modules/board/store.mjs";

const AUTH = { "user-explicit": 4, decision: 3, "user-selection": 2, critic: 1, "agent-inference": 0 };
export const SOURCES = ["user-explicit", "user-selection", "critic", "agent-inference"];
export const SCOPES = ["page", "feature", "brand"];
export const authorityOf = (src) => AUTH[src] ?? 0;

const memDir = (cwd) => path.join(projectDripDir(cwd), "memory");
export const feedbackFile = (cwd) => path.join(memDir(cwd), "feedback.jsonl");
export const decisionsFile = (cwd) => path.join(memDir(cwd), "decisions.json");
export const styleFile = (cwd) => path.join(memDir(cwd), "style.json");
export const skillDir = (cwd) => path.join(projectDripDir(cwd), "skills", "project-design");

const newId = (p) => `${p}_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9#.%]+/g, " ").trim();
const brandKey = (b) => b || "default";

// ---- decisions.json ----
const emptyDecisions = () => ({ schema: 1, revision: 0, rules: [], exceptions: [], rejected: [], styleRevisions: [], activeRevision: null });

export function loadDecisions(cwd) {
  return { ...emptyDecisions(), ...readJson(decisionsFile(cwd), {}) };
}

export function updateDecisions(fn, cwd, opts = {}) {
  ensureProjectDrip(cwd);
  return updateJson(decisionsFile(cwd), (cur) => fn({ ...emptyDecisions(), ...cur }), { init: emptyDecisions(), ...opts });
}

export const readFeedback = (cwd) => readJsonl(feedbackFile(cwd));

/** Approved rules that apply to `scope`/`target` (brand rules always; page and feature rules only for their target). */
export function effectiveRules(cwd, { target = null, d = loadDecisions(cwd) } = {}) {
  return d.rules.filter((r) => r.status === "approved" && (r.scope === "brand" || (target && r.target === target)));
}

function scopeOverlaps(rule, scope, target) {
  if (scope === "brand") return rule.scope === "brand";
  return rule.scope === scope && (rule.target || null) === (target || null);
}

// ---- style revisions: a proposed redesign never replaces the approved identity until the user says yes ----
function newRevisionId(d) {
  return `sr${d.styleRevisions.length + 1}`;
}

/** The task's proposed revision (created on first use), so redesign feedback and a proposed direction travel together. */
export function ensureProposedRevision({ label, cwd } = {}) {
  const a = actor(cwd);
  let id = null;
  updateDecisions((d) => {
    const mine = d.styleRevisions.find((r) => r.status === "proposed" && r.task && r.task === a.task);
    if (mine) {
      id = mine.id;
      return d;
    }
    id = newRevisionId(d);
    d.styleRevisions.push({ id, label: label || "redesign", status: "proposed", at: new Date().toISOString(), task: a.task, direction: null, ruleIds: [], previous: d.activeRevision, supersededRules: [] });
    return d;
  }, cwd);
  updateState((st) => {
    if (st.task?.memory) st.task.memory.proposedRevision = id;
  }, cwd);
  return id;
}

// ---- feedback ----
/**
 * Record one event and, when it carries a rule, apply it with the authority rules above.
 * input: { text, scope?, source?, kind?, target?, rule?: { topic, value, avoid?[] }, rejects?[], shots?: { before, after },
 *          board?, supersede? }
 * Returns { event, rule, status, conflict, question }.
 */
export function recordFeedback(input, { cwd } = {}) {
  const a = actor(cwd);
  const task = loadState(cwd).task;
  const scope = SCOPES.includes(input.scope) ? input.scope : "page";
  const source = SOURCES.includes(input.source) ? input.source : "agent-inference";
  const at = new Date().toISOString();
  const boardId = input.board || task?.board?.id || null;
  const board = boardId ? loadBoard(boardId) : null;
  const ev = {
    id: newId("fb"),
    task: a.task,
    session: a.session,
    artifact: { board: boardId, boardRevision: board?.revision ?? null, artifactRev: task ? artifactRev(task, cwd) : null, styleRevision: task?.memory?.styleRevision || null },
    at,
    scope,
    source,
    kind: input.kind || "feedback",
    target: input.target || null,
    text: String(input.text || "").slice(0, 2000),
    rule: input.rule ? { topic: String(input.rule.topic), value: String(input.rule.value), avoid: (input.rule.avoid || []).map(String) } : null,
    shots: input.shots || null,
    status: "proposed",
  };
  let outcome = { rule: null, conflict: null, question: null };
  const redesign = task?.memory?.mode === "redesign" && scope === "brand";
  const revision = redesign ? task.memory.proposedRevision || ensureProposedRevision({ cwd }) : null;
  if (ev.rule || input.rejects?.length) {
    updateDecisions((d) => {
      outcome = applyFeedback(d, ev, { supersede: input.supersede === true, redesign, revision, rejects: input.rejects || [] });
      return d;
    }, cwd);
    ev.status = outcome.status;
    ev.ruleId = outcome.rule?.id || null;
    if (outcome.conflict) ev.conflictsWith = outcome.conflict.map((r) => r.id);
  }
  ensureProjectDrip(cwd);
  appendJsonl(feedbackFile(cwd), ev);
  // Niche packs this task used learn from it: the user's reactions and the critic's findings go into their learned.md,
  // so the next task in the niche (any project, any conversation) starts with them.
  if (["user-explicit", "user-selection", "critic"].includes(source)) {
    try {
      const rule = input.rule ? ` (rule: ${input.rule.topic} = ${input.rule.value}${input.rule.avoid?.length ? `; avoid ${input.rule.avoid.join(", ")}` : ""})` : "";
      for (const id of task?.packs || []) if (!isProjectPack(id, cwd)) learnInPack(id, `${input.text}${rule}`, { source: source === "critic" ? "critic" : "user", cwd });
    } catch {
      /* a pack that can't learn never fails the record */
    }
  }
  return { event: ev, rule: outcome.rule, status: ev.status, conflict: outcome.conflict, question: outcome.question };
}

function applyFeedback(d, ev, { supersede, redesign, revision, rejects }) {
  const out = { rule: null, conflict: null, question: null, status: "proposed" };
  for (const what of rejects) d.rejected.push({ id: newId("rej"), kind: "style", what: String(what), why: ev.text, at: ev.at, source: ev.source, scope: ev.scope, evidence: { feedback: [ev.id] } });
  if (!ev.rule) return out;
  const key = norm(ev.rule.topic);
  const sameTopic = d.rules.filter((r) => r.status === "approved" && norm(r.topic) === key);
  const conflicts = sameTopic.filter((r) => norm(r.value) !== norm(ev.rule.value) && scopeOverlaps(r, ev.scope, ev.target));
  const rule = {
    id: newId("rule"),
    topic: ev.rule.topic,
    value: ev.rule.value,
    avoid: ev.rule.avoid,
    scope: ev.scope,
    target: ev.scope === "brand" ? null : ev.target || null,
    status: "proposed",
    since: ev.at,
    source: ev.source,
    text: ev.text,
    evidence: { feedback: [ev.id], board: ev.artifact.board ? { id: ev.artifact.board, revision: ev.artifact.boardRevision } : null, shots: ev.shots },
    revision: revision || null,
    supersedes: [],
  };
  if (ev.scope !== "brand") {
    // Page and feature feedback is scoped: it never touches a brand rule. Against one it is an exception.
    if (ev.source === "user-explicit") rule.status = "approved";
    const brandRule = sameTopic.find((r) => r.scope === "brand" && norm(r.value) !== norm(ev.rule.value));
    if (brandRule) {
      rule.exceptionTo = brandRule.id;
      if (rule.status === "approved") d.exceptions.push({ id: newId("exc"), rule: brandRule.id, for: ev.scope + ":" + (rule.target || "?"), reason: ev.text, at: ev.at, evidence: { feedback: [ev.id] } });
    }
    if (rule.status === "approved") for (const c of conflicts) if (c.scope === ev.scope) (c.status = "superseded"), (c.supersededBy = rule.id), rule.supersedes.push(c.id);
  } else if (redesign) {
    rule.status = "proposed"; // part of a proposed style revision; promoted only after the user approves it
    const rev = d.styleRevisions.find((r) => r.id === revision);
    if (rev) rev.ruleIds.push(rule.id);
  } else if (conflicts.length) {
    if (ev.source === "user-explicit" && supersede) {
      rule.status = "approved";
      for (const c of conflicts) {
        c.status = "superseded";
        c.supersededBy = rule.id;
        rule.supersedes.push(c.id);
      }
    } else {
      rule.conflictsWith = conflicts.map((r) => r.id);
      out.conflict = conflicts;
      out.question = `This contradicts the approved rule "${conflicts[0].topic}: ${conflicts[0].value}". Ask the user: replace it with "${ev.rule.value}" for the whole brand (record again with supersede: true), keep the rule and make this an exception for one page or feature (scope "page"/"feature" with a target), or drop it.`;
      if (authorityOf(ev.source) < AUTH.decision) rule.offDirection = true;
    }
  } else if (ev.source === "user-explicit") rule.status = "approved";
  d.rules.push(rule);
  if (revision) {
    const rev = d.styleRevisions.find((r) => r.id === revision);
    if (rev && !rev.ruleIds.includes(rule.id)) rev.ruleIds.push(rule.id);
  }
  out.rule = rule;
  out.status = rule.status;
  return out;
}

/** Approve, reject or supersede a stored rule (project_learn). Approving over a conflict needs supersede: true. */
export function decideRule(id, action, { supersede = false, reason = "", cwd } = {}) {
  let result = null;
  updateDecisions((d) => {
    const r = d.rules.find((x) => x.id === id);
    if (!r) throw new Error(`No rule "${id}". project_learn({ action: "list" }) shows them.`);
    if (action === "approve") {
      const conflicts = d.rules.filter((x) => x.id !== id && x.status === "approved" && norm(x.topic) === norm(r.topic) && norm(x.value) !== norm(r.value) && scopeOverlaps(x, r.scope, r.target));
      if (conflicts.length && !supersede) throw new Error(`"${r.topic}: ${r.value}" contradicts the approved rule "${conflicts[0].topic}: ${conflicts[0].value}". Approve with supersede: true if the user wants the new one to replace it, or record an exception for one page/feature.`);
      for (const c of conflicts) {
        c.status = "superseded";
        c.supersededBy = id;
        r.supersedes = [...new Set([...(r.supersedes || []), c.id])];
      }
      r.status = "approved";
      r.approvedAt = new Date().toISOString();
      delete r.conflictsWith;
    } else if (action === "reject") {
      r.status = "rejected";
      r.rejectedAt = new Date().toISOString();
      r.rejectedWhy = reason;
      d.rejected.push({ id: newId("rej"), kind: "rule", what: `${r.topic}: ${r.value}`, why: reason || r.text, at: r.rejectedAt, evidence: { rule: id } });
    } else throw new Error(`Unknown action ${action}`);
    result = r;
    return d;
  }, cwd);
  return result;
}

export function addException({ rule, forTarget, reason, cwd }) {
  let ex = null;
  updateDecisions((d) => {
    if (!d.rules.some((r) => r.id === rule)) throw new Error(`No rule "${rule}".`);
    ex = { id: newId("exc"), rule, for: forTarget, reason, at: new Date().toISOString(), evidence: {} };
    d.exceptions.push(ex);
    return d;
  }, cwd);
  return ex;
}

/** Fixes from a critic that contradict an approved rule's `avoid` phrases. */
export function offDirectionFixes(fixes, cwd) {
  const rules = effectiveRules(cwd);
  return fixes.map((fix) => {
    const f = norm(fix);
    const hit = rules.find((r) => (r.avoid || []).some((a) => a && f.includes(norm(a))));
    return { fix, off: !!hit && !/^\[off-direction\]/i.test(fix), rule: hit || null };
  });
}

// ---- approving a direction (board_choose with the user's yes) ----
const pickDirection = (dir) => ({ name: dir.name, summary: dir.summary, adjectives: dir.adjectives, palette: dir.palette, type: dir.type, manifesto: dir.manifesto || null, headline: dir.headline || null });

/**
 * The user approved `direction` on `boardId`.
 *   master board, nothing approved yet          -> approved (style revision sr1)
 *   master board, same direction                -> unchanged
 *   master board, another direction, fidelity   -> refused (the identity changes only in a redesign)
 *   master board, another direction, redesign   -> a proposed revision; with `approved: true` it is promoted at once
 *   any other board                             -> only chosen on that board
 */
export function approveDirection({ boardId, direction, reason = "", critic = null, mode = "fidelity", approved = false, cwd } = {}) {
  const board = loadBoard(boardId);
  const dir = board?.directions.find((x) => x.name.toLowerCase() === String(direction).toLowerCase());
  if (!dir) throw new Error(`No direction "${direction}" on board ${boardId}.`);
  if (board.scope !== "master") return { kind: "board-only" };
  const idx = loadIndex();
  const cur = idx.approved[brandKey(board.brand)];
  const snap = pickDirection(dir);
  if (cur && cur.direction === dir.name) return { kind: "unchanged", revision: cur.revision };
  if (cur && mode !== "redesign") throw new Error(`The project's approved direction is "${cur.direction}" (style ${cur.revision}) and this task is in fidelity mode. Changing the identity is a redesign: start the task with memory "redesign", or ask the user to confirm a redesign.`);
  const a = actor(cwd);
  let revId;
  updateDecisions((d) => {
    revId = newRevisionId(d);
    d.styleRevisions.push({ id: revId, label: dir.name, status: "proposed", at: new Date().toISOString(), task: a.task, direction: { board: boardId, ...snap }, ruleIds: [], previous: d.activeRevision, supersededRules: [], reason, critic });
    return d;
  }, cwd);
  if (cur && !approved) return { kind: "proposed", revision: revId };
  promoteRevision(revId, { cwd, board, reason, critic });
  return { kind: "approved", revision: revId };
}

/** Make a proposed style revision the approved one. The previous one is kept (rollback restores it). */
export function promoteRevision(id, { cwd, board: given, reason, critic } = {}) {
  let rev;
  updateDecisions((d) => {
    rev = d.styleRevisions.find((r) => r.id === id);
    if (!rev) throw new Error(`No style revision "${id}".`);
    if (rev.status !== "proposed") throw new Error(`Style revision ${id} is ${rev.status}, not proposed.`);
    const proposed = d.rules.filter((r) => rev.ruleIds.includes(r.id) && r.status === "proposed");
    rev.supersededRules = [];
    for (const r of proposed) {
      for (const old of d.rules.filter((x) => x.status === "approved" && x.scope === "brand" && norm(x.topic) === norm(r.topic) && norm(x.value) !== norm(r.value))) {
        old.status = "superseded";
        old.supersededBy = r.id;
        rev.supersededRules.push(old.id);
      }
      r.status = "approved";
      r.approvedAt = new Date().toISOString();
    }
    const prev = d.styleRevisions.find((r) => r.id === d.activeRevision);
    if (prev) prev.status = "superseded";
    rev.status = "approved";
    rev.approvedAt = new Date().toISOString();
    rev.previous = d.activeRevision;
    d.activeRevision = id;
    return d;
  }, cwd);
  const dir = rev.direction;
  if (dir) {
    const board = given || loadBoard(dir.board);
    const key = brandKey(board?.brand);
    const ptr = { board: dir.board, direction: dir.name, snapshot: dir, revision: id, boardRevision: board?.revision ?? null, at: new Date().toISOString(), reason: reason || rev.reason || "", critic: critic || rev.critic || null };
    updateIndex((i) => {
      i.approved[key] = ptr;
      return i;
    });
    if (board) updateBoard(board.id, (b) => { b.approved = { direction: dir.name, styleRevision: id, at: ptr.at, reason: ptr.reason, critic: ptr.critic, migrated: false }; }, { op: "approve", summary: `approved "${dir.name}" as ${id}` });
  }
  return rev;
}

export function rejectRevision(id, { reason = "", cwd } = {}) {
  let rev;
  updateDecisions((d) => {
    rev = d.styleRevisions.find((r) => r.id === id);
    if (!rev || rev.status !== "proposed") throw new Error(`No proposed style revision "${id}".`);
    rev.status = "rejected";
    rev.rejectedWhy = reason;
    for (const r of d.rules.filter((x) => rev.ruleIds.includes(x.id) && x.status === "proposed")) r.status = "rejected";
    if (rev.direction) d.rejected.push({ id: newId("rej"), kind: "direction", what: rev.direction.name, why: reason || "redesign not approved", at: new Date().toISOString(), evidence: { revision: id } });
    return d;
  }, cwd);
  return rev;
}

/** Go back to the previous approved style revision. Nothing is deleted: the rolled-back one stays in the history. */
export function rollbackRevision({ cwd } = {}) {
  let from;
  let to;
  updateDecisions((d) => {
    from = d.styleRevisions.find((r) => r.id === d.activeRevision);
    to = from && d.styleRevisions.find((r) => r.id === from.previous);
    if (!from || !to) throw new Error("There is no earlier approved style revision to go back to.");
    for (const r of d.rules.filter((x) => from.ruleIds.includes(x.id) && x.status === "approved")) r.status = "rolled-back";
    for (const r of d.rules.filter((x) => from.supersededRules.includes(x.id))) {
      r.status = "approved";
      delete r.supersededBy;
    }
    from.status = "rolled-back";
    to.status = "approved";
    d.activeRevision = to.id;
    return d;
  }, cwd);
  if (to.direction) {
    const board = loadBoard(to.direction.board);
    const key = brandKey(board?.brand);
    updateIndex((i) => {
      i.approved[key] = { board: to.direction.board, direction: to.direction.name, snapshot: to.direction, revision: to.id, boardRevision: board?.revision ?? null, at: new Date().toISOString(), reason: `rolled back from ${from.id}`, critic: to.critic || null };
      return i;
    });
    if (board) updateBoard(board.id, (b) => { b.approved = { direction: to.direction.name, styleRevision: to.id, at: new Date().toISOString(), reason: `rolled back from ${from.id}` }; }, { op: "rollback", summary: `back to ${to.id}` });
  }
  return { from, to };
}

// ---- measured style (style_extract output) ----
export const loadStyle = (cwd) => readJson(styleFile(cwd), null);

// ---- the project skill ----
const GEN_START = (v) => `<!-- drip:generated start v=${v} -->`;
const GEN_END = "<!-- drip:generated end -->";
const GEN_RE = /<!-- drip:generated start v=(\d+) -->[\s\S]*?<!-- drip:generated end -->/;

function list(items, max = 8) {
  return items.slice(0, max);
}

export function skillBody(cwd, { brandOnly = false } = {}) {
  const root = projectDir(cwd);
  const idx = loadIndex();
  const d = loadDecisions(cwd);
  const st = loadStyle(cwd);
  const doc = designDoc(root);
  const brand = "default";
  const ap = idx.approved[brand];
  const lines = [];
  const m = idx.masters[brand];
  if (ap) {
    const s = ap.snapshot || {};
    lines.push(`## Approved direction: ${ap.direction} (style ${ap.revision}, ${String(ap.at || "").slice(0, 10)})`);
    if (s.manifesto || s.summary) lines.push(s.manifesto || s.summary);
    if (s.palette?.length) lines.push(`Palette (role order): ${s.palette.join(" ")}`);
    if (s.type) lines.push(`Type: ${s.type}`);
    if (s.adjectives?.length) lines.push(`Feel: ${s.adjectives.join(", ")}`);
  } else lines.push("## Approved direction\nNone yet. The master board holds what exists; a direction becomes the project's only when the user approves it.");
  const rules = d.rules.filter((r) => r.status === "approved" && (!brandOnly || r.scope === "brand"));
  lines.push("", "## Rules (approved by the user)");
  lines.push(...(rules.length ? list(rules, 30).map((r) => `- ${r.topic}: ${r.value}${r.avoid?.length ? ` (refuses: ${r.avoid.join("; ")})` : ""}${r.scope !== "brand" ? ` [${r.scope}${r.target ? ` ${r.target}` : ""} only]` : ""}`) : ["- none recorded yet"]));
  const rej = d.rejected.slice(-10);
  if (rej.length) lines.push("", "## Rejected", ...rej.map((r) => `- ${r.what}${r.why ? ` (${String(r.why).slice(0, 100)})` : ""}`));
  const ex = brandOnly ? [] : d.exceptions.slice(-6);
  if (ex.length) lines.push("", "## Exceptions", ...ex.map((e) => `- ${e.for}: ${e.reason || ""} (rule ${e.rule})`));
  if (st?.tokens) {
    const t = st.tokens;
    lines.push("", "## Measured tokens");
    if (t.colors?.length) lines.push(`- colours: ${list(t.colors, 10).map((c) => `${c.value}${c.role ? ` ${c.role}` : ""}`).join(", ")}`);
    if (t.type?.length) lines.push(`- type scale: ${list(t.type, 8).map((x) => `${x.size}px/${x.weight}${x.family ? ` ${x.family}` : ""}`).join(", ")}`);
    if (t.spacing?.length) lines.push(`- spacing steps: ${list(t.spacing, 10).join(", ")}px`);
    if (t.radii?.length) lines.push(`- radii: ${list(t.radii, 6).join(", ")}`);
    if (t.shadows?.length) lines.push(`- shadows: ${list(t.shadows, 3).join(" | ")}`);
    if (t.motion?.length) lines.push(`- motion: ${list(t.motion, 5).join(", ")}`);
    if (t.grid) lines.push(`- grid: ${JSON.stringify(t.grid)}`);
  }
  lines.push("", "## Where things are");
  if (m) lines.push(`- master board: .drip/boards/${m}/board.json (board_read, project_context)`);
  lines.push(doc ? `- DESIGN.md: ${doc.rel} (hash ${hashFile(doc.file)}; maintained by hand, Drip never overwrites it)` : "- DESIGN.md: none yet");
  if (fs.existsSync(path.join(projectDripDir(cwd), "patterns", "index.json"))) lines.push("- patterns: .drip/patterns/index.json (approved, reusable components and recipes)");
  lines.push("", "## How to use this", "Call project_context before researching. Fidelity mode: extend this system, new content only. Redesign mode: propose a new direction; this one stays until the user approves the change. A learned rule never replaces this task's own gates: research gaps, critic, fit check still run.");
  return lines.join("\n");
}

function skillHead(name) {
  return `---\nname: project-design\ndescription: ${name}'s design memory: the approved direction, measured tokens, rules the user approved and what the project refuses. Use whenever you design or change UI in this project, before DESIGN.md or the moodboard.\n---\n\n# Project design (${name})\n\n`;
}

const projectName = (cwd) => path.basename(projectDir(cwd));

/** Write the generated block of .drip/skills/project-design/SKILL.md. Text outside the markers is never touched. */
export function writeProjectSkill({ cwd, dryRun = false } = {}) {
  const dir = skillDir(cwd);
  const file = path.join(dir, "SKILL.md");
  const body = skillBody(cwd);
  const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const prevV = cur ? Number((cur.match(GEN_RE) || [])[1] || 0) : 0;
  const block = `${GEN_START(prevV + 1)}\n${body}\n${GEN_END}`;
  let next;
  if (cur === null) next = `${skillHead(projectName(cwd))}${block}\n\nYour own notes go below this line; Drip never edits outside the markers above.\n`;
  else if (GEN_RE.test(cur)) next = cur.replace(GEN_RE, () => block);
  else next = `${cur.replace(/\s*$/, "")}\n\n${block}\n`;
  const same = cur !== null && (cur.match(GEN_RE)?.[0] || "").replace(/ v=\d+/, "") === block.replace(/ v=\d+/, "");
  if (dryRun || same) return { file, changed: !same, version: prevV + (same ? 0 : 1), preview: body };
  fs.mkdirSync(path.join(dir, ".history"), { recursive: true });
  if (cur !== null) {
    fs.writeFileSync(path.join(dir, ".history", `SKILL-v${prevV}-${Date.now()}.md`), cur);
    const old = fs.readdirSync(path.join(dir, ".history")).sort();
    for (const f of old.slice(0, Math.max(0, old.length - 20))) fs.rmSync(path.join(dir, ".history", f), { force: true });
  }
  ensureProjectDrip(cwd);
  fs.writeFileSync(file, next);
  return { file, changed: true, version: prevV + 1, preview: body };
}

/** Restore the previous version of the project skill (the current one goes to the history, so undo can be undone). */
export function undoProjectSkill({ cwd } = {}) {
  const dir = skillDir(cwd);
  const hist = path.join(dir, ".history");
  const files = fs.existsSync(hist) ? fs.readdirSync(hist).filter((f) => f.endsWith(".md")).sort() : [];
  if (!files.length) throw new Error("No earlier version of the project skill to restore.");
  const last = files[files.length - 1];
  const file = path.join(dir, "SKILL.md");
  const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const restored = fs.readFileSync(path.join(hist, last), "utf8");
  fs.writeFileSync(path.join(hist, `SKILL-undone-${Date.now()}.md`), cur);
  fs.writeFileSync(file, restored);
  fs.rmSync(path.join(hist, last), { force: true });
  return { file, restored: last };
}
