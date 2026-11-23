// Per-project task state in <project>/.drip/state.json, and the gates computed from it.
// The MCP writes it as Claude works; the hooks read it to decide what to allow.
// No dependencies: hooks import this file directly.
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDrip, projectDripDir } from "./paths.mjs";
import { loadConfig } from "./config.mjs";

const EMPTY = () => ({ version: 1, task: null, history: [] });

export function statePath(cwd) {
  return path.join(projectDripDir(cwd), "state.json");
}

export function loadState(cwd) {
  try {
    return { ...EMPTY(), ...JSON.parse(fs.readFileSync(statePath(cwd), "utf8")) };
  } catch {
    return EMPTY();
  }
}

export function saveState(state, cwd) {
  ensureProjectDrip(cwd);
  const file = statePath(cwd);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

/** Read, change and save in one go. `fn` gets the state and may mutate it. */
export function updateState(fn, cwd) {
  const state = loadState(cwd);
  const ret = fn(state);
  const out = ret && typeof ret === "object" && "history" in ret ? ret : state;
  saveState(out, cwd);
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
        how: `study ${g.minOnSurface - onSurfaceCount} more references that ARE what you're building (${what}), not print, posters or objects: refs_search with category "web-design" or "product-design", refs_tag "landing page" / "hero section" / "website" (now ${onSurfaceCount}/${g.minOnSurface})`,
      });
    }
    if (studied < g.minRefsStudied || designers < g.minDesigners)
      missing.push({
        need: "references",
        how: `study ${Math.max(0, g.minRefsStudied - studied)} more references from at least ${g.minDesigners} designers (now ${studied} studied, ${designers} designers): refs_search/refs_tag -> refs_pick -> refs_view -> refs_study`,
      });
    if (g.requireDirection && !task.board?.chosen)
      missing.push({ need: "direction", how: task.board ? "board_directions, board_tile, critic review (critic_prepare kind 'directions' + drip:critic), board_open, then board_choose" : "board_create, board_directions, board_tile, critic review, board_open, board_choose" });
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
  if (rounds >= config.gates.maxCriticRounds) return false; // never loop forever; the hand-off lists what's left
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
    lines.push(`${tick(task.system)} system written (DESIGN.md / tokens)`);
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
