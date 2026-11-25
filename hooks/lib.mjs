// Shared bits for the hook scripts. Hooks must be fast and must never crash the session:
// on any unexpected error they exit 0 with no output (= allow).
export { loadConfig } from "../mcp/src/core/config.mjs";
export { agentFinished, agentStarted, agentsRunning, bindSession, orphanTasks, checklist, evidenceStale, isUiFile, loadState, missingBeforeUi, needsFitcheck, otherTasks, reconcileWorkspace, saveState, updateState } from "../mcp/src/core/state.mjs";
export { hashFile, markSeen, shotHash } from "../mcp/src/core/evidence.mjs";
export { filmEvent, startEvent } from "../mcp/src/core/film.mjs";
import { agentsRunning, setIdentity } from "../mcp/src/core/state.mjs";

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let input = {};
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    /* empty */
  }
  // Each session sees only its own Drip task (several sessions can share a folder).
  setIdentity({ session: input.session_id });
  return input;
}

export function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

export function allow() {
  process.exit(0);
}

/** Names of the Drip MCP tools as Claude sees them inside the plugin. */
export const T = (name) => `mcp__plugin_drip_drip__${name}`;

/** Does this edit look visual (classes, styles, colours, layout) rather than logic? */
export function looksVisual(toolInput) {
  const s = [toolInput.content, toolInput.new_string, ...(toolInput.edits || []).map((e) => e.new_string)].filter(Boolean).join("\n");
  return /className=|class=|style=|\bstyled\.|css`|tw`|@apply|var\(--|#[0-9a-fA-F]{3,6}\b|\b(bg|text|p[xytrbl]?|m[xytrbl]?|gap|rounded|shadow|font|grid|flex|w|h)-[\w[\]/.-]+|\{[^}]*(color|margin|padding|font|display|grid|flex|border|background)\s*:/.test(s);
}

export const DIRECTOR_MAX = { lines: 40, chars: 2500 };

/** A message when the main agent is about to write a big chunk of UI itself in a swarm fast loop; null otherwise. */
export function directorTooBig(input, ti, task, config) {
  if (task?.loop !== "fast" || task.swarm === false || config.swarm === false || task.skipped) return null;
  const host = String(process.env.DRIP_HOST || "").toLowerCase();
  if (host && host !== "claude-code") return null; // hosts without Drip's subagents: the main agent builds
  if (input.agent_id || input.agent_type) return null; // a builder or helper: theirs to write
  // Older hosts don't say who is writing: while a builder or helper runs, give it the benefit of the doubt.
  if (!("agent_id" in input) && agentsRunning(task).some((a) => /builder|helper/.test(a.type))) return null;
  const s = [ti.content, ti.new_string, ...(ti.edits || []).map((e) => e.new_string)].filter(Boolean).join("\n");
  const lines = s.split("\n").length;
  if (lines <= DIRECTOR_MAX.lines && s.length <= DIRECTOR_MAX.chars) return null;
  return (
    `You are the director: plan, choose the pieces, write specs and delegate. This write is ${lines} lines: that is a builder's job. ` +
    `build_prepare({ sections: [{ section, spec, piece }] }) and launch the drip:builder (Sonnet); for a mechanical job (install, download, rename, copy swaps) launch a drip:helper (Haiku) with a one-paragraph task. ` +
    `Fixes under ${DIRECTOR_MAX.lines} lines you make yourself. (The user can turn the roles off: drip_start({ swarm: false }) or "swarm": false in .drip/config.json.)`
  );
}

export function run(main) {
  main().catch(() => process.exit(0));
}
