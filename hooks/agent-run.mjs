// PostToolUse (Agent | Task): record that the drip:critic subagent actually ran, so critic_record
// can't be called with an invented verdict.
import { allow, loadState, readInput, run, updateState } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const type = String(input.tool_input?.subagent_type || "");
  if (!/critic/i.test(type)) return allow();
  if (!loadState(dir).task) return allow();
  updateState((st) => {
    if (!st.task) return;
    st.task.critic = st.task.critic || { runs: [], records: [] };
    st.task.critic.runs = [...(st.task.critic.runs || []), new Date().toISOString()].slice(-50);
  }, dir);
  allow();
});
