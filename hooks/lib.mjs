// Shared bits for the hook scripts. Hooks must be fast and must never crash the session:
// on any unexpected error they exit 0 with no output (= allow).
export { loadConfig } from "../mcp/src/core/config.mjs";
export { REWORK_WORDS, agentFinished, agentStarted, agentsRunning, bindSession, orphanTasks, checklist, evidenceStale, isUiFile, loadState, missingBeforeUi, needsFitcheck, otherTasks, reconcileWorkspace, saveState, updateState } from "../mcp/src/core/state.mjs";
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

/** Files a shell command writes to: redirects, tee, sed -i, PowerShell Set-Content/Add-Content/Out-File, inline
 *  node/python writes. Best effort: it only has to catch the common ways an agent writes a file from the shell. */
export function shellWrites(command) {
  const s = String(command || "");
  const files = new Set();
  const add = (f) => {
    f = String(f || "").replace(/^["']|["']$/g, "").trim();
    if (f && !/^(\/dev\/|nul$|\$null$|&)/i.test(f)) files.add(f);
  };
  let m;
  const redirect = /(?:^|[^0-9&<>=-])>>?\s*(?!&)("[^"]+"|'[^']+'|[^\s;&|<>()]+)/g;
  while ((m = redirect.exec(s))) add(m[1]);
  const tee = /\btee\s+(?:-a\s+)?("[^"]+"|'[^']+'|[^\s;&|<>]+)/g;
  while ((m = tee.exec(s))) add(m[1]);
  const ps = /\b(?:Set-Content|Add-Content|Out-File)\b[^;|\n]*?(?:-(?:Literal)?(?:File)?Path\s+)?("[^"]+"|'[^']+'|[^\s;|-][^\s;|]*)/gi;
  while ((m = ps.exec(s))) add(m[1]);
  const code = /\b(?:writeFileSync|appendFileSync|writeFile|appendFile)\s*\(\s*["'`]([^"'`]+)["'`]|\bopen\s*\(\s*["']([^"']+)["']\s*,\s*["'][wa]/g;
  while ((m = code.exec(s))) add(m[1] || m[2]);
  for (const seg of s.split(/&&|\|\||;|\n/)) {
    const words = seg.trim().split(/\s+/).filter((w) => !/^-/.test(w));
    // sed -i edits its last argument in place; cp / mv / Copy-Item / Move-Item write their last argument (the destination).
    if (/\bsed\b[^|]*\s-i/.test(seg) || /^(cp|mv|copy|move|install|Copy-Item|Move-Item|cpi|mi)$/i.test(words[0] || "")) {
      const dest = (seg.match(/-Destination\s+("[^"]+"|'[^']+'|\S+)/i) || [])[1] || words[words.length - 1];
      if (words.length > 2 || /-Destination/i.test(seg)) add(dest);
    }
  }
  return [...files];
}

/** Drip's own bookkeeping (task state, config, memory, kits): written by Drip's tools, never by the agent's hands. */
export const isDripState = (file) => /(^|[\\/])\.drip[\\/](.*\.jsonl?$|memory[\\/])/i.test(String(file || "").replace(/^["']|["']$/g, ""));

export const DRIP_STATE_DENY =
  "This is Drip's own bookkeeping (.drip/*.json, memory): only Drip's tools write it. To change a setting, the user runs /drip:settings or edits .drip/config.json themselves; to move a step on, do the step.";

export const DIRECTOR_MAX = { lines: 40, chars: 2500, total: 150, edits: 6 };

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
  // Many small edits add up: the director's own lines since the last build_prepare have a ceiling too.
  const sofar = task.directorLines || 0;
  // Each of the director's edits re-reads its whole context (200-400k tokens late in a run): fixes go as one list.
  if ((task.built || []).length && (task.directorEdits || 0) >= DIRECTOR_MAX.edits && !((ti.edits || []).length > 1))
    return (
      `You have made ${task.directorEdits} edits yourself since the last page check, and each one re-reads your whole context. ` +
      "Put every fix still open in ONE list: send it to the builder that wrote the section (SendMessage to its agent: it keeps its context), or make them in one MultiEdit per file. Then fitcheck_shot once (that resets this count)."
    );
  if (lines <= DIRECTOR_MAX.lines && s.length <= DIRECTOR_MAX.chars && sofar + lines <= DIRECTOR_MAX.total) return null;
  const what = lines > DIRECTOR_MAX.lines || s.length > DIRECTOR_MAX.chars ? `This write is ${lines} lines` : `You have written ${sofar} lines yourself since the builders last ran, and this adds ${lines}`;
  return (
    `You are the director: plan, choose the pieces, write specs and delegate. ${what}: that is a builder's job. ` +
    `build_prepare({ sections: [{ section, spec, piece }] }) and launch the drip:builder (Sonnet); for a mechanical job (install, download, rename, copy swaps) launch a drip:helper (Haiku) with a one-paragraph task. ` +
    `Fixes under ${DIRECTOR_MAX.lines} lines you make yourself. (The user can turn the roles off: drip_start({ swarm: false }) or "swarm": false in .drip/config.json.)`
  );
}

export function run(main) {
  main().catch(() => process.exit(0));
}
