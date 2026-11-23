// SessionStart: only speaks when there is something to say — an unfinished Drip task, or strict mode.
import { allow, checklist, loadConfig, loadState, out, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const { task } = loadState(dir);
  const config = loadConfig(dir);
  const load = "Load its tools with ToolSearch select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide.";
  if (task)
    return out({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `[Drip] A design task is still open:\n${checklist(task, config)}\nIf the user continues it, follow drip_status; if they move on, call drip_end. ${load}`,
      },
    });
  if (config.gates.mode !== "always") return allow();
  out({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `[Drip] Strict mode: any UI work needs a Drip task first (drip_start). ${load}`,
    },
  });
});
