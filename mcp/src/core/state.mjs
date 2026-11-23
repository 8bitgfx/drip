// Per-project task state in <project>/.drip/state.json, and the gates computed from it.
// The MCP writes it as Claude works; the hooks read it to decide what to allow.
// No dependencies: hooks import this file directly.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, projectDripDir } from "./paths.mjs";
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
  ensureDir(projectDripDir(cwd));
  const file = statePath(cwd);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
  // Keep the folder out of git without touching the user's .gitignore.
  const ignore = path.join(projectDripDir(cwd), ".gitignore");
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, "state.json\ncache/\n");
}

/** Read, change and save in one go. `fn` gets the state and may mutate it. */
export function updateState(fn, cwd) {
  const state = loadState(cwd);
  const ret = fn(state);
  const out = ret && typeof ret === "object" && "history" in ret ? ret : state;
  saveState(out, cwd);
  return out;
}

export function newTask({ title, size, surface, guides }) {
  return {
    id: Date.now().toString(36),
    title,
    size, // "full" | "quick"
    surface, // "landing" | "app" | "mobile" | "component" | "other"
    startedAt: new Date().toISOString(),
    requiredGuides: guides,
    guidesRead: [],
    refs: { searches: 0, seen: 0, viewed: [] },
    board: null, // { id, items, directions, chosen }
    system: false,
    uiWrites: [], // [{ file, at }]
    lastUiWriteAt: null,
    fitcheck: { shots: 0, lastShotAt: null, lintAt: null, doneAt: null, score: null },
    skipped: null, // reason, when the user asked to skip the process
  };
}

/** Everything still missing before UI may be written. Empty list = allowed. */
export function missingBeforeUi(task, config) {
  if (!task) return [{ need: "task", how: "call drip_start with what you are designing" }];
  if (task.skipped || !config.gates.enforce) return [];
  const missing = [];
  const unread = task.requiredGuides.filter((g) => !task.guidesRead.includes(g));
  if (unread.length) missing.push({ need: "guides", how: `call drip_guide for: ${unread.join(", ")}` });
  if (task.size === "full") {
    const viewed = task.refs.viewed.length;
    if (viewed < config.gates.minRefsViewed)
      missing.push({ need: "references", how: `open ${config.gates.minRefsViewed - viewed} more references full size with refs_view (${viewed}/${config.gates.minRefsViewed}); find them with refs_search / refs_tag and refs_sheet` });
    if (config.gates.requireDirection && !task.board?.chosen)
      missing.push({ need: "direction", how: task.board ? "group the board with board_directions, then board_choose a direction" : "board_create, add your picks with board_add, then board_directions and board_choose" });
  }
  return missing;
}

/** True when UI changed after the last fit check (so Claude must not end its turn yet). */
export function needsFitcheck(task, config) {
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireFitcheck) return false;
  if (!task.lastUiWriteAt) return false;
  const last = task.size === "full" ? task.fitcheck.doneAt : task.fitcheck.doneAt || task.fitcheck.lintAt;
  return !last || last < task.lastUiWriteAt;
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
  const lines = [`Task: ${task.title}  (${task.size} loop, ${task.surface})${task.skipped ? `  SKIPPED: ${task.skipped}` : ""}`];
  for (const g of task.requiredGuides) lines.push(`${tick(task.guidesRead.includes(g))} guide: ${g}`);
  if (task.size === "full") {
    lines.push(`${tick(task.refs.viewed.length >= config.gates.minRefsViewed)} references studied full size: ${task.refs.viewed.length}/${config.gates.minRefsViewed} (searched ${task.refs.searches}, scanned ${task.refs.seen})`);
    lines.push(`${tick(!!task.board)} moodboard${task.board ? `: ${task.board.items} items` : ""}`);
    lines.push(`${tick(!!task.board?.chosen)} direction chosen${task.board?.chosen ? `: ${task.board.chosen}` : ""}`);
    lines.push(`${tick(task.system)} system written (DESIGN.md / tokens)`);
  }
  lines.push(`${tick(task.uiWrites.length > 0)} UI built (${task.uiWrites.length} writes)`);
  const fc = task.fitcheck;
  lines.push(`${tick(!needsFitcheck(task, config) && (fc.doneAt || fc.lintAt))} fit check after the last change (shots ${fc.shots}${fc.score ? `, score ${fc.score}` : ""})`);
  return lines.join("\n");
}
