// PreToolUse (Bash | PowerShell): while a Drip task is open, UI files are written with Write/Edit (or by a builder),
// never from the shell. A heredoc appended to a stylesheet skips every gate: the loop, the director's size limit and
// the film. Commands that don't write UI files pass untouched.
import { DRIP_STATE_DENY, allow, isDripState, isUiFile, loadConfig, loadState, missingBeforeUi, out, readInput, run, shellWrites, hookDir } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = hookDir(input);
  const command = input.tool_input?.command;
  if (!command) return allow();
  const targets = shellWrites(command);
  const deny = (reason) => out({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });
  const deletesState = /\b(rm|del|Remove-Item|truncate)\b/i.test(command) && /\.drip[\\/]\S*\.jsonl?\b/i.test(command);
  if (targets.some(isDripState) || deletesState) return deny(`[Drip] ${DRIP_STATE_DENY}`);
  const config = loadConfig(dir);
  if (!config.gates.enforce) return allow();
  const { task } = loadState(dir);
  if (!task || task.skipped) return allow();
  // A film holds only its composition (the HTML that plays); support files (fonts.css, data scripts) are free.
  const ui = targets.filter((f) => isUiFile(f, dir) && (task.mode !== "motion" || /\.html?$/i.test(f)));
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
