// PostToolUse (Write | Edit | MultiEdit): record UI changes (so the Stop hook can demand a fit check)
// and run the static slop checks on the file that just changed.
import path from "node:path";
import { allow, hashFile, isUiFile, loadConfig, loadState, looksVisual, markSeen, out, readInput, run, shotHash, updateState } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const ti = input.tool_input || {};
  const file = ti.file_path;
  if (!file || !isUiFile(file, dir)) return allow();
  const abs = path.isAbsolute(file) ? file : path.join(dir, file);
  const rel = path.relative(dir, abs);
  const visual = input.tool_name === "Write" || looksVisual(ti);

  const { task } = loadState(dir);
  const config = loadConfig(dir);
  if (task) markSeen(task, rel, dir); // an edit this hook saw is known: only edits that bypass it count as unseen at the end
  if (!task && config.gates.mode !== "always") return allow();
  if (task && visual) {
    // Same bytes as before (as last recorded, or as the last fit-check shot saw them): nothing changed, so nothing to re-check.
    const hash = hashFile(abs);
    const same = hash && (task.uiWrites.some((w) => w.file === rel && w.hash === hash) || shotHash(task, rel, dir) === hash);
    updateState((st) => {
      if (!st.task) return;
      const now = new Date().toISOString();
      const prev = st.task.uiWrites.find((w) => w.file === rel);
      st.task.uiWrites = [...st.task.uiWrites.filter((w) => w.file !== rel), same && prev ? { ...prev, hash } : { file: rel, at: now, hash }].slice(-200);
      if (!same) st.task.lastUiWriteAt = now;
    }, dir);
  }

  const { lintFiles } = await import("../mcp/src/modules/fitcheck/lint.mjs"); // only when there is something to lint
  const all = lintFiles([abs], dir).filter((i) => i.severity !== "info");
  // Say each issue once: the same list after every edit of the file is noise.
  const sig = (i) => `${i.id}:${i.message}`;
  const said = new Set(task?.linted?.[rel] || []);
  const issues = all.filter((i) => !said.has(sig(i)));
  if (task && all.length) updateState((st) => st.task && ((st.task.linted ||= {})[rel] = [...new Set(all.map(sig))].slice(0, 80)), dir);
  const notes = [];
  if (issues.length) notes.push(`[Drip] Slop/polish checks on ${rel}:\n${issues.map((i) => `- ${i.severity} line ${i.line} [${i.id}${i.count > 1 ? ` x${i.count}` : ""}] ${i.message} -> ${i.fix}`).join("\n")}\nFix these now.`);
  if (!task && visual && config.gates.enforce) notes.push("[Drip] UI changed without a Drip task. Call drip_start (size quick) so the change gets the right guides and a fit check.");
  if (!notes.length) return allow();
  out({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n\n") } });
});
