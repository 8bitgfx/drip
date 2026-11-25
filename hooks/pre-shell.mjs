// PreToolUse (Bash | PowerShell): while a Drip task is open, UI files are written with Write/Edit (or by a builder),
// never from the shell. A heredoc appended to a stylesheet skips every gate: the loop, the director's size limit and
// the film. Commands that don't write UI files pass untouched.
import { allow, isUiFile, loadConfig, loadState, missingBeforeUi, out, readInput, run, shellWrites } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const command = input.tool_input?.command;
  if (!command) return allow();
  const config = loadConfig(dir);
  if (!config.gates.enforce) return allow();
  const { task } = loadState(dir);
  if (!task || task.skipped) return allow();
  const ui = shellWrites(command).filter((f) => isUiFile(f, dir));
  if (!ui.length) return allow();
  const missing = missingBeforeUi(task, config);
  const todo = missing.length ? `\nFirst, the loop still needs:\n${missing.map((m) => `- ${m.need}: ${m.how}`).join("\n")}` : "";
  out({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `[Drip] This command writes UI (${ui.join(", ")}) from the shell. While a design task is open, UI is written with Write/Edit (fixes under 40 lines) or by drip:builder agents through build_prepare, so Drip can check it.${todo}`,
    },
  });
});
