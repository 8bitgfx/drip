// PreToolUse (Write | Edit | MultiEdit): the gate. UI may only be written once the Drip task's
// requirements are met (guides read, references studied, direction chosen for full loops).
import fs from "node:fs";
import path from "node:path";
import { allow, isUiFile, loadConfig, loadState, looksVisual, missingBeforeUi, out, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const ti = input.tool_input || {};
  const file = ti.file_path;
  if (!file || !isUiFile(file, dir)) return allow();
  const config = loadConfig(dir);
  if (!config.gates.enforce) return allow();

  const { task } = loadState(dir);
  const abs = path.isAbsolute(file) ? file : path.join(dir, file);
  const isNew = input.tool_name === "Write" && !fs.existsSync(abs);
  const rel = path.relative(dir, abs);

  const deny = (reason) =>
    out({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `[Drip] ${reason}\nIf the user explicitly asked to skip the design process, call drip_skip with their words. Unsure what is next: drip_status.`,
      },
    });

  if (!task) {
    if (isNew) return deny(`Creating a new UI file (${rel}) without a Drip task. Call drip_start with what you are designing (full loop for new UI), follow what it returns, then write this file.`);
    if (looksVisual(ti)) return deny(`This edit to ${rel} changes how the UI looks. Call drip_start first (size "quick" for a tweak, "full" for a redesign) and read the guides it lists; then make the edit.`);
    return allow();
  }

  const missing = missingBeforeUi(task, config);
  if (!missing.length) return allow();
  // Logic-only edits to existing files are not design work; don't block them.
  if (!isNew && !looksVisual(ti)) return allow();
  deny(`Not yet: the ${task.size} design loop for "${task.title}" is missing:\n${missing.map((m) => `- ${m.need}: ${m.how}`).join("\n")}\nDo these, then write ${rel}.`);
});
