// PreToolUse (Agent | Task): a subagent is starting. Remember it, so the Stop hook doesn't block the turn while the critic
// (or a scout, a builder...) is still running in the background: the agent is waiting for it, not skipping the fit check.
import { agentStarted, allow, loadState, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!loadState(dir).task) return allow();
  agentStarted(String(input.tool_input?.subagent_type || "agent"), dir);
  allow();
});
