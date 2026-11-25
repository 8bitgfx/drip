// PreToolUse (Agent | Task): a subagent is starting. Remember it, so the Stop hook doesn't block the turn while the critic
// (or a scout, a builder...) is still running in the background: the agent is waiting for it, not skipping the fit check.
import { agentStarted, allow, filmEvent, loadState, readInput, run, startEvent } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const { task } = loadState(dir);
  if (!task) return allow();
  filmEvent(task, startEvent(input.tool_input), dir);
  agentStarted(String(input.tool_input?.subagent_type || "agent"), dir);
  allow();
});
