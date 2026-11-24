// PostToolUse (Write | Edit | MultiEdit): record UI changes (so the Stop hook can demand a fit check)
// and run the static slop checks on the file that just changed.
import path from "node:path";
import { allow, isUiFile, loadConfig, loadState, looksVisual, out, readInput, run, updateState } from "./lib.mjs";

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
  if (!task && config.gates.mode !== "always") return allow();
  if (task && visual)
    updateState((st) => {
      if (!st.task) return;
      const now = new Date().toISOString();
      st.task.uiWrites = [...st.task.uiWrites.filter((w) => w.file !== rel), { file: rel, at: now }].slice(-200);
      st.task.lastUiWriteAt = now;
    }, dir);

  const { lintFiles } = await import("../mcp/src/modules/fitcheck/lint.mjs"); // only when there is something to lint
  const issues = lintFiles([abs], dir).filter((i) => i.severity !== "info");
  const notes = [];
  if (issues.length) notes.push(`[Drip] Slop/polish checks on ${rel}:\n${issues.map((i) => `- ${i.severity} line ${i.line} [${i.id}${i.count > 1 ? ` x${i.count}` : ""}] ${i.message} -> ${i.fix}`).join("\n")}\nFix these now.`);
  if (!task && visual && config.gates.enforce) notes.push("[Drip] UI changed without a Drip task. Call drip_start (size quick) so the change gets the right guides and a fit check.");
  if (!notes.length) return allow();
  out({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n\n") } });
});
