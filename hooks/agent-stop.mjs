// SubagentStop: a subagent finished (the background critic, a scout, a builder...). It no longer holds the Stop hook back.
import { agentFinished, allow, filmEvent, loadState, readInput, run, hookDir } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = hookDir(input);
  const { task } = loadState(dir);
  if (!task) return allow();
  filmEvent(task, { kind: "end", agent: input.agent_id || null, type: input.agent_type || input.subagent_type || null }, dir);
  agentFinished(String(input.agent_type || input.subagent_type || "") || null, dir);
  allow();
});
