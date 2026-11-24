// SessionStart: only speaks when there is something to say — an unfinished Drip task, or strict mode.
import { allow, checklist, loadConfig, loadState, orphanTasks, otherTasks, out, readInput, run } from "./lib.mjs";
import { sessionPointer } from "../mcp/src/core/project.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // This session's own task, or one an ended session left open (mentioned, never enforced here).
  const own = loadState(dir).task;
  const task = own || orphanTasks(dir)[0] || null;
  const config = loadConfig(dir);
  const load = "Load its tools with ToolSearch select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide.";
  const others = otherTasks(dir);
  const memory = sessionPointer(dir);
  const mem = memory ? ` [Drip] ${memory}` : "";
  const busy = others.length ? `\nOther live sessions are working on Drip tasks here (${others.map((o) => `"${o.title}"`).join(", ")}): they are theirs. Never drip_end them; drip_start your own task if you need one.` : "";
  if (task)
    return out({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `[Drip] A design task from an earlier session is still open:\n${checklist(task, config)}\nIf the user continues it, follow drip_status. If they move on, leave it (it blocks nothing until UI is written) or drip_end it when the user says it is finished.${busy}${mem} ${load}`,
      },
    });
  if (busy) return out({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: `[Drip]${busy}${mem}` } });
  if (memory && config.gates.mode !== "always") return out({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: `[Drip] ${memory} ${load}` } });
  if (config.gates.mode !== "always") return allow();
  out({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `[Drip] Strict mode: any UI work needs a Drip task first (drip_start). ${load}${mem}`,
    },
  });
});
