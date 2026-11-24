// SubagentStop: a subagent finished (the background critic, a scout, a builder...). It no longer holds the Stop hook back.
import { agentFinished, allow, loadState, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!loadState(dir).task) return allow();
  agentFinished(String(input.agent_type || input.subagent_type || "") || null, dir);
  allow();
});
