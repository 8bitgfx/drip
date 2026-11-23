// Stop: Claude may not end its turn after changing UI until a fit check was recorded
// (full loop: fitcheck_shot + fitcheck_done; quick loop: fitcheck_done or at least fitcheck_lint).
// Gives up after 3 blocks in a row so a session can never get stuck.
import { allow, loadConfig, loadState, needsFitcheck, out, readInput, run, updateState } from "./lib.mjs";

const MAX_BLOCKS = 3;

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const config = loadConfig(dir);
  const { task } = loadState(dir);
  if (!task || !needsFitcheck(task, config)) {
    if (task?.stopBlocks) updateState((st) => st.task && (st.task.stopBlocks = 0), dir);
    return allow();
  }
  const blocks = task.stopBlocks || 0;
  if (blocks >= MAX_BLOCKS) {
    updateState((st) => st.task && (st.task.stopBlocks = 0), dir);
    return allow();
  }
  updateState((st) => st.task && (st.task.stopBlocks = blocks + 1), dir);
  const files = [...new Set(task.uiWrites.map((w) => w.file))].slice(-8).join(", ");
  const fcDone = task.fitcheck?.doneAt && task.fitcheck.doneAt >= task.lastUiWriteAt;
  const how =
    task.size === "full"
      ? fcDone
        ? 'The critic hasn\'t passed the latest build. critic_prepare({ kind: "build", targets: [<page URL>] }) -> Agent drip:critic -> critic_record, fix what it says, repeat (max 3 rounds).'
        : 'Run the page: fitcheck_shot (phone + desktop), fitcheck_compare, then the critic (critic_prepare kind "build" -> Agent drip:critic -> critic_record), fix, fitcheck_done.'
      : "Call fitcheck_lint on the changed files and look at the change (fitcheck_shot if the page runs), then fitcheck_done.";
  out({
    decision: "block",
    reason: `[Drip] You changed UI (${files}) after the last fit check. ${how} If you are waiting on the user (e.g. a direction choice), say so and they can reply; if the user said to skip, call drip_skip with their words.`,
  });
});
