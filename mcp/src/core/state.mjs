// Per-project task state in <project>/.drip/state.json, and the gates computed from it.
// The MCP writes it as Claude works; the hooks read it to decide what to allow.
// No dependencies: hooks import this file directly.
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDrip, projectDripDir } from "./paths.mjs";
import { loadConfig } from "./config.mjs";

// Several Claude sessions can work in one folder at once, so the file holds one task PER SESSION:
// { version: 2, tasks: { <id>: task }, sessions: { <session id>: <task id> }, history: [] }.
// A session only ever sees and changes its own task. loadState() still returns { task, history }.
const EMPTY = () => ({ version: 2, tasks: {}, sessions: {}, history: [] });

// Who is asking. The MCP server (one per session) remembers its task in memory and knows its session
// from CLAUDE_CODE_SESSION_ID; hooks pass the session_id Claude Code gives them (setIdentity).
const me = { session: process.env.CLAUDE_CODE_SESSION_ID || null, server: false, taskId: null };
export function setIdentity({ session, server } = {}) {
  if (session) me.session = session;
  if (server !== undefined) me.server = server;
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

export function statePath(cwd) {
  return path.join(projectDripDir(cwd), "state.json");
}

function readRaw(cwd) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(statePath(cwd), "utf8"));
  } catch {
    return EMPTY();
  }
  const out = { ...EMPTY(), ...raw, tasks: { ...(raw.tasks || {}) }, sessions: { ...(raw.sessions || {}) }, history: raw.history || [] };
  if (raw.task) out.tasks[raw.task.id] = raw.task; // v1 file: one task for the whole folder
  delete out.task;
  return out;
}

/** Is this task being worked on by another live session? */
function ownedByOther(t, raw) {
  if (me.session && t.ownerSession && t.ownerSession !== me.session && alive(t.ownerPid)) return true;
  const boundTo = Object.entries(raw.sessions).filter(([, id]) => id === t.id).map(([sid]) => sid);
  if (me.session && boundTo.length && !boundTo.includes(me.session) && alive(t.ownerPid)) return true;
  if (me.server && t.ownerPid && t.ownerPid !== process.pid && alive(t.ownerPid)) return true;
  return false;
}

/** The id of this session's task, or null. */
function resolveId(raw) {
  if (me.taskId && raw.tasks[me.taskId]) return me.taskId;
  if (me.session) {
    const id = raw.sessions[me.session];
    if (id && raw.tasks[id]) return id;
    const own = Object.values(raw.tasks).find((t) => t.ownerSession === me.session);
    if (own) return own.id;
  }
  // Nothing bound: a task nobody live is working on (a resumed or restarted session) is yours.
  const free = Object.values(raw.tasks).filter((t) => !ownedByOther(t, raw));
  return free.length === 1 ? free[0].id : null;
}

function claim(raw, task) {
  if (!me.server) return;
  me.taskId = task.id;
  task.ownerPid = process.pid;
  if (me.session) {
    task.ownerSession = me.session;
    raw.sessions[me.session] = task.id;
  }
}

/** Open tasks in this folder that belong to other live sessions (never touch them). */
export function otherTasks(cwd) {
  const raw = readRaw(cwd);
  const mine = resolveId(raw);
  return Object.values(raw.tasks).filter((t) => t.id !== mine && ownedByOther(t, raw));
}

/** Hooks: remember that `session` works on task `taskId` (after drip_start answered it). */
export function bindSession(session, taskId, cwd) {
  const raw = readRaw(cwd);
  if (!session || !raw.tasks[taskId]) return;
  raw.sessions[session] = taskId;
  if (!raw.tasks[taskId].ownerSession) raw.tasks[taskId].ownerSession = session;
  writeRaw(raw, cwd);
}

export function loadState(cwd) {
  const raw = readRaw(cwd);
  const id = resolveId(raw);
  return { history: raw.history, task: id ? raw.tasks[id] : null };
}

function writeRaw(raw, cwd) {
  ensureProjectDrip(cwd);
  const file = statePath(cwd);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(raw, null, 2));
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows: another process has the file open for a moment.
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    fs.rmSync(tmp, { force: true });
  }
}

/** Write a { task, history } view back: only this session's task changes. */
function merge(raw, id, view) {
  if (id && (!view.task || view.task.id !== id)) {
    delete raw.tasks[id];
    for (const [sid, tid] of Object.entries(raw.sessions)) if (tid === id) delete raw.sessions[sid];
    if (me.taskId === id) me.taskId = null;
  }
  if (view.task) {
    if (view.task.id !== id || me.taskId !== view.task.id) claim(raw, view.task);
    view.task.touchedAt = new Date().toISOString();
    raw.tasks[view.task.id] = view.task;
  }
  // Forget tasks nobody has touched for 14 days (crashed sessions).
  const old = Date.now() - 14 * 864e5;
  for (const t of Object.values(raw.tasks)) if (t.id !== view.task?.id && Date.parse(t.touchedAt || t.startedAt) < old) delete raw.tasks[t.id];
  raw.history = (view.history || raw.history).slice(-30);
  return raw;
}

export function saveState(state, cwd) {
  const raw = readRaw(cwd);
  writeRaw(merge(raw, resolveId(raw), state), cwd);
}

/** Read, change and save in one go. `fn` gets { task, history } (this session's task) and may mutate it. */
export function updateState(fn, cwd) {
  const raw = readRaw(cwd);
  const id = resolveId(raw);
  const view = { history: [...raw.history], task: id ? raw.tasks[id] : null };
  const ret = fn(view);
  const out = ret && typeof ret === "object" && "history" in ret ? ret : view;
  writeRaw(merge(raw, id, out), cwd);
  return out;
}

export function newTask({ title, size, surface, guides, mode = "design", packs = [] }) {
  return {
    id: Date.now().toString(36),
    title,
    size, // "full" | "quick"
    mode, // "design" | "logo" | "refs" | "board" | "polish"
    surface, // "landing" | "app" | "mobile" | "component" | "brand" | "other"
    startedAt: new Date().toISOString(),
    requiredGuides: guides,
    guidesRead: [],
    packs, // niche pack ids in use
    brief: null, // set by drip_brief
    refs: { searches: 0, seen: 0, viewed: [], picked: [], studied: [] }, // studied: [{ key, designer, at }]
    board: null, // { id, items, directions, chosen, critiquedAt }
    system: false,
    uiWrites: [], // [{ file, at }]
    lastUiWriteAt: null,
    critic: { runs: [], records: [] }, // runs: timestamps of drip:critic subagent calls; records: verdicts
    fitcheck: { shots: 0, lastShotAt: null, lintAt: null, doneAt: null, score: null },
    skipped: null, // reason, when the user asked to skip the process
  };
}

/** A landing page, portfolio or showcase: the playbook's page-scale numbers and gates apply. */
export function isPersuade(task) {
  if (!task) return true;
  return ["landing", "other"].includes(task.surface) && !["logo", "refs", "board"].includes(task.mode);
}

/** Distinct designers among studied references. */
export function studiedDesigners(task) {
  return new Set((task.refs.studied || []).map((s) => s.designer).filter(Boolean)).size;
}

/** The latest critic verdict of a kind ("directions", "build", "logo", "pack", "any"). */
export function lastCritique(task, kind) {
  return [...(task?.critic?.records || [])].reverse().find((r) => r.kind === kind) || null;
}

/** Everything still missing before UI may be written. Empty list = allowed. */
export function missingBeforeUi(task, config) {
  if (!task) return [{ need: "task", how: "call drip_start with what you are designing" }];
  if (task.skipped || !config.gates.enforce) return [];
  const g = config.gates;
  const missing = [];
  if (task.size === "full" && g.requireBrief && !task.brief)
    missing.push({ need: "brief", how: "ask the user up to 4 clickable questions (AskUserQuestion), then record the answers with drip_brief" });
  const unread = task.requiredGuides.filter((x) => !task.guidesRead.includes(x));
  if (unread.length) missing.push({ need: "guides", how: `call drip_guide for: ${unread.join(", ")}` });
  if (task.size === "full") {
    const studied = (task.refs.studied || []).length;
    const designers = studiedDesigners(task);
    const pageWork = ["landing", "app", "mobile", "component"].includes(task.surface);
    const onSurfaceCount = (task.refs.studied || []).filter((x) => x.onSurface).length;
    if (pageWork && onSurfaceCount < g.minOnSurface) {
      const what = task.surface === "landing" ? "real landing pages, heroes and full-site shots" : task.surface === "component" ? "real components in real products" : "real app screens and flows";
      missing.push({
        need: "real examples",
        how: `study ${g.minOnSurface - onSurfaceCount} more references that ARE what you're building (${what}), not print, posters or objects. Fastest and best: refs_site with 2-4 shipped sites in the category (measured type sizes); or refs_tag "landing page" / "hero section" (now ${onSurfaceCount}/${g.minOnSurface})`,
      });
    }
    if (studied < g.minRefsStudied || designers < g.minDesigners)
      missing.push({
        need: "references",
        how: `study ${Math.max(0, g.minRefsStudied - studied)} more references from at least ${g.minDesigners} designers or sites (now ${studied} studied, ${designers}): refs_site for shipped sites, or refs_tag -> refs_view -> refs_study; batch them`,
      });
    if (g.requireDirection && !task.board?.chosen)
      missing.push({ need: "direction", how: task.board ? "board_directions (renders the comps), critic review (critic_prepare kind 'directions' + drip:critic), board_open, then board_choose" : "board_create, board_directions (2 first-viewport comps), critic review, board_open, board_choose" });
    if (g.requireCritic && task.board?.chosen && !lastCritique(task, "directions"))
      missing.push({ need: "critic", how: "have the drip:critic subagent rank the directions: critic_prepare kind 'directions' -> Agent drip:critic -> critic_record" });
  }
  return missing;
}

/** True when the build changed after the last passing critic verdict (full loop only). */
export function needsCritic(task, config) {
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireCritic || task.size !== "full" || !task.lastUiWriteAt) return false;
  const rec = lastCritique(task, "build");
  const rounds = (task.critic?.records || []).filter((r) => r.kind === "build").length;
  if (rounds >= config.gates.maxCriticRounds + (task.critic?.extraRounds || 0)) return false; // never loop forever; the hand-off lists what's left
  return !rec || rec.at < task.lastUiWriteAt || rec.verdict !== "pass";
}

/** True when UI changed after the last fit check (so Claude must not end its turn yet). */
export function needsFitcheck(task, config) {
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireFitcheck) return false;
  if (!task.lastUiWriteAt) return false;
  const last = task.size === "full" ? task.fitcheck.doneAt : task.fitcheck.doneAt || task.fitcheck.lintAt;
  return !last || last < task.lastUiWriteAt || needsCritic(task, config);
}

export function isUiFile(file, cwd) {
  if (!file) return false;
  const config = loadConfig(cwd);
  const f = file.replace(/\\/g, "/");
  return new RegExp(config.uiFiles, "i").test(f) && !new RegExp(config.ignoreFiles, "i").test(f);
}

/** Human-readable checklist used by drip_status and the hooks. */
export function checklist(task, config) {
  if (!task) return "No Drip task is active. Call drip_start first.";
  const tick = (ok) => (ok ? "[x]" : "[ ]");
  const g = config.gates;
  const lines = [`Task: ${task.title}  (${task.mode || "design"}, ${task.size} loop, ${task.surface})${task.packs?.length ? `  packs: ${task.packs.join(", ")}` : ""}${task.skipped ? `  SKIPPED: ${task.skipped}` : ""}`];
  if (task.size === "full") lines.push(`${tick(!!task.brief)} brief${task.brief ? `: ${task.brief.what} · ambition ${task.brief.ambition}` : " (ask up to 4 clickable questions, then drip_brief)"}`);
  for (const x of task.requiredGuides) lines.push(`${tick(task.guidesRead.includes(x))} guide: ${x}`);
  if (task.size === "full") {
    const st = (task.refs.studied || []).length;
    lines.push(`${tick(st >= g.minRefsStudied && studiedDesigners(task) >= g.minDesigners)} references studied: ${st}/${g.minRefsStudied} from ${studiedDesigners(task)}/${g.minDesigners} designers (picked ${(task.refs.picked || []).length}, viewed ${task.refs.viewed.length}, scanned ${task.refs.seen}, searches ${task.refs.searches})`);
    lines.push(`${tick(!!task.board)} moodboard${task.board ? `: ${task.board.items} items, ${task.board.directions || 0} directions` : ""}`);
    lines.push(`${tick(!!lastCritique(task, "directions"))} critic ranked the directions${lastCritique(task, "directions") ? `: ${lastCritique(task, "directions").summary}` : ""}`);
    lines.push(`${tick(!!task.board?.chosen)} direction chosen${task.board?.chosen ? `: ${task.board.chosen}` : ""}`);
    lines.push(`${tick(task.system)} system written (kit/base.css + DESIGN.md)`);
    if (isPersuade(task)) lines.push(`${tick(!!task.fitcheck.heroPassedAt)} hero gate passed (fitcheck_shot hero: true, before the sections)`);
  }
  lines.push(`${tick(task.uiWrites.length > 0)} built (${task.uiWrites.length} UI writes)`);
  const fc = task.fitcheck;
  lines.push(`${tick(!!fc.doneAt && !(task.lastUiWriteAt && fc.doneAt < task.lastUiWriteAt))} fit check after the last change (shots ${fc.shots}${fc.score ? `, score ${fc.score}` : ""})`);
  if (task.size === "full") {
    const b = lastCritique(task, "build");
    lines.push(`${tick(!needsCritic(task, config) && !!b)} critic passed the build${b ? `: ${b.verdict} (${b.summary})` : ""}`);
  }
  return lines.join("\n");
}
