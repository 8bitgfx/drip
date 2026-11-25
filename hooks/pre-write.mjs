// PreToolUse (Write | Edit | MultiEdit): the gate. UI may only be written once the Drip task's
// requirements are met (guides read, references studied, direction chosen for full loops).
import fs from "node:fs";
import path from "node:path";
import { DRIP_STATE_DENY, allow, directorTooBig, isDripState, isUiFile, loadConfig, loadState, looksVisual, missingBeforeUi, out, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const ti = input.tool_input || {};
  const file = ti.file_path;
  if (file && isDripState(file) && !input.agent_id) return out({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `[Drip] ${DRIP_STATE_DENY}` } });
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
        permissionDecisionReason: `[Drip] ${reason}\nUnsure what is next: drip_status. Tools not loaded: ToolSearch select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_guide. If the user wants out of the process, they can turn checks off in /drip:settings (or you call drip_skip quoting their words).`,
      },
    });

  if (!task) {
    // Default: Drip is opt-in. Without an active task it never gets in the way.
    if (config.gates.mode !== "always") return allow();
    if (isNew) return deny(`Creating a new UI file (${rel}) without a Drip task. Call drip_start with what you are designing (full loop for new UI), follow what it returns, then write this file.`);
    if (looksVisual(ti)) return deny(`This edit to ${rel} changes how the UI looks. Call drip_start first (size "quick" for a tweak, "full" for a redesign) and read the guides it lists; then make the edit.`);
    return allow();
  }

  const missing = missingBeforeUi(task, config);
  if (!missing.length) {
    // The fast loop's roles: the main agent (Opus) directs and makes small fixes; builders (Sonnet) write the sections.
    const big = directorTooBig(input, ti, task, config);
    if (big) return deny(big);
    return allow();
  }
  // Logic-only edits to existing files are not design work; don't block them.
  if (!isNew && !looksVisual(ti)) return allow();
  deny(`Not yet: the ${task.size} design loop for "${task.title}" is missing:\n${missing.map((m) => `- ${m.need}: ${m.how}`).join("\n")}\nDo these, then write ${rel}.`);
});
