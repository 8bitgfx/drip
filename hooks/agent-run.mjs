// PostToolUse (Agent | Task): record that the drip:critic subagent actually ran, so critic_record
// can't be called with an invented verdict. A foreground subagent is also finished here; a background one finishes
// later (SubagentStop), so it stays "running" for the Stop hook until then.
import { agentFinished, allow, loadState, readInput, run, updateState, hookDir } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = hookDir(input);
  const type = String(input.tool_input?.subagent_type || "");
  if (!loadState(dir).task) return allow();
  // Hosts may start a subagent in the background without the flag (the result says so): it is still running.
  const background = input.tool_input?.run_in_background || /async agent launched|running in the background|agentId/i.test(JSON.stringify(input.tool_response ?? "").slice(0, 2000));
  if (!background) agentFinished(type || "agent", dir);
  if (!/critic/i.test(type)) return allow();
  updateState((st) => {
    if (!st.task) return;
    st.task.critic = st.task.critic || { runs: [], records: [] };
    st.task.critic.runs = [...(st.task.critic.runs || []), new Date().toISOString()].slice(-50);
  }, dir);
  allow();
});
