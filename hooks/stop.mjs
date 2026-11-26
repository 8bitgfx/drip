// Stop: Claude may not end its turn after changing UI until a fit check was recorded
// (full loop: fitcheck_shot + fitcheck_done; quick loop: fitcheck_done or at least fitcheck_lint).
// Gives up after 3 blocks in a row so a session can never get stuck.
import { agentsRunning, allow, evidenceStale, loadConfig, loadState, needsFitcheck, out, readInput, reconcileWorkspace, run, updateState } from "./lib.mjs";

const MAX_BLOCKS = 3;

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const config = loadConfig(dir);
  // UI files changed without any hook seeing it (a shell edit, another tool) are folded in as UI writes first.
  const unseen = loadState(dir).task && config.gates.enforce ? reconcileWorkspace(dir) : [];
  const { task } = loadState(dir);
  if (!task || !needsFitcheck(task, config)) {
    if (task?.stopBlocks) updateState((st) => st.task && (st.task.stopBlocks = 0), dir);
    return allow();
  }
  // The critic (or any subagent) is still running in the background: the agent is waiting for it, not skipping the check.
  // Don't block and don't count it; the Stop after it finishes is judged as usual (a subagent that never reports expires after 10 minutes).
  if (agentsRunning(task).length) return allow();
  const blocks = task.stopBlocks || 0;
  if (blocks >= MAX_BLOCKS) {
    // Never stuck, never silent: the turn may end, but the user is told, in Drip's words, what wasn't checked.
    const why = needsFitcheck(task, config) ? "the latest UI changes weren't checked (no fit check of this version, or a critic REVISE the user hasn't ruled on)" : "the checks weren't finished";
    updateState((st) => {
      if (!st.task) return;
      st.task.stopBlocks = 0;
      st.task.endedUnchecked = [...(st.task.endedUnchecked || []), { at: new Date().toISOString(), why }].slice(-10);
    }, dir);
    return out({ systemMessage: `[Drip] This turn ended unchecked: ${why}. Don't take this version as reviewed; ask Claude to finish the check, or say you accept it as it is.` });
  }
  updateState((st) => st.task && (st.task.stopBlocks = blocks + 1), dir);
  const files = [...new Set(task.uiWrites.map((w) => w.file))].slice(-8).join(", ");
  const fcDone = task.fitcheck?.doneAt && task.fitcheck.doneAt >= task.lastUiWriteAt;
  const critic = (task.critic?.records || []).filter((r) => r.kind === "build").at(-1);
  const filmCritic = (task.critic?.records || []).filter((r) => r.kind === "motion").at(-1);
  const how =
    task.mode === "motion"
      ? fcDone && filmCritic && filmCritic.verdict !== "pass"
        ? `The critic said ${String(filmCritic.verdict).toUpperCase()} on the film ("${filmCritic.worst || ""}"). Fix what it listed and look again (motion_frames), then ask the user: "Ship with these open points" (list them) or "One more critic round". If they ship: drip_end({ acceptOpen: "<their words>" }).`
        : "Look at the film as it is now: motion_frames({ target: <composition> }) (the full sweep) and fix what it flags; the critic once on the finished cut (critic_prepare kind \"motion\")."
      : task.loop === "fast" && critic && critic.verdict !== "pass"
      ? `The critic said ${String(critic.verdict).toUpperCase()} on this build ("${critic.worst || ""}"), and your own pass doesn't overrule it. Fix what it listed, then ask the user with AskUserQuestion: "Ship with these open points" (list them) or "One more critic round". If they ship: fitcheck_done({ ..., acceptedByUser: true }).`
      : task.size === "full"
      ? fcDone
        ? 'The critic hasn\'t passed the latest build. critic_prepare({ kind: "build", targets: [<page URL>] }) -> Agent drip:critic -> critic_record, fix what it says, repeat (max 3 rounds).'
        : 'Run the page: fitcheck_shot (phone + desktop), fitcheck_compare, then the critic (critic_prepare kind "build" -> Agent drip:critic -> critic_record), fix, fitcheck_done.'
      : "Call fitcheck_lint on the changed files and look at the change (fitcheck_shot if the page runs), then fitcheck_done.";
  out({
    decision: "block",
    reason: `[Drip] You changed UI (${files}) after the last fit check${unseen.length ? ` (${unseen.length} edit(s) Drip never saw: ${unseen.slice(0, 5).map((u) => u.file).join(", ")})` : ""}${evidenceStale(task).length ? `; the evidence is stale (${evidenceStale(task).join("; ")})` : ""}. ${how} If you are waiting on the user (e.g. a direction choice), say so and they can reply; if the user said to skip, call drip_skip with their words.`,
  });
});
