// SessionStart: one short line so Claude knows Drip exists and how to start; plus the active task, if any.
import { checklist, loadConfig, loadState, out, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const { task } = loadState(dir);
  const config = loadConfig(dir);
  const base =
    "[Drip] Design plugin is active. For ANY UI work (new page, component, redesign, visual tweak) call drip_start first; it returns the guides to read and the next step. " +
    "Hooks block UI writes until the loop's requirements are met, and block ending a turn after UI changes until fitcheck_done.";
  out({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: task ? `${base}\nActive task:\n${checklist(task, config)}` : base,
    },
  });
});
